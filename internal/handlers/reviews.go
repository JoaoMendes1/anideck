// internal/handlers/reviews.go
// Avaliações públicas de obras completas (anime_reviews), separadas da anotação privada
// do deck e integradas à proteção contra spoiler e às missões de avaliação.
package handlers

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

const (
	reviewMinCaracteres = 100
	reviewMaxCaracteres = 2000
	limiteReviewsObra   = 100
)

type ReviewsHandler struct{}

type ReviewDaObra struct {
	ID            string          `json:"id"`
	MalID         int             `json:"mal_id"`
	Autor         autorComentario `json:"autor"`
	Nota          *float64        `json:"nota"`
	Texto         string          `json:"texto"`
	ContemSpoiler bool            `json:"contem_spoiler"`
	CreatedAt     string          `json:"created_at"`
	UpdatedAt     string          `json:"updated_at"`
	Meu           bool            `json:"meu"`
	Oculto        bool            `json:"oculto,omitempty"`
}

type RespostaReviewsObra struct {
	Reviews        []ReviewDaObra `json:"reviews"`
	MinhaReview    *ReviewDaObra  `json:"minha_review,omitempty"`
	PodeAvaliar    bool           `json:"pode_avaliar"`
	MotivoBloqueio string         `json:"motivo_bloqueio,omitempty"`
}

