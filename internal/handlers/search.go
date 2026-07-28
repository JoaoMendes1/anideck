package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/JoaoMendes1/anideck/internal/jikan"
)

type SearchHandler struct {
	JikanClient *jikan.Client
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "O parâmetro 'q' é obrigatório para a busca", http.StatusBadRequest)
		return
	}

	// 1. O PORTÃO DO MOCK (Plan A)
	if os.Getenv("MOCK_JIKAN") == "true" {
		log.Println("[MOCK] Variável MOCK_JIKAN ativada. Retornando dados falsos para busca...")
		resultados := &jikan.AnimeSearchResponse{
			Data: []jikan.Anime{
				{MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Finished Airing"},
				{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
				{MalID: 31964, Title: "Boku no Hero Academia (Mock)", Status: "Finished Airing"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resultados)
		return // Bloqueia a continuação!
	}

	// 2. PRODUÇÃO (Internet Real)
	resultados, err := h.JikanClient.SearchAnime(r.Context(), query)
	if err != nil {
		log.Printf("[ERRO JIKAN] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultados)
}