package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/go-chi/chi/v5"
)

type NotificationsHandler struct {
	AniListClient anilist.Service
}

// HandleSubscribePush salva a inscrição do dispositivo do usuário (Web Push)
func (h *NotificationsHandler) HandleSubscribePush(w http.ResponseWriter, r *http.Request) {
	token, _ := r.Context().Value(middleware.TokenKey).(string)
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)

	var payload struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	sub := map[string]interface{}{
		"user_id":  userID,
		"endpoint": payload.Endpoint,
		"p256dh":   payload.Keys.P256dh,
		"auth":     payload.Keys.Auth,
	}

	dbClient, _ := database.ClientWithToken(token)
	_, _, err := dbClient.From("push_subscriptions").Insert(sub, false, "exact", "", "").Execute()

	// Se for erro de duplicidade de endpoint, apenas retornamos sucesso
	if err != nil && (strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505")) {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// HandleGetNotifications lista o histórico de notificações In-App
func (h *NotificationsHandler) HandleGetNotifications(w http.ResponseWriter, r *http.Request) {
	token, _ := r.Context().Value(middleware.TokenKey).(string)
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)

	dbClient, _ := database.ClientWithToken(token)
	data, _, err := dbClient.From("notifications").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Is("read_at", "null").
		Execute()

	if err != nil {
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// HandleReadNotification marca o aviso como lido
func (h *NotificationsHandler) HandleReadNotification(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	dbClient, _ := database.ClientWithToken(token)
	update := map[string]interface{}{"read_at": "now()"}

	_, _, err := dbClient.From("notifications").
		Update(update, "", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleCheckNewEpisodes é o Cron Job diário que varre novos lançamentos
func (h *NotificationsHandler) HandleCheckNewEpisodes(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Cron-Secret") != os.Getenv("CRON_SECRET") {
		http.Error(w, "Acesso Negado", http.StatusForbidden)
		return
	}

	// 1. Busca todos os usuários e animes que estão sendo acompanhados
	data, _, err := database.Client.From("media_entries").
		Select("user_id, mal_id", "exact", false).
		In("status", []string{"Assistindo", "Em Dia"}).
		Execute()

	if err != nil {
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	var entries []map[string]interface{}
	_ = json.Unmarshal(data, &entries)

	malIDsMap := make(map[int]bool)
	userAnimes := make(map[int][]string)

	for _, e := range entries {
		malID := int(e["mal_id"].(float64))
		userID := e["user_id"].(string)
		malIDsMap[malID] = true
		userAnimes[malID] = append(userAnimes[malID], userID)
	}

	var malIDs []int
	for id := range malIDsMap {
		malIDs = append(malIDs, id)
	}

	if len(malIDs) == 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 2. Busca na AniList os detalhes desses animes
	animes, _ := h.AniListClient.GetAnimesByMalIDs(context.Background(), malIDs)
	if animes == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 3. Processa e dispara as notificações
	for _, anime := range animes.Data {
		if anime.NextAiringEpisode == nil {
			continue
		}

		// Se faltam mais de 6 dias (518400s) pro próximo, significa que o anterior recém lançou (janela de 24h)
		if anime.NextAiringEpisode.TimeUntilAiring > 518400 {
			episodeAired := anime.NextAiringEpisode.Episode - 1
			if episodeAired < 1 {
				continue
			}

			for _, userID := range userAnimes[anime.MalID] {
				notif := map[string]interface{}{
					"user_id":        userID,
					"mal_id":         anime.MalID,
					"episode_number": episodeAired,
				}

				// Tenta inserir no histórico. O ON CONFLICT do Supabase rejeitará duplicatas.
				_, _, err := database.Client.From("notifications").Insert(notif, false, "exact", "", "").Execute()

				// Se inseriu sem erro (novo episódio detectado para este usuário)
				if err == nil {
					go h.sendWebPush(userID, anime.Title, episodeAired)
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}

// sendWebPush dispara o alerta nativo para os dispositivos cadastrados
func (h *NotificationsHandler) sendWebPush(userID string, animeTitle string, episode int) {
	data, _, err := database.Client.From("push_subscriptions").
		Select("endpoint, p256dh, auth", "exact", false).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		return
	}

	var subs []map[string]string
	_ = json.Unmarshal(data, &subs)

	// O payload que o Service Worker no React vai ler para criar o Card da Notificação
	message := []byte(fmt.Sprintf(`{"title": "Novo Episódio!", "body": "%s — Episódio %d acabou de lançar!"}`, animeTitle, episode))

	for _, s := range subs {
		sub := &webpush.Subscription{
			Endpoint: s["endpoint"],
			Keys: webpush.Keys{
				P256dh: s["p256dh"],
				Auth:   s["auth"],
			},
		}

		_, err := webpush.SendNotification(message, sub, &webpush.Options{
			Subscriber:      "mailto:admin@anideck.com.br", // Substitua pelo seu e-mail real depois
			VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
			VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
			TTL:             30,
		})
		
		if err != nil {
			log.Printf("[WEB PUSH] Erro ao enviar para user %s: %v", userID, err)
		}
	}
}