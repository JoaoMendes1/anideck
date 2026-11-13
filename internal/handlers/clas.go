package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	postgrest "github.com/supabase-community/postgrest-go"
)

type ClaSummary struct {
	ID           string    `json:"id"`
	Nome         string    `json:"nome"`
	Tag          string    `json:"tag"`
	Descricao    string    `json:"descricao"`
	Emblema      string    `json:"emblema"`
	Tipo         string    `json:"tipo"`
	NivelMinimo  int       `json:"nivel_minimo"`
	CriadoEm     time.Time `json:"criado_em"`
	TotalMembros int       `json:"total_membros"`
	XPSemana     int       `json:"xp_semana"`
}

type ClaMembro struct {
	UserID    string    `json:"user_id"`
	Handle    string    `json:"handle"`
	Nome      string    `json:"nome"`
	AvatarURL string    `json:"avatar_url,omitempty"`
	Papel     string    `json:"papel"`
	EntrouEm  time.Time `json:"entrou_em"`
	Nivel     int       `json:"nivel"`
	XPSemana  int       `json:"xp_semana"`
}

type ClaDetalhe struct {
	ID           string      `json:"id"`
	Nome         string      `json:"nome"`
	Tag          string      `json:"tag"`
	Descricao    string      `json:"descricao"`
	Emblema      string      `json:"emblema"`
	Tipo         string      `json:"tipo"`
	NivelMinimo  int         `json:"nivel_minimo"`
	CriadorID    string      `json:"criador_id"`
	CriadoEm     time.Time   `json:"criado_em"`
	TotalMembros int         `json:"total_membros"`
	XPSemana     int         `json:"xp_semana"`
	Membros      []ClaMembro `json:"membros"`
}

type ClaConvite struct {
	ID               string    `json:"id"`
	ClaID            string    `json:"cla_id"`
	ClaNome          string    `json:"cla_nome"`
	ClaTag           string    `json:"cla_tag"`
	ClaEmblema       string    `json:"cla_emblema"`
	ConvidadoEm      time.Time `json:"convidado_em"`
	ConvidadoPorNome string    `json:"convidado_por_nome"`
}

type MeuClaResponse struct {
	TemCla                bool         `json:"tem_cla"`
	ClaID                 string       `json:"cla_id,omitempty"`
	Nome                  string       `json:"nome,omitempty"`
	Tag                   string       `json:"tag,omitempty"`
	Descricao             string       `json:"descricao,omitempty"`
	Emblema               string       `json:"emblema,omitempty"`
	Tipo                  string       `json:"tipo,omitempty"`
	NivelMinimo           int          `json:"nivel_minimo,omitempty"`
	Ativo                 bool         `json:"ativo,omitempty"`
	CriadoEm              time.Time    `json:"criado_em,omitempty"`
	MeuPapel              string       `json:"meu_papel,omitempty"`
	TotalMembros          int          `json:"total_membros,omitempty"`
	XPSemana              int          `json:"xp_semana,omitempty"`
	CooldownDiasRestantes int          `json:"cooldown_dias_restantes"`
	Convites              []ClaConvite `json:"convites"`
}

type ClaDenunciaItem struct {
	ID                 string    `json:"id"`
	ClaID              string    `json:"cla_id"`
	ClaNome            string    `json:"cla_nome"`
	ClaTag             string    `json:"cla_tag"`
	DenuncianteUserID  string    `json:"denunciante_user_id"`
	DenuncianteNome    string    `json:"denunciante_nome,omitempty"`
	DenuncianteHandle  string    `json:"denunciante_handle,omitempty"`
	Motivo             string    `json:"motivo"`
	Status             string    `json:"status"`
	CriadoEm           time.Time `json:"criado_em"`
}

// Tipos para Liga de Clãs por Temporada (Fase 17 · 17.1c, #182)

type RankingClaTemporadaMembro struct {
	Posicao   int    `json:"posicao"`
	UserID    string `json:"user_id"`
	Handle    string `json:"handle"`
	Nome      string `json:"nome"`
	AvatarURL string `json:"avatar_url,omitempty"`
	XP        int64  `json:"xp"`
}

