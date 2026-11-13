package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	postgrest "github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

type SalasEstreiaHandler struct{}

type SalaEstreia struct {
	ID                string    `json:"id"`
	MalID             int       `json:"mal_id"`
	Episodio          int       `json:"episodio"`
	TituloAnime       string    `json:"titulo_anime"`
	ImagemAnime       string    `json:"imagem_anime,omitempty"`
	AbreEm            time.Time `json:"abre_em"`
	FechaEm           time.Time `json:"fecha_em"`
	Encerrada         bool      `json:"encerrada"`
	AoVivo            bool      `json:"ao_vivo"`
	SegundosRestantes int       `json:"segundos_restantes"`
	TotalMensagens    int       `json:"total_mensagens"`
	CriadoEm          time.Time `json:"created_at"`
}

type SalaMensagem struct {
	ID            string    `json:"id"`
	SalaID        string    `json:"sala_id"`
	UserID        string    `json:"user_id"`
	AutorNome     string    `json:"autor_nome"`
	AutorHandle   string    `json:"autor_handle"`
	AutorAvatar   string    `json:"autor_avatar,omitempty"`
	AutorMoldura  string    `json:"autor_moldura,omitempty"`
	AutorClaTag   string    `json:"autor_cla_tag,omitempty"`
	Conteudo      string    `json:"conteudo"`
	Curtidas      int       `json:"curtidas"`
	Destaque      bool      `json:"destaque"`
	CurtidoPorMim bool      `json:"curtido_por_mim"`
	CriadoEm      time.Time `json:"created_at"`
}

type CriarMensagemRequest struct {
	Conteudo string `json:"conteudo"`
}

type DenunciaMensagemRequest struct {
	Motivo string `json:"motivo"`
}

type CriarSalaManualRequest struct {
	MalID          int    `json:"mal_id"`
	Episodio       int    `json:"episodio"`
	TituloAnime    string `json:"titulo_anime"`
	ImagemAnime    string `json:"imagem_anime"`
	DuracaoMinutos int    `json:"duracao_minutos"` // Padrão: 180 min (3 horas)
}

// HandleListarSalasAoVivo devolve salas que estão no ar agora ou prestes a abrir.
func (h *SalasEstreiaHandler) HandleListarSalasAoVivo(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	agora := time.Now().UTC()
	agoraISO := agora.Format(time.RFC3339)

	// Busca salas não encerradas com data de abertura até daqui a 1 hora e fechamento no futuro
	data, _, err := client.From("salas_estreia").
		Select("id,mal_id,episodio,titulo_anime,imagem_anime,abre_em,fecha_em,encerrada,created_at", "", false).
		Eq("encerrada", "false").
		Gte("fecha_em", agoraISO).
		Order("abre_em", &postgrest.OrderOpts{Ascending: true}).
		Limit(20, "").
		Execute()
	if err != nil {
		log.Printf("[SALAS_ESTREIA] HandleListarSalasAoVivo: %v", err)
		http.Error(w, "Erro ao listar salas de estreia.", http.StatusInternalServerError)
		return
	}

	var salasBanco []SalaEstreia
	if err := json.Unmarshal(data, &salasBanco); err != nil {
		http.Error(w, "Erro ao processar dados das salas.", http.StatusInternalServerError)
		return
	}

	resposta := make([]SalaEstreia, 0, len(salasBanco))
	for _, s := range salasBanco {
		aoVivo := !s.Encerrada && agora.After(s.AbreEm) && agora.Before(s.FechaEm)
		segundosRestantes := 0
		if aoVivo {
			segundosRestantes = int(s.FechaEm.Sub(agora).Seconds())
		}
		s.AoVivo = aoVivo
		s.SegundosRestantes = segundosRestantes
		resposta = append(resposta, s)
	}

	// Também fecha automaticamente salas vencidas em segundo plano
	go fecharSalasVencidas(client)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resposta)
}

