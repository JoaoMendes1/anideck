// Social: seguir jogadores, atividade no perfil público e feed da comunidade.
// Toda a regra de quem aparece (perfil público, opção de esconder, bloqueio e o texto que
// só sai para quem já viu o episódio) mora no banco, em sql/098. O Go confere quem está
// olhando pelo token, chama as funções pelo service role e troca o id do autor pelo retrato.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

// SocialHandler responde pelas rotas de seguir, atividade e feed.
type SocialHandler struct{}

// Tamanho de página do feed e da atividade do perfil.
const (
	paginaFeed      = 30
	paginaAtividade = 20
)

// linhaEvento é uma linha de atividade_eventos, como o banco devolve.
type linhaEvento struct {
	Tipo          string          `json:"tipo"`
	Quando        string          `json:"quando"`
	AutorID       string          `json:"autor_id"`
	AutorHandle   string          `json:"autor_handle"`
	AutorNome     string          `json:"autor_nome"`
	AutorAvatar   json.RawMessage `json:"autor_avatar"`
	AutorNivel    int             `json:"autor_nivel"`
	MalID         int             `json:"mal_id"`
	Titulo        string          `json:"titulo"`
	Episodio      int             `json:"episodio"`
	EpisodioAte   int             `json:"episodio_ate"`
	ComentarioID  string          `json:"comentario_id"`
	Texto         string          `json:"texto"`
	TextoOculto   bool            `json:"texto_oculto"`
	ContemSpoiler bool            `json:"contem_spoiler"`
	AlvoHandle    string          `json:"alvo_handle"`
	AlvoNome      string          `json:"alvo_nome"`
}

// AutorDoEvento é quem fez a ação, com o que a tela precisa para o retrato. Sem user_id.
type AutorDoEvento struct {
	Handle         string          `json:"handle"`
	Nome           string          `json:"nome"`
	Nivel          int             `json:"nivel"`
	Avatar         json.RawMessage `json:"avatar,omitempty"`
	Estagio        string          `json:"estagio,omitempty"`
	PersonagemBase string          `json:"personagem_base,omitempty"`
}

// EventoDeAtividade é um item do feed ou da atividade do perfil.
type EventoDeAtividade struct {
	Tipo          string        `json:"tipo"`
	Quando        string        `json:"quando"`
	Autor         AutorDoEvento `json:"autor"`
	MalID         int           `json:"mal_id"`
	Titulo        string        `json:"titulo,omitempty"`
	Episodio      int           `json:"episodio,omitempty"`
	EpisodioAte   int           `json:"episodio_ate,omitempty"`
	ComentarioID  string        `json:"comentario_id,omitempty"`
	Texto         string        `json:"texto,omitempty"`
	TextoOculto   bool          `json:"texto_oculto,omitempty"`
	ContemSpoiler bool          `json:"contem_spoiler,omitempty"`
	AlvoHandle    string        `json:"alvo_handle,omitempty"`
	AlvoNome      string        `json:"alvo_nome,omitempty"`
}

// PaginaDeAtividade é a resposta do feed e da atividade: os eventos e o cursor da próxima
// página (vazio quando não há mais).
type PaginaDeAtividade struct {
	Eventos []EventoDeAtividade `json:"eventos"`
	Proximo string              `json:"proximo,omitempty"`
}

// montarEventos troca o id do autor pelo retrato e calcula o cursor. Separada do handler
// para ser testada sem banco. Com a página cheia, o cursor é o instante do último evento.
func montarEventos(linhas []linhaEvento, retratos map[string]retratoDoMembro, estagios []EstagioRPG, tamanhoPagina int) PaginaDeAtividade {
	saida := PaginaDeAtividade{Eventos: make([]EventoDeAtividade, 0, len(linhas))}
	for _, l := range linhas {
		autor := AutorDoEvento{Handle: l.AutorHandle, Nome: l.AutorNome, Nivel: l.AutorNivel}
		if autor.Nivel < 1 {
			autor.Nivel = 1
		}
		if avatarEscolhido(l.AutorAvatar) {
			autor.Avatar = l.AutorAvatar
		}
		estagio, _ := CalcularEstagio(autor.Nivel, estagios)
		autor.Estagio = estagio.ID
		if rt, ok := retratos[l.AutorID]; ok {
			autor.PersonagemBase = rt.Base
			if rt.Visual != "" {
				autor.Estagio = VisualParaRetrato(rt.Visual, autor.Nivel, estagios)
			}
		}
		saida.Eventos = append(saida.Eventos, EventoDeAtividade{
			Tipo: l.Tipo, Quando: l.Quando, Autor: autor, MalID: l.MalID, Titulo: l.Titulo,
			Episodio: l.Episodio, EpisodioAte: l.EpisodioAte, ComentarioID: l.ComentarioID,
			Texto: l.Texto, TextoOculto: l.TextoOculto, ContemSpoiler: l.ContemSpoiler,
			AlvoHandle: l.AlvoHandle, AlvoNome: l.AlvoNome,
		})
	}
	if tamanhoPagina > 0 && len(linhas) >= tamanhoPagina {
		saida.Proximo = linhas[len(linhas)-1].Quando
	}
	return saida
}

