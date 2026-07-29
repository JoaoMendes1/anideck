package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

// RankingHandler lida com requisições relacionadas a rankings de animes.
type RankingHandler struct {
	AniListClient *anilist.Client
}

// HandleGetTopAnime busca e retorna os animes mais bem avaliados.
func (h *RankingHandler) HandleGetTopAnime(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1 // Página padrão
	}

	perPageStr := r.URL.Query().Get("perPage")
	perPage, err := strconv.Atoi(perPageStr)
	if err != nil || perPage < 1 || perPage > 50 { // AniList tem um limite de 50 por página
		perPage = 20 // Quantidade padrão por página
	}

	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar top animes: %v", err)
		http.Error(w, "Ranking indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetTopAnime: falha ao serializar resposta: %v", err)
	}
}
