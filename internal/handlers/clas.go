package handlers

import (
	"encoding/json"
	"log"
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
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
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
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao carregar denúncias")
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
