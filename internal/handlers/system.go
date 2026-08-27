// Cria o endpoint que retorna o status da API AniList, incluindo o estado do kill switch e a saúde geral da API.
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type SystemHandler struct{}

func (h *SystemHandler) HandleGetSystemStatus(w http.ResponseWriter, r *http.Request) {
	anilist.StateMutex.RLock()
	offline := anilist.ForceOffline
	health := anilist.ApiHealth
	anilist.StateMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"force_offline": offline,
		"api_health":    health,
	})
}

func (h *SystemHandler) HandleToggleKillSwitch(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		ForceOffline bool `json:"force_offline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	// Altera imediatamente na RAM do Go para efeito instantâneo
	anilist.StateMutex.Lock()
	anilist.ForceOffline = req.ForceOffline
	anilist.StateMutex.Unlock()

	// Tenta persistir no Supabase (em background/silencioso para não travar a UI)
	dbClient, errClient := database.ClientWithToken(token)
	if errClient == nil {
		valStr := "false"
		if req.ForceOffline {
			valStr = "true"
		}
		updateData := map[string]string{"value": valStr}
		_, _, _ = dbClient.From("app_settings").Update(updateData, "representation", "exact").Eq("key", "anilist_force_offline").Execute()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Status alterado com sucesso",
		"force_offline": req.ForceOffline,
	})
}