package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/microcosm-cc/bluemonday"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/entries"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

var sanitizer = bluemonday.StrictPolicy() // Remove qualquer tag HTML, guarda só o texto puro

type EntriesHandler struct {}

// HandleCreate salva uma nova entrada na lista pessoal do usuário autentiicado 
func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	// O user_id vem do middleware, JÁ VALIDADO - nunca do corpo da requisição 
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return 
	}

	entrada.UserID = userID //Sobrescreve qualquer coisa que viesse ddo cliente 
	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	var resultado []entries.MediaEntry 
	err := database.Client.DB.From("media_entries").Insert(entrada).Execute(&resultado)
	if err != nil {
		http.Error(w, "Erro ao salvar entrada", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleList retorno só entradas do usuário autenticado (RLS já protege, isso é reforço)
func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)

	var resultado []entries.MediaEntry
	err := database.Client.DB.From("media_entries"). 
	Select("*").
	Eq("user_id", userID). 
	Execute(&resultado)
	if err != nil {
		http.Error(w, "Erro ao buscar lista", http.StatusInternalServerError)
		return 
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleUpdate altera status/nota/anotação de uma entrada existente 
func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")


	var  entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido!", http.StatusBadRequest)
		return
	}
	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	var resultado []entries.MediaEntry
	err := database.Client.DB.From("media_entries"). 
	Update(entrada). 
	Eq("id", id). 
	Eq("user_id", userID). // Trava dupla: Só atualiza se for o dono 
	Execute(&resultado)
	if err != nil {
		http.Error(w, "Error ao atualizar entrada", http.StatusInternalServerError)
		return 
	} 

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleDelete remove uma entrada da lista pessoal 
func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")

	err := database.Client.DB.From("media_entries"). 
	Delete(). 
	Eq("id", id). 
	Eq("user_id", userID). 
	Execute(nil)
	if err != nil {
		http.Error(w, "Erro ao remover entrada", http.StatusInternalServerError)
		return 
	}

	w.WriteHeader(http.StatusNoContent)

}