type RankingClaTemporadaItem struct {
	Posicao          *int                        `json:"posicao"`
	ClaID            string                      `json:"cla_id"`
	Nome             string                      `json:"nome"`
	Tag              string                      `json:"tag"`
	Descricao        string                      `json:"descricao"`
	Emblema          string                      `json:"emblema"`
	CriadoEm         time.Time                   `json:"criado_em"`
	TotalMembros     int                         `json:"total_membros"`
	ElegivelLiga     bool                        `json:"elegivel_liga"`
	MotivoIneligivel *string                     `json:"motivo_ineligivel"`
	Pontuacao        int                         `json:"pontuacao"`
	XPTotal          int64                       `json:"xp_total"`
	Top10Membros     []RankingClaTemporadaMembro `json:"top10_membros"`
}

type TemporadaCampeaoCla struct {
	Posicao            int       `json:"posicao"`
	ClaID              string    `json:"cla_id"`
	Nome               string    `json:"nome"`
	Tag                string    `json:"tag"`
	Emblema            string    `json:"emblema"`
	Pontuacao          int       `json:"pontuacao"`
	XPTotal            int64     `json:"xp_total"`
	TotalMembros       int       `json:"total_membros"`
	RecompensaAniCoins int       `json:"recompensa_anicoins"`
	EmblemaSlug        string    `json:"emblema_slug,omitempty"`
	FechadoEm          time.Time `json:"fechado_em,omitempty"`
}

type HistoricoTemporadaCampeoesItem struct {
	Temporada string                `json:"temporada"`
	FechadoEm time.Time             `json:"fechado_em"`
	Campeoes  []TemporadaCampeaoCla `json:"campeoes"`
}

type RankingClasTemporadaResponse struct {
	Temporada      string                    `json:"temporada"`
	NomeEstacao    string                    `json:"nome_estacao"`
	Ano            int                       `json:"ano"`
	Inicio         time.Time                 `json:"inicio"`
	Fim            time.Time                 `json:"fim"`
	MinMembrosLiga int                       `json:"min_membros_liga"`
	Fechada        bool                      `json:"fechada"`
	Campeoes       []TemporadaCampeaoCla     `json:"campeoes"`
	Ranking        []RankingClaTemporadaItem `json:"ranking"`
}

// CodigoTemporadaBrasilia devolve o identificador "YYYY-ESTACAO" no fuso de Brasília.
func CodigoTemporadaBrasilia(t time.Time) string {
	local := t.In(fusoGuilda)
	trimestre := (int(local.Month()) - 1) / 3
	return fmt.Sprintf("%04d-%s", local.Year(), temporadasPorTrimestre[trimestre])
}

// CalcularPontuacaoLigaCla aplica o piso de membros e a média aritmética dos 10 melhores membros.
func CalcularPontuacaoLigaCla(totalMembros int, minMembros int, somaTop10 int64) (pontuacao int, elegivel bool, motivo string) {
	if minMembros < 1 {
		minMembros = 10
	}
	if totalMembros < minMembros {
		return 0, false, fmt.Sprintf("Mínimo de %d membros para disputar a liga (atual: %d)", minMembros, totalMembros)
	}
	media := math.Round(float64(somaTop10) / 10.0)
	return int(media), true, ""
}

// CompararClasLiga define o critério estrito de desempate da Liga de Clãs:
// 1º Elegibilidade (elegíveis antes de inelegíveis)
// 2º Pontuação (média top 10) decrescente
// 3º XP total acumulado decrescente
// 4º Antiguidade da fundação (mais antigo vence)
// Retorna -1 se a deve vir antes de b, 1 se b deve vir antes de a, 0 se idênticos.
func CompararClasLiga(a, b RankingClaTemporadaItem) int {
	if a.ElegivelLiga != b.ElegivelLiga {
		if a.ElegivelLiga {
			return -1
		}
		return 1
	}
	if a.Pontuacao != b.Pontuacao {
		if a.Pontuacao > b.Pontuacao {
			return -1
		}
		return 1
	}
	if a.XPTotal != b.XPTotal {
		if a.XPTotal > b.XPTotal {
			return -1
		}
		return 1
	}
	if a.CriadoEm.Before(b.CriadoEm) {
		return -1
	}
	if b.CriadoEm.Before(a.CriadoEm) {
		return 1
	}
	return 0
}

