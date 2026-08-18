package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/go-chi/chi/v5"
)

type NotificationsHandler struct {
	AniListClient anilist.Service
}

func (h *NotificationsHandler) HandleSubscribePush(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !tokenOk || !userOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

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

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("push_subscriptions").Insert(sub, false, "exact", "", "").Execute()

	if err != nil && (strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505")) {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *NotificationsHandler) HandleGetNotifications(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !tokenOk || !userOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("notifications").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Is("read_at", "null").
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleGetNotifications (user=%s): %v", userID, err)
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *NotificationsHandler) HandleReadNotification(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !tokenOk || !userOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	update := map[string]interface{}{"read_at": time.Now().Format(time.RFC3339)}

	_, _, err := dbClient.From("notifications").
		Update(update, "", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleReadNotification (id=%s): %v", id, err)
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *NotificationsHandler) HandleCheckNewEpisodes(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Cron-Secret") != os.Getenv("CRON_SECRET") {
		http.Error(w, "Acesso Negado", http.StatusForbidden)
		return
	}

	data, _, err := database.Client.From("media_entries").
		Select("user_id, mal_id", "exact", false).
		In("status", []string{"Assistindo", "Em Dia"}).
		Execute()

	if err != nil {
		log.Printf("[ERRO CRON] Falha ao buscar media_entries: %v | Retorno: %s", err, string(data))
		http.Error(w, "Erro DB", http.StatusInternalServerError)
		return
	}

	var entries []map[string]interface{}
	if err := json.Unmarshal(data, &entries); err != nil {
		log.Printf("[ERRO CRON] Falha ao converter JSON: %v", err)
		http.Error(w, "Erro JSON", http.StatusInternalServerError)
		return
	}

	malIDsMap := make(map[int]bool)
	userAnimes := make(map[int][]string)

	for _, e := range entries {
		if e["mal_id"] == nil || e["user_id"] == nil {
			continue
		}
		
		malIDFloat, okID := e["mal_id"].(float64)
		userID, okUser := e["user_id"].(string)
		
		if !okID || !okUser {
			log.Printf("[AVISO CRON] Falha de tipagem ignorada: mal_id=%v, user_id=%v", e["mal_id"], e["user_id"])
			continue
		}
		
		malID := int(malIDFloat)
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

	animes, _ := h.AniListClient.GetAnimesByMalIDs(context.Background(), malIDs)
	if animes == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	for _, anime := range animes.Data {
		if anime.NextAiringEpisode == nil {
			continue
		}

		if anime.NextAiringEpisode.TimeUntilAiring > 432000 {
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

				_, _, err := database.Client.From("notifications").Insert(notif, false, "exact", "", "").Execute()

				if err == nil {
					go h.sendWebPush(userID, anime.Title, episodeAired)
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}

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
			Subscriber:      "mailto:admin@anideck.com.br",
			VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
			VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
			TTL:             30,
		})
		
		if err != nil {
			log.Printf("[WEB PUSH] Erro ao enviar para user %s: %v", userID, err)
		}
	}
}