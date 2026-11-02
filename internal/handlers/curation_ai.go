package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/ia"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

var (
	aiPromptCache string
	aiPromptMutex sync.RWMutex
)

type AIRewriteRequest struct {
	Title    string `json:"title"`
	Synopsis string `json:"synopsis"`
}

func (h *CurationHandler) HandleGetAIPrompt(w http.ResponseWriter, r *http.Request) {
	aiPromptMutex.RLock()
	currentPrompt := aiPromptCache
	aiPromptMutex.RUnlock()

	if currentPrompt == "" {
		token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
		if !tokenOk {
			http.Error(w, "Não autenticado", http.StatusUnauthorized)
			return
		}

		dbClient, errClient := database.ClientWithToken(token)
		if errClient != nil {
			http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
			return
		}

		var results []map[string]interface{}
		data, _, err := dbClient.From("app_settings").Select("value", "exact", false).Eq("key", "ai_curation_prompt").Execute()

		if err == nil {
			_ = json.Unmarshal(data, &results)
			if len(results) > 0 {
				currentPrompt = results[0]["value"].(string)
				aiPromptMutex.Lock()
				aiPromptCache = currentPrompt
				aiPromptMutex.Unlock()
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"prompt": currentPrompt})
}

func (h *CurationHandler) HandleUpdateAIPrompt(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Prompt == "" {
		http.Error(w, "Prompt inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	updateData := map[string]string{"value": req.Prompt}
	_, _, err := dbClient.From("app_settings").Update(updateData, "representation", "exact").Eq("key", "ai_curation_prompt").Execute()

	if err != nil {
		log.Printf("[ERRO SUPABASE] Falha ao atualizar prompt: %v", err)
		http.Error(w, "Erro ao salvar no banco", http.StatusInternalServerError)
		return
	}

	aiPromptMutex.Lock()
	aiPromptCache = req.Prompt
	aiPromptMutex.Unlock()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Instrução da IA atualizada com sucesso"}`))
}

func (h *CurationHandler) HandleAIRewrite(w http.ResponseWriter, r *http.Request) {
	var req AIRewriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	if req.Synopsis == "" {
		http.Error(w, "Sinopse original não fornecida", http.StatusBadRequest)
		return
	}

	aiPromptMutex.RLock()
	systemInstructionText := aiPromptCache
	aiPromptMutex.RUnlock()

	// Popula a RAM no primeiro uso se o painel de configurações ainda não tiver sido aberto
	if systemInstructionText == "" {
		if token, tokenOk := r.Context().Value(middleware.TokenKey).(string); tokenOk {
			if dbClient, errClient := database.ClientWithToken(token); errClient == nil {
				if data, _, err := dbClient.From("app_settings").Select("value", "exact", false).Eq("key", "ai_curation_prompt").Execute(); err == nil {
					var results []map[string]interface{}
					_ = json.Unmarshal(data, &results)
					if len(results) > 0 {
						systemInstructionText = results[0]["value"].(string)
						aiPromptMutex.Lock()
						aiPromptCache = systemInstructionText
						aiPromptMutex.Unlock()
					}
				}
			}
		}
	}

	// Fallback caso o banco de dados falhe
	if systemInstructionText == "" {
		systemInstructionText = ia.PromptCuradoriaPadrao
	}

	prompt := fmt.Sprintf("Título do anime: %s\nSinopse original técnica: %s", req.Title, req.Synopsis)

	// A chamada e o fallback de modelos estão no pacote ia, compartilhado com o worker
	// da fila de curadoria.
	aiResponse, apiErr := ia.GerarCuradoria(r.Context(), systemInstructionText, prompt)
	if apiErr != nil {
		log.Printf("[ERRO AI] Groq e Gemini falharam: %v", apiErr)
		http.Error(w, "Serviço de IA congestionado no momento. Tente novamente em alguns segundos.", http.StatusServiceUnavailable)
		return
	}
	if aiResponse == "" {
		http.Error(w, "IA retornou vazio", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(aiResponse))
}
