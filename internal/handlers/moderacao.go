// Moderação: denúncia de perfil e de avaliação, e punições (advertência, silenciar, multa,
// banir e bloquear e-mail). As regras moram no banco (sql/112 e sql/113); aqui ficam a
// conferência de quem pede e o banimento, que é feito na API de administração do
// Supabase Auth porque o login não passa pelo PostgREST.
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	postgrest "github.com/supabase-community/postgrest-go"
)

// ModeracaoHandler responde pelas rotas de denúncia e de punição.
type ModeracaoHandler struct{}

// pedidoDenuncia é o corpo de POST /api/denuncias.
type pedidoDenuncia struct {
	Tipo    string `json:"tipo"`
	Alvo    string `json:"alvo"`
	Motivo  string `json:"motivo"`
	Detalhe string `json:"detalhe"`
}

// validarDenuncia confere o formato antes de ir ao banco, que confere de novo.
func validarDenuncia(p pedidoDenuncia) string {
	if p.Tipo != "perfil" && p.Tipo != "avaliacao" {
		return "Tipo de denúncia inválido."
	}
	switch p.Motivo {
	case "spoiler", "ofensa", "spam", "improprio", "outro":
	default:
		return "Escolha um motivo."
	}
	if strings.TrimSpace(p.Alvo) == "" {
		return "Não encontrado."
	}
	if len([]rune(p.Detalhe)) > 300 {
		return "O detalhe tem no máximo 300 caracteres."
	}
	return ""
}

