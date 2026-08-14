package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/entries"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type EntriesHandler struct{}

func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		log.Printf("[ERRO] Falha ao buscar entries do DB: %v", err)
		http.Error(w, "Erro ao buscar entries", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").Insert(entrada, false, "exact", "", "").Execute()
	if err != nil {
		http.Error(w, "Erro ao salvar entry", http.StatusInternalServerError)
		return
	}

	syncMetadataCacheAsync(entrada.MalID, token)

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").Update(entrada, "", "exact").Eq("id", id).Execute()
	if err != nil {
		http.Error(w, "Erro ao atualizar entry", http.StatusInternalServerError)
		return
	}

	syncMetadataCacheAsync(entrada.MalID, token)

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("media_entries").Delete("", "exact").Eq("id", id).Execute()
	if err != nil {
		http.Error(w, "Erro ao excluir entry", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func syncMetadataCacheAsync(malID int, token string) {
	go func() {
		client := anilist.NewClient()
		ctx := context.Background()

		res, err := client.GetAnimeById(ctx, fmt.Sprintf("%d", malID))
		if err != nil || res == nil {
			log.Printf("[CACHE METADATA] Erro ao buscar dados na AniList para mal_id %d: %v", malID, err)
			return
		}
		anime := res.Data

		var genres, studios []string
		for _, g := range anime.Genres {
			genres = append(genres, g.Name)
		}
		for _, s := range anime.Studios {
			studios = append(studios, s.Name)
		}

		payload := map[string]interface{}{
			"mal_id":           anime.MalID,
			"title":            anime.Title,
			"episodes":         anime.Episodes,
			"duration_minutes": anime.Duration,
			"genres":           genres,
			"studios":          studios,
			"average_score":    anime.Score,
		}

		dbClient, errClient := database.ClientWithToken(token)
		if errClient != nil {
			log.Printf("[CACHE METADATA] Erro ao criar cliente com token: %v", errClient)
			return
		}

		_, _, err = dbClient.From("anime_metadata_cache").Upsert(payload, "", "exact", "mal_id").Execute()
		if err != nil {
			log.Printf("[CACHE METADATA] Erro ao salvar no banco para mal_id %d: %v", malID, err)
		} else {
			log.Printf("[CACHE METADATA] Metadados sincronizados com sucesso para: %s", anime.Title)
		}
	}()
}