// ChaveReferenciaLigaCla constrói a chave de idempotência para o crystal_ledger.
func ChaveReferenciaLigaCla(temporada, claID, userID string) string {
	return fmt.Sprintf("liga_cla:%s:%s:%s", temporada, claID, userID)
}

type ClasHandler struct{}

// HandleListarClas lista os clãs ativos com filtro e paginação.
func (h *ClasHandler) HandleListarClas(w http.ResponseWriter, r *http.Request) {
	busca := strings.TrimSpace(r.URL.Query().Get("busca"))
	limite, _ := strconv.Atoi(r.URL.Query().Get("limite"))
	if limite <= 0 || limite > 100 {
		limite = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	params := map[string]interface{}{
		"p_busca":  busca,
		"p_limite": limite,
		"p_offset": offset,
	}

	resRaw := strings.TrimSpace(database.Client.Rpc("listar_clas", "", params))
	if resRaw == "" || resRaw == "null" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]ClaSummary{})
		return
	}

	if strings.HasPrefix(resRaw, `{"code"`) || strings.Contains(resRaw, `"error"`) {
		log.Printf("[CLAS] Erro ao listar clãs: %s", resRaw)
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao carregar clãs")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(resRaw))
}

// HandleObterClaPorTag retorna os detalhes do clã pela tag (público).
func (h *ClasHandler) HandleObterClaPorTag(w http.ResponseWriter, r *http.Request) {
	tag := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "tag")))
	if tag == "" {
		responderErroJSON(w, http.StatusBadRequest, "Tag do clã não informada")
		return
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	resRaw := strings.TrimSpace(database.Client.Rpc("obter_cla_detalhe", "", map[string]interface{}{
		"p_tag": tag,
	}))

	if resRaw == "" || resRaw == "null" {
		responderErroJSON(w, http.StatusNotFound, "Clã não encontrado")
		return
	}

	if strings.HasPrefix(resRaw, `{"code"`) || strings.Contains(resRaw, `"error"`) {
		log.Printf("[CLAS] Erro ao obter detalhes do clã (%s): %s", tag, resRaw)
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao carregar clã")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(resRaw))
}

// HandleObterMeuCla retorna o clã do usuário logado, seu papel e convites pendentes.
func (h *ClasHandler) HandleObterMeuCla(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("obter_meu_cla", "", nil))
	if resRaw == "" || resRaw == "null" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(MeuClaResponse{TemCla: false, Convites: []ClaConvite{}})
		return
	}

	if strings.HasPrefix(resRaw, `{"code"`) || strings.Contains(resRaw, `"error"`) {
		log.Printf("[CLAS] Erro ao obter meu clã: %s", resRaw)
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao carregar seus dados de clã")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(resRaw))
}

