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

var sanitizer = bluemonday.StrictPolicy()

type EntriesHandler struct{}

func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID
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

func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

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

func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido!", http.StatusBadRequest)
		return
	}

	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	var resultado []entries.MediaEntry
	err := database.Client.DB.From("media_entries").
		Update(entrada).
		Eq("id", id).
		Eq("user_id", userID).
		Execute(&resultado)

	if err != nil {
		http.Error(w, "Error ao atualizar entrada", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

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