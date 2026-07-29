// internal/handlers/search.go (substituir arquivo)
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

type SearchHandler struct {
	AniListClient *anilist.Client
}

func filterByStreaming(animes []anilist.Anime, streamingFilter string) []anilist.Anime {
	streamingFilter = strings.TrimSpace(streamingFilter)
	if streamingFilter == "" {
		return animes
	}

	var filtrados []anilist.Anime
	for _, anime := range animes {
		for _, stream := range anime.Streaming {
			if strings.EqualFold(stream.Name, streamingFilter) {
				filtrados = append(filtrados, anime)
				break
			}
		}
	}
	return filtrados
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	genres := r.URL.Query()["genre"]
	streamingFilter := r.URL.Query().Get("streaming")

	if query == "" && len(genres) == 0 {
		http.Error(w, "É necessário informar um termo de busca ou gênero", http.StatusBadRequest)
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

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, genres)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	resultados.Data = filterByStreaming(resultados.Data, streamingFilter)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleSearch: falha ao serializar resposta: %v", err)
	}
}