// HandleDenunciar registra a denúncia com o token de quem denuncia: a função do banco usa
// auth.uid() para saber quem é.
func (h *ModeracaoHandler) HandleDenunciar(w http.ResponseWriter, r *http.Request) {
	token, _ := r.Context().Value(middleware.TokenKey).(string)
	if token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	var p pedidoDenuncia
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&p); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}
	if msg := validarDenuncia(p); msg != "" {
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}
	cliente, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	bruto := cliente.Rpc("denunciar", "", map[string]interface{}{
		"p_tipo": p.Tipo, "p_alvo": p.Alvo, "p_motivo": p.Motivo, "p_detalhe": strings.TrimSpace(p.Detalhe),
	})
	if !strings.Contains(bruto, `"ok"`) {
		responderErroJSON(w, http.StatusUnprocessableEntity, extrairMensagemErroBanco(bruto, "Não foi possível enviar a denúncia agora."))
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// HandleListarDenuncias devolve a fila de denúncias de perfil e de avaliação (?status=pendente
// por padrão), com o nome de quem denunciou e de quem foi denunciado.
func (h *ModeracaoHandler) HandleListarDenuncias(w http.ResponseWriter, r *http.Request) {
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	status := r.URL.Query().Get("status")
	if status != "resolvida" && status != "descartada" {
		status = "pendente"
	}
	dados, _, err := cliente.From("denuncias").
		Select("id,alvo_tipo,alvo_id,alvo_user_id,denunciante_id,motivo,detalhe,status,decisao,created_at", "", false).
		Eq("status", status).Order("created_at", &postgrest.OrderOpts{Ascending: false}).Limit(200, "").Execute()
	if err != nil {
		log.Printf("[MODERACAO] Falha ao listar denúncias: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível carregar as denúncias.")
		return
	}
	var lista []map[string]interface{}
	_ = json.Unmarshal(dados, &lista)

	// Nomes e @ de todos os envolvidos numa leitura só.
	ids := map[string]bool{}
	revisoes := []string{}
	for _, d := range lista {
		for _, k := range []string{"alvo_user_id", "denunciante_id"} {
			if s, ok := d[k].(string); ok {
				ids[s] = true
			}
		}
		if d["alvo_tipo"] == "avaliacao" {
			if s, ok := d["alvo_id"].(string); ok {
				revisoes = append(revisoes, s)
			}
		}
	}
	nomes := map[string]map[string]interface{}{}
	if len(ids) > 0 {
		chaves := make([]string, 0, len(ids))
		for k := range ids {
			chaves = append(chaves, k)
		}
		if bruto, _, err := cliente.From("profiles").Select("user_id,handle,nome", "", false).In("user_id", chaves).Execute(); err == nil {
			var perfis []map[string]interface{}
			_ = json.Unmarshal(bruto, &perfis)
			for _, p := range perfis {
				if s, ok := p["user_id"].(string); ok {
					nomes[s] = p
				}
			}
		}
	}
	textos := map[string]interface{}{}
	if len(revisoes) > 0 {
		if bruto, _, err := cliente.From("anime_reviews").Select("id,texto,mal_id", "", false).In("id", revisoes).Execute(); err == nil {
			var rs []map[string]interface{}
			_ = json.Unmarshal(bruto, &rs)
			for _, rv := range rs {
				if s, ok := rv["id"].(string); ok {
					textos[s] = rv
				}
			}
		}
	}
	for _, d := range lista {
		if s, ok := d["alvo_user_id"].(string); ok {
			d["alvo"] = nomes[s]
		}
		if s, ok := d["denunciante_id"].(string); ok {
			d["denunciante"] = nomes[s]
		}
		if s, ok := d["alvo_id"].(string); ok && d["alvo_tipo"] == "avaliacao" {
			d["avaliacao"] = textos[s]
		}
	}
	if lista == nil {
		lista = []map[string]interface{}{}
	}
	responderJSON(w, http.StatusOK, lista)
}

// HandleDecidirDenuncia resolve ou descarta uma denúncia sem punição.
func (h *ModeracaoHandler) HandleDecidirDenuncia(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var corpo struct {
		Status  string `json:"status"`
		Decisao string `json:"decisao"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048)).Decode(&corpo); err != nil || (corpo.Status != "resolvida" && corpo.Status != "descartada") {
		responderErroJSON(w, http.StatusBadRequest, "Status inválido.")
		return
	}
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	bruto := cliente.Rpc("decidir_denuncia", "", map[string]interface{}{
		"p_admin": adminID, "p_id": chi.URLParam(r, "id"), "p_status": corpo.Status, "p_decisao": corpo.Decisao,
	})
	if strings.Contains(bruto, `"code"`) {
		responderErroJSON(w, http.StatusUnprocessableEntity, extrairMensagemErroBanco(bruto, "Não foi possível decidir agora."))
		return
	}
	responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// PedidoPunicao é o corpo de POST /api/admin/punicoes. O alvo vem pelo @.
type PedidoPunicao struct {
	Handle     string `json:"handle"`
	Tipo       string `json:"tipo"`
	Gravidade  string `json:"gravidade"`
	Motivo     string `json:"motivo"`
	AniCoins   int    `json:"anicoins"`
	XP         int    `json:"xp"`
	Dias       *int   `json:"dias"`
	DenunciaID string `json:"denuncia_id"`
}

// validarPunicao confere o pedido antes de ir ao banco.
func validarPunicao(p PedidoPunicao) string {
	switch p.Tipo {
	case "advertencia", "silenciar", "multa", "banir", "bloqueio_email":
	default:
		return "Tipo de punição inválido."
	}
	switch p.Gravidade {
	case "leve", "media", "grave", "gravissima":
	default:
		return "Escolha a gravidade."
	}
	if n := len([]rune(strings.TrimSpace(p.Motivo))); n < 3 || n > 300 {
		return "Escreva o motivo (3 a 300 caracteres): a pessoa vai ler."
	}
	if p.Tipo == "multa" && p.AniCoins <= 0 && p.XP <= 0 {
		return "A multa precisa de AniCoins ou XP."
	}
	if p.AniCoins < 0 || p.XP < 0 || p.AniCoins > 100000 || p.XP > 100000 {
		return "Valores da multa entre 0 e 100.000."
	}
	if p.Dias != nil && (*p.Dias < 1 || *p.Dias > 3650) {
		return "Dias entre 1 e 3650, ou vazio para sem fim."
	}
	return ""
}

// duracaoDoBanimento traduz dias em ban_duration do Supabase Auth. Sem dias, 100 anos.
func duracaoDoBanimento(dias *int) string {
	if dias == nil {
		return "876000h"
	}
	return strconv.Itoa(*dias*24) + "h"
}

// banirNoAuth bloqueia (ou libera, com "none") o login na API de administração do Supabase.
func banirNoAuth(ctx context.Context, userID, duracao string) error {
	base := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	chave := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if base == "" || chave == "" {
		return fmt.Errorf("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes")
	}
	corpo, _ := json.Marshal(map[string]string{"ban_duration": duracao})
	ctx, cancelar := context.WithTimeout(ctx, 10*time.Second)
	defer cancelar()
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, base+"/auth/v1/admin/users/"+userID, bytes.NewReader(corpo))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", chave)
	req.Header.Set("Authorization", "Bearer "+chave)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("auth respondeu %d", res.StatusCode)
	}
	return nil
}

// userIDDoHandle acha o dono de um @ com o service role.
func userIDDoHandle(handle string) string {
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		return ""
	}
	h := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(handle)), "@")
	dados, _, err := cliente.From("profiles").Select("user_id", "", false).Eq("handle", h).Limit(1, "").Execute()
	if err != nil {
		return ""
	}
	var linhas []struct {
		UserID string `json:"user_id"`
	}
	_ = json.Unmarshal(dados, &linhas)
	if len(linhas) == 0 {
		return ""
	}
	return linhas[0].UserID
}

// HandleAplicarPunicao registra a punição no banco e, se for banimento, bloqueia o login.
func (h *ModeracaoHandler) HandleAplicarPunicao(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var p PedidoPunicao
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&p); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}
	if msg := validarPunicao(p); msg != "" {
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}
	alvo := userIDDoHandle(p.Handle)
	if alvo == "" {
		responderErroJSON(w, http.StatusNotFound, "Membro não encontrado.")
		return
	}
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	params := map[string]interface{}{
		"p_admin": adminID, "p_user": alvo, "p_tipo": p.Tipo, "p_gravidade": p.Gravidade,
		"p_motivo": strings.TrimSpace(p.Motivo), "p_anicoins": p.AniCoins, "p_xp": p.XP, "p_dias": p.Dias,
	}
	if p.DenunciaID != "" {
		params["p_denuncia"] = p.DenunciaID
	}
	bruto := cliente.Rpc("aplicar_punicao", "", params)
	if !strings.Contains(bruto, `"id"`) {
		responderErroJSON(w, http.StatusUnprocessableEntity, extrairMensagemErroBanco(bruto, "Não foi possível aplicar a punição."))
		return
	}
	if p.Tipo == "banir" {
		if err := banirNoAuth(r.Context(), alvo, duracaoDoBanimento(p.Dias)); err != nil {
			log.Printf("[MODERACAO] Banimento registrado, mas o Auth recusou (user=%s): %v", alvo, err)
			responderErroJSON(w, http.StatusServiceUnavailable, "Registrei o banimento, mas o login não foi bloqueado: o Supabase Auth não respondeu. Tente revogar e aplicar de novo.")
			return
		}
	}
	responderJSON(w, http.StatusOK, json.RawMessage(bruto))
}

// HandleRevogarPunicao desfaz o que for reversível; banimento revogado libera o login.
func (h *ModeracaoHandler) HandleRevogarPunicao(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	bruto := cliente.Rpc("revogar_punicao", "", map[string]interface{}{"p_admin": adminID, "p_id": chi.URLParam(r, "id")})
	var res struct {
		Tipo   string `json:"tipo"`
		UserID string `json:"user_id"`
	}
	if err := json.Unmarshal([]byte(bruto), &res); err != nil || res.Tipo == "" {
		responderErroJSON(w, http.StatusUnprocessableEntity, extrairMensagemErroBanco(bruto, "Não foi possível revogar."))
		return
	}
	if res.Tipo == "banir" {
		if err := banirNoAuth(r.Context(), res.UserID, "none"); err != nil {
			log.Printf("[MODERACAO] Falha ao liberar o login (user=%s): %v", res.UserID, err)
			responderErroJSON(w, http.StatusServiceUnavailable, "Revoguei no registro, mas o login continua bloqueado: o Supabase Auth não respondeu.")
			return
		}
	}
	responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// HandleHistoricoPunicoes lista as punições de um @, da mais nova para a mais antiga.
func (h *ModeracaoHandler) HandleHistoricoPunicoes(w http.ResponseWriter, r *http.Request) {
	alvo := userIDDoHandle(chi.URLParam(r, "handle"))
	if alvo == "" {
		responderErroJSON(w, http.StatusNotFound, "Membro não encontrado.")
		return
	}
	cliente, err := database.ServiceRoleClient()
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	dados, _, err := cliente.From("punicoes").
		Select("id,tipo,gravidade,motivo,anicoins,xp,ate,created_at,revogada_em", "", false).
		Eq("user_id", alvo).Order("created_at", &postgrest.OrderOpts{Ascending: false}).Limit(100, "").Execute()
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível carregar o histórico.")
		return
	}
	responderJSON(w, http.StatusOK, json.RawMessage(dados))
}
