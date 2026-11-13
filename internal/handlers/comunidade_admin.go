package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
)

// Moderação e regras da comunidade no Painel Admin.
//
// POR QUE SERVICE ROLE AQUI: ocultar um comentário e fechar denúncias grava colunas
// que o papel authenticated não tem permissão de alterar (sql/041, GRANT por coluna).
// As rotas ficam atrás de RequireAdmin, então a chave só é usada depois de o
// servidor confirmar que quem pede é admin.

type denunciaBruta struct {
	ID        string `json:"id"`
	CommentID string `json:"comment_id"`
	Motivo    string `json:"motivo"`
	Detalhe   string `json:"detalhe"`
	CreatedAt string `json:"created_at"`
}

type comentarioDenunciado struct {
	ID            string `json:"id"`
	UserID        string `json:"user_id"`
	MalID         int    `json:"mal_id"`
	EpisodeNumber int    `json:"episode_number"`
	Texto         string `json:"texto"`
	Oculto        bool   `json:"oculto"`
	CreatedAt     string `json:"created_at"`
}

type itemModeracao struct {
	Comentario   comentarioDenunciado `json:"comentario"`
	TituloAnime  string               `json:"titulo_anime"`
	Autor        autorComentario      `json:"autor"`
	Denuncias    int                  `json:"denuncias"`
	Motivos      map[string]int       `json:"motivos"`
	Detalhes     []string             `json:"detalhes"`
	UltimaEm     string               `json:"ultima_em"`
	PrimeiraEm   string               `json:"primeira_em"`
	comentarioOK bool
}

// agruparDenuncias junta as denúncias abertas por comentário e ordena pela mais
// denunciada. Comentário já apagado some da fila.
func agruparDenuncias(denuncias []denunciaBruta, comentarios map[string]comentarioDenunciado, autores map[string]autorComentario) []itemModeracao {
	porComentario := map[string]*itemModeracao{}
	ordem := []string{}
	for _, d := range denuncias {
		item, ok := porComentario[d.CommentID]
		if !ok {
			c, existe := comentarios[d.CommentID]
			item = &itemModeracao{Comentario: c, Motivos: map[string]int{}, Detalhes: []string{}, comentarioOK: existe}
			if existe {
				if a, temAutor := autores[c.UserID]; temAutor {
					item.Autor = a
				} else {
					item.Autor = autorComentario{Nome: "Membro sem perfil público"}
				}
			}
			porComentario[d.CommentID] = item
			ordem = append(ordem, d.CommentID)
		}
		item.Denuncias++
		item.Motivos[d.Motivo]++
		if d.Detalhe != "" && len(item.Detalhes) < 5 {
			item.Detalhes = append(item.Detalhes, d.Detalhe)
		}
		if item.UltimaEm == "" || d.CreatedAt > item.UltimaEm {
			item.UltimaEm = d.CreatedAt
		}
		if item.PrimeiraEm == "" || d.CreatedAt < item.PrimeiraEm {
			item.PrimeiraEm = d.CreatedAt
		}
	}
	lista := make([]itemModeracao, 0, len(ordem))
	for _, id := range ordem {
		if porComentario[id].comentarioOK {
			lista = append(lista, *porComentario[id])
		}
	}
	sort.SliceStable(lista, func(i, j int) bool {
		if lista[i].Denuncias != lista[j].Denuncias {
			return lista[i].Denuncias > lista[j].Denuncias
		}
		return lista[i].UltimaEm > lista[j].UltimaEm
	})
	return lista
}

type resumoComunidade struct {
	Perfis             int64 `json:"perfis"`
	ComentariosSemana  int64 `json:"comentarios_semana"`
	ReacoesSemana      int64 `json:"reacoes_semana"`
	DenunciasPendentes int   `json:"denuncias_pendentes"`
}

