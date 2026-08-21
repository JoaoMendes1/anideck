package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"google.golang.org/genai"
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

	// Fallback hardcoded caso o banco de dados falhe
	if systemInstructionText == "" {
		systemInstructionText = "Você é o redator-chefe do catálogo AniDeck. Seu tom de voz é instigante, moderno e direto ao ponto. Sua função é ler sinopses frias e técnicas (que podem estar em inglês), traduzi-las e reescrevê-las transformando-as em resumos empolgantes de no máximo 2 parágrafos, sem spoilers, estritamente em Português do Brasil (pt-BR). Utilize formatação Markdown para enriquecer a leitura: destaque nomes de personagens, lugares ou facções em **negrito** e use *itálico* para termos estrangeiros ou de impacto. Você também deve sugerir até 4 tags genéricas em português (ex: Ação, Drama, Cyberpunk). Retorne APENAS um objeto JSON estrito com as chaves 'sinopse' e 'tags'."
	}

	ctx := context.Background()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  os.Getenv("GEMINI_API_KEY"),
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		log.Printf("[ERRO AI] Falha ao criar cliente Gemini: %v", err)
		http.Error(w, "Erro interno de IA", http.StatusInternalServerError)
		return
	}

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{
				Text: systemInstructionText,
			}},
		},
		ResponseMIMEType: "application/json",
	}

	prompt := fmt.Sprintf("Título do anime: %s\nSinopse original técnica: %s", req.Title, req.Synopsis)

	modelsToTry := []string{"gemini-3.7-flash", "gemini-3.6-flash"}
	var resp *genai.GenerateContentResponse
	var apiErr error

	for _, modelName := range modelsToTry {
		resp, apiErr = client.Models.GenerateContent(ctx, modelName, genai.Text(prompt), config)
		if apiErr == nil {
			log.Printf("[INFO AI] Sucesso utilizando o modelo: %s", modelName)
			break
		}
		log.Printf("[WARN AI] Falha no modelo %s: %v. Tentando fallback...", modelName, apiErr)
	}

	if apiErr != nil {
		log.Printf("[ERRO AI] Todos os modelos falharam. Último erro: %v", apiErr)
		http.Error(w, "Serviço de IA congestionado no momento. Tente novamente em alguns segundos.", http.StatusServiceUnavailable)
		return
	}

	var aiResponse string
	if resp != nil && len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		aiResponse = resp.Candidates[0].Content.Parts[0].Text
	}

	if aiResponse == "" {
		http.Error(w, "IA retornou vazio", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(aiResponse))
}
