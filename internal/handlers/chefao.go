package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type ChefaoHandler struct{}

type TopAtacanteChefao struct {
	UserID    string `json:"user_id"`
	Nome      string `json:"nome"`
	Handle    string `json:"handle"`
	AvatarURL string `json:"avatar_url,omitempty"`
	ClaTag    string `json:"cla_tag,omitempty"`
	Dano      int64  `json:"dano"`
}

type StatusChefaoResponse struct {
	Ativo              bool                `json:"ativo"`
	ID                 string              `json:"id,omitempty"`
	Temporada          string              `json:"temporada"`
	Nome               string              `json:"nome,omitempty"`
	Titulo             string              `json:"titulo,omitempty"`
	Descricao          string              `json:"descricao,omitempty"`
	ArteURL            string              `json:"arte_url,omitempty"`
	HPTotal            int64               `json:"hp_total,omitempty"`
	HPRestante         int64               `json:"hp_restante,omitempty"`
	DanoTotal          int64               `json:"dano_total,omitempty"`
	PorcentagemHP      float64             `json:"porcentagem_hp,omitempty"`
	Inicio             time.Time           `json:"inicio,omitempty"`
	Fim                time.Time           `json:"fim,omitempty"`
	Status             string              `json:"status,omitempty"` // 'ativo', 'derrotado', 'escapou'
	Derrotado          bool                `json:"derrotado,omitempty"`
	RecompensasPagas   bool                `json:"recompensas_pagas,omitempty"`
	RecompensaAniCoins int                 `json:"recompensa_anicoins,omitempty"`
	TituloRecompensa   string              `json:"titulo_recompensa,omitempty"`
	DanoMinimo         int                 `json:"dano_minimo,omitempty"`
	MeuDano            int64               `json:"meu_dano,omitempty"`
	ElegivelRecompensa bool                `json:"elegivel_recompensa,omitempty"`
	TopAtacantes       []TopAtacanteChefao `json:"top_atacantes,omitempty"`
}

type UpsertChefaoRequest struct {
	Temporada          string `json:"temporada"`
	Nome               string `json:"nome"`
	Titulo             string `json:"titulo"`
	Descricao          string `json:"descricao"`
	ArteURL            string `json:"arte_url"`
	HPTotal            int64  `json:"hp_total"`
	Inicio             string `json:"inicio"`
	Fim                string `json:"fim"`
	DanoMinimo         int    `json:"dano_minimo"`
	RecompensaAniCoins int    `json:"recompensa_anicoins"`
	TituloRecompensa   string `json:"titulo_recompensa"`
}

// HandleObterChefaoAtual devolve o status do chefão da temporada ativa ou informada via query ?temporada=...
func (h *ChefaoHandler) HandleObterChefaoAtual(w http.ResponseWriter, r *http.Request) {
	temporada := strings.TrimSpace(r.URL.Query().Get("temporada"))

	// Se houver usuário logado, utiliza client com o token dele para que a RPC calcule meu_dano via auth.uid()
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

	params := map[string]interface{}{"p_temporada": nil}
	if temporada != "" {
		params["p_temporada"] = temporada
	}

	raw := strings.TrimSpace(client.Rpc("obter_chefao_atual", "", params))
	// Fallback suave com database.Client se o client autenticado receber erro de permissão
	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		if client != database.Client && database.Client != nil {
			fallbackRaw := strings.TrimSpace(database.Client.Rpc("obter_chefao_atual", "", params))
			if fallbackRaw != "" && !strings.Contains(fallbackRaw, "\"code\"") && !strings.HasPrefix(fallbackRaw, "error") {
				raw = fallbackRaw
			}
		}
	}

	if raw == "" || strings.HasPrefix(raw, "error") || (strings.Contains(raw, "\"code\"") && strings.Contains(raw, "\"message\"")) {
		log.Printf("[CHEFAO] Erro ao obter chefão: %s", raw)
		http.Error(w, fmt.Sprintf("Erro ao consultar chefão da temporada: %s", raw), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleAdminCriarOuEditarChefao cadastra ou atualiza o chefão da temporada pelo Painel Admin.
func (h *ChefaoHandler) HandleAdminCriarOuEditarChefao(w http.ResponseWriter, r *http.Request) {
	var req UpsertChefaoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	req.Temporada = strings.TrimSpace(req.Temporada)
	req.Nome = strings.TrimSpace(req.Nome)
	if req.Temporada == "" || req.Nome == "" || req.HPTotal <= 0 {
		http.Error(w, "temporada, nome e hp_total válidos são obrigatórios.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	dados := map[string]interface{}{
		"temporada":              req.Temporada,
		"nome":                   req.Nome,
		"titulo":                 req.Titulo,
		"descricao":              req.Descricao,
		"arte_url":               req.ArteURL,
		"hp_total":               req.HPTotal,
		"inicio":                 req.Inicio,
		"fim":                    req.Fim,
		"dano_minimo_recompensa": req.DanoMinimo,
		"recompensa_anicoins":    req.RecompensaAniCoins,
		"titulo_recompensa":      req.TituloRecompensa,
	}

	data, _, err := client.From("chefoes").
		Insert(dados, true, "", "representation", "temporada").
		Single().
		Execute()
	if err != nil {
		log.Printf("[CHEFAO] Erro ao salvar chefão: %v", err)
		http.Error(w, fmt.Sprintf("Erro ao salvar chefão: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// HandleAdminPagarRecompensas aciona manualmente o pagamento de recompensas do chefão.
func (h *ChefaoHandler) HandleAdminPagarRecompensas(w http.ResponseWriter, r *http.Request) {
	chefaoID := chi.URLParam(r, "id")
	if chefaoID == "" {
		http.Error(w, "ID do chefão obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	raw := strings.TrimSpace(client.Rpc("pagar_recompensas_chefao", "", map[string]interface{}{
		"p_chefao_id": chefaoID,
	}))

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// executarFecharChefaoTemporada roda no worker para verificar se o chefão foi derrotado e pagar recompensas.
func executarFecharChefaoTemporada(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}

	// Busca chefão derrotado e não pago
	data, _, err := client.From("chefoes").
		Select("id,temporada,nome", "", false).
		Eq("derrotado", "true").
		Eq("recompensas_pagas", "false").
		Execute()
	if err != nil {
		return "", fmt.Errorf("erro ao buscar chefões pendentes: %w", err)
	}

	var pendentes []struct {
		ID        string `json:"id"`
		Temporada string `json:"temporada"`
		Nome      string `json:"nome"`
	}
	_ = json.Unmarshal(data, &pendentes)

	if len(pendentes) == 0 {
		return "Nenhum chefão pendente de pagamento de recompensas.", nil
	}

	pagos := 0
	for _, c := range pendentes {
		res := strings.TrimSpace(client.Rpc("pagar_recompensas_chefao", "", map[string]interface{}{
			"p_chefao_id": c.ID,
		}))
		log.Printf("[WORKER][CHEFAO] Pagamento de recompensas de %s (%s): %s", c.Nome, c.Temporada, res)
		pagos++
	}

	return fmt.Sprintf("Recompensas processadas para %d chefão(ões).", pagos), nil
}
