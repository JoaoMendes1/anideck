package handlers

import (
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
)

type CartaAnime struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id,omitempty"`
	MalID     int       `json:"mal_id"`
	Titulo    string    `json:"titulo"`
	ImagemURL string    `json:"imagem_url"`
	Raridade  string    `json:"raridade"`
	IsFoil    bool      `json:"is_foil"`
	Estreia   bool      `json:"estreia"`
	Nota      float64   `json:"nota"`
	ObtidaEm  time.Time `json:"obtida_em"`
}

type PersonagemFavorito struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id,omitempty"`
	CharacterID int       `json:"character_id"`
	MalID       int       `json:"mal_id"`
	Nome        string    `json:"nome"`
	ImagemURL   string    `json:"imagem_url"`
	Papel       string    `json:"papel"`
	CriadoEm    time.Time `json:"criado_em"`
}

type DueloResultado struct {
	HandleA           string  `json:"handle_a"`
	NomeA             string  `json:"nome_a"`
	HandleB           string  `json:"handle_b"`
	NomeB             string  `json:"nome_b"`
	Afinidade         int     `json:"afinidade"`
	ObrasEmComum      int     `json:"obras_em_comum"`
	ConcordanciaNotas float64 `json:"concordancia_notas"`
	GeneroQueUne      string  `json:"genero_que_une"`
	GeneroQueSepara   string  `json:"genero_que_separa"`
}

type CartasHandler struct{}

// HandleMinhasCartas retorna as cartas de anime colecionadas pelo usuário autenticado.
func (h *CartasHandler) HandleMinhasCartas(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	if userID == "" || token == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro de autenticação", http.StatusUnauthorized)
		return
	}

	var rawCards []struct {
		ID       string    `json:"id"`
		MalID    int       `json:"mal_id"`
		Raridade string    `json:"raridade"`
		IsFoil   bool      `json:"is_foil"`
		Estreia  bool      `json:"estreia"`
		Nota     float64   `json:"nota"`
		ObtidaEm time.Time `json:"obtida_em"`
	}

	data, _, err := client.From("user_cards").
		Select("id,mal_id,raridade,is_foil,estreia,nota,obtida_em", "", false).
		Eq("user_id", userID).
		Order("obtida_em", &postgrest.OrderOpts{Ascending: false}).
		Execute()

	if err != nil {
		log.Printf("[Cartas] Erro ao buscar cartas do usuário %s: %v", userID, err)
		http.Error(w, "Erro ao buscar cartas", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(data, &rawCards); err != nil {
		log.Printf("[Cartas] Erro ao decodificar cartas: %v", err)
		http.Error(w, "Erro ao processar dados", http.StatusInternalServerError)
		return
	}

	cartas := enriquecerCartasComMetadados(rawCards)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cartas": cartas,
		"total":  len(cartas),
	})
}

// HandleCartasDoMembro retorna as cartas públicas de um membro a partir de seu @handle.
func (h *CartasHandler) HandleCartasDoMembro(w http.ResponseWriter, r *http.Request) {
	handle := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "handle")))
	if handle == "" {
		http.Error(w, "Handle inválido", http.StatusBadRequest)
		return
	}

	// 1. Confere se o perfil existe e é público
	var perfis []struct {
		UserID  string `json:"user_id"`
		Publico bool   `json:"publico"`
	}
	dataP, _, errP := database.Client.From("profiles").
		Select("user_id,publico", "", false).
		Eq("handle", handle).
		Execute()

	if errP != nil || json.Unmarshal(dataP, &perfis) != nil || len(perfis) == 0 {
		http.Error(w, "Membro não encontrado", http.StatusNotFound)
		return
	}

	p := perfis[0]
	if !p.Publico {
		http.Error(w, "Perfil privado", http.StatusNotFound)
		return
	}

	var rawCards []struct {
		ID       string    `json:"id"`
		MalID    int       `json:"mal_id"`
		Raridade string    `json:"raridade"`
		IsFoil   bool      `json:"is_foil"`
		Estreia  bool      `json:"estreia"`
		Nota     float64   `json:"nota"`
		ObtidaEm time.Time `json:"obtida_em"`
	}

	data, _, err := database.Client.From("user_cards").
		Select("id,mal_id,raridade,is_foil,estreia,nota,obtida_em", "", false).
		Eq("user_id", p.UserID).
		Order("obtida_em", &postgrest.OrderOpts{Ascending: false}).
		Execute()

	if err != nil {
		log.Printf("[Cartas] Erro ao buscar cartas públicas de %s: %v", handle, err)
		http.Error(w, "Erro ao buscar cartas", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(data, &rawCards); err != nil {
		http.Error(w, "Erro ao processar dados", http.StatusInternalServerError)
		return
	}

	cartas := enriquecerCartasComMetadados(rawCards)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"handle": handle,
		"cartas": cartas,
		"total":  len(cartas),
	})
}