// HandleObterSala devolve detalhes de uma sala de estreia específica.
func (h *SalasEstreiaHandler) HandleObterSala(w http.ResponseWriter, r *http.Request) {
	salaID := chi.URLParam(r, "id")
	if salaID == "" {
		http.Error(w, "ID da sala obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	data, _, err := client.From("salas_estreia").
		Select("id,mal_id,episodio,titulo_anime,imagem_anime,abre_em,fecha_em,encerrada,created_at", "", false).
		Eq("id", salaID).
		Single().
		Execute()
	if err != nil {
		http.Error(w, "Sala de estreia não encontrada.", http.StatusNotFound)
		return
	}

	var sala SalaEstreia
	if err := json.Unmarshal(data, &sala); err != nil {
		http.Error(w, "Erro ao processar dados da sala.", http.StatusInternalServerError)
		return
	}

	agora := time.Now().UTC()
	// Se passou do prazo de fechamento e não foi marcada encerrada, fecha agora
	if !sala.Encerrada && agora.After(sala.FechaEm) {
		_, _ = fecharSalaEstreiaRPC(client, sala.ID)
		sala.Encerrada = true
	}

	aoVivo := !sala.Encerrada && agora.After(sala.AbreEm) && agora.Before(sala.FechaEm)
	segundosRestantes := 0
	if aoVivo {
		segundosRestantes = int(sala.FechaEm.Sub(agora).Seconds())
	}
	sala.AoVivo = aoVivo
	sala.SegundosRestantes = segundosRestantes

	// Conta total de mensagens não ocultas
	dataContagem, _, _ := client.From("sala_mensagens").
		Select("id", "exact", true).
		Eq("sala_id", salaID).
		Eq("oculto", "false").
		Execute()
	var idsMsgs []struct{}
	_ = json.Unmarshal(dataContagem, &idsMsgs)
	sala.TotalMensagens = len(idsMsgs)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sala)
}

// HandleObterSalaPorAnime busca sala de estreia ativa ou recente para um determinado anime (mal_id).
func (h *SalasEstreiaHandler) HandleObterSalaPorAnime(w http.ResponseWriter, r *http.Request) {
	malIDStr := chi.URLParam(r, "malId")
	malID, err := strconv.Atoi(malIDStr)
	if err != nil || malID <= 0 {
		http.Error(w, "ID do anime inválido.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	agora := time.Now().UTC()
	limiteRecente := agora.Add(-3 * time.Hour).Format(time.RFC3339)

	// Busca a sala mais recente desse anime aberta ou encerrada há pouco tempo
	data, _, err := client.From("salas_estreia").
		Select("id,mal_id,episodio,titulo_anime,imagem_anime,abre_em,fecha_em,encerrada,created_at", "", false).
		Eq("mal_id", strconv.Itoa(malID)).
		Gte("fecha_em", limiteRecente).
		Order("episodio", &postgrest.OrderOpts{Ascending: false}).
		Limit(1, "").
		Execute()
	if err != nil {
		http.Error(w, "Erro ao buscar sala para o anime.", http.StatusInternalServerError)
		return
	}

	var salas []SalaEstreia
	if err := json.Unmarshal(data, &salas); err != nil || len(salas) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("null"))
		return
	}

	sala := salas[0]
	aoVivo := !sala.Encerrada && agora.After(sala.AbreEm) && agora.Before(sala.FechaEm)
	segundosRestantes := 0
	if aoVivo {
		segundosRestantes = int(sala.FechaEm.Sub(agora).Seconds())
	}
	sala.AoVivo = aoVivo
	sala.SegundosRestantes = segundosRestantes

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sala)
}

