package handlers

import (
	"cmp"
	"encoding/json"
	"log"
	"net/http"
	"slices"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/microcosm-cc/bluemonday"
)

// Inicia o higienizador para evitar ataques XSS nos textos de curadoria
var sanitizer = bluemonday.StrictPolicy()

type CurationHandler struct{}

func (h *CurationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	var resultado []models.CuratedAnime

	data, _, err := database.Client.From("curated_animes").
		Select("*", "exact", false).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleList Curation: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	slices.SortFunc(resultado, func(a, b models.CuratedAnime) int {
		return cmp.Compare(a.OrderIndex, b.OrderIndex)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	// Os campos JSONB precisam de validação própria: o Postgres aceita qualquer JSON bem
	// formado, inclusive episódio repetido ou link com esquema perigoso.
	if err := SanitizarCuradoria(&entrada); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").Insert(entrada, false, "", "representation", "exact").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Curation: %v", err)
		http.Error(w, "Erro ao salvar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	// Os campos JSONB precisam de validação própria: o Postgres aceita qualquer JSON bem
	// formado, inclusive episódio repetido ou link com esquema perigoso.
	if err := SanitizarCuradoria(&entrada); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").
		Update(entrada, "representation", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("curated_animes").
		Delete("", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover destaque", http.StatusInternalServerError)
		return
	}

	InvalidateRankingCache()

	w.WriteHeader(http.StatusNoContent)
}
