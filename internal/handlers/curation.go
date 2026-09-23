package handlers

import (
	"cmp"
	"encoding/json"
	"log"
	"net/http"
	"slices"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/microcosm-cc/bluemonday"
	"strconv"
	supabase "github.com/supabase-community/supabase-go"
	"github.com/supabase-community/postgrest-go"
	
)

// Inicia o higienizador para evitar ataques XSS nos textos de curadoria
var sanitizer = bluemonday.StrictPolicy()

type CurationHandler struct{}

// destaqueVitrine é o recorte de curated_animes que a vitrine do Meu Deck exibe.
// Struct própria em vez de CuratedAnime com menos colunas: decodificar colunas
// ausentes na struct completa faria os campos sem omitempty saírem com zero value
// (tags nulas, order_index 0), que pareceria dado real para quem lê o JSON.
type destaqueVitrine struct {
	ID               string `json:"id"`
	MalID            int    `json:"mal_id"`
	CustomTitle      string `json:"custom_title"`
	CustomCoverImage string `json:"custom_cover_image"`
	CustomFormat     string `json:"custom_format,omitempty"`
}

// maxDestaquesNaVitrine espelha o MAX_NA_VITRINE da VitrineDestaques.tsx.
// O corte acontece no banco para não trafegar o que a tela vai descartar.
const maxDestaquesNaVitrine = 12

// listarDestaques busca só o que a vitrine desenha. A ordenação acontece no banco,
// ANTES do limite: limitar primeiro e ordenar no Go devolveria 12 destaques
// quaisquer, em ordem certa — o grupo errado, sem erro nenhum.
func (h *CurationHandler) listarDestaques(w http.ResponseWriter) {
	data, _, err := database.Client.From("curated_animes").
		Select("id,mal_id,custom_title,custom_cover_image,custom_format", "", false).
		Eq("is_destaque", "true").
		Order("order_index", &postgrest.OrderOpts{Ascending: true}).
		Limit(maxDestaquesNaVitrine, "").
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] listarDestaques: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}

	var destaques []destaqueVitrine
	if err := json.Unmarshal(data, &destaques); err != nil {
		log.Printf("[ERRO] listarDestaques: resposta ilegível: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(destaques)
}

func (h *CurationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	var resultado []models.CuratedAnime

	consulta := database.Client.From("curated_animes").Select("*", "exact", false)

	// A vitrine tem caminho próprio e enxuto; sem o parâmetro segue o comportamento
	// de sempre, que é o que o Painel Admin precisa (inclusive os ocultos).
	if r.URL.Query().Get("destaques") == "true" {
		h.listarDestaques(w)
		return
	}

	data, _, err := consulta.Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleList Curation: %v", err)
		http.Error(w, "Erro ao buscar destaques", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	slices.SortFunc(resultado, func(a, b models.CuratedAnime) int {
		return cmp.Compare(a.OrderIndex, b.OrderIndex)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// malIDJaCurado diz se algum OUTRO registro já usa este mal_id.
//
// A UNIQUE (mal_id) de curated_animes já impede a duplicata no banco — mas ela devolve
// erro genérico, que o handler mapeia para 500. E 500 significa "meu código quebrou",
// mandando o diagnóstico para o lado errado quando o erro foi de digitação.
//
// Consultar antes custa uma query só na criação e devolve 409 com mensagem legível.
// A constraint continua como última linha de defesa: com um único admin, a corrida
// entre a consulta e o insert é aceita — se acontecer, cai no 500 de antes.
//
// idAtual vazio significa criação. Na edição, ele exclui o próprio registro da busca:
// senão todo update acusaria conflito consigo mesmo.
func malIDJaCurado(dbClient *supabase.Client, malID int, idAtual string) (bool, error) {
	consulta := dbClient.From("curated_animes").
		Select("id", "exact", false).
		Eq("mal_id", strconv.Itoa(malID))

	if idAtual != "" {
		consulta = consulta.Neq("id", idAtual)
	}

	data, _, err := consulta.Execute()
	if err != nil {
		return false, err
	}

	var encontrados []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &encontrados); err != nil {
		return false, err
	}

	return len(encontrados) > 0, nil
}

func (h *CurationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	// Antes de qualquer higienização: sem mal_id válido o registro não serve para nada, já
	// que é ele que liga curadoria, cache, deck e progresso.
	if err := ValidarMalID(entrada.MalID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	// Os campos JSONB precisam de validação própria: o Postgres aceita qualquer JSON bem
	// formado, inclusive episódio repetido ou link com esquema perigoso.
	if err := SanitizarCuradoria(&entrada); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	jaExiste, errBusca := malIDJaCurado(dbClient, entrada.MalID, "")
	if errBusca != nil {
		log.Printf("[ERRO DB] HandleCreate checagem de mal_id: %v", errBusca)
		http.Error(w, "Erro ao salvar destaque", http.StatusInternalServerError)
		return
	}
	if jaExiste {
		http.Error(w, "Já existe curadoria para este MAL ID", http.StatusConflict)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").Insert(entrada, false, "", "representation", "exact").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Curation: %v", err)
		http.Error(w, "Erro ao salvar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	var entrada models.CuratedAnime
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	if err := ValidarMalID(entrada.MalID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	entrada.CustomSynopsis = sanitizer.Sanitize(entrada.CustomSynopsis)

	// Os campos JSONB precisam de validação própria: o Postgres aceita qualquer JSON bem
	// formado, inclusive episódio repetido ou link com esquema perigoso.
	if err := SanitizarCuradoria(&entrada); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	// O `id` como idAtual tira o próprio registro da busca. Sem isso, salvar uma edição
	// sem mexer no mal_id acusaria conflito consigo mesmo.
	jaExiste, errBusca := malIDJaCurado(dbClient, entrada.MalID, id)
	if errBusca != nil {
		log.Printf("[ERRO DB] HandleUpdate checagem de mal_id (id=%s): %v", id, errBusca)
		http.Error(w, "Erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}
	if jaExiste {
		http.Error(w, "Já existe curadoria para este MAL ID", http.StatusConflict)
		return
	}

	var resultado []models.CuratedAnime
	data, _, err := dbClient.From("curated_animes").
		Update(entrada, "representation", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar destaque", http.StatusInternalServerError)
		return
	}
	_ = json.Unmarshal(data, &resultado)

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *CurationHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID do destaque é obrigatório", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("curated_animes").
		Delete("", "exact").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Curation (id=%s): %v", id, err)
		http.Error(w, "Erro ao remover destaque", http.StatusInternalServerError)
		return
	}

	InvalidateRankingCache()

	w.WriteHeader(http.StatusNoContent)
}
