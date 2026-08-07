package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

type AnimeHandler struct {
	AniListClient *anilist.Client
}

func (h *AnimeHandler) HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Retornando detalhes ricos falsos para desenvolvimento...")
		resultados := &anilist.AnimeByIdResponse{
			Data: anilist.Anime{
				MalID:    20,
				Title:    "Naruto (Mock Detail)",
				Status:   "Finished Airing",
				Synopsis: "Sinopse falsa gerada localmente. O Ninja Loiro faz coisas de ninja.",
				Score:    8.5,
				Episodes: 199,
				Studios: []struct {
					Name string `json:"name"`
				}{{Name: "Studio Pierrot"}},
				Streaming: []struct {
					Name string `json:"name"`
					URL  string `json:"url"`
				}{
					{Name: "Crunchyroll", URL: "https://crunchyroll.com/"},
					{Name: "Netflix", URL: "https://netflix.com/"},
				},
				Theme: struct {
					Openings []string `json:"openings"`
					Endings  []string `json:"endings"`
				}{
					Openings: []string{"\"Rocks\" by Hound Dog"},
					Endings:  []string{"\"Wind\" by Akeboshi"},
				},
				Relations: []struct {
					Relation string `json:"relation"`
					Entry    []struct {
						MalID int    `json:"mal_id"`
						Type  string `json:"type"`
						Name  string `json:"name"`
					} `json:"entry"`
				}{
					{
						Relation: "Sequel",
						Entry: []struct {
							MalID int    `json:"mal_id"`
							Type  string `json:"type"`
							Name  string `json:"name"`
						}{{MalID: 1735, Type: "anime", Name: "Naruto: Shippuuden"}},
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resultados); err != nil {
			log.Printf("[ERRO] HandleGetAnime mock: falha ao serializar: %v", err)
		}
		return
	}

	resultados, err := h.AniListClient.GetAnimeById(r.Context(), id)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar detalhes do anime %s: %v", id, err)
		http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	errCurado := database.Client.DB.From("curated_animes").Select("*").Eq("mal_id", id).Execute(&curados)

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

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Retornando estatísticas falsas para desenvolvimento...")
		resultados := &anilist.AnimeStatisticsResponse{
			Data: anilist.AnimeStatistics{
				Scores: []anilist.ScoreDistribution{
					{Score: 10, Votes: 5000, Percentage: 50.0},
					{Score: 9, Votes: 3000, Percentage: 30.0},
					{Score: 8, Votes: 1000, Percentage: 10.0},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resultados); err != nil {
			log.Printf("[ERRO] HandleGetStatistics mock: falha ao serializar: %v", err)
		}
		return
	}

	resultados, err := h.AniListClient.GetAnimeStatistics(r.Context(), id)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar estatísticas do anime %s: %v", id, err)
		http.Error(w, "Estatísticas indisponíveis no momento", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetStatistics: falha ao serializar resposta: %v", err)
	}
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

	// ✨ MUDOU AQUI: Aplicando a sua Curadoria (Override) diretamente no Backend!
	var curados []models.CuratedAnime
	errCurado := database.Client.DB.From("curated_animes").Select("*").Execute(&curados)
	
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
					// O Deck pega a [0], então a primeira tag cadastrada será a categoria principal
					for _, tag := range curado.CustomTags {
						novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
					}
					resultados.Data[i].Genres = novasTags
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetAnimesByIDs: falha ao serializar resposta: %v", err)
	}
}