type linhaReview struct {
	ID            string   `json:"id"`
	UserID        string   `json:"user_id"`
	MalID         int      `json:"mal_id"`
	Nota          *float64 `json:"nota"`
	Texto         string   `json:"texto"`
	ContemSpoiler bool     `json:"contem_spoiler"`
	Oculto        bool     `json:"oculto"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

func validarReview(textoBruto string, nota *float64) (string, *float64, string) {
	texto := strings.TrimSpace(textoBruto)
	n := len([]rune(texto))
	if n < reviewMinCaracteres || n > reviewMaxCaracteres {
		return "", nil, "A avaliação da obra precisa ter entre 100 e 2000 caracteres."
	}
	if nota != nil {
		if math.IsNaN(*nota) || math.IsInf(*nota, 0) || *nota < 1 || *nota > 10 {
			return "", nil, "A nota da avaliação precisa estar entre 1 e 10."
		}
		arredondada := math.Round(*nota*100) / 100
		return texto, &arredondada, ""
	}
	return texto, nil, ""
}

func montarReviews(linhas []linhaReview, autores map[string]autorComentario, bloqueados map[string]bool, eu string) ([]ReviewDaObra, *ReviewDaObra) {
	lista := make([]ReviewDaObra, 0, len(linhas))
	var minha *ReviewDaObra
	for _, l := range linhas {
		meu := eu != "" && l.UserID == eu
		if !meu && bloqueados[l.UserID] {
			continue
		}
		autor, ok := autores[l.UserID]
		if !ok {
			autor = autorComentario{Nome: "Membro"}
		}
		item := ReviewDaObra{
			ID:            l.ID,
			MalID:         l.MalID,
			Autor:         autor,
			Nota:          l.Nota,
			Texto:         l.Texto,
			ContemSpoiler: l.ContemSpoiler,
			CreatedAt:     l.CreatedAt,
			UpdatedAt:     l.UpdatedAt,
			Meu:           meu,
			Oculto:        l.Oculto,
		}
		if meu {
			copia := item
			minha = &copia
		}
		if !l.Oculto || meu {
			lista = append(lista, item)
		}
	}
	return lista, minha
}

func carregarAutoresComentarios(client *supabase.Client, userIDs []string) map[string]autorComentario {
	autores := map[string]autorComentario{}
	if client == nil || len(userIDs) == 0 {
		return autores
	}
	if dataA, _, errA := client.From("profiles").Select("user_id,handle,nome", "", false).In("user_id", userIDs).Execute(); errA == nil {
		var perfis []struct {
			UserID string `json:"user_id"`
			Handle string `json:"handle"`
			Nome   string `json:"nome"`
		}
		if json.Unmarshal(dataA, &perfis) == nil {
			for _, p := range perfis {
				autores[p.UserID] = autorComentario{Handle: p.Handle, Nome: p.Nome}
			}
		}
	} else {
		log.Printf("[REVIEWS] falha ao carregar profiles dos autores: %v", errA)
	}

	if dataEq, _, errEq := client.From("user_equipped").
		Select("user_id,slot,store_items(estilo)", "", false).
		In("user_id", userIDs).
		Execute(); errEq == nil {
		var eqLinhas []struct {
			UserID       string `json:"user_id"`
			Slot         string `json:"slot"`
			StoreItemRef struct {
				Estilo string `json:"estilo"`
			} `json:"store_items"`
		}
		if json.Unmarshal(dataEq, &eqLinhas) == nil {
			for _, item := range eqLinhas {
				if a, ok := autores[item.UserID]; ok {
					switch item.Slot {
					case "moldura":
						a.Moldura = item.StoreItemRef.Estilo
					case "cor_nome":
						a.CorNome = item.StoreItemRef.Estilo
					case "emblema":
						a.Emblema = item.StoreItemRef.Estilo
					}
					autores[item.UserID] = a
				}
			}
		}
	}

	if dataCl, _, errCl := client.From("cla_membros").
		Select("user_id,clas(tag)", "", false).
		In("user_id", userIDs).
		Execute(); errCl == nil {
		var claLinhas []struct {
			UserID string `json:"user_id"`
			ClaRef struct {
				Tag string `json:"tag"`
			} `json:"clas"`
		}
		if json.Unmarshal(dataCl, &claLinhas) == nil {
			for _, item := range claLinhas {
				if a, ok := autores[item.UserID]; ok && item.ClaRef.Tag != "" {
					a.ClaTag = item.ClaRef.Tag
					autores[item.UserID] = a
				}
			}
		}
	}
	return autores
}

func verificarElegibilidadeReview(client *supabase.Client, userID string, malID int) (bool, string) {
	if client == nil || userID == "" || malID <= 0 {
		return false, "Entre na sua conta para avaliar esta obra."
	}
	bruto := strings.TrimSpace(client.Rpc("pode_avaliar_anime", "", map[string]interface{}{
		"p_user_id": userID,
		"p_mal_id":  malID,
	}))
	var permitido bool
	if err := json.Unmarshal([]byte(bruto), &permitido); err == nil {
		if permitido {
			return true, ""
		}
		// Descobre o motivo exato para orientar o jogador com clareza.
		mal := strconv.Itoa(malID)
		if data, _, errM := client.From("media_entries").
			Select("status", "", false).
			Eq("user_id", userID).
			Eq("mal_id", mal).
			Eq("tipo", "anime").
			Execute(); errM == nil {
			var entries []struct {
				Status string `json:"status"`
			}
			if json.Unmarshal(data, &entries) == nil && (len(entries) == 0 || entries[0].Status != "Completo") {
				return false, "Marque este anime como Completo no seu deck para publicar uma avaliação pública."
			}
		}
		return false, "Marque pelo menos 1 episódio assistido para liberar a avaliação pública."
	}

	// Fallback quando a função SQL ainda não foi aplicada em algum ambiente.
	mal := strconv.Itoa(malID)
	data, _, err := client.From("media_entries").
		Select("status", "", false).
		Eq("user_id", userID).
		Eq("mal_id", mal).
		Eq("tipo", "anime").
		Execute()
	if err != nil {
		return false, "Não foi possível verificar seu status neste anime agora."
	}
	var entries []struct {
		Status string `json:"status"`
	}
	if json.Unmarshal(data, &entries) != nil || len(entries) == 0 || entries[0].Status != "Completo" {
		return false, "Marque este anime como Completo no seu deck para publicar uma avaliação pública."
	}
	return true, ""
}

// HandleListarReviews lista as avaliações públicas da obra sem vazar anotação privada nem user_id.
func (h *ReviewsHandler) HandleListarReviews(w http.ResponseWriter, r *http.Request) {
	malID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || malID <= 0 {
		responderErroJSON(w, http.StatusBadRequest, "ID do anime inválido.")
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	client := database.Client
	if token != "" {
		if c, err := database.ClientWithToken(token); err == nil && c != nil {
			client = c
		}
	}
	if client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco indisponível.")
		return
	}

	mal := strconv.Itoa(malID)
	data, _, err := client.From("anime_reviews").
		Select("id,user_id,mal_id,nota,texto,contem_spoiler,oculto,created_at,updated_at", "", false).
		Eq("mal_id", mal).
		Order("updated_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(limiteReviewsObra, "").
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarReviews (mal=%d): %v", malID, err)
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível carregar as avaliações.")
		return
	}

	var linhas []linhaReview
	if err := json.Unmarshal(data, &linhas); err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Resposta do banco em formato inesperado.")
		return
	}

	resp := RespostaReviewsObra{Reviews: []ReviewDaObra{}}
	if userID != "" {
		resp.PodeAvaliar, resp.MotivoBloqueio = verificarElegibilidadeReview(client, userID, malID)
	}
	if len(linhas) == 0 {
		responderJSON(w, http.StatusOK, resp)
		return
	}

	autoresMap := map[string]bool{}
	for _, l := range linhas {
		autoresMap[l.UserID] = true
	}
	userIDs := make([]string, 0, len(autoresMap))
	for id := range autoresMap {
		userIDs = append(userIDs, id)
	}

	// Leitura pública de perfis cosméticos usa ClientWithToken/Client conforme disponibilidade.
	autores := carregarAutoresComentarios(client, userIDs)

	bloqueados := map[string]bool{}
	if userID != "" {
		if dataB, _, errB := client.From("user_blocks").Select("blocked_id", "", false).Eq("blocker_id", userID).Execute(); errB == nil {
			var bs []struct {
				BlockedID string `json:"blocked_id"`
			}
			_ = json.Unmarshal(dataB, &bs)
			for _, b := range bs {
				bloqueados[b.BlockedID] = true
			}
		}
	}

	resp.Reviews, resp.MinhaReview = montarReviews(linhas, autores, bloqueados, userID)
	responderJSON(w, http.StatusOK, resp)
}

// HandleSalvarReview cria ou atualiza a avaliação pública do usuário para um anime Completo.
func (h *ReviewsHandler) HandleSalvarReview(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	malID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || malID <= 0 {
		responderErroJSON(w, http.StatusBadRequest, "ID do anime inválido.")
		return
	}

	var req struct {
		Nota          *float64 `json:"nota"`
		Texto         string   `json:"texto"`
		ContemSpoiler bool     `json:"contem_spoiler"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<14)).Decode(&req); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Pedido inválido.")
		return
	}

	texto, nota, problema := validarReview(req.Texto, req.Nota)
	if problema != "" {
		responderErroJSON(w, http.StatusBadRequest, problema)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	pode, motivo := verificarElegibilidadeReview(client, userID, malID)
	if !pode {
		responderErroJSON(w, http.StatusForbidden, motivo)
		return
	}

	mal := strconv.Itoa(malID)
	var existentes []struct {
		ID string `json:"id"`
	}
	if dEx, _, errEx := client.From("anime_reviews").
		Select("id", "", false).
		Eq("user_id", userID).
		Eq("mal_id", mal).
		Execute(); errEx == nil {
		_ = json.Unmarshal(dEx, &existentes)
	}

	var data []byte
	if len(existentes) > 0 {
		payload := map[string]interface{}{
			"nota":           nota,
			"texto":          texto,
			"contem_spoiler": req.ContemSpoiler,
			"updated_at":     time.Now().UTC().Format(time.RFC3339),
		}
		data, _, err = client.From("anime_reviews").
			Update(payload, "representation", "").
			Eq("user_id", userID).
			Eq("mal_id", mal).
			Execute()
	} else {
		payload := map[string]interface{}{
			"user_id":        userID,
			"mal_id":         malID,
			"nota":           nota,
			"texto":          texto,
			"contem_spoiler": req.ContemSpoiler,
		}
		data, _, err = client.From("anime_reviews").
			Insert(payload, false, "", "representation", "").
			Execute()
	}
	if err != nil {
		status, msg := erroDoBanco(err)
		log.Printf("[REVIEWS] HandleSalvarReview (user=%s mal=%d): %v", userID, malID, err)
		responderErroJSON(w, status, msg)
		return
	}

	var salvas []linhaReview
	_ = json.Unmarshal(data, &salvas)
	if len(salvas) == 0 {
		responderJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	autores := carregarAutoresComentarios(client, []string{userID})
	lista, _ := montarReviews(salvas, autores, nil, userID)
	responderJSON(w, http.StatusOK, lista[0])
}

// HandleApagarReview remove a avaliação pública do próprio usuário (triggers estornam XP se houver missão vinculada).
func (h *ReviewsHandler) HandleApagarReview(w http.ResponseWriter, r *http.Request) {
	userID, client, ok := usuarioDaRequisicao(w, r)
	if !ok {
		return
	}
	malID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || malID <= 0 {
		responderErroJSON(w, http.StatusBadRequest, "ID do anime inválido.")
		return
	}

	data, _, err := client.From("anime_reviews").
		Delete("representation", "").
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Execute()
	if err != nil {
		status, msg := erroDoBanco(err)
		responderErroJSON(w, status, msg)
		return
	}
	var apagadas []map[string]interface{}
	_ = json.Unmarshal(data, &apagadas)
	if len(apagadas) == 0 {
		responderErroJSON(w, http.StatusNotFound, "Avaliação não encontrada.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
