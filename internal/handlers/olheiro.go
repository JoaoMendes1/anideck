package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/supabase-community/supabase-go"
)

// Quantos candidatos o scan grava por execução. Menos que isso deixa a aba
// vazia; mais vira lista que ninguém revisa.
const limiteSugestoesPorScan = 10

// tagsDesejadas é o gosto declarado do dono do AniDeck — o que a afinidade
// calculada não captura sozinha.
//
// Por que uma lista fixa em vez de deduzir das Estatísticas: a view de
// afinidade exclui tag_tematica de propósito (ver DECISIONS.md), então "Level
// Up" e "Guilds" nunca chegariam até aqui. Declarar à mão é honesto para uma
// v1 — vira tabela quando existir a tela de configuração do Olheiro.
//
// A chave é o nome exato da AniList (em inglês, é assim que chega da API).
// O Label é o que aparece para o usuário no motivo da sugestão.
var tagsDesejadas = map[string]struct {
	Peso  float64
	Label string
}{
	"Isekai":       {3.0, "isekai"},
	"Level Up":     {3.0, "progressão"},
	"Magic":        {2.0, "magia"},
	"Dungeon":      {2.0, "dungeon"},
	"Guilds":       {2.0, "guildas"},
	"Female Harem": {1.5, "harém"},
	"Cultivation":  {1.5, "cultivo"},
	"Martial Arts": {1.0, "luta"},
}

// PerfilOlheiro é o retrato do gosto do usuário no momento do scan.
// Fica separado da requisição HTTP de propósito: é o que a função de
// pontuação recebe, e o que permite testá-la sem banco e sem rede.
type PerfilOlheiro struct {
	// Rótulos de maior afinidade, do mais assistido para o menos.
	GenerosFavoritos []string
	// Nota média que o usuário costuma dar. Serve de régua para não
	// sugerir obra muito abaixo do padrão dele.
	NotaMedia float64
}

// Candidato é um anime vindo da AniList que ainda não está no catálogo curado.
type Candidato struct {
	MalID      int
	Titulo     string
	ImagemURL  string
	Generos    []string
	Nota       float64
	Popularity int
}

// Sugestao é o resultado da pontuação, pronto para virar linha no banco.
type Sugestao struct {
	MalID     int     `json:"mal_id"`
	Titulo    string  `json:"titulo"`
	ImagemURL string  `json:"imagem_url"`
	Motivo    string  `json:"motivo"`
	Score     float64 `json:"score"`
}

// SugestaoPendente é o que a aba do Admin recebe para montar cada card.
type SugestaoPendente struct {
	ID        int64   `json:"id"`
	MalID     int     `json:"mal_id"`
	Titulo    string  `json:"titulo"`
	ImagemURL string  `json:"imagem_url"`
	Motivo    string  `json:"motivo"`
	Score     float64 `json:"score"`
}

// PontuarCandidato decide o quanto um anime combina com o gosto do usuário.
//
// Função pura: sem banco, sem rede, sem relógio. Entra dado, sai número —
// por isso dá para testar isoladamente e refinar sem medo.
//
// Score 0 e motivo vazio significam "não vale sugerir".
func PontuarCandidato(c Candidato, p PerfilOlheiro) (score float64, motivo string) {
	var labels []string

	for _, g := range c.Generos {
		if tag, existe := tagsDesejadas[g]; existe {
			score += tag.Peso
			labels = append(labels, tag.Label)
		}
	}

	if len(labels) == 0 {
		return 0, ""
	}

	return score, "Tem " + strings.Join(labels, ", ")
}

// OlheiroHandler concentra o scan e a revisão da fila. Todas as rotas rodam
// autenticadas como admin — não existe caminho de cron, e por isso nenhuma
// função no banco precisa contornar a RLS (ver sql/011).
type OlheiroHandler struct {
	AniListClient anilist.Service
}

