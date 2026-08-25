package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
)

type AnimeHandler struct {
	AniListClient anilist.Service // CORRIGIDO AQUI (era *anilist.Client)
}

func (h *AnimeHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("perPage")

	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(perPageStr)
	if perPage < 1 || perPage > 50 {
		perPage = 40
	}

	filtros := anilist.SearchFilters{
		Sort:   r.URL.Query().Get("sort"),
		Season: r.URL.Query().Get("season"),
		Status: r.URL.Query().Get("status"),
	}

	if seasonYear := r.URL.Query().Get("seasonYear"); seasonYear != "" {
		filtros.SeasonYear, _ = strconv.Atoi(seasonYear)
	}
	if tags := r.URL.Query().Get("tags"); tags != "" {
		filtros.Tags = strings.Split(tags, ",")
	}
	if genres := r.URL.Query().Get("genres"); genres != "" {
		filtros.Genres = strings.Split(genres, ",")
	}

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, page, perPage, filtros)
	if err != nil {
		http.Error(w, "Erro ao buscar na AniList", http.StatusInternalServerError)
		return
	}

	// Injeta a Curadoria na Busca (Capa e Título)
	if resultados != nil {
		resultados.Data = ApplyCurationToAnimeList(resultados.Data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

func (h *AnimeHandler) HandleGetTop(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("perPage")

	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(perPageStr)
	if perPage < 1 || perPage > 50 {
		perPage = 10
	}

	filtros := anilist.SearchFilters{
		Sort:   r.URL.Query().Get("sort"),
		Season: r.URL.Query().Get("season"),
		Status: r.URL.Query().Get("status"),
	}

	if seasonYear := r.URL.Query().Get("seasonYear"); seasonYear != "" {
		filtros.SeasonYear, _ = strconv.Atoi(seasonYear)
	}
	if tags := r.URL.Query().Get("tags"); tags != "" {
		filtros.Tags = strings.Split(tags, ",")
	}
	if genres := r.URL.Query().Get("genres"); genres != "" {
		filtros.Genres = strings.Split(genres, ",")
	}

	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage, filtros)
	if err != nil {
		http.Error(w, "Erro ao buscar na AniList", http.StatusInternalServerError)
		return
	}

	// Injeta a Curadoria no Ranking (Capa e Título)
	if resultados != nil {
		resultados.Data = ApplyCurationToAnimeList(resultados.Data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

func (h *AnimeHandler) HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	resultados, err := h.AniListClient.GetAnimeById(r.Context(), id)
	if err != nil {
		http.Error(w, "Erro ao buscar na AniList", http.StatusInternalServerError)
		return
	}

	if rank, bScore, ok := GetAniDeckStats(resultados.Data.MalID); ok {
		resultados.Data.Ranking = rank         // Substitui pelo rank do AniDeck!
		resultados.Data.BayesianScore = bScore // Injeta a nossa nota
		resultados.Data.Score = bScore         // Força a nota principal a ser a nossa (Consistência Global)
	} else {
		// Se não estiver no nosso Top 1000, não mostramos troféu falso da AniList
		resultados.Data.Ranking = 0
	}

	dbClient := database.Client
	if dbClient != nil {
		data, _, errCurado := dbClient.From("curated_animes").Select("*", "exact", false).Eq("mal_id", id).Execute()
		var curados []models.CuratedAnime
		if errCurado == nil {
			json.Unmarshal(data, &curados)
		}

		if errCurado == nil && len(curados) > 0 {
			curado := curados[0]

			if curado.CustomTitle != "" {
				resultados.Data.Title = curado.CustomTitle
			}
			if curado.CustomSynopsis != "" {
				resultados.Data.Synopsis = curado.CustomSynopsis
			}
			if curado.CustomStatus != "" {
				resultados.Data.Status = curado.CustomStatus
			}
			if curado.CustomTags != nil {
				var novasTags []struct {
					Name string `json:"name"`
				}
				for _, tag := range curado.CustomTags {
					novasTags = append(novasTags, struct {
						Name string `json:"name"`
					}{Name: tag})
				}
				resultados.Data.Genres = novasTags
			}
			if curado.CustomCoverImage != "" {
				resultados.Data.Images.JPG.ImageURL = curado.CustomCoverImage
			}
			if curado.CustomBannerImage != "" {
				resultados.Data.BannerImage = curado.CustomBannerImage
			}
			if len(curado.CustomCharacters) > 0 && string(curado.CustomCharacters) != "null" {
				var chars []anilist.Character
				if err := json.Unmarshal(curado.CustomCharacters, &chars); err == nil {
					resultados.Data.Characters = chars
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

func (h *AnimeHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	stats, err := h.AniListClient.GetAnimeStatistics(r.Context(), id)
	if err != nil {
		http.Error(w, "Erro ao buscar estatísticas na AniList", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *AnimeHandler) HandleGetAnimesByIDs(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	resultados, err := h.AniListClient.GetAnimesByMalIDs(r.Context(), payload.IDs)
	if err != nil {
		http.Error(w, "Erro ao buscar na AniList", http.StatusInternalServerError)
		return
	}

	// Injeta a Curadoria (Capa e Título)
	if resultados != nil {
		resultados.Data = ApplyCurationToAnimeList(resultados.Data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}
