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
	postgrest "github.com/supabase-community/postgrest-go"
)

// InicioTemporadaBrasilia devolve o timestamp exato do início da temporada atual no fuso de Brasília.
// Temporadas de anime:
// - Inverno: 01 de janeiro a 31 de março
// - Primavera: 01 de abril a 30 de junho
// - Verão: 01 de julho a 30 de setembro
// - Outono: 01 de outubro a 31 de dezembro
func InicioTemporadaBrasilia(t time.Time) time.Time {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}
	tBR := t.In(loc)
	ano := tBR.Year()
	var mes time.Month
	switch {
	case tBR.Month() <= 3:
		mes = time.January
	case tBR.Month() <= 6:
		mes = time.April
	case tBR.Month() <= 9:
		mes = time.July
	default:
		mes = time.October
	}
	return time.Date(ano, mes, 1, 0, 0, 0, 0, loc)
}

// CodigoSemanaAtualBrasilia gera a chave ISO de semana no fuso de Brasília (ex.: '2026-W45').
func CodigoSemanaAtualBrasilia(t time.Time) string {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}
	ano, sem := t.In(loc).ISOWeek()
	return fmt.Sprintf("%d-W%02d", ano, sem)
}

type RankingsComunidadeHandler struct{}

// HandleRankingGenero retorna os membros líderes em um gênero a partir da tabela de cache ranking_genero.
func (h *RankingsComunidadeHandler) HandleRankingGenero(w http.ResponseWriter, r *http.Request) {
	if database.Client == nil {
		http.Error(w, "Banco indisponível", http.StatusServiceUnavailable)
		return
	}

	genero := strings.TrimSpace(r.URL.Query().Get("genero"))
	if genero == "" {
		genero = "Ação"
	}

	var linhas []struct {
		Posicao    int    `json:"posicao"`
		Handle     string `json:"handle"`
		Nome       string `json:"nome"`
		XPGenero   int    `json:"xp_genero"`
		Nivel      int    `json:"nivel"`
		Rank       string `json:"rank"`
		TituloRank string `json:"titulo_rank"`
		UserID     string `json:"user_id"`
	}

	data, _, err := database.Client.From("ranking_genero").
		Select("posicao,handle,nome,xp_genero,nivel,rank,titulo_rank,user_id", "", false).
		Eq("genero", genero).
		Order("posicao", &postgrest.OrderOpts{Ascending: true}).
		Limit(50, "").
		Execute()

	if err != nil {
		log.Printf("[Rankings] Erro ao buscar ranking_genero para %s: %v", genero, err)
		http.Error(w, "Erro ao carregar ranking por gênero", http.StatusInternalServerError)
		return
	}

	_ = json.Unmarshal(data, &linhas)

	// Enriquece cosméticos
	if len(linhas) > 0 {
		userIDs := make([]string, len(linhas))
		for i, l := range linhas {
			userIDs[i] = l.UserID
		}

		cosmeticos := buscarCosmeticosUsuarios(userIDs)
		resultado := make([]membroNoRanking, len(linhas))
		for i, l := range linhas {
			cos := cosmeticos[l.UserID]
			resultado[i] = membroNoRanking{
				Posicao:    l.Posicao,
				Handle:     l.Handle,
				Nome:       l.Nome,
				XP:         l.XPGenero,
				Nivel:      l.Nivel,
				Rank:       l.Rank,
				TituloRank: l.TituloRank,
				Moldura:    cos.Moldura,
				CorNome:    cos.CorNome,
				Emblema:    cos.Emblema,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resultado)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]membroNoRanking{})
}

