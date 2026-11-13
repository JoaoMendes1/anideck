package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// WrappedHandler gerencia o AniDeck Wrapped (Fase 17.5a, #190): retrospectiva anual em histórias.
type WrappedHandler struct{}

func NewWrappedHandler() *WrappedHandler {
	return &WrappedHandler{}
}

// HandleGetMeuWrapped devolve a retrospectiva do usuário logado para o ano especificado.
func (h *WrappedHandler) HandleGetMeuWrapped(w http.ResponseWriter, r *http.Request) {
	anoStr := chi.URLParam(r, "ano")
	ano, err := strconv.Atoi(anoStr)
	anoAtual := time.Now().Year()
	if err != nil || ano < 2000 || ano > anoAtual+1 {
		http.Error(w, "Ano inválido.", http.StatusBadRequest)
		return
	}

	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autenticado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	// Executa a RPC anideck_wrapped agregada no Postgres
	raw := client.Rpc("anideck_wrapped", "", map[string]interface{}{
		"p_ano": ano,
	})

	if raw == "" || (len(raw) > 10 && raw[:1] != "{" && raw[:1] != "[") {
		log.Printf("[WRAPPED] Erro ao carregar wrapped (ano=%d): %s", ano, raw)
		http.Error(w, "Não foi possível carregar a retrospectiva.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleGetWrappedPublico devolve a retrospectiva pública de um membro pelo seu @handle.
func (h *WrappedHandler) HandleGetWrappedPublico(w http.ResponseWriter, r *http.Request) {
	handle := chi.URLParam(r, "handle")
	anoStr := chi.URLParam(r, "ano")
	ano, err := strconv.Atoi(anoStr)
	anoAtual := time.Now().Year()
	if err != nil || ano < 2000 || ano > anoAtual+1 || handle == "" {
		http.Error(w, "Requisição inválida.", http.StatusBadRequest)
		return
	}

	client := database.Client
	if client == nil {
		http.Error(w, "Banco indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Busca o perfil público pelo handle
	var perfis []struct {
		UserID  string `json:"user_id"`
		Publico bool   `json:"publico"`
	}

	dataPerfil, _, err := client.From("profiles").
		Select("user_id,publico", "", false).
		Eq("handle", handle).
		Limit(1, "").
		Execute()

	if err != nil || json.Unmarshal(dataPerfil, &perfis) != nil || len(perfis) == 0 || !perfis[0].Publico {
		// Recurso não público ou inexistente responde 404 (regra do AGENTS.md)
		http.Error(w, "Perfil não encontrado ou retrospectiva privada.", http.StatusNotFound)
		return
	}

	raw := client.Rpc("anideck_wrapped", "", map[string]interface{}{
		"p_ano":     ano,
		"p_user_id": perfis[0].UserID,
	})

	if raw == "" || (len(raw) > 10 && raw[:1] != "{" && raw[:1] != "[") {
		log.Printf("[WRAPPED PUBLICO] Erro ao carregar wrapped (handle=%s, ano=%d): %s", handle, ano, raw)
		http.Error(w, "Não foi possível carregar a retrospectiva.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}
