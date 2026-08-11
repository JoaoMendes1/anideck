package handlers

import (
	"encoding/json"
	"log"
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
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
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

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").Insert(entrada, false, "", "representation", "exact").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate: %v", err)
		http.Error(w, "Erro ao salvar entrada", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleCreate: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").
		Select("*", "exact", false).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleList: %v", err)
		http.Error(w, "Erro ao buscar lista", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleList: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID da entrada é obrigatório", http.StatusBadRequest)
		return
	}
	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido!", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID
	entrada.Anotacao = sanitizer.Sanitize(entrada.Anotacao)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var resultado []entries.MediaEntry
	data, _, err := dbClient.From("media_entries").
		Update(entrada, "representation", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar entrada", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultado); err != nil {
		log.Printf("[ERRO] HandleUpdate: falha ao serializar resposta: %v", err)
	}
}

func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID da entrada é obrigatório", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("media_entries").
		Delete("", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover entrada", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}