package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// ComunidadeHandler cobre a Fase 15: perfil público, conversa por episódio (reações e
// comentários com escudo de spoiler), ranking de membros, Mana e Vitalidade.
//
// O escudo de spoiler mora no banco (RLS do sql/041): este código lê com o token de
// quem pede, então um comentário de episódio não assistido nem chega até aqui.
type ComunidadeHandler struct{}

var limiteDeComentarios = novoLimitadorDeTaxa()

const (
	comentariosPorJanela = 6
	janelaDeComentarios  = 10 * time.Minute
	limiteComentarios    = 100
)

func responderJSON(w http.ResponseWriter, status int, corpo interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(corpo); err != nil {
		log.Printf("[COMUNIDADE] falha ao serializar resposta: %v", err)
	}
}

// usuarioDaRequisicao devolve o id, o token e o cliente com o token, ou responde 401.
func usuarioDaRequisicao(w http.ResponseWriter, r *http.Request) (string, *supabase.Client, bool) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return "", nil, false
	}
	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return "", nil, false
	}
	return userID, client, true
}

// episodioDaRota lê {id} e {n}; responde 400 quando algum não é inteiro positivo.
func episodioDaRota(w http.ResponseWriter, r *http.Request) (int, int, bool) {
	malID, err1 := strconv.Atoi(chi.URLParam(r, "id"))
	numero, err2 := strconv.Atoi(chi.URLParam(r, "n"))
	if err1 != nil || err2 != nil || malID <= 0 || numero <= 0 {
		http.Error(w, "Anime ou episódio inválido.", http.StatusBadRequest)
		return 0, 0, false
	}
	return malID, numero, true
}

// =============================================================================
// Meu perfil, Mana e Vitalidade
// =============================================================================

type perfilProprio struct {
	Existe         bool   `json:"existe"`
	Handle         string `json:"handle"`
	Nome           string `json:"nome"`
	Bio            string `json:"bio"`
	Vitrine        []int  `json:"vitrine"`
	Publico        bool   `json:"publico"`
	DescansoInicio string `json:"descanso_inicio"`
	DescansoFim    string `json:"descanso_fim"`
}

type estadoComunidade struct {
	Perfil  perfilProprio    `json:"perfil"`
	Mana    int              `json:"mana"`
	HP      int              `json:"hp"`
	Regras  RegrasComunidade `json:"regras"`
	EmPausa bool             `json:"em_descanso"`
}

