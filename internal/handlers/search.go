// internal/handlers/search.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

type SearchHandler struct {
	AniListClient *anilist.Client
}

// HandleSearch processa buscas de anime por texto, gênero, tag, temporada, ano e/ou status.
// Requer ao menos um de: q (texto), genre ou tag — filtros de contexto não são uma fonte de dados.
func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	genres := r.URL.Query()["genre"]
	tags := r.URL.Query()["tag"]
	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))

	// seasonYear só é relevante quando season também está presente (regra da AniList)
	seasonYear := 0
	if season != "" {
		if y, err := strconv.Atoi(r.URL.Query().Get("year")); err == nil && y > 0 {
			seasonYear = y
		}
	}

	if query == "" && len(genres) == 0 && len(tags) == 0 && season == "" && status == "" {
		http.Error(w, "É necessário informar ao menos um critério de busca", http.StatusBadRequest)
		return
	}

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Variável MOCK_ANILIST ativada. Retornando dados falsos para busca...")
		resultados := &anilist.AnimeSearchResponse{
			Data: []anilist.Anime{
				{MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Finished Airing"},
				{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
				{MalID: 31964, Title: "Boku no Hero Academia (Mock)", Status: "Finished Airing"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resultados); err != nil {
			log.Printf("[ERRO] HandleSearch mock: falha ao serializar: %v", err)
		}
		return
	}

	filters := anilist.SearchFilters{
		Genres:     genres,
		Tags:       tags,
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
	}

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleSearch: falha ao serializar resposta: %v", err)
	}
}