// HandleScan busca candidatos na AniList, pontua e grava os melhores na fila.
//
// Disparado pelo botão "Buscar sugestões" no Painel Admin. Roda com o JWT do
// admin, então a policy do sql/009 autoriza a escrita — sem RPC, sem
// SECURITY DEFINER, sem chave secreta compartilhada.
func (h *OlheiroHandler) HandleScan(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()

	perfil, err := carregarPerfilOlheiro(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao carregar perfil: %v", err)
		http.Error(w, "Erro ao carregar perfil de gosto", http.StatusInternalServerError)
		return
	}

	candidatos, err := h.buscarCandidatos(ctx)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao buscar candidatos: %v", err)
		http.Error(w, "Serviço da AniList indisponível no momento", http.StatusServiceUnavailable)
		return
	}

	jaConhecidos, err := malIDsJaConhecidos(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao ler o que já é conhecido: %v", err)
		http.Error(w, "Erro ao consultar o catálogo", http.StatusInternalServerError)
		return
	}

	var sugestoes []Sugestao

	for _, c := range candidatos {
		if jaConhecidos[c.MalID] {
			continue
		}

		score, motivo := PontuarCandidato(c, perfil)
		if score <= 0 || motivo == "" {
			continue
		}

		sugestoes = append(sugestoes, Sugestao{
			MalID:     c.MalID,
			Titulo:    c.Titulo,
			ImagemURL: c.ImagemURL,
			Motivo:    motivo,
			Score:     score,
		})
	}

	// Melhores primeiro, corta no limite.
	sort.Slice(sugestoes, func(i, j int) bool {
		return sugestoes[i].Score > sugestoes[j].Score
	})
	if len(sugestoes) > limiteSugestoesPorScan {
		sugestoes = sugestoes[:limiteSugestoesPorScan]
	}

	if len(sugestoes) > 0 {
		// O UNIQUE(mal_id) do sql/009 garante a idempotência: rodar o scan duas
		// vezes não duplica nem ressuscita dispensado. O upsert faz o Postgres
		// ignorar o conflito em vez de devolver erro.
		_, _, err := dbClient.From("curation_suggestions").
			Insert(sugestoes, true, "mal_id", "minimal", "exact").
			Execute()
		if err != nil {
			log.Printf("[OLHEIRO] Falha ao gravar sugestões: %v", err)
			http.Error(w, "Erro ao gravar sugestões", http.StatusInternalServerError)
			return
		}
	}

	log.Printf("[OLHEIRO] Scan concluído: %d candidatos, %d pontuados",
		len(candidatos), len(sugestoes))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"candidatos": len(candidatos),
		"pontuados":  len(sugestoes),
	})
}

// buscarCandidatos consulta a AniList uma vez por tag desejada. Buscar
// "melhores Isekai" traz o que interessa; o top geral só devolveria os
// campeões de todos os tempos (Shingeki, One Piece), que não têm relação
// nenhuma com o gosto declarado.
func (h *OlheiroHandler) buscarCandidatos(ctx context.Context) ([]Candidato, error) {
	vistos := make(map[int]bool)
	var candidatos []Candidato

	coletar := func(res *anilist.AnimeSearchResponse) {
		if res == nil {
			return
		}
		for _, a := range res.Data {
			if a.MalID <= 0 || vistos[a.MalID] {
				continue
			}
			vistos[a.MalID] = true

			// Gêneros e tags entram na mesma lista: para a pontuação, ambos são
			// apenas rótulos que podem ou não bater com o gosto declarado.
			generos := make([]string, 0, len(a.Genres)+len(a.Tags))
			for _, g := range a.Genres {
				generos = append(generos, g.Name)
			}
			generos = append(generos, a.Tags...)

			candidatos = append(candidatos, Candidato{
				MalID:      a.MalID,
				Titulo:     a.Title,
				ImagemURL:  a.Images.JPG.ImageURL,
				Generos:    generos,
				Nota:       a.Score,
				Popularity: a.Popularity,
			})
		}
	}

	sucessos := 0
	for tag := range tagsDesejadas {
		res, err := h.AniListClient.GetTopAnime(ctx, 1, 10, anilist.SearchFilters{
			Tags: []string{tag},
			Sort: "SCORE_DESC",
		})
		if err != nil {
			// Uma tag que falha não derruba o scan inteiro.
			log.Printf("[OLHEIRO] Busca por tag %q falhou: %v", tag, err)
			continue
		}
		sucessos++
		coletar(res)
		time.Sleep(2 * time.Second) // BLOCO 3: Respeita o limite de 30 req/min da AniList
	}

	if sucessos == 0 {
		return nil, fmt.Errorf("nenhuma busca na AniList teve sucesso")
	}

	return candidatos, nil
}

