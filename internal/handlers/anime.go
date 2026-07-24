package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

	"github.com/JoaoMendes1/anideck/internal/jikan"
)

type AnimeHandler struct {
	JikanClient *jikan.Client
}

// HandleGetAnime busca os dados completos de um único anime
func (h *AnimeHandler) HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.JikanClient.GetAnimeById(r.Context(), id)

	if err != nil {
		log.Printf("[ERRO JIKAN] Falha ao buscar detalhes do anime %s: %v", id, err)

		if os.Getenv("MOCK_JIKAN") == "true" {
			log.Println("[MOCK] Retornando detalhes ricos falsos para desenvolvimento do Frontend...")
			resultados = &jikan.AnimeByIdResponse{
				Data: jikan.Anime{
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
		} else {
			http.Error(w, "Detalhes indisponíveis no momento", http.StatusServiceUnavailable)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}

// Busca a distribuição de notas para o nosso histograma
func (h *AnimeHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do anime é obrigatório", http.StatusBadRequest)
		return
	}

	resultados, err := h.JikanClient.GetAnimeStatistics(r.Context(), id)

	if err != nil {
		log.Printf("[ERRO JIKAN] Falha ao buscar estatísticas do anime %s: %v", id, err)

		if os.Getenv("MOCK_JIKAN") == "true" {
			log.Println("[MOCK] Retornando estatísticas falsas para desenvolvimento...")
			resultados = &jikan.AnimeStatisticsResponse{
				Data: jikan.AnimeStatistics{
					Scores: []jikan.ScoreDistribution{
						{Score: 10, Votes: 5000, Percentage: 50.0},
						{Score: 9, Votes: 3000, Percentage: 30.0},
						{Score: 8, Votes: 1000, Percentage: 10.0},
					},
				},
			}
		} else {
			http.Error(w, "Estatísticas indisponíveis no momento", http.StatusServiceUnavailable)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}