func lerPerfilProprio(client *supabase.Client, userID string) (perfilProprio, error) {
	data, _, err := client.From("profiles").
		Select("handle,nome,bio,vitrine,publico,descanso_inicio,descanso_fim", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return perfilProprio{}, err
	}
	var linhas []struct {
		Handle         string  `json:"handle"`
		Nome           string  `json:"nome"`
		Bio            string  `json:"bio"`
		Vitrine        []int   `json:"vitrine"`
		Publico        bool    `json:"publico"`
		DescansoInicio *string `json:"descanso_inicio"`
		DescansoFim    *string `json:"descanso_fim"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil || len(linhas) == 0 {
		return perfilProprio{Vitrine: []int{}, Publico: true}, err
	}
	l := linhas[0]
	p := perfilProprio{Existe: true, Handle: l.Handle, Nome: l.Nome, Bio: l.Bio, Vitrine: l.Vitrine, Publico: l.Publico}
	if p.Vitrine == nil {
		p.Vitrine = []int{}
	}
	if l.DescansoInicio != nil {
		p.DescansoInicio = *l.DescansoInicio
	}
	if l.DescansoFim != nil {
		p.DescansoFim = *l.DescansoFim
	}
	return p, nil
}

func lerDiasAtivos(client *supabase.Client) []string {
	data, _, err := client.From("view_user_watch_dates").Select("dia", "", false).Execute()
	if err != nil {
		return nil
	}
	var linhas []struct {
		Dia string `json:"dia"`
	}
	_ = json.Unmarshal(data, &linhas)
	dias := make([]string, 0, len(linhas))
	for _, l := range linhas {
		dias = append(dias, l.Dia)
	}
	return dias
}

// lerMinhaMana chama a função do banco, que já aplica a recarga desde o último gasto.
func lerMinhaMana(client *supabase.Client, regras RegrasComunidade) int {
	bruto := strings.TrimSpace(client.Rpc("minha_mana", "", map[string]interface{}{}))
	if bruto == "" || bruto == "null" {
		// Sem perfil ainda: a Mana nasce cheia na criação.
		return regras.MPMax
	}
	valor, err := strconv.ParseFloat(bruto, 64)
	if err != nil {
		log.Printf("[COMUNIDADE] minha_mana devolveu %q", bruto)
		return 0
	}
	return int(valor)
}

func (h *ComunidadeHandler) montarEstado(client *supabase.Client, userID string) (estadoComunidade, error) {
	regras := lerRegrasComunidade(client)
	perfil, err := lerPerfilProprio(client, userID)
	if err != nil {
		return estadoComunidade{}, err
	}
	hoje := time.Now().In(fusoGuilda)
	hojeTexto := hoje.Format("2006-01-02")
	return estadoComunidade{
		Perfil:  perfil,
		Mana:    lerMinhaMana(client, regras),
		HP:      CalcularHP(lerDiasAtivos(client), perfil.DescansoInicio, perfil.DescansoFim, hoje, regras),
		Regras:  regras,
		EmPausa: perfil.DescansoFim != "" && perfil.DescansoInicio <= hojeTexto && hojeTexto <= perfil.DescansoFim,
	}, nil
}

// HandleGetEu devolve o perfil próprio (ou existe=false), a Mana e a Vitalidade.
func (h *ComunidadeHandler) HandleGetEu(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	estado, err := h.montarEstado(client, userID)
	if err != nil {
		log.Printf("[ERRO DB] HandleGetEu (user=%s): %v", userID, err)
		http.Error(w, "Não foi possível carregar seu perfil.", http.StatusInternalServerError)
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleSalvarEu cria o perfil público na primeira vez e o atualiza nas seguintes.
// Não usa upsert: o ON CONFLICT DO UPDATE tentaria gravar user_id, coluna sem GRANT
// de UPDATE (sql/041).
func (h *ComunidadeHandler) HandleSalvarEu(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	var req struct {
		Handle  string `json:"handle"`
		Nome    string `json:"nome"`
		Bio     string `json:"bio"`
		Vitrine []int  `json:"vitrine"`
		Publico *bool  `json:"publico"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<14)).Decode(&req); err != nil {
		http.Error(w, "Pedido inválido.", http.StatusBadRequest)
		return
	}

	handle, problema := normalizarHandle(req.Handle, ehDaEquipe(userID))
	if problema != "" {
		http.Error(w, problema, http.StatusBadRequest)
		return
	}
	nome := strings.TrimSpace(req.Nome)
	if n := len([]rune(nome)); n < 1 || n > 40 {
		http.Error(w, "O nome de exibição vai de 1 a 40 caracteres.", http.StatusBadRequest)
		return
	}
	bio := strings.TrimSpace(req.Bio)
	if len([]rune(bio)) > 160 {
		http.Error(w, "A bio vai até 160 caracteres.", http.StatusBadRequest)
		return
	}
	vitrine := make([]int, 0, 5)
	vistos := map[int]bool{}
	for _, id := range req.Vitrine {
		if id > 0 && !vistos[id] && len(vitrine) < 5 {
			vitrine = append(vitrine, id)
			vistos[id] = true
		}
	}
	publico := true
	if req.Publico != nil {
		publico = *req.Publico
	}

	atual, err := lerPerfilProprio(client, userID)
	if err != nil {
		log.Printf("[ERRO DB] HandleSalvarEu leitura (user=%s): %v", userID, err)
		http.Error(w, "Não foi possível salvar agora.", http.StatusInternalServerError)
		return
	}

	campos := map[string]interface{}{"handle": handle, "nome": nome, "bio": bio, "vitrine": vitrine, "publico": publico}
	if atual.Existe {
		campos["updated_at"] = time.Now().UTC().Format(time.RFC3339)
		_, _, err = client.From("profiles").Update(campos, "minimal", "").Eq("user_id", userID).Execute()
	} else {
		campos["user_id"] = userID
		_, _, err = client.From("profiles").Insert(campos, false, "", "minimal", "").Execute()
	}
	if err != nil {
		status, msg := erroDoBanco(err)
		if status == http.StatusConflict {
			msg = "Esse @ já está em uso. Escolha outro."
		}
		log.Printf("[COMUNIDADE] HandleSalvarEu (user=%s): %v", userID, err)
		http.Error(w, msg, status)
		return
	}

	estado, err := h.montarEstado(client, userID)
	if err != nil {
		responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleAtivarDescanso congela a Vitalidade por alguns dias (função ativar_descanso).
func (h *ComunidadeHandler) HandleAtivarDescanso(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	var req struct {
		Dias int `json:"dias"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&req); err != nil {
		http.Error(w, "Pedido inválido.", http.StatusBadRequest)
		return
	}
	bruto := strings.TrimSpace(client.Rpc("ativar_descanso", "", map[string]interface{}{"p_dias": req.Dias}))
	if bruto == "" {
		// O Rpc devolve vazio em toda falha de transporte (ver interpretarRespostaRPC).
		http.Error(w, "Não foi possível falar com o banco.", http.StatusBadGateway)
		return
	}
	var falha erroPostgREST
	if json.Unmarshal([]byte(bruto), &falha) == nil && falha.Message != "" {
		status, msg := erroDoBanco(errorString("(" + falha.Code + ") " + falha.Message))
		http.Error(w, msg, status)
		return
	}
	estado, err := h.montarEstado(client, userID)
	if err != nil {
		responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

type errorString string

func (e errorString) Error() string { return string(e) }

// =============================================================================
// Conversa por episódio
// =============================================================================

type contagemEpisodio struct {
	EpisodeNumber int            `json:"episode_number"`
	Comentarios   int            `json:"comentarios"`
	Reacoes       map[string]int `json:"reacoes"`
}

// HandleContagemConversa é público: diz quantos comentários e reações cada episódio
// tem, sem conteúdo. É o que quem ainda não assistiu enxerga.
func (h *ComunidadeHandler) HandleContagemConversa(w http.ResponseWriter, r *http.Request) {
	malID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || malID <= 0 {
		http.Error(w, "Anime inválido.", http.StatusBadRequest)
		return
	}
	if database.Client == nil {
		http.Error(w, "Banco indisponível.", http.StatusServiceUnavailable)
		return
	}
	bruto := strings.TrimSpace(database.Client.Rpc("contagem_conversa", "", map[string]interface{}{"p_mal_id": malID}))
	var contagens []contagemEpisodio
	if err := json.Unmarshal([]byte(bruto), &contagens); err != nil {
		log.Printf("[COMUNIDADE] contagem_conversa(%d) devolveu %q", malID, bruto)
		http.Error(w, "Não foi possível carregar a conversa.", http.StatusInternalServerError)
		return
	}
	if contagens == nil {
		contagens = []contagemEpisodio{}
	}
	responderJSON(w, http.StatusOK, contagens)
}

type autorComentario struct {
	Handle string `json:"handle"`
	Nome   string `json:"nome"`
}

type comentarioDaConversa struct {
	ID            string          `json:"id"`
	Autor         autorComentario `json:"autor"`
	Texto         string          `json:"texto"`
	MomentoSeg    *int            `json:"momento_seg"`
	CreatedAt     string          `json:"created_at"`
	EditadoEm     *string         `json:"editado_em"`
	Curtidas      int             `json:"curtidas"`
	CurtidoPorMim bool            `json:"curtido_por_mim"`
	Meu           bool            `json:"meu"`
	Oculto        bool            `json:"oculto"`
}

type linhaComentario struct {
	ID           string  `json:"id"`
	UserID       string  `json:"user_id"`
	Texto        string  `json:"texto"`
	MomentoSeg   *int    `json:"momento_seg"`
	Oculto       bool    `json:"oculto"`
	CreatedAt    string  `json:"created_at"`
	EditadoEm    *string `json:"editado_em"`
	CommentLikes []struct {
		Count int `json:"count"`
	} `json:"comment_likes"`
}

// montarConversa junta comentários, autores, bloqueios e curtidas numa lista pronta
// para a tela. Separada do handler para ser testada sem banco.
func montarConversa(linhas []linhaComentario, autores map[string]autorComentario, bloqueados, curtidos map[string]bool, eu, ordem string) []comentarioDaConversa {
	lista := make([]comentarioDaConversa, 0, len(linhas))
	for _, l := range linhas {
		if bloqueados[l.UserID] {
			continue
		}
		autor, ok := autores[l.UserID]
		if !ok {
			autor = autorComentario{Nome: "Membro"}
		}
		curtidas := 0
		if len(l.CommentLikes) > 0 {
			curtidas = l.CommentLikes[0].Count
		}
		lista = append(lista, comentarioDaConversa{
			ID: l.ID, Autor: autor, Texto: l.Texto, MomentoSeg: l.MomentoSeg,
			CreatedAt: l.CreatedAt, EditadoEm: l.EditadoEm, Curtidas: curtidas,
			CurtidoPorMim: curtidos[l.ID], Meu: l.UserID == eu, Oculto: l.Oculto,
		})
	}
	if ordem == "populares" {
		sort.SliceStable(lista, func(i, j int) bool {
			if lista[i].Curtidas != lista[j].Curtidas {
				return lista[i].Curtidas > lista[j].Curtidas
			}
			return lista[i].CreatedAt > lista[j].CreatedAt
		})
	}
	return lista
}

type conversaDoEpisodio struct {
	Assistiu      bool                   `json:"assistiu"`
	MinhasReacoes []string               `json:"minhas_reacoes"`
	Comentarios   []comentarioDaConversa `json:"comentarios"`
}

// HandleConversaDoEpisodio devolve os comentários que o usuário pode ler (o RLS já
// esconde os de episódio não marcado), as reações dele e se ele assistiu.
func (h *ComunidadeHandler) HandleConversaDoEpisodio(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	malID, numero, ok := episodioDaRota(w, r)
	if !ok {
		return
	}
	mal, ep := strconv.Itoa(malID), strconv.Itoa(numero)

	resposta := conversaDoEpisodio{MinhasReacoes: []string{}, Comentarios: []comentarioDaConversa{}}

	if data, _, err := client.From("episode_progress").Select("episode_number", "", false).
		Eq("user_id", userID).Eq("mal_id", mal).Eq("episode_number", ep).Execute(); err == nil {
		var linhas []map[string]interface{}
		_ = json.Unmarshal(data, &linhas)
		resposta.Assistiu = len(linhas) > 0
	}

	if data, _, err := client.From("episode_reactions").Select("reacao", "", false).
		Eq("user_id", userID).Eq("mal_id", mal).Eq("episode_number", ep).Execute(); err == nil {
		var linhas []struct {
			Reacao string `json:"reacao"`
		}
		_ = json.Unmarshal(data, &linhas)
		for _, l := range linhas {
			resposta.MinhasReacoes = append(resposta.MinhasReacoes, l.Reacao)
		}
	}

	data, _, err := client.From("episode_comments").
		Select("id,user_id,texto,momento_seg,oculto,created_at,editado_em,comment_likes(count)", "", false).
		Eq("mal_id", mal).Eq("episode_number", ep).
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(limiteComentarios, "").
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleConversaDoEpisodio (mal=%d ep=%d): %v", malID, numero, err)
		http.Error(w, "Não foi possível carregar a conversa.", http.StatusInternalServerError)
		return
	}
	var linhas []linhaComentario
	if err := json.Unmarshal(data, &linhas); err != nil {
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}
	if len(linhas) == 0 {
		responderJSON(w, http.StatusOK, resposta)
		return
	}

	ids := make([]string, 0, len(linhas))
	autoresIDs := map[string]bool{}
	for _, l := range linhas {
		ids = append(ids, l.ID)
		autoresIDs[l.UserID] = true
	}
	listaAutores := make([]string, 0, len(autoresIDs))
	for id := range autoresIDs {
		listaAutores = append(listaAutores, id)
	}

	autores := map[string]autorComentario{}
	if dataA, _, errA := client.From("profiles").Select("user_id,handle,nome", "", false).In("user_id", listaAutores).Execute(); errA == nil {
		var perfis []struct {
			UserID string `json:"user_id"`
			Handle string `json:"handle"`
			Nome   string `json:"nome"`
		}
		_ = json.Unmarshal(dataA, &perfis)
		for _, p := range perfis {
			autores[p.UserID] = autorComentario{Handle: p.Handle, Nome: p.Nome}
		}
	}

	bloqueados := map[string]bool{}
	if dataB, _, errB := client.From("user_blocks").Select("blocked_id", "", false).Eq("blocker_id", userID).Execute(); errB == nil {
		var bs []struct {
			BlockedID string `json:"blocked_id"`
		}
		_ = json.Unmarshal(dataB, &bs)
		for _, b := range bs {
			bloqueados[b.BlockedID] = true
		}
	}

	curtidos := map[string]bool{}
	if dataC, _, errC := client.From("comment_likes").Select("comment_id", "", false).Eq("user_id", userID).In("comment_id", ids).Execute(); errC == nil {
		var cs []struct {
			CommentID string `json:"comment_id"`
		}
		_ = json.Unmarshal(dataC, &cs)
		for _, c := range cs {
			curtidos[c.CommentID] = true
		}
	}

	resposta.Comentarios = montarConversa(linhas, autores, bloqueados, curtidos, userID, r.URL.Query().Get("ordem"))
	responderJSON(w, http.StatusOK, resposta)
}

// HandleComentar grava o comentário. A Mana é cobrada pelo gatilho do banco na mesma
// transação; sem Mana ou sem o episódio marcado, o INSERT é recusado.
func (h *ComunidadeHandler) HandleComentar(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	malID, numero, ok := episodioDaRota(w, r)
	if !ok {
		return
	}
	var req struct {
		Texto      string `json:"texto"`
		MomentoSeg *int   `json:"momento_seg"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<14)).Decode(&req); err != nil {
		http.Error(w, "Pedido inválido.", http.StatusBadRequest)
		return
	}
	texto, problema := validarComentario(req.Texto, req.MomentoSeg)
	if problema != "" {
		http.Error(w, problema, http.StatusBadRequest)
		return
	}
	if !limiteDeComentarios.permitir(userID, comentariosPorJanela, janelaDeComentarios, time.Now()) {
		http.Error(w, "Muitos comentários em pouco tempo. Espere alguns minutos.", http.StatusTooManyRequests)
		return
	}

	linha := map[string]interface{}{
		"user_id": userID, "mal_id": malID, "episode_number": numero, "texto": texto,
	}
	if req.MomentoSeg != nil {
		linha["momento_seg"] = *req.MomentoSeg
	}
	data, _, err := client.From("episode_comments").Insert(linha, false, "", "representation", "").Execute()
	if err != nil {
		status, msg := erroDoBanco(err)
		log.Printf("[COMUNIDADE] HandleComentar (user=%s mal=%d ep=%d): %v", userID, malID, numero, err)
		http.Error(w, msg, status)
		return
	}
	var criados []linhaComentario
	_ = json.Unmarshal(data, &criados)
	if len(criados) == 0 {
		responderJSON(w, http.StatusCreated, map[string]bool{"ok": true})
		return
	}
	perfil, _ := lerPerfilProprio(client, userID)
	lista := montarConversa(criados, map[string]autorComentario{userID: {Handle: perfil.Handle, Nome: perfil.Nome}}, nil, nil, userID, "")
	responderJSON(w, http.StatusCreated, lista[0])
}

