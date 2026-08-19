package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"bytes"
	"io"
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

func callRPC(rpcName string, payload interface{}) ([]byte, error) {
	url := os.Getenv("SUPABASE_URL") + "/rest/v1/rpc/" + rpcName
	var bodyReader io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest("POST", url, bodyReader)
	if err != nil {
		return nil, err
	}

	anonKey := os.Getenv("SUPABASE_ANON_KEY")
	req.Header.Set("apikey", anonKey)
	req.Header.Set("Authorization", "Bearer "+anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
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

	data, err := callRPC("get_cron_media_entries", nil)

	if err != nil {
		log.Printf("[ERRO CRON] Falha na RPC get_cron_media_entries: %v", err)
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
				payload := map[string]interface{}{
					"p_user_id":        userID,
					"p_mal_id":         anime.MalID,
					"p_episode_number": episodeAired,
				}

			if errRpc == nil && string(subData) != "null" && string(subData) != "[]" {
				// RPC que insere a notificação e devolve as assinaturas Web Push via helper nativo
				subData, errRpc := callRPC("process_cron_notification", payload)

				// Se a RPC retornou dados (significa que o episódio era inédito para este usuário)
				if errRpc == nil && string(subData) != "null" && string(subData) != "[]" {
					var subs []map[string]string
					if errJson := json.Unmarshal(subData, &subs); errJson == nil {
						go h.sendWebPush(subs, anime.Title, episodeAired)
					}
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}

func (h *NotificationsHandler) sendWebPush(subs []map[string]string, animeTitle string, episode int) {
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
			log.Printf("[WEB PUSH] Erro ao disparar notificação: %v", err)
		}
	}
}