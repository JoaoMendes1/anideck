package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
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

// OlheiroHandler concentra o scan (disparado por cron) e a revisão da fila
// (feita por você no Painel Admin).
type OlheiroHandler struct {
	AniListClient anilist.Service
}

// HandleScan busca candidatos na AniList, pontua e grava os melhores na fila.
//
// Autorização por chave secreta no header, mesmo padrão da Fase 6.7:
// o cron-job.org não tem JWT de usuário, então a policy de RLS não se aplica —
// a gravação acontece via RPC SECURITY DEFINER (ver sql/009).
func (h *OlheiroHandler) HandleScan(w http.ResponseWriter, r *http.Request) {
	segredo := os.Getenv("CRON_SECRET")
	if segredo == "" || r.Header.Get("X-Cron-Secret") != segredo {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	ctx := r.Context()

	perfil, err := carregarPerfilOlheiro()
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao carregar perfil: %v", err)
		http.Error(w, "Erro ao carregar perfil de gosto", http.StatusInternalServerError)
		return
	}

	candidatos, err := h.buscarCandidatos(ctx)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao buscar candidatos: %v", err)
		http.Error(w, "Erro ao consultar a AniList", http.StatusBadGateway)
		return
	}

	jaConhecidos, err := malIDsJaConhecidos()
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

	inseridas := 0
	if len(sugestoes) > 0 {
		resp, errRPC := callRPC("olheiro_registrar_sugestoes", map[string]interface{}{
			"sugestoes": sugestoes,
		})
		if errRPC != nil {
			log.Printf("[OLHEIRO] Falha ao gravar sugestões: %v", errRPC)
			http.Error(w, "Erro ao gravar sugestões", http.StatusInternalServerError)
			return
		}
		if err := json.Unmarshal(resp, &inseridas); err != nil {
			// A gravação funcionou; só não deu para ler quantas entraram.
			log.Printf("[OLHEIRO] Resposta inesperada da RPC: %v", err)
		}
	}

	log.Printf("[OLHEIRO] Scan concluído: %d candidatos, %d pontuados, %d gravados",
		len(candidatos), len(sugestoes), inseridas)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"candidatos": len(candidatos),
		"pontuados":  len(sugestoes),
		"gravados":   inseridas,
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
	}

	if sucessos == 0 {
		return nil, fmt.Errorf("nenhuma busca na AniList teve sucesso")
	}

	return candidatos, nil
}

// malIDsJaConhecidos junta o catálogo curado com tudo que já passou pela fila.
// O UNIQUE em curation_suggestions já impediria a duplicata, mas filtrar aqui
// evita gastar pontuação com quem seria descartado de qualquer forma.
func malIDsJaConhecidos() (map[int]bool, error) {
	resp, err := callRPC("olheiro_mal_ids_conhecidos", nil)
	if err != nil {
		return nil, err
	}

	var ids []int
	if err := json.Unmarshal(resp, &ids); err != nil {
		return nil, fmt.Errorf("payload inesperado: %w", err)
	}

	conhecidos := make(map[int]bool, len(ids))
	for _, id := range ids {
		conhecidos[id] = true
	}
	return conhecidos, nil
}

// carregarPerfilOlheiro lê a afinidade de gêneros já calculada pelas views das
// Estatísticas — não recalcula nada aqui, para não ter duas fontes de verdade.
func carregarPerfilOlheiro() (PerfilOlheiro, error) {
	resp, err := callRPC("olheiro_perfil_de_gosto", nil)
	if err != nil {
		return PerfilOlheiro{}, err
	}

	var linhas []struct {
		Genero    string  `json:"genero"`
		NotaMedia float64 `json:"nota_media"`
	}
	if err := json.Unmarshal(resp, &linhas); err != nil {
		return PerfilOlheiro{}, fmt.Errorf("payload inesperado: %w", err)
	}

	perfil := PerfilOlheiro{}
	for _, l := range linhas {
		if strings.TrimSpace(l.Genero) == "" {
			continue
		}
		perfil.GenerosFavoritos = append(perfil.GenerosFavoritos, l.Genero)
		if l.NotaMedia > 0 {
			perfil.NotaMedia = l.NotaMedia
		}
	}

	return perfil, nil
}

// HandleListarSugestoes devolve a fila pendente, melhor pontuada primeiro.
//
// Diferente do scan, aqui quem chama é você pelo navegador — então usa o JWT
// normal e a RLS do sql/009 decide se pode ver. Sem RPC, sem SECURITY DEFINER:
// código que passa pela RLS é sempre mais seguro que código que a contorna.
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