// HandleCriarCla cria um novo clã.
func (h *ClasHandler) HandleCriarCla(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	var payload struct {
		Nome        string `json:"nome"`
		Tag         string `json:"tag"`
		Descricao   string `json:"descricao"`
		Emblema     string `json:"emblema"`
		Tipo        string `json:"tipo"`
		NivelMinimo int    `json:"nivel_minimo"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Dados inválidos")
		return
	}

	params := map[string]interface{}{
		"p_nome":         strings.TrimSpace(payload.Nome),
		"p_tag":          strings.ToUpper(strings.TrimSpace(payload.Tag)),
		"p_descricao":    strings.TrimSpace(payload.Descricao),
		"p_emblema":      strings.TrimSpace(payload.Emblema),
		"p_tipo":         strings.TrimSpace(payload.Tipo),
		"p_nivel_minimo": payload.NivelMinimo,
	}

	resRaw := strings.TrimSpace(client.Rpc("criar_cla", "", params))
	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao criar clã")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	// Remove aspas do uuid retornado se houver
	claID := strings.Trim(resRaw, "\"")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sucesso": true,
		"cla_id":  claID,
		"tag":     params["p_tag"],
	})
}

// HandleEntrarCla entra em um clã aberto ou aceita convite.
func (h *ClasHandler) HandleEntrarCla(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	if claID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do clã não informado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("entrar_cla", "", map[string]interface{}{
		"p_cla_id": claID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao entrar no clã")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleSairCla remove o usuário do clã atual.
func (h *ClasHandler) HandleSairCla(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("sair_cla", "", nil))
	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao sair do clã")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleExpulsarMembro remove um membro do clã (líder ou vice).
func (h *ClasHandler) HandleExpulsarMembro(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	targetUserID := strings.TrimSpace(chi.URLParam(r, "userId"))
	if claID == "" || targetUserID == "" {
		responderErroJSON(w, http.StatusBadRequest, "Parâmetros incompletos")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("expulsar_membro_cla", "", map[string]interface{}{
		"p_cla_id":         claID,
		"p_target_user_id": targetUserID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao expulsar membro")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleTransferirLideranca transfere a liderança do clã para outro membro.
func (h *ClasHandler) HandleTransferirLideranca(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	var payload struct {
		NovoLiderID string `json:"novo_lider_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.NovoLiderID == "" {
		responderErroJSON(w, http.StatusBadRequest, "Novo líder não especificado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("transferir_lideranca_cla", "", map[string]interface{}{
		"p_cla_id":         claID,
		"p_novo_lider_id": payload.NovoLiderID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao transferir liderança")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleAlterarPapel altera o papel de um membro entre 'vice' e 'membro'.
func (h *ClasHandler) HandleAlterarPapel(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	targetUserID := strings.TrimSpace(chi.URLParam(r, "userId"))
	var payload struct {
		NovoPapel string `json:"novo_papel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.NovoPapel == "" {
		responderErroJSON(w, http.StatusBadRequest, "Papel não especificado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("alterar_papel_membro_cla", "", map[string]interface{}{
		"p_cla_id":         claID,
		"p_target_user_id": targetUserID,
		"p_novo_papel":     payload.NovoPapel,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao alterar papel")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleConvidarMembro envia um convite para um membro entrar no clã.
func (h *ClasHandler) HandleConvidarMembro(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	var payload struct {
		ConvidadoUserID string `json:"convidado_user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.ConvidadoUserID == "" {
		responderErroJSON(w, http.StatusBadRequest, "Usuário convidado não especificado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("convidar_membro_cla", "", map[string]interface{}{
		"p_cla_id":            claID,
		"p_convidado_user_id": payload.ConvidadoUserID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao enviar convite")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true, "convite_id": strings.Trim(resRaw, "\"")})
}

// HandleResponderConvite aceita ou recusa um convite para entrar no clã.
func (h *ClasHandler) HandleResponderConvite(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	conviteID := strings.TrimSpace(chi.URLParam(r, "id"))
	var payload struct {
		Aceitar bool `json:"aceitar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Dados inválidos")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("responder_convite_cla", "", map[string]interface{}{
		"p_convite_id": conviteID,
		"p_aceitar":    payload.Aceitar,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao responder convite")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleDenunciarCla envia uma denúncia contra um clã.
func (h *ClasHandler) HandleDenunciarCla(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	var payload struct {
		Motivo string `json:"motivo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Motivo) == "" {
		responderErroJSON(w, http.StatusBadRequest, "Motivo da denúncia é obrigatório")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("denunciar_cla", "", map[string]interface{}{
		"p_cla_id": claID,
		"p_motivo": strings.TrimSpace(payload.Motivo),
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") {
		msg := extrairMensagemErroBanco(resRaw, "Falha ao registrar denúncia")
		responderErroJSON(w, http.StatusUnprocessableEntity, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleAdminListarDenuncias lista denúncias pendentes no painel admin.
func (h *ClasHandler) HandleAdminListarDenuncias(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		if token, ok := r.Context().Value(middleware.TokenKey).(string); ok && token != "" {
			client, _ = database.ClientWithToken(token)
		}
	}
	if client == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	var denuncias []struct {
		ID                string    `json:"id"`
		ClaID             string    `json:"cla_id"`
		DenuncianteUserID string    `json:"denunciante_user_id"`
		Motivo            string    `json:"motivo"`
		Status            string    `json:"status"`
		CriadoEm          time.Time `json:"criado_em"`
		ClaRef            struct {
			Nome string `json:"nome"`
			Tag  string `json:"tag"`
		} `json:"clas"`
	}

	data, _, err := client.From("cla_denuncias").
		Select("id,cla_id,denunciante_user_id,motivo,status,criado_em,clas(nome,tag)", "", false).
		Eq("status", "pendente").
		Order("criado_em", &postgrest.OrderOpts{Ascending: false}).
		Limit(50, "").
		Execute()

	if err != nil {
		log.Printf("[CLAS ADMIN] Erro ao listar denúncias: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	_ = json.Unmarshal(data, &denuncias)

	// Carrega perfis dos denunciantes
	var uids []string
	for _, d := range denuncias {
		uids = append(uids, d.DenuncianteUserID)
	}

	nomesMap := map[string]struct {
		Nome   string
		Handle string
	}{}
	if len(uids) > 0 {
		var profs []struct {
			UserID string `json:"user_id"`
			Nome   string `json:"nome"`
			Handle string `json:"handle"`
		}
		if dataP, _, errP := client.From("profiles").Select("user_id,nome,handle", "", false).In("user_id", uids).Execute(); errP == nil {
			_ = json.Unmarshal(dataP, &profs)
			for _, p := range profs {
				nomesMap[p.UserID] = struct {
					Nome   string
					Handle string
				}{Nome: p.Nome, Handle: p.Handle}
			}
		}
	}

	var resultado []ClaDenunciaItem
	for _, d := range denuncias {
		perfil := nomesMap[d.DenuncianteUserID]
		resultado = append(resultado, ClaDenunciaItem{
			ID:                d.ID,
			ClaID:             d.ClaID,
			ClaNome:           d.ClaRef.Nome,
			ClaTag:            d.ClaRef.Tag,
			DenuncianteUserID: d.DenuncianteUserID,
			DenuncianteNome:   perfil.Nome,
			DenuncianteHandle: perfil.Handle,
			Motivo:            d.Motivo,
			Status:            d.Status,
			CriadoEm:          d.CriadoEm,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleAdminDissolverCla dissolve o clã indicado por moderação.
func (h *ClasHandler) HandleAdminDissolverCla(w http.ResponseWriter, r *http.Request) {
	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	if claID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do clã não informado")
		return
	}

	var payload struct {
		Motivo string `json:"motivo"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("admin_dissolver_cla", "", map[string]interface{}{
		"p_cla_id": claID,
		"p_motivo": strings.TrimSpace(payload.Motivo),
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") {
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao dissolver clã")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// HandleAdminRenomearCla altera nome e tag de um clã por moderação.
func (h *ClasHandler) HandleAdminRenomearCla(w http.ResponseWriter, r *http.Request) {
	claID := strings.TrimSpace(chi.URLParam(r, "id"))
	if claID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do clã não informado")
		return
	}

	var payload struct {
		NovoNome string `json:"novo_nome"`
		NovaTag  string `json:"nova_tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.NovoNome == "" || payload.NovaTag == "" {
		responderErroJSON(w, http.StatusBadRequest, "Novo nome e tag são obrigatórios")
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("admin_renomear_cla", "", map[string]interface{}{
		"p_cla_id":    claID,
		"p_novo_nome": strings.TrimSpace(payload.NovoNome),
		"p_nova_tag":  strings.ToUpper(strings.TrimSpace(payload.NovaTag)),
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") {
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao renomear clã")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sucesso": true})
}

// extrairMensagemErroBanco limpa mensagens de erro retornadas pelo Postgres/Supabase RPC
func extrairMensagemErroBanco(raw, fallback string) string {
	var errObj struct {
		Message string `json:"message"`
		Details string `json:"details"`
		Hint    string `json:"hint"`
	}
	if err := json.Unmarshal([]byte(raw), &errObj); err == nil && errObj.Message != "" {
		msg := errObj.Message
		if strings.HasPrefix(msg, "P000") || strings.HasPrefix(msg, "220") || strings.HasPrefix(msg, "235") {
			parts := strings.SplitN(msg, ": ", 2)
			if len(parts) == 2 {
				msg = parts[1]
			}
		}
		return msg
	}

	for _, termo := range []string{
		"Seu perfil precisa ser público",
		"Nível insuficiente para fundar",
		"Você já pertence a um clã",
		"Aguarde o período de carência",
		"Já existe um clã com este",
		"A tag do clã",
		"O clã atingiu a capacidade",
		"Seu nível",
		"apenas por convite",
		"Sem permissão",
		"Membro não encontrado",
		"Não é permitido expulsar o líder",
		"Apenas o líder",
	} {
		if strings.Contains(raw, termo) {
			idx := strings.Index(raw, termo)
			sub := raw[idx:]
			if endIdx := strings.IndexAny(sub, "\"\n\\}"); endIdx != -1 {
				return sub[:endIdx]
			}
			return sub
		}
	}

	return fallback
}

// -----------------------------------------------------------------------------
// REGRAS PURAS E HANDLERS: DESAFIO SEMANAL DO CLÃ (Fase 17 · 17.1b, #181)
// -----------------------------------------------------------------------------

// CalcularMetaDesafioCla calcula a meta proporcional ao tamanho do clã.
func CalcularMetaDesafioCla(qtdMembros, metaPorMembro, metaMinima int) int {
	if qtdMembros < 1 {
		qtdMembros = 1
	}
	proporcional := qtdMembros * metaPorMembro
	if proporcional < metaMinima {
		return metaMinima
	}
	return proporcional
}

// EventoContaParaDesafio define se uma atividade conta para o desafio:
// precisa ocorrer dentro do intervalo da semana E após o membro ter ingressado no clã.
func EventoContaParaDesafio(eventoEm, entrouEm, inicioSemana, fimSemana time.Time) bool {
	if eventoEm.Before(inicioSemana) || !eventoEm.Before(fimSemana) {
		return false
	}
	corte := inicioSemana
	if entrouEm.After(inicioSemana) {
		corte = entrouEm
	}
	return !eventoEm.Before(corte)
}

// ChaveReferenciaDesafioCla gera a chave única de auditoria para o crystal_ledger.
func ChaveReferenciaDesafioCla(claID, semana, userID string) string {
	return "desafio:" + strings.TrimSpace(claID) + ":" + strings.TrimSpace(semana) + ":" + strings.TrimSpace(userID)
}

// HandleObterDesafioCla devolve o desafio semanal de um clã por tag.
func (h *ClasHandler) HandleObterDesafioCla(w http.ResponseWriter, r *http.Request) {
	tag := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "tag")))
	if tag == "" {
		responderErroJSON(w, http.StatusBadRequest, "Tag do clã não informada")
		return
	}
	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	// Busca o ID do clã pela tag
	var clas []struct {
		ID string `json:"id"`
	}
	res, _, err := database.Client.From("clas").
		Select("id", "", false).
		Eq("tag", tag).
		Eq("ativo", "true").
		Limit(1, "").
		Execute()
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao buscar clã")
		return
	}
	if err := json.Unmarshal(res, &clas); err != nil || len(clas) == 0 {
		responderErroJSON(w, http.StatusNotFound, "Clã não encontrado")
		return
	}

	params := map[string]interface{}{
		"p_cla_id": clas[0].ID,
	}
	if semana := strings.TrimSpace(r.URL.Query().Get("semana")); semana != "" {
		params["p_semana"] = semana
	}

	raw := strings.TrimSpace(database.Client.Rpc("obter_desafio_semanal_cla", "", params))
	if raw == "" || raw == "null" {
		responderErroJSON(w, http.StatusNotFound, "Desafio não encontrado para esta semana")
		return
	}
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao consultar desafio semanal")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}

// HandleMeuDesafioClaResumo retorna o desafio do clã do usuário logado.
func (h *ClasHandler) HandleMeuDesafioClaResumo(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Token de autenticação não fornecido")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	var params map[string]interface{}
	if semana := strings.TrimSpace(r.URL.Query().Get("semana")); semana != "" {
		params = map[string]interface{}{"p_semana": semana}
	}

	raw := strings.TrimSpace(client.Rpc("meu_desafio_cla_resumo", "", params))
	if raw == "" || raw == "null" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"tem_cla": false})
		return
	}
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao consultar desafio do clã")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}

// HandleAdminFecharSemanaDesafios consolida os desafios da semana e distribui as recompensas.
func (h *ClasHandler) HandleAdminFecharSemanaDesafios(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Service role indisponível")
		return
	}

	agora := time.Now()
	semanaPassada := CodigoSemanaAtualBrasilia(agora.AddDate(0, 0, -1))
	semanaAtual := CodigoSemanaAtualBrasilia(agora)

	var body struct {
		SemanaFechada string `json:"semana_fechada"`
		NovaSemana    string `json:"nova_semana"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.SemanaFechada != "" {
		semanaPassada = body.SemanaFechada
	}
	if body.NovaSemana != "" {
		semanaAtual = body.NovaSemana
	}

	raw := strings.TrimSpace(client.Rpc("fechar_semana_desafios_cla", "", map[string]interface{}{
		"p_semana_fechada": semanaPassada,
		"p_nova_semana":    semanaAtual,
	}))
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao fechar semana dos desafios")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}

// HandleRankingClasTemporada consulta o ranking e pódio da temporada da Liga de Clãs.
func (h *ClasHandler) HandleRankingClasTemporada(w http.ResponseWriter, r *http.Request) {
	temporada := strings.TrimSpace(r.URL.Query().Get("temporada"))
	limite, _ := strconv.Atoi(r.URL.Query().Get("limite"))
	if limite <= 0 || limite > 100 {
		limite = 50
	}

	params := map[string]interface{}{
		"p_limite": limite,
	}
	if temporada != "" {
		params["p_temporada"] = temporada
	}

	raw := strings.TrimSpace(database.Client.Rpc("ranking_clas_temporada", "", params))
	if raw == "" || raw == "null" {
		responderErroJSON(w, http.StatusNotFound, "Temporada não encontrada")
		return
	}
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao consultar ranking da temporada")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}

// HandleHistoricoCampeoesClas devolve o histórico das temporadas encerradas com seus campeões.
func (h *ClasHandler) HandleHistoricoCampeoesClas(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(database.Client.Rpc("listar_temporadas_campeoes_clas", "", nil))
	if raw == "" || raw == "null" {
		raw = "[]"
	}
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao consultar histórico de campeões")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}

// HandleAdminFecharTemporadaClas fecha uma temporada da liga de clãs sob demanda no Painel Admin.
func (h *ClasHandler) HandleAdminFecharTemporadaClas(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Service role indisponível")
		return
	}

	agora := time.Now().In(fusoGuilda)
	temporadaPassada := CodigoTemporadaBrasilia(agora.AddDate(0, -1, 0))
	temporadaAtual := CodigoTemporadaBrasilia(agora)

	var body struct {
		TemporadaFechada string `json:"temporada_fechada"`
		NovaTemporada    string `json:"nova_temporada"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.TemporadaFechada != "" {
		temporadaPassada = body.TemporadaFechada
	}
	if body.NovaTemporada != "" {
		temporadaAtual = body.NovaTemporada
	}

	raw := strings.TrimSpace(client.Rpc("fechar_temporada_clas", "", map[string]interface{}{
		"p_temporada_fechada": temporadaPassada,
		"p_nova_temporada":    temporadaAtual,
	}))
	if strings.Contains(raw, "\"error\"") || strings.Contains(raw, "\"code\"") {
		msg := extrairMensagemErroBanco(raw, "Falha ao fechar temporada de clãs")
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(raw))
}