// cursorValido aceita só um instante RFC 3339 (o que a própria API devolveu em "proximo").
// Vazio é a primeira página.
func cursorValido(bruto string) (string, bool) {
	bruto = strings.TrimSpace(bruto)
	if bruto == "" {
		return "", true
	}
	if _, err := time.Parse(time.RFC3339Nano, bruto); err != nil {
		return "", false
	}
	return bruto, true
}

// quemOlha devolve o user_id de quem fez a requisição, ou nil para visitante.
func quemOlha(r *http.Request) interface{} {
	if id, ok := r.Context().Value(middleware.UserIDKey).(string); ok && id != "" {
		return id
	}
	return nil
}

// lerEventos chama uma função de atividade e monta a página. ok=false quando o banco falhou.
func lerEventos(funcao string, params map[string]interface{}, tamanhoPagina int) (PaginaDeAtividade, bool) {
	bruto := strings.TrimSpace(database.Client.Rpc(funcao, "", params))
	var linhas []linhaEvento
	if !strings.HasPrefix(bruto, "[") || json.Unmarshal([]byte(bruto), &linhas) != nil {
		log.Printf("[SOCIAL] %s devolveu %q", funcao, bruto)
		return PaginaDeAtividade{}, false
	}
	ids := make([]string, 0, len(linhas))
	vistos := map[string]bool{}
	for _, l := range linhas {
		if l.AutorID != "" && !vistos[l.AutorID] {
			vistos[l.AutorID] = true
			ids = append(ids, l.AutorID)
		}
	}
	retratos := map[string]retratoDoMembro{}
	if len(ids) > 0 {
		retratos = retratosDosMembros(ids)
	}
	return montarEventos(linhas, retratos, carregarEstagiosRPG(database.Client), tamanhoPagina), true
}