// malIDsJaConhecidos junta o catálogo curado com tudo que já passou pela fila.
// O UNIQUE em curation_suggestions já impediria a duplicata, mas filtrar aqui
// evita gastar pontuação com quem seria descartado de qualquer forma.
func malIDsJaConhecidos(dbClient *supabase.Client) (map[int]bool, error) {
	conhecidos := make(map[int]bool)

	for _, tabela := range []string{"curated_animes", "curation_suggestions"} {
		data, _, err := dbClient.From(tabela).
			Select("mal_id", "exact", false).
			Execute()
		if err != nil {
			return nil, fmt.Errorf("tabela %s: %w", tabela, err)
		}

		var linhas []struct {
			MalID int `json:"mal_id"`
		}
		if err := json.Unmarshal(data, &linhas); err != nil {
			return nil, fmt.Errorf("tabela %s: payload inesperado: %w", tabela, err)
		}
		for _, l := range linhas {
			conhecidos[l.MalID] = true
		}
	}

	return conhecidos, nil
}

// carregarPerfilOlheiro lê a view de afinidade que já alimenta as Estatísticas.
// Como o scan agora roda com o JWT do admin, o auth.uid() dentro da view
// resolve sozinho — não precisa de função parametrizada nem de RPC.
//
// Tags temáticas ficam de fora pelo mesmo motivo documentado no DECISIONS.md
// para o Perfil Especialista/Explorador: aparecem em quase todo anime e não
// discriminam gosto.
func carregarPerfilOlheiro(dbClient *supabase.Client) (PerfilOlheiro, error) {
	data, _, err := dbClient.From("view_user_genre_affinity").
		Select("genre,tier,total_watched,media_nota_genero", "exact", false).
		Order("total_watched", &postgrest.OrderOpts{Ascending: false}).
		Execute()
	if err != nil {
		return PerfilOlheiro{}, err
	}

	var linhas []struct {
		Genre           string  `json:"genre"`
		Tier            string  `json:"tier"`
		TotalWatched    int     `json:"total_watched"`
		MediaNotaGenero float64 `json:"media_nota_genero"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return PerfilOlheiro{}, fmt.Errorf("payload inesperado: %w", err)
	}

	perfil := PerfilOlheiro{}
	var soma float64
	var contados int

	for _, l := range linhas {
		if l.Tier == "tag_tematica" || strings.TrimSpace(l.Genre) == "" {
			continue
		}
		if len(perfil.GenerosFavoritos) < 5 {
			perfil.GenerosFavoritos = append(perfil.GenerosFavoritos, l.Genre)
		}
		if l.MediaNotaGenero > 0 {
			soma += l.MediaNotaGenero
			contados++
		}
	}

	if contados > 0 {
		perfil.NotaMedia = soma / float64(contados)
	}

	return perfil, nil
}

// HandleListarSugestoes devolve a fila pendente, melhor pontuada primeiro.
func (h *OlheiroHandler) HandleListarSugestoes(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("curation_suggestions").
		Select("id,mal_id,titulo,imagem_url,motivo,score", "exact", false).
		Eq("status", "pendente").
		Order("score", &postgrest.OrderOpts{Ascending: false}).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarSugestoes: %v", err)
		http.Error(w, "Erro ao listar sugestões", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// HandleRevisarSugestao marca uma sugestão como curada ou dispensada.
//
// Os dois casos viraram um endpoint só porque a operação é idêntica — muda
// apenas o valor gravado. O CHECK do sql/009 rejeita qualquer outro status,
// mas a validação aqui devolve 400 em vez de deixar o banco dar 500.
func (h *OlheiroHandler) HandleRevisarSugestao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID ausente", http.StatusBadRequest)
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Corpo inválido", http.StatusBadRequest)
		return
	}
	if body.Status != "curado" && body.Status != "dispensado" {
		http.Error(w, "Status deve ser 'curado' ou 'dispensado'", http.StatusBadRequest)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err = dbClient.From("curation_suggestions").
		Update(map[string]interface{}{
			"status":      body.Status,
			"reviewed_at": time.Now().UTC().Format(time.RFC3339),
		}, "minimal", "exact").
		Eq("id", id).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleRevisarSugestao (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar sugestão", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}