// HandleListarMensagens devolve as mensagens da sala ordenadas por data de criação.
func (h *SalasEstreiaHandler) HandleListarMensagens(w http.ResponseWriter, r *http.Request) {
	salaID := chi.URLParam(r, "id")
	if salaID == "" {
		http.Error(w, "ID da sala obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Busca mensagens da sala (não ocultas)
	data, _, err := client.From("sala_mensagens").
		Select("id,sala_id,user_id,conteudo,curtidas,destaque,created_at", "", false).
		Eq("sala_id", salaID).
		Eq("oculto", "false").
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		Limit(100, "").
		Execute()
	if err != nil {
		log.Printf("[SALAS_ESTREIA] HandleListarMensagens: %v", err)
		http.Error(w, "Erro ao carregar mensagens.", http.StatusInternalServerError)
		return
	}

	type msgRaw struct {
		ID        string    `json:"id"`
		SalaID    string    `json:"sala_id"`
		UserID    string    `json:"user_id"`
		Conteudo  string    `json:"conteudo"`
		Curtidas  int       `json:"curtidas"`
		Destaque  bool      `json:"destaque"`
		CreatedAt time.Time `json:"created_at"`
	}

	var rawMsgs []msgRaw
	if err := json.Unmarshal(data, &rawMsgs); err != nil {
		http.Error(w, "Erro ao decodificar mensagens.", http.StatusInternalServerError)
		return
	}

	if len(rawMsgs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]SalaMensagem{})
		return
	}

	// Coleta IDs únicos de usuários para carregar perfis
	userIDsMap := make(map[string]bool)
	msgIDs := make([]string, 0, len(rawMsgs))
	for _, m := range rawMsgs {
		userIDsMap[m.UserID] = true
		msgIDs = append(msgIDs, m.ID)
	}

	userIDs := make([]string, 0, len(userIDsMap))
	for uid := range userIDsMap {
		userIDs = append(userIDs, uid)
	}

	// Carrega perfis dos autores
	dataPerfis, _, _ := client.From("profiles").
		Select("user_id,handle,nome,avatar_url", "", false).
		In("user_id", userIDs).
		Execute()

	type perfilRow struct {
		UserID    string  `json:"user_id"`
		Handle    *string `json:"handle"`
		Nome      *string `json:"nome"`
		AvatarURL *string `json:"avatar_url"`
	}
	var perfis []perfilRow
	_ = json.Unmarshal(dataPerfis, &perfis)
	perfisMap := make(map[string]perfilRow)
	for _, p := range perfis {
		perfisMap[p.UserID] = p
	}

	// Carrega cosméticos equipados (moldura)
	dataEquip, _, _ := client.From("user_equipped").
		Select("user_id,slot,store_items(icone)", "", false).
		In("user_id", userIDs).
		Eq("slot", "moldura").
		Execute()

	type equipRow struct {
		UserID     string `json:"user_id"`
		StoreItems *struct {
			Icone string `json:"icone"`
		} `json:"store_items"`
	}
	var equips []equipRow
	_ = json.Unmarshal(dataEquip, &equips)
	moldurasMap := make(map[string]string)
	for _, eq := range equips {
		if eq.StoreItems != nil {
			moldurasMap[eq.UserID] = eq.StoreItems.Icone
		}
	}

	// Carrega clãs dos autores
	dataMembros, _, _ := client.From("cla_membros").
		Select("user_id,clas(tag)", "", false).
		In("user_id", userIDs).
		Execute()

	type membroRow struct {
		UserID string `json:"user_id"`
		Clas   *struct {
			Tag string `json:"tag"`
		} `json:"clas"`
	}
	var membros []membroRow
	_ = json.Unmarshal(dataMembros, &membros)
	tagsClaMap := make(map[string]string)
	for _, mb := range membros {
		if mb.Clas != nil {
			tagsClaMap[mb.UserID] = mb.Clas.Tag
		}
	}

	// Verifica se o usuário atual curtiu as mensagens
	usuarioLogadoID, _ := r.Context().Value(middleware.UserIDKey).(string)
	curtidasPorMim := make(map[string]bool)
	if usuarioLogadoID != "" {
		dataCurtidas, _, _ := client.From("sala_mensagem_curtidas").
			Select("mensagem_id", "", false).
			Eq("user_id", usuarioLogadoID).
			In("mensagem_id", msgIDs).
			Execute()

		var curtidas []struct {
			MensagemID string `json:"mensagem_id"`
		}
		_ = json.Unmarshal(dataCurtidas, &curtidas)
		for _, c := range curtidas {
			curtidasPorMim[c.MensagemID] = true
		}
	}

	resultado := make([]SalaMensagem, 0, len(rawMsgs))
	for _, m := range rawMsgs {
		p := perfisMap[m.UserID]
		nome := "Membro"
		if p.Nome != nil && *p.Nome != "" {
			nome = *p.Nome
		}
		handle := ""
		if p.Handle != nil {
			handle = *p.Handle
		}
		avatar := ""
		if p.AvatarURL != nil {
			avatar = *p.AvatarURL
		}

		resultado = append(resultado, SalaMensagem{
			ID:            m.ID,
			SalaID:        m.SalaID,
			UserID:        m.UserID,
			AutorNome:     nome,
			AutorHandle:   handle,
			AutorAvatar:   avatar,
			AutorMoldura:  moldurasMap[m.UserID],
			AutorClaTag:   tagsClaMap[m.UserID],
			Conteudo:      m.Conteudo,
			Curtidas:      m.Curtidas,
			Destaque:      m.Destaque,
			CurtidoPorMim: curtidasPorMim[m.ID],
			CriadoEm:      m.CreatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleEnviarMensagem envia uma nova mensagem para a sala aberta.
func (h *SalasEstreiaHandler) HandleEnviarMensagem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		http.Error(w, "Autenticação obrigatória.", http.StatusUnauthorized)
		return
	}

	salaID := chi.URLParam(r, "id")
	if salaID == "" {
		http.Error(w, "ID da sala obrigatório.", http.StatusBadRequest)
		return
	}

	var req CriarMensagemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido.", http.StatusBadRequest)
		return
	}

	conteudo := strings.TrimSpace(req.Conteudo)
	if len([]rune(conteudo)) < 1 || len([]rune(conteudo)) > 280 {
		http.Error(w, "A mensagem deve ter entre 1 e 280 caracteres.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Confere se a sala está aberta
	dataSala, _, err := client.From("salas_estreia").
		Select("id,abre_em,fecha_em,encerrada", "", false).
		Eq("id", salaID).
		Single().
		Execute()
	if err != nil {
		http.Error(w, "Sala de estreia não encontrada.", http.StatusNotFound)
		return
	}

	var sala struct {
		ID        string    `json:"id"`
		AbreEm    time.Time `json:"abre_em"`
		FechaEm   time.Time `json:"fecha_em"`
		Encerrada bool      `json:"encerrada"`
	}
	_ = json.Unmarshal(dataSala, &sala)

	agora := time.Now().UTC()
	if sala.Encerrada || agora.Before(sala.AbreEm) || agora.After(sala.FechaEm) {
		http.Error(w, "Esta sala de estreia está fechada para novas mensagens.", http.StatusBadRequest)
		return
	}

	// Insere a mensagem
	novaMsg := map[string]interface{}{
		"sala_id":  salaID,
		"user_id":  userID,
		"conteudo": conteudo,
	}

	dataNova, _, err := client.From("sala_mensagens").
		Insert(novaMsg, false, "", "representation", "").
		Single().
		Execute()
	if err != nil {
		log.Printf("[SALAS_ESTREIA] Erro ao inserir mensagem: %v", err)
		if strings.Contains(err.Error(), "Aguarde 3 segundos") {
			http.Error(w, "Aguarde 3 segundos entre o envio de cada mensagem.", http.StatusTooManyRequests)
			return
		}
		http.Error(w, "Erro ao enviar mensagem.", http.StatusInternalServerError)
		return
	}

	var criada SalaMensagem
	_ = json.Unmarshal(dataNova, &criada)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(criada)
}

// HandleCurtirMensagem alterna curtida em uma mensagem da sala.
func (h *SalasEstreiaHandler) HandleCurtirMensagem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		http.Error(w, "Autenticação obrigatória.", http.StatusUnauthorized)
		return
	}

	msgID := chi.URLParam(r, "msgId")
	if msgID == "" {
		http.Error(w, "ID da mensagem obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Confere se já curtiu
	dataCheck, _, _ := client.From("sala_mensagem_curtidas").
		Select("mensagem_id", "", false).
		Eq("mensagem_id", msgID).
		Eq("user_id", userID).
		Execute()

	var jaCurtiu []struct{}
	_ = json.Unmarshal(dataCheck, &jaCurtiu)

	curtido := false
	if len(jaCurtiu) > 0 {
		// Remove curtida
		_, _, _ = client.From("sala_mensagem_curtidas").
			Delete("minimal", "").
			Eq("mensagem_id", msgID).
			Eq("user_id", userID).
			Execute()
		curtido = false
	} else {
		// Insere curtida
		_, _, _ = client.From("sala_mensagem_curtidas").
			Insert(map[string]interface{}{
				"mensagem_id": msgID,
				"user_id":     userID,
			}, false, "", "minimal", "").
			Execute()
		curtido = true
	}

	// Busca contagem atualizada
	dataMsg, _, _ := client.From("sala_mensagens").
		Select("curtidas,destaque", "", false).
		Eq("id", msgID).
		Single().
		Execute()

	var msgAtual struct {
		Curtidas int  `json:"curtidas"`
		Destaque bool `json:"destaque"`
	}
	_ = json.Unmarshal(dataMsg, &msgAtual)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"curtido":  curtido,
		"curtidas": msgAtual.Curtidas,
		"destaque": msgAtual.Destaque,
	})
}

// HandleDenunciarMensagem envia denúncia de moderação para a mensagem da sala.
func (h *SalasEstreiaHandler) HandleDenunciarMensagem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		http.Error(w, "Autenticação obrigatória.", http.StatusUnauthorized)
		return
	}

	msgID := chi.URLParam(r, "msgId")
	if msgID == "" {
		http.Error(w, "ID da mensagem obrigatório.", http.StatusBadRequest)
		return
	}

	var req DenunciaMensagemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	motivo := strings.TrimSpace(req.Motivo)
	if len(motivo) < 3 {
		http.Error(w, "Descreva o motivo da denúncia.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	_, _, err = client.From("sala_mensagem_denuncias").
		Insert(map[string]interface{}{
			"mensagem_id":    msgID,
			"denunciante_id": userID,
			"motivo":         motivo,
		}, false, "", "minimal", "").
		Execute()
	if err != nil {
		log.Printf("[SALAS_ESTREIA] Erro ao gravar denúncia: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// HandleAdminCriarSalaManual permite ao administrador abrir sala de estreia manualmente para testes ou estreias especiais.
func (h *SalasEstreiaHandler) HandleAdminCriarSalaManual(w http.ResponseWriter, r *http.Request) {
	var req CriarSalaManualRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido.", http.StatusBadRequest)
		return
	}

	if req.MalID <= 0 || req.Episodio <= 0 || strings.TrimSpace(req.TituloAnime) == "" {
		http.Error(w, "mal_id, episodio e titulo_anime são obrigatórios.", http.StatusBadRequest)
		return
	}

	duracao := req.DuracaoMinutos
	if duracao <= 0 {
		duracao = 180 // 3 horas
	}

	abreEm := time.Now().UTC()
	fechaEm := abreEm.Add(time.Duration(duracao) * time.Minute)

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	novaSala := map[string]interface{}{
		"mal_id":       req.MalID,
		"episodio":     req.Episodio,
		"titulo_anime": req.TituloAnime,
		"imagem_anime": req.ImagemAnime,
		"abre_em":      abreEm.Format(time.RFC3339),
		"fecha_em":     fechaEm.Format(time.RFC3339),
		"encerrada":    false,
	}

	data, _, err := client.From("salas_estreia").
		Insert(novaSala, false, "", "representation", "").
		Single().
		Execute()
	if err != nil {
		log.Printf("[SALAS_ESTREIA] HandleAdminCriarSalaManual: %v", err)
		http.Error(w, fmt.Sprintf("Erro ao criar sala de estreia: %v", err), http.StatusInternalServerError)
		return
	}

	var criada SalaEstreia
	_ = json.Unmarshal(data, &criada)
	criada.AoVivo = true
	criada.SegundosRestantes = int(fechaEm.Sub(abreEm).Seconds())

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(criada)
}

// HandleAdminFecharSala força o encerramento de uma sala de estreia e a migração de destaques para comentários.
func (h *SalasEstreiaHandler) HandleAdminFecharSala(w http.ResponseWriter, r *http.Request) {
	salaID := chi.URLParam(r, "id")
	if salaID == "" {
		http.Error(w, "ID da sala obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Serviço indisponível.", http.StatusServiceUnavailable)
		return
	}

	resumo, err := fecharSalaEstreiaRPC(client, salaID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao fechar sala: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":      true,
		"resumo":  resumo,
		"sala_id": salaID,
	})
}

// ---------------------------------------------------------------------------
// Helpers e Funções de Background
// ---------------------------------------------------------------------------

func fecharSalaEstreiaRPC(client *supabase.Client, salaID string) (string, error) {
	raw := strings.TrimSpace(client.Rpc("fechar_sala_estreia", "", map[string]interface{}{
		"p_sala_id": salaID,
	}))
	if strings.Contains(raw, "error") {
		return raw, fmt.Errorf("%s", raw)
	}
	return raw, nil
}

func fecharSalasVencidas(client *supabase.Client) {
	agoraISO := time.Now().UTC().Format(time.RFC3339)
	data, _, err := client.From("salas_estreia").
		Select("id", "", false).
		Eq("encerrada", "false").
		Lt("fecha_em", agoraISO).
		Execute()
	if err != nil {
		return
	}

	var vencidas []struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(data, &vencidas)

	for _, v := range vencidas {
		_, _ = fecharSalaEstreiaRPC(client, v.ID)
	}
}

// executarLimpezaSalasEstreia roda no worker para expurgar mensagens com mais de 30 dias de salas encerradas.
func executarLimpezaSalasEstreia(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}

	raw := strings.TrimSpace(client.Rpc("limpar_mensagens_antigas_salas", "", nil))
	return fmt.Sprintf("Mensagens antigas das salas de estreia expurgadas: %s", raw), nil
}