// HandleFeed devolve o feed da comunidade: ?aba=geral (padrão) ou ?aba=seguindo, e
// ?antes= com o cursor da página anterior.
func (h *SocialHandler) HandleFeed(w http.ResponseWriter, r *http.Request) {
	eu := quemOlha(r)
	if eu == nil {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}
	aba := r.URL.Query().Get("aba")
	if aba != "seguindo" {
		aba = "geral"
	}
	antes, ok := cursorValido(r.URL.Query().Get("antes"))
	if !ok {
		responderErroJSON(w, http.StatusBadRequest, "Cursor inválido.")
		return
	}
	params := map[string]interface{}{"p_eu": eu, "p_aba": aba, "p_limite": paginaFeed}
	if antes != "" {
		params["p_antes"] = antes
	}
	pagina, ok := lerEventos("feed_comunidade", params, paginaFeed)
	if !ok {
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível carregar o feed.")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	responderJSON(w, http.StatusOK, pagina)
}

// AssistindoAgora é um anime da lista "Assistindo" de um perfil, com o último episódio.
type AssistindoAgora struct {
	MalID          int    `json:"mal_id"`
	Titulo         string `json:"titulo,omitempty"`
	Episodios      int    `json:"episodios,omitempty"`
	UltimoEpisodio int    `json:"ultimo_episodio,omitempty"`
	AtualizadoEm   string `json:"atualizado_em,omitempty"`
}

// atividadeDoPerfil é a resposta da atividade de um perfil. "assistindo" só vem na
// primeira página.
type atividadeDoPerfil struct {
	PaginaDeAtividade
	Assistindo []AssistindoAgora `json:"assistindo,omitempty"`
}

// HandleAtividadeDoPerfil é pública (com login opcional): o que um @ assiste, comenta e
// curte. Visitante vê a atividade, mas nenhum texto de comentário (não marcou episódio).
func (h *SocialHandler) HandleAtividadeDoPerfil(w http.ResponseWriter, r *http.Request) {
	handle, problema := formatoDeHandle(chi.URLParam(r, "handle"))
	if problema != "" || database.Client == nil {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	antes, ok := cursorValido(r.URL.Query().Get("antes"))
	if !ok {
		responderErroJSON(w, http.StatusBadRequest, "Cursor inválido.")
		return
	}
	eu := quemOlha(r)
	params := map[string]interface{}{"p_eu": eu, "p_handle": handle, "p_limite": paginaAtividade}
	if antes != "" {
		params["p_antes"] = antes
	}
	pagina, ok := lerEventos("atividade_do_perfil", params, paginaAtividade)
	if !ok {
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível carregar a atividade.")
		return
	}
	resposta := atividadeDoPerfil{PaginaDeAtividade: pagina}
	if antes == "" {
		bruto := strings.TrimSpace(database.Client.Rpc("atividade_assistindo", "", map[string]interface{}{"p_eu": eu, "p_handle": handle}))
		if err := json.Unmarshal([]byte(bruto), &resposta.Assistindo); err != nil {
			log.Printf("[SOCIAL] atividade_assistindo(%s) devolveu %q", handle, bruto)
		}
	}
	w.Header().Set("Cache-Control", "no-store")
	responderJSON(w, http.StatusOK, resposta)
}

// ResumoSocial são os números de seguir de um perfil e a relação com quem olha.
type ResumoSocial struct {
	Seguidores      int  `json:"seguidores"`
	Seguindo        int  `json:"seguindo"`
	EuSigo          bool `json:"eu_sigo"`
	SouEu           bool `json:"sou_eu"`
	MostraAtividade bool `json:"mostra_atividade"`
}

// resumoDaResposta lê o resumo do banco. null (perfil privado ou inexistente) é false.
func resumoDaResposta(bruto string) (ResumoSocial, bool) {
	bruto = strings.TrimSpace(bruto)
	if bruto == "" || bruto == "null" || !strings.HasPrefix(bruto, "{") {
		return ResumoSocial{}, false
	}
	var corpo struct {
		ResumoSocial
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(bruto), &corpo); err != nil || corpo.Code != "" || corpo.Message != "" {
		return ResumoSocial{}, false
	}
	return corpo.ResumoSocial, true
}

// HandleResumoSocial é pública (com login opcional): seguidores, seguindo e se quem olha segue.
func (h *SocialHandler) HandleResumoSocial(w http.ResponseWriter, r *http.Request) {
	handle, problema := formatoDeHandle(chi.URLParam(r, "handle"))
	if problema != "" || database.Client == nil {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	bruto := database.Client.Rpc("social_resumo", "", map[string]interface{}{"p_eu": quemOlha(r), "p_handle": handle})
	resumo, ok := resumoDaResposta(bruto)
	if !ok {
		http.Error(w, "Membro não encontrado.", http.StatusNotFound)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	responderJSON(w, http.StatusOK, resumo)
}

// HandleSeguir segue (POST) ou deixa de seguir (DELETE) um @.
func (h *SocialHandler) HandleSeguir(w http.ResponseWriter, r *http.Request) {
	eu := quemOlha(r)
	if eu == nil {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	handle, problema := formatoDeHandle(chi.URLParam(r, "handle"))
	if problema != "" || database.Client == nil {
		responderErroJSON(w, http.StatusNotFound, "Membro não encontrado.")
		return
	}
	bruto := database.Client.Rpc("social_seguir", "", map[string]interface{}{
		"p_eu": eu, "p_handle": handle, "p_seguir": r.Method == http.MethodPost,
	})
	resumo, ok := resumoDaResposta(bruto)
	if !ok {
		msg := extrairMensagemErroBanco(bruto, "Não foi possível seguir agora.")
		status := http.StatusUnprocessableEntity
		if msg == "Membro não encontrado." {
			status = http.StatusNotFound
		}
		responderErroJSON(w, status, msg)
		return
	}
	responderJSON(w, http.StatusOK, resumo)
}
