package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"cmp"
	"slices"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
)

// CurationHandler agrupa as funções que lidam com a nossa curadoria (Destaques).
type CurationHandler struct{}

// HandleList (Ler) - Traz todos os animes que você curou, ordenados pelo OrderIndex.
func (h *CurationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	var resultado []models.CuratedAnime
    
	err := database.Client.DB.From("curated_animes").
		Select("*").
		Execute(&resultado)

	if err != nil {
		log.Printf("[ERRO DB] HandleList Curation: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}

	// 2. Ordenamos a lista usando o pacote mais moderno e performático do Go (slices)
	slices.SortFunc(resultado, func(a, b models.CuratedAnime) int {
		// O cmp.Compare retorna:
		// -1 se o 'a' for menor que o 'b' (coloca o 'a' na frente)
		//  0 se forem iguais
		// +1 se o 'a' for maior que o 'b' (coloca o 'b' na frente)
		return cmp.Compare(a.OrderIndex, b.OrderIndex)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleCreate (Criar) - Recebe um anime do painel admin e salva no banco.
func (h *CurationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	// Aproveitamos o "sanitizer" que já existe no seu arquivo entries.go
	// para limpar qualquer código malicioso (XSS) que possa vir no texto da sinopse.
	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	var resultado []models.CuratedAnime
	err := database.Client.DB.From("curated_animes").Insert(entrada).Execute(&resultado)
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Curation: %v", err)
		http.Error(w, "Erro ao salvar destaque", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleUpdate (Atualizar) - Edita um anime que já está na curadoria.
func (h *CurationHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
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

	var resultado []models.CuratedAnime
	err := database.Client.DB.From("curated_animes").
		Update(entrada).
		Eq("id", id).
		Execute(&resultado)

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleDelete (Deletar) - Remove um anime da tabela de destaques.
func (h *CurationHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	err := database.Client.DB.From("curated_animes").
		Delete().
		Eq("id", id).
		Execute(nil)

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover destaque", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent) // Responde 204 (Sucesso, sem conteúdo para retornar)
}