// HandleLigaSemanal retorna o status da liga semanal e a divisão/grupo do usuário autenticado.
func (h *RankingsComunidadeHandler) HandleLigaSemanal(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	semana := CodigoSemanaAtualBrasilia(time.Now())

	// Sincroniza pontos da semana corrente
	_ = database.Client.Rpc("sincronizar_xp_liga_semana", "", map[string]interface{}{"p_semana": semana})

	type ParticipacaoLiga struct {
		ID                 string `json:"id"`
		Semana             string `json:"semana"`
		UserID             string `json:"user_id"`
		Divisao            string `json:"divisao"`
		Grupo              int    `json:"grupo"`
		XP                 int    `json:"xp"`
		Posicao            int    `json:"posicao"`
		Resultado          string `json:"resultado"`
		RecompensaAniCoins int    `json:"recompensa_anicoins"`
		Handle             string `json:"handle,omitempty"`
		Nome               string `json:"nome,omitempty"`
		Moldura            string `json:"moldura,omitempty"`
		CorNome            string `json:"cor_nome,omitempty"`
		Emblema            string `json:"emblema,omitempty"`
	}

	client := database.Client
	if token != "" {
		if c, err := database.ClientWithToken(token); err == nil {
			client = c
		}
	}

	var todasParticipacoes []ParticipacaoLiga
	data, _, _ := client.From("liga_participacoes").
		Select("id,semana,user_id,divisao,grupo,xp,posicao,resultado,recompensa_anicoins", "", false).
		Eq("semana", semana).
		Order("xp", &postgrest.OrderOpts{Ascending: false}).
		Execute()

	_ = json.Unmarshal(data, &todasParticipacoes)

	// Busca perfis para mapear handles e nomes
	if len(todasParticipacoes) > 0 {
		userIDs := make([]string, len(todasParticipacoes))
		for i, p := range todasParticipacoes {
			userIDs[i] = p.UserID
		}

		var perfis []struct {
			UserID string `json:"user_id"`
			Handle string `json:"handle"`
			Nome   string `json:"nome"`
		}
		if dataP, _, errP := database.Client.From("profiles").
			Select("user_id,handle,nome", "", false).
			In("user_id", userIDs).
			Execute(); errP == nil {
			_ = json.Unmarshal(dataP, &perfis)
			mapaPerfis := map[string]struct{ Handle, Nome string }{}
			for _, p := range perfis {
				mapaPerfis[p.UserID] = struct{ Handle, Nome string }{Handle: p.Handle, Nome: p.Nome}
			}

			cosmeticos := buscarCosmeticosUsuarios(userIDs)

			for i := range todasParticipacoes {
				uid := todasParticipacoes[i].UserID
				if prof, ok := mapaPerfis[uid]; ok {
					todasParticipacoes[i].Handle = prof.Handle
					todasParticipacoes[i].Nome = prof.Nome
				}
				todasParticipacoes[i].Posicao = i + 1
				cos := cosmeticos[uid]
				todasParticipacoes[i].Moldura = cos.Moldura
				todasParticipacoes[i].CorNome = cos.CorNome
				todasParticipacoes[i].Emblema = cos.Emblema
			}
		}
	}

	// Filtra a divisão/grupo do usuário logado se ele estiver participando
	minhaDivisao := "Bronze"
	meuGrupo := 1
	var meusParticipantes []ParticipacaoLiga = todasParticipacoes

	if userID != "" {
		for _, p := range todasParticipacoes {
			if p.UserID == userID {
				minhaDivisao = p.Divisao
				meuGrupo = p.Grupo
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"semana":             semana,
		"minha_divisao":      minhaDivisao,
		"meu_grupo":          meuGrupo,
		"total_ativos":       len(todasParticipacoes),
		"modo_divisao_ativa": len(todasParticipacoes) >= 40,
		"participantes":      meusParticipantes,
	})
}

// HandleClimaTemporada retorna os animes líderes por tipo de reação com proteção de spoiler.
func (h *RankingsComunidadeHandler) HandleClimaTemporada(w http.ResponseWriter, r *http.Request) {
	reacao := strings.TrimSpace(r.URL.Query().Get("reacao"))
	if reacao == "" {
		reacao = "chorei"
	}

	bruto := strings.TrimSpace(database.Client.Rpc("top_reacoes_temporada", "", map[string]interface{}{
		"p_reacao": reacao,
		"p_limite": 10,
	}))

	var linhas []struct {
		MalID                int `json:"mal_id"`
		TotalReacoes         int `json:"total_reacoes"`
		EpisodioLider        int `json:"episodio_lider"`
		ReacoesEpisodioLider int `json:"reacoes_episodio_lider"`
	}

	if err := json.Unmarshal([]byte(bruto), &linhas); err != nil {
		log.Printf("[Clima] Erro ao carregar top_reacoes_temporada para %s: %q", reacao, bruto)
		linhas = []struct {
			MalID                int `json:"mal_id"`
			TotalReacoes         int `json:"total_reacoes"`
			EpisodioLider        int `json:"episodio_lider"`
			ReacoesEpisodioLider int `json:"reacoes_episodio_lider"`
		}{}
	}

	// Verifica spoilers se logado
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	epsAssistidos := map[string]bool{}

	if userID != "" && len(linhas) > 0 {
		malIDs := make([]string, len(linhas))
		for i, l := range linhas {
			malIDs[i] = strconv.Itoa(l.MalID)
		}

		var progresso []struct {
			MalID          int `json:"mal_id"`
			EpisodeNumber  int `json:"episode_number"`
		}
		if dataProg, _, errP := database.Client.From("episode_progress").
			Select("mal_id,episode_number", "", false).
			Eq("user_id", userID).
			In("mal_id", malIDs).
			Execute(); errP == nil {
			_ = json.Unmarshal(dataProg, &progresso)
			for _, p := range progresso {
				epsAssistidos[fmt.Sprintf("%d-%d", p.MalID, p.EpisodeNumber)] = true
			}
		}
	}

	// Enriquece com dados de catálogo
	type ClimaItem struct {
		MalID          int    `json:"mal_id"`
		Titulo         string `json:"titulo"`
		ImagemURL      string `json:"imagem_url"`
		TotalReacoes   int    `json:"total_reacoes"`
		EpisodioLider  int    `json:"episodio_lider"`
		MostrarSpoiler bool   `json:"mostrar_spoiler"`
	}

	itens := make([]ClimaItem, len(linhas))
	if len(linhas) > 0 {
		malIDs := make([]string, len(linhas))
		for i, l := range linhas {
			malIDs[i] = strconv.Itoa(l.MalID)
		}

		metas := map[int]struct{ Title, Image string }{}
		var caches []struct {
			MalID  int    `json:"mal_id"`
			Title  string `json:"title"`
			Images struct {
				JPG struct {
					ImageURL string `json:"image_url"`
				} `json:"jpg"`
			} `json:"images"`
		}
		if dataC, _, errC := database.Client.From("anime_metadata_cache").
			Select("mal_id,title,images", "", false).
			In("mal_id", malIDs).
			Execute(); errC == nil {
			_ = json.Unmarshal(dataC, &caches)
			for _, c := range caches {
				metas[c.MalID] = struct{ Title, Image string }{Title: c.Title, Image: c.Images.JPG.ImageURL}
			}
		}

		for i, l := range linhas {
			titulo := fmt.Sprintf("Anime #%d", l.MalID)
			imagem := ""
			if m, ok := metas[l.MalID]; ok {
				if m.Title != "" {
					titulo = m.Title
				}
				imagem = m.Image
			}

			assistiu := epsAssistidos[fmt.Sprintf("%d-%d", l.MalID, l.EpisodioLider)]
			itens[i] = ClimaItem{
				MalID:          l.MalID,
				Titulo:         titulo,
				ImagemURL:      imagem,
				TotalReacoes:   l.TotalReacoes,
				EpisodioLider:  l.EpisodioLider,
				MostrarSpoiler: assistiu,
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"reacao": reacao,
		"itens":  itens,
	})
}

// buscarCosmeticosUsuarios lê as molduras, cores e emblemas equipados para uma lista de usuários
func buscarCosmeticosUsuarios(userIDs []string) map[string]struct{ Moldura, CorNome, Emblema string } {
	mapa := map[string]struct{ Moldura, CorNome, Emblema string }{}
	if len(userIDs) == 0 {
		return mapa
	}

	var eqLinhas []struct {
		UserID       string `json:"user_id"`
		Slot         string `json:"slot"`
		StoreItemRef struct {
			Estilo string `json:"estilo"`
		} `json:"store_items"`
	}

	if dataEq, _, errEq := database.Client.From("user_equipped").
		Select("user_id,slot,store_items(estilo)", "", false).
		In("user_id", userIDs).
		Execute(); errEq == nil {
		if json.Unmarshal(dataEq, &eqLinhas) == nil {
			for _, item := range eqLinhas {
				c := mapa[item.UserID]
				switch item.Slot {
				case "moldura":
					c.Moldura = item.StoreItemRef.Estilo
				case "cor_nome":
					c.CorNome = item.StoreItemRef.Estilo
				case "emblema":
					c.Emblema = item.StoreItemRef.Estilo
				}
				mapa[item.UserID] = c
			}
		}
	}

	return mapa
}
