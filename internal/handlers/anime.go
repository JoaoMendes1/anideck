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
		// FALLBACK (BLOCO 3): Tenta recuperar do cache local e curadoria
		malID, _ := strconv.Atoi(id)
		dbClient := database.Client
		
		if dbClient == nil {
			http.Error(w, "Catálogo indisponível no momento.", http.StatusServiceUnavailable)
			return
		}

		dataCache, _, errM := dbClient.From("anime_metadata_cache").Select("*", "exact", false).Eq("mal_id", id).Execute()
		var cached []map[string]interface{}
		if errM == nil { json.Unmarshal(dataCache, &cached) }

		dataCurado, _, errC := dbClient.From("curated_animes").Select("*", "exact", false).Eq("mal_id", id).Execute()
		var curados []models.CuratedAnime
		if errC == nil { json.Unmarshal(dataCurado, &curados) }

		// Se não tem no cache nem na curadoria, aí sim dá erro
		if len(cached) == 0 && len(curados) == 0 {
			http.Error(w, "Catálogo indisponível", http.StatusServiceUnavailable)
			return
		}

		// Reconstrói o anime usando os dados salvos localmente
		animeFallback := anilist.Anime{MalID: malID}
		if len(cached) > 0 {
			c := cached[0]
			if title, ok := c["title"].(string); ok { animeFallback.Title = title }
			if epFloat, ok := c["episodes"].(float64); ok { animeFallback.Episodes = int(epFloat) }
			if score, ok := c["average_score"].(float64); ok { animeFallback.Score = score }
		}

		resultados = &anilist.AnimeByIdResponse{Data: animeFallback}
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
			AplicarCuradoria(&resultados.Data, curado)

			// O elenco customizado fica fora de AplicarCuradoria de propósito: é o único
			// campo exclusivo da tela de detalhe (as listas nem pedem personagens à AniList)
			// e o único guardado como JSON cru, que precisa ser decodificado antes de usar.
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
		http.Error(w, "Estatísticas indisponíveis no momento", http.StatusServiceUnavailable)
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
	if err != nil || resultados == nil || (len(resultados.Data) == 0 && len(payload.IDs) > 0) {
		// FALLBACK (BLOCO 3): Monta o array base usando o cache local para o Deck não quebrar
		resultados = &anilist.AnimeSearchResponse{Data: []anilist.Anime{}}
		dbClient := database.Client
		if dbClient != nil {
			dataCache, _, _ := dbClient.From("anime_metadata_cache").Select("*", "exact", false).Execute()
			var cached []map[string]interface{}
			json.Unmarshal(dataCache, &cached)
			
			cacheMap := make(map[int]map[string]interface{})
			for _, c := range cached {
				if m, ok := c["mal_id"].(float64); ok { cacheMap[int(m)] = c }
			}

			// Para cada ID que a tela pediu, criamos um "esqueleto" que a Curadoria vai preencher
			for _, id := range payload.IDs {
				anime := anilist.Anime{MalID: id}
				if c, ok := cacheMap[id]; ok {
					if t, ok := c["title"].(string); ok { anime.Title = t }
					if e, ok := c["episodes"].(float64); ok { anime.Episodes = int(e) }
					if s, ok := c["average_score"].(float64); ok { anime.Score = s }
					if st, ok := c["status"].(string); ok { anime.Status = st }
				}
				resultados.Data = append(resultados.Data, anime)
			}
		}
	}

	// Injeta a Curadoria (Capa e Título)
	if resultados != nil {
		resultados.Data = ApplyCurationToAnimeList(resultados.Data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}
