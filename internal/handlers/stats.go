// Consultar as views de forma segura usando o token do usuário
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type StatsHandler struct{}

func (h *StatsHandler) HandleGetUserStats(w http.ResponseWriter, r *http.Request) {
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

	// 1. Busca os dados gerais
	var statsData []map[string]interface{}
	data, _, err := dbClient.From("view_user_stats").Select("*", "exact", false).Execute()
	if err == nil {
		_ = json.Unmarshal(data, &statsData)
	} else {
		log.Printf("[ERRO DB] HandleGetUserStats (stats): %v", err)
	}

	// 2. Busca a afinidade de gêneros
	var genresData []map[string]interface{}
	dataGenres, _, errGenres := dbClient.From("view_user_genre_affinity").Select("*", "exact", false).Execute()
	if errGenres == nil {
		_ = json.Unmarshal(dataGenres, &genresData)
	} else {
		log.Printf("[ERRO DB] HandleGetUserStats (genres): %v", errGenres)
	}

	// 3. Monta a resposta unificada
	response := map[string]interface{}{
		"overview": statsData,
		"genres":   genresData,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}