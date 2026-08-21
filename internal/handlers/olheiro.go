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

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

// Quantos candidatos o scan grava por execução. Menos que isso deixa a aba
// vazia; mais vira lista que ninguém revisa.
const limiteSugestoesPorScan = 10

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

// PontuarCandidato decide o quanto um anime combina com o gosto do usuário.
//
// Função pura: sem banco, sem rede, sem relógio. Entra dado, sai número —
// por isso dá para testar isoladamente e refinar sem medo.
//
// Retorna o score e o motivo em português, que aparece no card do Admin.
// Motivo vazio ou score <= 0 significa "não vale sugerir".
//
// TODO(joão): implementar. Ideias de ponto de partida, todas ajustáveis:
//   - somar peso por gênero em comum com PerfilOlheiro.GenerosFavoritos,
//     dando mais peso aos primeiros da lista (são os mais assistidos)
//   - somar algo pela nota do anime, mas só se estiver acima da NotaMedia
//   - cuidado com Popularity: sozinha ela só sugere blockbuster, que o
//     usuário provavelmente já conhece
//   - o motivo é tão importante quanto o número: "3 dos seus 5 gêneros
//     favoritos" explica a sugestão; "score 8.4" não explica nada
func PontuarCandidato(c Candidato, p PerfilOlheiro) (score float64, motivo string) {
	return 0, ""
}

// OlheiroHandler roda o scan. Disparado por cron, não por usuário logado.
type OlheiroHandler struct {
	AniListClient anilist.Service
}

// HandleScan busca candidatos na AniList, pontua e grava os melhores na fila.
//
// Autorização por chave secreta no header, mesmo padrão da Fase 6.7:
// o cron-job.org não tem JWT de usuário, então a policy de RLS não se aplica —
// a gravação acontece via RPC SECURITY DEFINER (ver sql/009).
func (h *OlheiroHandler) HandleScan(w http.ResponseWriter, r *http.Request) {
		if os.Getenv("CRON_SECRET") == "" || r.Header.Get("X-Cron-Secret") != os.Getenv("CRON_SECRET") {
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

	candidatos, err := h.buscarCandidatos(ctx, perfil)
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

// buscarCandidatos consulta a AniList uma vez por gênero favorito, mais uma
// busca de trending geral como rede de segurança para o cold start.
func (h *OlheiroHandler) buscarCandidatos(ctx context.Context, p PerfilOlheiro) ([]Candidato, error) {
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

	// Cold start: sem perfil de gosto, cai no trending puro em vez de
	// devolver lista vazia.
	generos := p.GenerosFavoritos
	if len(generos) > 3 {
		generos = generos[:3]
	}

	for _, g := range generos {
		res, err := h.AniListClient.GetTopAnime(ctx, 1, 20, anilist.SearchFilters{
			Genres: []string{g},
		})
		if err != nil {
			// Um gênero que falha não derruba o scan inteiro.
			log.Printf("[OLHEIRO] Busca por gênero %q falhou: %v", g, err)
			continue
		}
		coletar(res)
	}

	res, err := h.AniListClient.GetTopAnime(ctx, 1, 20, anilist.SearchFilters{})
	if err != nil && len(candidatos) == 0 {
		return nil, fmt.Errorf("nenhuma busca teve sucesso: %w", err)
	}
	coletar(res)

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