package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

type AnimeHandler struct {
	AniListClient anilist.Service
}

func (h *AnimeHandler) HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.AniListClient.GetAnimeById(r.Context(), id)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar detalhes do anime %s: %v", id, err)
		http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Eq("mal_id", id).Execute()

	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
	}

	if errCurado == nil && len(curados) > 0 {
		curado := curados[0]

		resultados.Data.Title = curado.CustomTitle
		if curado.CustomSynopsis != "" {
			resultados.Data.Synopsis = curado.CustomSynopsis
		}
		if curado.CustomStatus != "" {
			resultados.Data.Status = curado.CustomStatus
		}
		if len(curado.CustomTags) > 0 {
			var novasTags []struct{ Name string `json:"name"` }
			for _, tag := range curado.CustomTags {
				novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
			}
			resultados.Data.Genres = novasTags
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetAnime: falha ao serializar resposta: %v", err)
	}
}

func (h *AnimeHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.AniListClient.GetAnimeStatistics(r.Context(), id)
	if err != nil {
		http.Error(w, "Estatísticas indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

func (h *AnimeHandler) HandleGetAnimesByIDs(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		IDs []int `json:"ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	if len(payload.IDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": []interface{}{}})
		return
	}

	resultados, err := h.AniListClient.GetAnimesByMalIDs(r.Context(), payload.IDs)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar animes em lote: %v", err)
		http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
	
	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
	}
	
	if errCurado == nil && len(curados) > 0 {
		mapaCuradoria := make(map[int]models.CuratedAnime)
		for _, c := range curados {
			mapaCuradoria[c.MalID] = c
		}

		for i, anime := range resultados.Data {
			if curado, ok := mapaCuradoria[anime.MalID]; ok {
				resultados.Data[i].Title = curado.CustomTitle
				if curado.CustomStatus != "" {
					resultados.Data[i].Status = curado.CustomStatus
				}
				if len(curado.CustomTags) > 0 {
					var novasTags []struct{ Name string `json:"name"` }
					for _, tag := range curado.CustomTags {
						novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
					}
					resultados.Data[i].Genres = novasTags
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}