// HandleApagarComentario remove o próprio comentário (o RLS também libera o admin).
func (h *ComunidadeHandler) HandleApagarComentario(w http.ResponseWriter, r *http.Request) {
	_, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "cid")
	data, _, err := client.From("episode_comments").Delete("representation", "").Eq("id", id).Execute()
	if err != nil {
		status, msg := erroDoBanco(err)
		http.Error(w, msg, status)
		return
	}
	var apagados []map[string]interface{}
	_ = json.Unmarshal(data, &apagados)
	if len(apagados) == 0 {
		// Comentário de outra pessoa ou inexistente: 404, sem confirmar que existe.
		http.Error(w, "Comentário não encontrado.", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleCurtir liga (POST) ou desliga (DELETE) a curtida num comentário visível.
func (h *ComunidadeHandler) HandleCurtir(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "cid")
	var err error
	if r.Method == http.MethodDelete {
		_, _, err = client.From("comment_likes").Delete("minimal", "").Eq("comment_id", id).Eq("user_id", userID).Execute()
	} else {
		_, _, err = client.From("comment_likes").Insert(map[string]interface{}{"comment_id": id, "user_id": userID}, false, "", "minimal", "").Execute()
	}
	if err != nil {
		status, msg := erroDoBanco(err)
		if status == http.StatusConflict {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if status == http.StatusForbidden {
			msg = "Não é possível curtir este comentário."
		}
		http.Error(w, msg, status)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleDenunciar registra a denúncia para a fila de moderação do Painel Admin.
func (h *ComunidadeHandler) HandleDenunciar(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	var req struct {
		Motivo  string `json:"motivo"`
		Detalhe string `json:"detalhe"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil || !motivosDenuncia[req.Motivo] {
		http.Error(w, "Escolha o motivo da denúncia.", http.StatusBadRequest)
		return
	}
	detalhe := strings.TrimSpace(req.Detalhe)
	if len([]rune(detalhe)) > 300 {
		http.Error(w, "O detalhe vai até 300 caracteres.", http.StatusBadRequest)
		return
	}
	linha := map[string]interface{}{"comment_id": chi.URLParam(r, "cid"), "reporter_id": userID, "motivo": req.Motivo, "detalhe": detalhe}
	if _, _, err := client.From("comment_reports").Insert(linha, false, "", "minimal", "").Execute(); err != nil {
		status, msg := erroDoBanco(err)
		if status == http.StatusConflict {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if status == http.StatusForbidden {
			status, msg = http.StatusNotFound, "Comentário não encontrado."
		}
		http.Error(w, msg, status)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleReagir liga (PUT) ou desliga (DELETE) uma reação num episódio assistido.
func (h *ComunidadeHandler) HandleReagir(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	malID, numero, ok := episodioDaRota(w, r)
	if !ok {
		return
	}
	reacao := chi.URLParam(r, "reacao")
	if !reacaoValida(reacao) {
		http.Error(w, "Reação desconhecida.", http.StatusBadRequest)
		return
	}
	var err error
	if r.Method == http.MethodDelete {
		_, _, err = client.From("episode_reactions").Delete("minimal", "").
			Eq("user_id", userID).Eq("mal_id", strconv.Itoa(malID)).Eq("episode_number", strconv.Itoa(numero)).Eq("reacao", reacao).Execute()
	} else {
		linha := map[string]interface{}{"user_id": userID, "mal_id": malID, "episode_number": numero, "reacao": reacao}
		_, _, err = client.From("episode_reactions").Insert(linha, false, "", "minimal", "").Execute()
	}
	if err != nil {
		status, msg := erroDoBanco(err)
		if status == http.StatusConflict {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, msg, status)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleBloquear liga (POST) ou desliga (DELETE) o bloqueio de um @: os comentários
// dele deixam de aparecer para quem bloqueou.
func (h *ComunidadeHandler) HandleBloquear(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	handle, problema := formatoDeHandle(chi.URLParam(r, "handle"))
	if problema != "" {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	data, _, err := client.From("profiles").Select("user_id", "", false).Eq("handle", handle).Execute()
	var alvos []struct {
		UserID string `json:"user_id"`
	}
	if err == nil {
		_ = json.Unmarshal(data, &alvos)
	}
	if len(alvos) == 0 || alvos[0].UserID == userID {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	if r.Method == http.MethodDelete {
		_, _, err = client.From("user_blocks").Delete("minimal", "").Eq("blocker_id", userID).Eq("blocked_id", alvos[0].UserID).Execute()
	} else {
		_, _, err = client.From("user_blocks").Insert(map[string]interface{}{"blocker_id": userID, "blocked_id": alvos[0].UserID}, false, "", "minimal", "").Execute()
	}
	if err != nil {
		status, msg := erroDoBanco(err)
		if status != http.StatusConflict {
			http.Error(w, msg, status)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleListarBloqueios devolve os @ que o usuário bloqueou (só os de perfil público
// aparecem com @; o RLS de profiles esconde os demais).
func (h *ComunidadeHandler) HandleListarBloqueios(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	data, _, err := client.From("user_blocks").Select("blocked_id", "", false).Eq("blocker_id", userID).Execute()
	if err != nil {
		http.Error(w, "Não foi possível carregar seus bloqueios.", http.StatusInternalServerError)
		return
	}
	var bs []struct {
		BlockedID string `json:"blocked_id"`
	}
	_ = json.Unmarshal(data, &bs)
	handles := []string{}
	if len(bs) > 0 {
		ids := make([]string, 0, len(bs))
		for _, b := range bs {
			ids = append(ids, b.BlockedID)
		}
		if dataP, _, errP := client.From("profiles").Select("handle", "", false).In("user_id", ids).Execute(); errP == nil {
			var ps []struct {
				Handle string `json:"handle"`
			}
			_ = json.Unmarshal(dataP, &ps)
			for _, p := range ps {
				handles = append(handles, p.Handle)
			}
		}
	}
	sort.Strings(handles)
	responderJSON(w, http.StatusOK, handles)
}

// =============================================================================
// Ranking de membros e perfil público
// =============================================================================

type membroNoRanking struct {
	Posicao    int    `json:"posicao"`
	Handle     string `json:"handle"`
	Nome       string `json:"nome"`
	XP         int    `json:"xp"`
	Nivel      int    `json:"nivel"`
	Rank       string `json:"rank"`
	TituloRank string `json:"titulo_rank"`
}

// HandleRankingMembros é público. periodo=semana conta o XP desde segunda-feira
// (fuso de Brasília); qualquer outro valor é o Hall da Fama, de todos os tempos.
func (h *ComunidadeHandler) HandleRankingMembros(w http.ResponseWriter, r *http.Request) {
	if database.Client == nil {
		http.Error(w, "Banco indisponível.", http.StatusServiceUnavailable)
		return
	}
	periodo := "geral"
	if r.URL.Query().Get("periodo") == "semana" {
		periodo = "semana"
	}
	bruto := strings.TrimSpace(database.Client.Rpc("ranking_membros", "", map[string]interface{}{"p_periodo": periodo, "p_limite": 50}))
	var linhas []struct {
		Posicao int    `json:"posicao"`
		Handle  string `json:"handle"`
		Nome    string `json:"nome"`
		XP      int    `json:"xp"`
	}
	if err := json.Unmarshal([]byte(bruto), &linhas); err != nil {
		log.Printf("[COMUNIDADE] ranking_membros devolveu %q", bruto)
		http.Error(w, "Não foi possível carregar o ranking.", http.StatusInternalServerError)
		return
	}

	// Nível e rank sempre pelo XP de todos os tempos: na liga semanal o número da
	// semana ordena, mas a classe mostrada é a da pessoa.
	xpTotal := map[string]int{}
	if periodo == "semana" && len(linhas) > 0 {
		brutoGeral := strings.TrimSpace(database.Client.Rpc("ranking_membros", "", map[string]interface{}{"p_periodo": "geral", "p_limite": 100}))
		var geral []struct {
			Handle string `json:"handle"`
			XP     int    `json:"xp"`
		}
		_ = json.Unmarshal([]byte(brutoGeral), &geral)
		for _, g := range geral {
			xpTotal[g.Handle] = g.XP
		}
	}

	_, ranks, _ := carregarConfigGuilda(nil)
	lista := make([]membroNoRanking, 0, len(linhas))
	for _, l := range linhas {
		base := l.XP
		if periodo == "semana" {
			if total, ok := xpTotal[l.Handle]; ok {
				base = total
			}
		}
		status := CalcularNivelERank(base, ranks)
		lista = append(lista, membroNoRanking{
			Posicao: l.Posicao, Handle: l.Handle, Nome: l.Nome, XP: l.XP,
			Nivel: status.Nivel, Rank: status.Rank, TituloRank: status.TituloRank,
		})
	}
	responderJSON(w, http.StatusOK, lista)
}

type perfilPublico struct {
	Handle          string         `json:"handle"`
	Nome            string         `json:"nome"`
	Bio             string         `json:"bio"`
	Vitrine         []int          `json:"vitrine"`
	MembroDesde     string         `json:"membro_desde"`
	XPTotal         int            `json:"xp_total"`
	EpisodiosVistos int            `json:"episodios_vistos"`
	Comentarios     int            `json:"comentarios"`
	Status          map[string]int `json:"status"`
	Nivel           int            `json:"nivel"`
	Rank            string         `json:"rank"`
	TituloRank      string         `json:"titulo_rank"`
	HP              int            `json:"hp"`
}

// HandlePerfilPublico é público: o perfil de um @ com perfil aberto.
func (h *ComunidadeHandler) HandlePerfilPublico(w http.ResponseWriter, r *http.Request) {
	handle, problema := formatoDeHandle(chi.URLParam(r, "handle"))
	if problema != "" || database.Client == nil {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	bruto := strings.TrimSpace(database.Client.Rpc("perfil_publico", "", map[string]interface{}{"p_handle": handle}))
	if bruto == "" || bruto == "null" {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	var dados struct {
		perfilPublico
		DiasAtivos     []string `json:"dias_ativos"`
		DescansoInicio *string  `json:"descanso_inicio"`
		DescansoFim    *string  `json:"descanso_fim"`
	}
	if err := json.Unmarshal([]byte(bruto), &dados); err != nil || dados.Handle == "" {
		log.Printf("[COMUNIDADE] perfil_publico(%s) devolveu %q", handle, bruto)
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	_, ranks, _ := carregarConfigGuilda(nil)
	status := CalcularNivelERank(dados.XPTotal, ranks)
	p := dados.perfilPublico
	p.Nivel, p.Rank, p.TituloRank = status.Nivel, status.Rank, status.TituloRank
	inicio, fim := "", ""
	if dados.DescansoInicio != nil {
		inicio = *dados.DescansoInicio
	}
	if dados.DescansoFim != nil {
		fim = *dados.DescansoFim
	}
	p.HP = CalcularHP(dados.DiasAtivos, inicio, fim, time.Now().In(fusoGuilda), lerRegrasComunidade(database.Client))
	if p.Vitrine == nil {
		p.Vitrine = []int{}
	}
	if p.Status == nil {
		p.Status = map[string]int{}
	}
	responderJSON(w, http.StatusOK, p)
}
