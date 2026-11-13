package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type PrevisoesHandler struct{}

type ApostarPrevisaoRequest struct {
	OpcaoID int `json:"opcao_id"`
	Mana    int `json:"mana"`
}

type ResolverPrevisaoRequest struct {
	OpcaoVencedora int `json:"opcao_vencedora"`
}

type EscolherClasseRequest struct {
	Classe string `json:"classe"`
}

type EquiparTituloRequest struct {
	Titulo string `json:"titulo"`
}

// HandleListarPrevisoes retorna a lista de previsões com status do usuário logado (se houver).
func (h *PrevisoesHandler) HandleListarPrevisoes(w http.ResponseWriter, r *http.Request) {
	client := database.Client
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if ok && token != "" {
		if authedClient, err := database.ClientWithToken(token); err == nil && authedClient != nil {
			client = authedClient
		}
	}

	if client == nil {
		http.Error(w, "Banco indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Se o admin desativou as previsões, devolve lista vazia para ocultar da interface
	regras := lerRegrasComunidade(client)
	if !regras.PrevisoesAtivas {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	raw := strings.TrimSpace(client.Rpc("listar_previsoes_ativas", "", nil))
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		// Fallback com client anônimo
		if client != database.Client && database.Client != nil {
			fallbackRaw := strings.TrimSpace(database.Client.Rpc("listar_previsoes_ativas", "", nil))
			if fallbackRaw != "" && !strings.Contains(fallbackRaw, "\"code\"") {
				raw = fallbackRaw
			}
		}
	}

	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[PREVISOES] Erro ao listar previsões: %s", raw)
		http.Error(w, "Erro ao listar previsões.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleApostarPrevisao registra o voto/aposta de Mana do usuário autenticado.
func (h *PrevisoesHandler) HandleApostarPrevisao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao autenticar no banco.", http.StatusInternalServerError)
		return
	}

	regras := lerRegrasComunidade(client)
	if !regras.PrevisoesAtivas {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":   false,
			"erro": "As previsões com Mana estão temporariamente desativadas pela administração.",
		})
		return
	}

	previsaoID := strings.TrimSpace(chi.URLParam(r, "id"))
	if previsaoID == "" {
		http.Error(w, "ID da previsão obrigatório.", http.StatusBadRequest)
		return
	}

	var req ApostarPrevisaoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	if req.Mana < 5 || req.Mana > 25 {
		http.Error(w, "A Mana apostada deve ser entre 5 e 25 MP.", http.StatusBadRequest)
		return
	}

	params := map[string]interface{}{
		"p_previsao_id": previsaoID,
		"p_opcao_id":    req.OpcaoID,
		"p_mana":        req.Mana,
	}

	raw := strings.TrimSpace(client.Rpc("apostar_previsao", "", params))
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[PREVISOES] Erro ao apostar: %s", raw)
		http.Error(w, "Erro ao processar aposta de Mana.", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleAdminResolverPrevisao encerra e distribui recompensas para quem acertou.
func (h *PrevisoesHandler) HandleAdminResolverPrevisao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao autenticar no banco.", http.StatusInternalServerError)
		return
	}

	previsaoID := strings.TrimSpace(chi.URLParam(r, "id"))
	if previsaoID == "" {
		http.Error(w, "ID da previsão obrigatório.", http.StatusBadRequest)
		return
	}

	var req ResolverPrevisaoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	params := map[string]interface{}{
		"p_previsao_id":      previsaoID,
		"p_opcao_vencedora": req.OpcaoVencedora,
	}

	raw := strings.TrimSpace(client.Rpc("resolver_previsao", "", params))
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[PREVISOES] Erro ao resolver previsão: %s", raw)
		http.Error(w, "Erro ao resolver previsão.", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleEscolherClasse salva a classe (bardo, ranger ou paladino) no perfil do usuário autenticado.
func (h *PrevisoesHandler) HandleEscolherClasse(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao autenticar no banco.", http.StatusInternalServerError)
		return
	}

	var req EscolherClasseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	classeLimpa := strings.ToLower(strings.TrimSpace(req.Classe))
	if classeLimpa != "bardo" && classeLimpa != "ranger" && classeLimpa != "paladino" {
		http.Error(w, "Classe inválida. Escolha entre bardo, ranger ou paladino.", http.StatusBadRequest)
		return
	}

	params := map[string]interface{}{
		"p_classe": classeLimpa,
	}

	raw := strings.TrimSpace(client.Rpc("escolher_classe", "", params))
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[CLASSES] Erro ao escolher classe: %s", raw)
		http.Error(w, "Erro ao salvar classe.", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleEquiparTitulo ativa o título selecionado no perfil do usuário autenticado.
func (h *PrevisoesHandler) HandleEquiparTitulo(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao autenticar no banco.", http.StatusInternalServerError)
		return
	}

	var req EquiparTituloRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	tituloLimpo := strings.TrimSpace(req.Titulo)
	if tituloLimpo == "" {
		http.Error(w, "Título obrigatório.", http.StatusBadRequest)
		return
	}

	params := map[string]interface{}{
		"p_titulo": tituloLimpo,
	}

	raw := strings.TrimSpace(client.Rpc("equipar_titulo", "", params))
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[TITULOS] Erro ao equipar título: %s", raw)
		http.Error(w, "Erro ao equipar título.", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}
