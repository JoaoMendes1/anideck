package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

type SearchHandler struct {
	AniListClient *anilist.Client
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "O parâmetro 'q' é obrigatório para a busca", http.StatusBadRequest)
		return
	}

	// Portão do mock — só ativo se MOCK_ANILIST=true no ambiente de desenvolvimento
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

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query)
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