// HandleListarModeracao devolve a fila de comentários denunciados e um resumo da
// atividade da comunidade.
func (h *ComunidadeHandler) HandleListarModeracao(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil {
		if token, ok := r.Context().Value(middleware.TokenKey).(string); ok && token != "" {
			client, _ = database.ClientWithToken(token)
		}
	}
	if client == nil {
		log.Printf("[MODERACAO] cliente Supabase indisponível: %v", err)
		responderJSON(w, http.StatusOK, map[string]interface{}{
			"fila":   []itemModeracao{},
			"resumo": resumoComunidade{},
		})
		return
	}

	data, _, err := client.From("comment_reports").
		Select("id,comment_id,motivo,detalhe,created_at", "", false).
		Eq("resolvido", "false").
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(300, "").
		Execute()
	if err != nil {
		log.Printf("[MODERACAO] leitura das denúncias: %v", err)
		responderJSON(w, http.StatusOK, map[string]interface{}{
			"fila":   []itemModeracao{},
			"resumo": resumoComunidade{},
		})
		return
	}
	var denuncias []denunciaBruta
	_ = json.Unmarshal(data, &denuncias)

	comentarios := map[string]comentarioDenunciado{}
	autores := map[string]autorComentario{}
	if len(denuncias) > 0 {
		ids := make([]string, 0, len(denuncias))
		vistos := map[string]bool{}
		for _, d := range denuncias {
			if !vistos[d.CommentID] {
				vistos[d.CommentID] = true
				ids = append(ids, d.CommentID)
			}
		}
		if dataC, _, errC := client.From("episode_comments").
			Select("id,user_id,mal_id,episode_number,texto,oculto,created_at", "", false).
			In("id", ids).Execute(); errC == nil {
			var cs []comentarioDenunciado
			_ = json.Unmarshal(dataC, &cs)
			usuarios := []string{}
			for _, c := range cs {
				comentarios[c.ID] = c
				usuarios = append(usuarios, c.UserID)
			}
			if len(usuarios) > 0 {
				if dataP, _, errP := client.From("profiles").Select("user_id,handle,nome", "", false).In("user_id", usuarios).Execute(); errP == nil {
					var ps []struct {
						UserID string `json:"user_id"`
						Handle string `json:"handle"`
						Nome   string `json:"nome"`
					}
					_ = json.Unmarshal(dataP, &ps)
					for _, p := range ps {
						autores[p.UserID] = autorComentario{Handle: p.Handle, Nome: p.Nome}
					}
				}
			}
		}
	}

	fila := agruparDenuncias(denuncias, comentarios, autores)
	if len(fila) > 0 {
		idsAnime := []string{}
		for _, item := range fila {
			idsAnime = append(idsAnime, strconv.Itoa(item.Comentario.MalID))
		}
		if dataT, _, errT := client.From("anime_metadata_cache").Select("mal_id,title", "", false).In("mal_id", idsAnime).Execute(); errT == nil {
			var ts []struct {
				MalID int    `json:"mal_id"`
				Title string `json:"title"`
			}
			_ = json.Unmarshal(dataT, &ts)
			titulos := map[int]string{}
			for _, t := range ts {
				titulos[t.MalID] = t.Title
			}
			for i := range fila {
				fila[i].TituloAnime = titulos[fila[i].Comentario.MalID]
			}
		}
	}
	semana := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	resumo := resumoComunidade{DenunciasPendentes: len(denuncias)}
	if _, n, errN := client.From("profiles").Select("user_id", "exact", true).Execute(); errN == nil {
		resumo.Perfis = n
	}
	if _, n, errN := client.From("episode_comments").Select("id", "exact", true).Gte("created_at", semana).Execute(); errN == nil {
		resumo.ComentariosSemana = n
	}
	if _, n, errN := client.From("episode_reactions").Select("user_id", "exact", true).Gte("created_at", semana).Execute(); errN == nil {
		resumo.ReacoesSemana = n
	}

	responderJSON(w, http.StatusOK, map[string]interface{}{"fila": fila, "resumo": resumo})
}

// HandleModerar aplica a decisão sobre um comentário denunciado:
// ocultar (some para todos, menos autor e admin), reexibir, apagar ou dispensar.
func (h *ComunidadeHandler) HandleModerar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Acao string `json:"acao"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&req); err != nil {
		http.Error(w, "Pedido inválido.", http.StatusBadRequest)
		return
	}
	id := chi.URLParam(r, "cid")
	client, err := database.ServiceRoleClient()
	if err != nil {
		if token, ok := r.Context().Value(middleware.TokenKey).(string); ok && token != "" {
			client, _ = database.ClientWithToken(token)
		}
	}
	if client == nil {
		http.Error(w, "Moderação indisponível: chave de serviço ausente.", http.StatusServiceUnavailable)
		return
	}

	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)
	fecharDenuncias := func() error {
		_, _, e := client.From("comment_reports").Update(map[string]interface{}{"resolvido": true}, "minimal", "").Eq("comment_id", id).Execute()
		return e
	}

	switch req.Acao {
	case "ocultar", "reexibir":
		_, _, err = client.From("episode_comments").Update(map[string]interface{}{"oculto": req.Acao == "ocultar"}, "minimal", "").Eq("id", id).Execute()
		if err == nil {
			err = fecharDenuncias()
		}
	case "apagar":
		_, _, err = client.From("episode_comments").Delete("minimal", "").Eq("id", id).Execute()
	case "dispensar":
		err = fecharDenuncias()
	default:
		http.Error(w, "Ação desconhecida.", http.StatusBadRequest)
		return
	}
	if err != nil {
		log.Printf("[MODERACAO] %s no comentário %s: %v", req.Acao, id, err)
		http.Error(w, "Não foi possível aplicar a decisão.", http.StatusInternalServerError)
		return
	}
	log.Printf("[MODERACAO] admin=%s acao=%s comentario=%s", adminID, req.Acao, id)
	w.WriteHeader(http.StatusNoContent)
}

// HandleGetRegrasComunidade devolve os números da Mana, da Vitalidade e do descanso.
func (h *ComunidadeHandler) HandleGetRegrasComunidade(w http.ResponseWriter, r *http.Request) {
	responderJSON(w, http.StatusOK, lerRegrasComunidade(database.Client))
}

// HandleSalvarRegrasComunidade valida e grava as regras. O gatilho da Mana no banco
// lê a mesma chave, então a mudança vale no próximo comentário.
func (h *ComunidadeHandler) HandleSalvarRegrasComunidade(w http.ResponseWriter, r *http.Request) {
	_, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	var regras RegrasComunidade
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&regras); err != nil {
		http.Error(w, "Pedido inválido.", http.StatusBadRequest)
		return
	}
	if msg := validarRegrasComunidade(regras); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	valor, _ := json.Marshal(regras)
	linha := map[string]string{"key": chaveRegrasComunidade, "value": string(valor), "updated_at": time.Now().UTC().Format(time.RFC3339)}
	if _, _, err := client.From("app_settings").Upsert(linha, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[COMUNIDADE ADMIN] falha ao salvar regras: %v", err)
		http.Error(w, "Não foi possível salvar as regras.", http.StatusInternalServerError)
		return
	}
	responderJSON(w, http.StatusOK, regras)
}
