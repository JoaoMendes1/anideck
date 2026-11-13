package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
)

// CuradoriaCollabHandler gerencia a curadoria colaborativa (Fase 17.7, #188).
type CuradoriaCollabHandler struct{}

func NewCuradoriaCollabHandler() *CuradoriaCollabHandler {
	return &CuradoriaCollabHandler{}
}

type ReqSubmeterSugestao struct {
	MalID          int    `json:"mal_id"`
	Campo          string `json:"campo"`
	EpisodioNumero int    `json:"episodio_numero"`
	Valor          string `json:"valor"`
	Motivo         string `json:"motivo"`
}

// HandleSubmeterSugestao recebe uma sugestão de correção enviada por membro autenticado.
func (h *CuradoriaCollabHandler) HandleSubmeterSugestao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autenticado.", http.StatusUnauthorized)
		return
	}

	var req ReqSubmeterSugestao
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	req.Campo = strings.TrimSpace(req.Campo)
	req.Valor = strings.TrimSpace(req.Valor)
	if req.MalID <= 0 || req.Valor == "" {
		http.Error(w, "Anime e valor sugerido são obrigatórios.", http.StatusBadRequest)
		return
	}

	camposValidos := map[string]bool{
		"titulo_episodio": true,
		"estreia":         true,
		"link_streaming":  true,
		"sinopse":         true,
	}
	if !camposValidos[req.Campo] {
		http.Error(w, "Campo inválido para sugestão.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro de conexão com o banco.", http.StatusInternalServerError)
		return
	}

	params := map[string]interface{}{
		"p_mal_id":          req.MalID,
		"p_campo":           req.Campo,
		"p_episodio_numero": req.EpisodioNumero,
		"p_valor":           req.Valor,
		"p_motivo":          strings.TrimSpace(req.Motivo),
	}

	raw := client.Rpc("submeter_sugestao_curadoria", "", params)
	if strings.Contains(raw, "error") || strings.Contains(raw, "\"code\"") {
		log.Printf("[CURADORIA COLLAB] Erro ao submeter: %s", raw)
		msg := "Não foi possível enviar a sugestão."
		if strings.Contains(raw, "Rank B") {
			msg = "Você precisa de Rank B ou superior na Guilda para sugerir correções."
		} else if strings.Contains(raw, "limite") {
			msg = "Você atingiu seu limite diário de sugestões."
		} else if strings.Contains(raw, "Já existe uma sugestão pendente") {
			msg = "Já existe uma sugestão pendente para este campo."
		}
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleAdminListarSugestoes lista as sugestões colaborativas pendentes no Painel Admin.
func (h *CuradoriaCollabHandler) HandleAdminListarSugestoes(w http.ResponseWriter, r *http.Request) {
	client := database.Client
	if client == nil {
		if token, ok := r.Context().Value(middleware.TokenKey).(string); ok && token != "" {
			client, _ = database.ClientWithToken(token)
		}
	}
	if client == nil {
		http.Error(w, "Banco indisponível.", http.StatusServiceUnavailable)
		return
	}

	data, _, err := client.From("curation_collab_suggestions").
		Select("id,user_id,mal_id,campo,episodio_numero,valor_sugerido,motivo,status,created_at", "", false).
		Eq("status", "pendente").
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(50, "").
		Execute()

	if err != nil {
		log.Printf("[CURADORIA COLLAB] Erro ao listar: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	var sugestoes []struct {
		ID             string `json:"id"`
		UserID         string `json:"user_id"`
		MalID          int    `json:"mal_id"`
		Campo          string `json:"campo"`
		EpisodioNumero int    `json:"episodio_numero"`
		ValorSugerido  string `json:"valor_sugerido"`
		Motivo         string `json:"motivo"`
		Status         string `json:"status"`
		CreatedAt      string `json:"created_at"`
		AutorNome      string `json:"autor_nome,omitempty"`
		AutorHandle    string `json:"autor_handle,omitempty"`
		TituloAnime    string `json:"titulo_anime,omitempty"`
	}
	_ = json.Unmarshal(data, &sugestoes)

	// Carrega perfis dos autores
	if len(sugestoes) > 0 {
		uids := make([]string, 0, len(sugestoes))
		animes := make([]int, 0, len(sugestoes))
		for _, s := range sugestoes {
			uids = append(uids, s.UserID)
			animes = append(animes, s.MalID)
		}

		if dataP, _, errP := client.From("profiles").Select("user_id,nome,handle", "", false).In("user_id", uids).Execute(); errP == nil {
			var perfis []struct {
				UserID string `json:"user_id"`
				Nome   string `json:"nome"`
				Handle string `json:"handle"`
			}
			_ = json.Unmarshal(dataP, &perfis)
			mapaPerfis := make(map[string]struct{ Nome, Handle string })
			for _, p := range perfis {
				mapaPerfis[p.UserID] = struct{ Nome, Handle string }{p.Nome, p.Handle}
			}
			for i := range sugestoes {
				if info, ok := mapaPerfis[sugestoes[i].UserID]; ok {
					sugestoes[i].AutorNome = info.Nome
					sugestoes[i].AutorHandle = info.Handle
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sugestoes)
}

// HandleAdminRevisarSugestao aprova ou recusa uma sugestão colaborativa.
func (h *CuradoriaCollabHandler) HandleAdminRevisarSugestao(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID obrigatório.", http.StatusBadRequest)
		return
	}

	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	var req struct {
		Aprovar       bool   `json:"aprovar"`
		Justificativa string `json:"justificativa"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	params := map[string]interface{}{
		"p_sugestao_id":   id,
		"p_aprovar":       req.Aprovar,
		"p_justificativa": strings.TrimSpace(req.Justificativa),
	}

	raw := client.Rpc("admin_revisar_sugestao_curadoria", "", params)
	if strings.Contains(raw, "error") || strings.Contains(raw, "\"code\"") {
		log.Printf("[CURADORIA COLLAB] Erro ao revisar: %s", raw)
		http.Error(w, "Erro ao processar revisão da sugestão.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}
