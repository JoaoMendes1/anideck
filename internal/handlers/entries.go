package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

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
		log.Printf("[ERRO DB] HandleList Entries (user=%s): %v", userID, err)
		http.Error(w, "Erro ao buscar entries", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").Insert(entrada, false, "exact", "", "").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Entries (user=%s, mal_id=%d): %v", userID, entrada.MalID, err)
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
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").
		Update(entrada, "", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Entries (user=%s, id=%s): %v", userID, id, err)
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

	_, _, err := dbClient.From("media_entries").
		Delete("", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Entries (user=%s, id=%s): %v", userID, id, err)
		http.Error(w, "Erro ao excluir entry", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// buildMetadataPayload traduz o anime da AniList para as colunas de anime_metadata_cache.
// Fica separado da função de I/O justamente pra poder ser testado sem rede nem banco.
func buildMetadataPayload(anime anilist.Anime) map[string]interface{} {
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
		// As tags da AniList são a fonte de categorias como Isekai, que não existem
		// como "genre". Sem elas a taxonomia do AniDeck não consegue classificar o anime.
		"tags": anime.Tags,
	}

	// Só grava o ano quando a AniList realmente devolveu um. Enviar 0 sobrescreveria
	// um ano correto que já estivesse no cache por um valor sem sentido.
	if anime.SeasonYear > 0 {
		payload["season_year"] = anime.SeasonYear
	}

	return payload
}

// syncMetadataCache busca o anime na AniList e grava os metadados no cache local.
//
// O client vem de fora de propósito: ele carrega o rate limiter da AniList. Numa
// re-sincronização em lote, criar um client por anime daria a cada chamada um limiter
// zerado — o limite deixaria de valer e a API responderia 429. Reaproveitando o mesmo
// client, as chamadas entram todas na mesma fila.
func syncMetadataCache(ctx context.Context, client anilist.Service, malID int, token string) error {
	res, err := client.GetAnimeById(ctx, fmt.Sprintf("%d", malID))
	if err != nil || res == nil {
		return fmt.Errorf("erro ao buscar dados na AniList para mal_id %d: %w", malID, err)
	}
	anime := res.Data

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		return fmt.Errorf("erro ao criar cliente com token: %w", errClient)
	}

	payload := buildMetadataPayload(anime)
	if _, _, err := dbClient.From("anime_metadata_cache").Upsert(payload, "", "exact", "mal_id").Execute(); err != nil {
		return fmt.Errorf("erro ao salvar no banco para mal_id %d: %w", malID, err)
	}

	log.Printf("[CACHE METADATA] Metadados sincronizados com sucesso para: %s", anime.Title)
	return nil
}

func syncMetadataCacheAsync(malID int, token string) {
	go func() {
		if err := syncMetadataCache(context.Background(), anilist.NewClient(), malID, token); err != nil {
			log.Printf("[CACHE METADATA] %v", err)
		}
	}()
}

func (h *EntriesHandler) HandleGetEpisodes(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	malID := chi.URLParam(r, "mal_id")

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("episode_progress").
		Select("episode_number", "exact", false).
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleGetEpisodes (user=%s, mal_id=%s): %v", userID, malID, err)
		http.Error(w, "Erro ao buscar episódios", http.StatusInternalServerError)
		return
	}

	var raw []map[string]int
	_ = json.Unmarshal(data, &raw)

	episodes := make([]int, 0)
	for _, row := range raw {
		episodes = append(episodes, row["episode_number"])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(episodes)
}

func (h *EntriesHandler) HandleMarkEpisode(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID, _ := strconv.Atoi(chi.URLParam(r, "mal_id"))
	episodeNumber, _ := strconv.Atoi(chi.URLParam(r, "number"))

	progresso := entries.EpisodeProgress{
		UserID:        userID,
		MalID:         malID,
		EpisodeNumber: episodeNumber,
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("episode_progress").Insert(progresso, false, "exact", "", "").Execute()

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") || strings.Contains(err.Error(), "23505") {
			w.WriteHeader(http.StatusOK)
			return
		}
		log.Printf("[ERRO DB] HandleMarkEpisode (user=%s, mal_id=%d, ep=%d): %v", userID, malID, episodeNumber, err)
		http.Error(w, "Erro ao marcar episódio", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *EntriesHandler) HandleUnmarkEpisode(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID := chi.URLParam(r, "mal_id")
	episodeNumber := chi.URLParam(r, "number")

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("episode_progress").
		Delete("", "exact").
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Eq("episode_number", episodeNumber).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUnmarkEpisode (user=%s, mal_id=%s, ep=%s): %v", userID, malID, episodeNumber, err)
		http.Error(w, "Erro ao desmarcar episódio", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}