// HandleDueloDeGosto calcula a afinidade e agregados entre dois perfis públicos.
func (h *CartasHandler) HandleDueloDeGosto(w http.ResponseWriter, r *http.Request) {
	handleA := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "a")))
	handleB := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "b")))

	if handleA == "" || handleB == "" || handleA == handleB {
		http.Error(w, "Handles inválidos para duelo", http.StatusBadRequest)
		return
	}

	bruto := strings.TrimSpace(database.Client.Rpc("duelo_de_gosto", "", map[string]interface{}{
		"p_handle_a": handleA,
		"p_handle_b": handleB,
	}))

	if bruto == "" || strings.HasPrefix(bruto, `{"code"`) || strings.Contains(bruto, `"error"`) {
		log.Printf("[Duelo] Erro ao processar duelo entre %s e %s: %s", handleA, handleB, bruto)
		http.Error(w, "Não foi possível realizar o duelo de gosto. Verifique se ambos os perfis são públicos.", http.StatusNotFound)
		return
	}

	var resultado DueloResultado
	if err := json.Unmarshal([]byte(bruto), &resultado); err != nil {
		log.Printf("[Duelo] Erro ao decodificar resultado do duelo: %v", err)
		http.Error(w, "Erro ao processar duelo", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleGetPersonagensFavoritos lista os personagens favoritos do usuário.
func (h *CartasHandler) HandleGetPersonagensFavoritos(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	if userID == "" || token == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro de autenticação", http.StatusUnauthorized)
		return
	}

	var personagens []PersonagemFavorito
	data, _, err := client.From("favorite_characters").
		Select("id,character_id,mal_id,nome,imagem_url,papel,criado_em", "", false).
		Eq("user_id", userID).
		Order("criado_em", &postgrest.OrderOpts{Ascending: false}).
		Execute()

	if err != nil {
		log.Printf("[Personagens] Erro ao buscar favoritos: %v", err)
		http.Error(w, "Erro ao buscar personagens", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(data, &personagens); err != nil {
		http.Error(w, "Erro ao processar dados", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"personagens": personagens,
		"total":       len(personagens),
	})
}

// HandleFavoritarPersonagem adiciona um personagem aos favoritos.
func (h *CartasHandler) HandleFavoritarPersonagem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	if userID == "" || token == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var body struct {
		CharacterID int    `json:"character_id"`
		MalID       int    `json:"mal_id"`
		Nome        string `json:"nome"`
		ImagemURL   string `json:"imagem_url"`
		Papel       string `json:"papel"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.CharacterID <= 0 || strings.TrimSpace(body.Nome) == "" {
		http.Error(w, "Dados de personagem inválidos", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro de autenticação", http.StatusUnauthorized)
		return
	}

	payload := map[string]interface{}{
		"user_id":      userID,
		"character_id": body.CharacterID,
		"mal_id":       body.MalID,
		"nome":         strings.TrimSpace(body.Nome),
		"imagem_url":   body.ImagemURL,
		"papel":        body.Papel,
	}

	_, _, err = client.From("favorite_characters").
		Insert(payload, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("[Personagens] Erro ao favoritar personagem %d: %v", body.CharacterID, err)
		http.Error(w, "Não foi possível favoritar o personagem ou limite de 50 atingido.", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]bool{"sucesso": true})
}

// HandleDesfavoritarPersonagem remove um personagem dos favoritos.
func (h *CartasHandler) HandleDesfavoritarPersonagem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	if userID == "" || token == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	charIDStr := chi.URLParam(r, "id")
	charID, errConv := strconv.Atoi(charIDStr)
	if errConv != nil || charID <= 0 {
		http.Error(w, "ID inválido", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro de autenticação", http.StatusUnauthorized)
		return
	}

	_, _, err = client.From("favorite_characters").
		Delete("", "").
		Eq("user_id", userID).
		Eq("character_id", strconv.Itoa(charID)).
		Execute()

	if err != nil {
		log.Printf("[Personagens] Erro ao remover favorito %d: %v", charID, err)
		http.Error(w, "Erro ao remover favorito", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"sucesso": true})
}

// HandlePersonagensDoMembro retorna os personagens favoritos públicos de um perfil.
func (h *CartasHandler) HandlePersonagensDoMembro(w http.ResponseWriter, r *http.Request) {
	handle := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "handle")))
	if handle == "" {
		http.Error(w, "Handle inválido", http.StatusBadRequest)
		return
	}

	var perfis []struct {
		UserID  string `json:"user_id"`
		Publico bool   `json:"publico"`
	}
	dataP, _, errP := database.Client.From("profiles").
		Select("user_id,publico", "", false).
		Eq("handle", handle).
		Execute()

	if errP != nil || json.Unmarshal(dataP, &perfis) != nil || len(perfis) == 0 || !perfis[0].Publico {
		http.Error(w, "Perfil não encontrado ou privado", http.StatusNotFound)
		return
	}

	var personagens []PersonagemFavorito
	data, _, err := database.Client.From("favorite_characters").
		Select("id,character_id,mal_id,nome,imagem_url,papel,criado_em", "", false).
		Eq("user_id", perfis[0].UserID).
		Order("criado_em", &postgrest.OrderOpts{Ascending: false}).
		Limit(10, "").
		Execute()

	if err != nil {
		http.Error(w, "Erro ao consultar personagens", http.StatusInternalServerError)
		return
	}

	json.Unmarshal(data, &personagens)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"handle":      handle,
		"personagens": personagens,
	})
}

// enriquecerCartasComMetadados busca títulos e imagens de animes no cache e curadoria.
func enriquecerCartasComMetadados(rawCards []struct {
	ID       string    `json:"id"`
	MalID    int       `json:"mal_id"`
	Raridade string    `json:"raridade"`
	IsFoil   bool      `json:"is_foil"`
	Estreia  bool      `json:"estreia"`
	Nota     float64   `json:"nota"`
	ObtidaEm time.Time `json:"obtida_em"`
}) []CartaAnime {
	if len(rawCards) == 0 {
		return []CartaAnime{}
	}

	ids := make([]string, len(rawCards))
	for i, c := range rawCards {
		ids[i] = strconv.Itoa(c.MalID)
	}

	type MetaCache struct {
		MalID  int    `json:"mal_id"`
		Title  string `json:"title"`
		Images struct {
			JPG struct {
				ImageURL string `json:"image_url"`
			} `json:"jpg"`
		} `json:"images"`
	}

	metas := map[int]MetaCache{}
	if dataM, _, errM := database.Client.From("anime_metadata_cache").
		Select("mal_id,title,images", "", false).
		In("mal_id", ids).
		Execute(); errM == nil {
		var lista []MetaCache
		if json.Unmarshal(dataM, &lista) == nil {
			for _, m := range lista {
				metas[m.MalID] = m
			}
		}
	}

	// Curadoria
	type MetaCurada struct {
		MalID          int    `json:"mal_id"`
		CustomTitle    string `json:"custom_title"`
		CustomCoverURL string `json:"custom_cover_url"`
	}
	curadas := map[int]MetaCurada{}
	if dataC, _, errC := database.Client.From("curated_animes").
		Select("mal_id,custom_title,custom_cover_url", "", false).
		In("mal_id", ids).
		Execute(); errC == nil {
		var lista []MetaCurada
		if json.Unmarshal(dataC, &lista) == nil {
			for _, c := range lista {
				curadas[c.MalID] = c
			}
		}
	}

	resultado := make([]CartaAnime, len(rawCards))
	for i, c := range rawCards {
		titulo := fmt.Sprintf("Anime #%d", c.MalID)
		imagem := ""

		if m, ok := metas[c.MalID]; ok {
			if m.Title != "" {
				titulo = m.Title
			}
			imagem = m.Images.JPG.ImageURL
		}

		if cur, ok := curadas[c.MalID]; ok {
			if cur.CustomTitle != "" {
				titulo = cur.CustomTitle
			}
			if cur.CustomCoverURL != "" {
				imagem = cur.CustomCoverURL
			}
		}

		resultado[i] = CartaAnime{
			ID:        c.ID,
			MalID:     c.MalID,
			Titulo:    titulo,
			ImagemURL: imagem,
			Raridade:  c.Raridade,
			IsFoil:    c.IsFoil,
			Estreia:   c.Estreia,
			Nota:      c.Nota,
			ObtidaEm:  c.ObtidaEm,
		}
	}

	return resultado
}
