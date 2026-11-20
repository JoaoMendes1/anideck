// internal/handlers/missoes.go
// Missões diárias e da semana: sorteio por usuário (missoes_regras.go), progresso lido da
// atividade real e resgate atômico de AniCoins e XP pela função resgatar_missao do banco.
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
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/supabase-go"
)

// MissaoUsuario é uma missão sorteada com o progresso do jogador.
type MissaoUsuario struct {
	ID                 string     `json:"id"`
	Tipo               TipoMissao `json:"tipo"`
	Periodo            string     `json:"periodo"`
	Titulo             string     `json:"titulo"`
	Descricao          string     `json:"descricao"`
	Meta               int        `json:"meta"`
	Progresso          int        `json:"progresso"`
	ProgressoAtual     int        `json:"progresso_atual"`
	RecompensaCristais int        `json:"recompensa_cristais"`
	RecompensaAniCoins int        `json:"recompensa_anicoins"`
	RecompensaXP       int        `json:"recompensa_xp"`
	Concluida          bool       `json:"concluida"`
	Resgatada          bool       `json:"resgatada"`
	Icone              string     `json:"icone"`
}

// RespostaMissoesHoje mantém os campos antigos (missões do dia) e acrescenta as longas.
type RespostaMissoesHoje struct {
	Data             string          `json:"data"`
	Missoes          []MissaoUsuario `json:"missoes"`
	Total            int             `json:"total"`
	Concluidas       int             `json:"concluidas"`
	Resgatadas       int             `json:"resgatadas"`
	TodasResgatadas  bool            `json:"todas_resgatadas"`
	GeneroDoDia      string          `json:"genero_do_dia"`
	Longas           []MissaoUsuario `json:"longas"`
	Semana           string          `json:"semana"`
	LongasTerminamEm string          `json:"longas_terminam_em"`
	GeneroDaSemana   string          `json:"genero_da_semana"`
	XPAtivo          bool            `json:"xp_ativo"`
}

type MissoesHandler struct{}

// missaoSorteada guarda a missão com o gênero aplicado e o que identifica o resgate.
type missaoSorteada struct {
	ItemCatalogoMissao
	periodo    string
	genero     string
	inicio     time.Time
	motivo     string
	referencia string
}

// ChaveMissoesRecompensas guarda em app_settings os ajustes individuais de AniCoins e XP por missão.
const ChaveMissoesRecompensas = "missoes_recompensas"

func carregarAjustesMissoes(dbClient *supabase.Client) map[string]AjusteMissao {
	if dbClient == nil {
		return nil
	}
	dados, _, err := dbClient.From("app_settings").
		Select("value", "", false).
		Eq("key", ChaveMissoesRecompensas).
		Execute()
	if err != nil {
		return nil
	}
	var linhas []struct {
		Value string `json:"value"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return nil
	}
	var aj map[string]AjusteMissao
	if json.Unmarshal([]byte(linhas[0].Value), &aj) != nil {
		return nil
	}
	return aj
}

// missoesDoUsuario monta as missões do dia e da semana de agora para o usuário,
// aplicando as recompensas customizadas no Painel Admin quando existirem.
func missoesDoUsuario(userID string, agora time.Time, ajustes map[string]AjusteMissao) (diarias, semanais []missaoSorteada) {
	dataStr := agora.In(fusoGuilda).Format("2006-01-02")
	inicioDia := inicioDoDiaBrasilia(agora)
	inicioSemana := inicioDaSemanaBrasilia(agora)
	semanaStr := inicioSemana.In(fusoGuilda).Format("2006-01-02")
	generoDia := GeneroDoPeriodo(userID, "dia", indiceDoDia(agora))
	generoSemana := GeneroDoPeriodo(userID, "semana", indiceDaSemana(agora))

	catalogoDiarias := AplicarAjustesMissoes(CatalogoMissoesDiarias(), ajustes)
	catalogoSemanais := AplicarAjustesMissoes(CatalogoMissoesSemanais(), ajustes)

	for _, m := range SortearMissoesDoDia(catalogoDiarias, userID, agora) {
		diarias = append(diarias, missaoSorteada{
			ItemCatalogoMissao: comGenero(m, generoDia), periodo: "dia", genero: generoDia, inicio: inicioDia,
			motivo: motivoMissaoDiaria, referencia: fmt.Sprintf("missao:%s:%s", dataStr, m.ID),
		})
	}
	for _, m := range SortearMissoesDaSemana(catalogoSemanais, userID, agora) {
		semanais = append(semanais, missaoSorteada{
			ItemCatalogoMissao: comGenero(m, generoSemana), periodo: "semana", genero: generoSemana, inicio: inicioSemana,
			motivo: motivoMissaoSemanal, referencia: fmt.Sprintf("semana:%s:%s", semanaStr, m.ID),
		})
	}
	return diarias, semanais
}

// lerInstante aceita os formatos de data que o PostgREST devolve.
func lerInstante(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	for _, layout := range formatosDeTimestamp {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// carregarAtividadeMissoes lê a semana do jogador: episódios vistos, animes terminados,
// reações e comentários de hoje e o que cada anime tem de gênero, ano e temporada.
func carregarAtividadeMissoes(dbClient *supabase.Client, userID string, agora time.Time) AtividadeMissoes {
	inicioSemana := inicioDaSemanaBrasilia(agora).Format(time.RFC3339)
	inicioDia := inicioDoDiaBrasilia(agora).Format(time.RFC3339)
	a := AtividadeMissoes{Animes: map[int]InfoAnimeMissao{}, AnoAtual: agora.In(fusoGuilda).Year()}
	curados := CarregarCuradoria(dbClient)

	var eps []struct {
		MalID     int    `json:"mal_id"`
		Episodio  int    `json:"episode_number"`
		WatchedAt string `json:"watched_at"`
	}
	if data, _, err := dbClient.From("episode_progress").
		Select("mal_id,episode_number,watched_at", "", false).
		Eq("user_id", userID).
		Gte("watched_at", inicioSemana).
		Limit(1000, "").
		Execute(); err == nil {
		_ = json.Unmarshal(data, &eps)
	}
	ids := map[int]bool{}
	for _, e := range eps {
		em, ok := lerInstante(e.WatchedAt)
		if !ok || e.MalID <= 0 {
			continue
		}
		var curado *models.CuratedAnime
		if c, existe := curados[e.MalID]; existe {
			curado = &c
		}
		a.Episodios = append(a.Episodios, EpisodioDaMissao{
			MalID: e.MalID, Numero: e.Episodio, Em: em,
			Lancamento: episodioEhLancamentoRecente(curado, e.Episodio, em),
		})
		ids[e.MalID] = true
	}

	// A carta de coleção nasce uma vez por anime, quando ele vira Completo: é o registro de
	// término que não se repete ao editar a nota ou o status depois.
	var cartas []struct {
		MalID    int    `json:"mal_id"`
		ObtidaEm string `json:"obtida_em"`
	}
	if data, _, err := dbClient.From("user_cards").
		Select("mal_id,obtida_em", "", false).
		Eq("user_id", userID).
		Gte("obtida_em", inicioSemana).
		Execute(); err == nil {
		_ = json.Unmarshal(data, &cartas)
	}
	for _, c := range cartas {
		if em, ok := lerInstante(c.ObtidaEm); ok {
			a.Concluidas = append(a.Concluidas, ObraConcluida{MalID: c.MalID, Em: em})
			ids[c.MalID] = true
		}
	}

	var reacoesRows []struct {
		MalID     int    `json:"mal_id"`
		Episodio  int    `json:"episode_number"`
		Reacao    string `json:"reacao"`
		CreatedAt string `json:"created_at"`
	}
	if dReac, _, err := dbClient.From("episode_reactions").
		Select("mal_id,episode_number,reacao,created_at", "", false).
		Eq("user_id", userID).
		Gte("created_at", inicioDia).
		Execute(); err == nil {
		_ = json.Unmarshal(dReac, &reacoesRows)
	}
	for _, r := range reacoesRows {
		em, ok := lerInstante(r.CreatedAt)
		if !ok {
			em = agora
		}
		a.ReacoesHojeLista = append(a.ReacoesHojeLista, ReacaoDaMissao{
			MalID: r.MalID, Numero: r.Episodio, Reacao: r.Reacao, Em: em,
		})
	}
	a.ReacoesHoje = len(a.ReacoesHojeLista)

	var comRows []struct {
		ID        string `json:"id"`
		MalID     int    `json:"mal_id"`
		Episodio  int    `json:"episode_number"`
		Texto     string `json:"texto"`
		CreatedAt string `json:"created_at"`
	}
	if dCom, _, err := dbClient.From("episode_comments").
		Select("id,mal_id,episode_number,texto,created_at", "", false).
		Eq("user_id", userID).
		Eq("oculto", "false").
		Gte("created_at", inicioDia).
		Execute(); err == nil {
		_ = json.Unmarshal(dCom, &comRows)
	}
	epsVistosChave := map[string]bool{}
	for _, e := range a.Episodios {
		if !e.Em.Before(inicioDoDiaBrasilia(agora)) || e.MalID > 0 {
			epsVistosChave[fmt.Sprintf("%d:%d", e.MalID, e.Numero)] = true
		}
	}
	if len(comRows) > 0 {
		faltando := map[string]bool{}
		for _, c := range comRows {
			chave := fmt.Sprintf("%d:%d", c.MalID, c.Episodio)
			if !epsVistosChave[chave] && c.MalID > 0 {
				faltando[strconv.Itoa(c.MalID)] = true
			}
		}
		if len(faltando) > 0 {
			listaMal := make([]string, 0, len(faltando))
			for m := range faltando {
				listaMal = append(listaMal, m)
			}
			var epsExtra []struct {
				MalID    int `json:"mal_id"`
				Episodio int `json:"episode_number"`
			}
			if dEp, _, errEp := dbClient.From("episode_progress").
				Select("mal_id,episode_number", "", false).
				Eq("user_id", userID).
				In("mal_id", listaMal).
				Execute(); errEp == nil && json.Unmarshal(dEp, &epsExtra) == nil {
				for _, e := range epsExtra {
					epsVistosChave[fmt.Sprintf("%d:%d", e.MalID, e.Episodio)] = true
				}
			}
		}
	}
	for _, c := range comRows {
		em, ok := lerInstante(c.CreatedAt)
		if !ok {
			em = agora
		}
		item := ComentarioDaMissao{ID: c.ID, MalID: c.MalID, Numero: c.Episodio, Em: em}
		a.ComentariosHojeLista = append(a.ComentariosHojeLista, item)
		if len([]rune(strings.TrimSpace(c.Texto))) >= 60 && epsVistosChave[fmt.Sprintf("%d:%d", c.MalID, c.Episodio)] {
			a.AvaliacoesEpHojeLista = append(a.AvaliacoesEpHojeLista, item)
		}
	}
	a.ComentariosHoje = len(a.ComentariosHojeLista)
	a.AvaliacoesEpHoje = len(a.AvaliacoesEpHojeLista)

	var revRows []struct {
		ID        string `json:"id"`
		MalID     int    `json:"mal_id"`
		Texto     string `json:"texto"`
		CreatedAt string `json:"created_at"`
	}
	if dRev, _, err := dbClient.From("anime_reviews").
		Select("id,mal_id,texto,created_at", "", false).
		Eq("user_id", userID).
		Eq("oculto", "false").
		Gte("created_at", inicioDia).
		Execute(); err == nil {
		_ = json.Unmarshal(dRev, &revRows)
	}
	for _, rev := range revRows {
		if len([]rune(strings.TrimSpace(rev.Texto))) < reviewMinCaracteres || rev.MalID <= 0 {
			continue
		}
		if pode, _ := verificarElegibilidadeReview(dbClient, userID, rev.MalID); !pode {
			continue
		}
		em, ok := lerInstante(rev.CreatedAt)
		if !ok {
			em = agora
		}
		a.ReviewsAnimeHojeLista = append(a.ReviewsAnimeHojeLista, ReviewDaMissao{
			ID: rev.ID, MalID: rev.MalID, Em: em,
		})
	}
	a.ReviewsAnimeHoje = len(a.ReviewsAnimeHojeLista)

	if len(ids) > 0 {
		lista := make([]string, 0, len(ids))
		for id := range ids {
			lista = append(lista, strconv.Itoa(id))
		}
		var cache []struct {
			MalID      int      `json:"mal_id"`
			Genres     []string `json:"genres"`
			Tags       []string `json:"tags"`
			SeasonYear int      `json:"season_year"`
		}
		if data, _, err := dbClient.From("anime_metadata_cache").
			Select("mal_id,genres,tags,season_year", "", false).
			In("mal_id", lista).
			Execute(); err == nil {
			_ = json.Unmarshal(data, &cache)
		}
		porID := map[int]int{}
		for i, c := range cache {
			porID[c.MalID] = i
		}
		indice := taxonomiaAtual().indice
		inicioTemp, fimTemp := InicioTemporadaBrasilia(agora), fimDaTemporadaBrasilia(agora)
		for id := range ids {
			var rotulos, tags []string
			ano := 0
			if i, ok := porID[id]; ok {
				rotulos, tags, ano = cache[i].Genres, cache[i].Tags, cache[i].SeasonYear
			}
			info := InfoAnimeMissao{}
			if c, ok := curados[id]; ok {
				// Mesma prioridade da fn_user_genre_affinity: rótulo da curadoria antes do cache.
				if len(c.CustomTags) > 0 {
					rotulos = c.CustomTags
				}
				if c.CustomFirstAiredAt != nil {
					if t, ok := lerDataDeEstreia(*c.CustomFirstAiredAt); ok {
						ano = t.In(fusoGuilda).Year()
						info.DaTemporada = !t.Before(inicioTemp) && t.Before(fimTemp)
					}
				}
			}
			info.Ano = ano
			info.Generos = generosCanonicos(indice, append(append([]string{}, rotulos...), tags...))
			a.Animes[id] = info
		}
	}
	return a
}

// lerDataDeEstreia aceita a data só com dia (2026-10-04) ou com hora.
func lerDataDeEstreia(s string) (time.Time, bool) {
	if t, ok := lerInstante(s); ok {
		return t, true
	}
	if t, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(s), fusoGuilda); err == nil {
		return t, true
	}
	return time.Time{}, false
}

// generosCanonicos traduz os rótulos pela genre_taxonomy e tira repetidos.
func generosCanonicos(indice indiceRotulos, rotulos []string) []string {
	visto := map[string]bool{}
	var r []string
	for _, rot := range rotulos {
		nome := indice.canonico(rot)
		if nome == "" {
			nome = strings.TrimSpace(rot)
		}
		if nome != "" && !visto[nome] {
			visto[nome] = true
			r = append(r, nome)
		}
	}
	return r
}

// resgatesDoPeriodo devolve as referências já resgatadas com o prefixo do dia ou da semana.
func resgatesDoPeriodo(dbClient *supabase.Client, userID, motivo, prefixo string) map[string]bool {
	r := map[string]bool{}
	data, _, err := dbClient.From("crystal_ledger").
		Select("referencia", "", false).
		Eq("user_id", userID).
		Eq("motivo", motivo).
		Like("referencia", prefixo+"%").
		Execute()
	if err != nil {
		return r
	}
	var linhas []struct {
		Referencia string `json:"referencia"`
	}
	if json.Unmarshal(data, &linhas) == nil {
		for _, l := range linhas {
			r[l.Referencia] = true
		}
	}
	return r
}

func montarMissaoUsuario(m missaoSorteada, a AtividadeMissoes, resgatadas map[string]bool, xpAtivo bool) MissaoUsuario {
	progresso := AvaliarMissao(m.ItemCatalogoMissao, m.genero, m.inicio, a)
	xp := m.XP
	if !xpAtivo {
		xp = 0
	}
	icone := m.Icone
	if icone == "" {
		icone = "Play"
	}
	return MissaoUsuario{
		ID: m.ID, Tipo: m.Tipo, Periodo: m.periodo, Titulo: m.Titulo, Descricao: m.Descricao,
		Meta: m.Meta, Progresso: progresso, ProgressoAtual: progresso,
		RecompensaCristais: m.Recompensa, RecompensaAniCoins: m.Recompensa, RecompensaXP: xp,
		Concluida: progresso >= m.Meta, Resgatada: resgatadas[m.referencia], Icone: icone,
	}
}

// HandleGetMissoesHoje lista as missões do dia e da semana com o progresso real.
func (h *MissoesHandler) HandleGetMissoesHoje(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	agora := time.Now()
	ajustes := carregarAjustesMissoes(dbClient)
	diarias, semanais := missoesDoUsuario(userID, agora, ajustes)
	atividade := carregarAtividadeMissoes(dbClient, userID, agora)
	economia, _, _ := carregarConfigGuilda(dbClient)

	dataStr := agora.In(fusoGuilda).Format("2006-01-02")
	semanaStr := inicioDaSemanaBrasilia(agora).In(fusoGuilda).Format("2006-01-02")
	resgatadas := resgatesDoPeriodo(dbClient, userID, motivoMissaoDiaria, "missao:"+dataStr+":")
	for ref := range resgatesDoPeriodo(dbClient, userID, motivoMissaoSemanal, "semana:"+semanaStr+":") {
		resgatadas[ref] = true
	}

	resp := RespostaMissoesHoje{
		Data: dataStr, Semana: semanaStr, XPAtivo: economia.Ativo,
		LongasTerminamEm: inicioDaSemanaBrasilia(agora).AddDate(0, 0, 7).Format(time.RFC3339),
		Missoes:          make([]MissaoUsuario, 0, len(diarias)),
		Longas:           make([]MissaoUsuario, 0, len(semanais)),
	}
	for _, m := range diarias {
		resp.GeneroDoDia = m.genero
		mu := montarMissaoUsuario(m, atividade, resgatadas, economia.Ativo)
		if mu.Concluida {
			resp.Concluidas++
		}
		if mu.Resgatada {
			resp.Resgatadas++
		}
		resp.Missoes = append(resp.Missoes, mu)
	}
	for _, m := range semanais {
		resp.GeneroDaSemana = m.genero
		resp.Longas = append(resp.Longas, montarMissaoUsuario(m, atividade, resgatadas, economia.Ativo))
	}
	resp.Total = len(resp.Missoes)
	resp.TodasResgatadas = resp.Total > 0 && resp.Resgatadas >= resp.Total
	responderJSON(w, http.StatusOK, resp)
}

// resultadoResgate espelha o jsonb devolvido por resgatar_missao.
type resultadoResgate struct {
	JaResgatada  bool `json:"ja_resgatada"`
	LimiteDiario bool `json:"limite_diario"`
	Saldo        int  `json:"saldo"`
	XP           int  `json:"xp"`
}

// evidenciasDaMissao monta o payload gravado em missoes_resgates e missoes_evidencias,
// permitindo estornar o XP caso qualquer ação que cumpriu a missão seja desfeita depois.
func evidenciasDaMissao(m missaoSorteada, a AtividadeMissoes) map[string]interface{} {
	fim := m.inicio.In(fusoGuilda).AddDate(0, 0, 1).UTC()
	if m.periodo == "semana" {
		fim = m.inicio.In(fusoGuilda).AddDate(0, 0, 7).UTC()
	}

	var epsPeriodo []EpisodioDaMissao
	for _, e := range a.Episodios {
		if !e.Em.Before(m.inicio) {
			epsPeriodo = append(epsPeriodo, e)
		}
	}

	evEpisodio := func(e EpisodioDaMissao) map[string]interface{} {
		generos := a.Animes[e.MalID].Generos
		if generos == nil {
			generos = []string{}
		}
		return map[string]interface{}{
			"tipo_acao":      "episodio",
			"mal_id":         e.MalID,
			"episode_number": e.Numero,
			"lancamento":     e.Lancamento,
			"generos":        generos,
			"acao_em":        e.Em.Format(time.RFC3339),
		}
	}

	evCarta := func(c ObraConcluida) map[string]interface{} {
		info := a.Animes[c.MalID]
		generos := info.Generos
		if generos == nil {
			generos = []string{}
		}
		return map[string]interface{}{
			"tipo_acao":    "carta",
			"mal_id":       c.MalID,
			"do_ano":       a.AnoAtual > 0 && info.Ano == a.AnoAtual,
			"da_temporada": info.DaTemporada,
			"generos":      generos,
			"acao_em":      c.Em.Format(time.RFC3339),
		}
	}

	evidencias := make([]map[string]interface{}, 0, m.Meta)
	switch m.Tipo {
	case MissaoEpisodios:
		for _, e := range epsPeriodo {
			evidencias = append(evidencias, evEpisodio(e))
			if len(evidencias) >= m.Meta {
				break
			}
		}
	case MissaoEpisodiosGenero:
		for _, e := range epsPeriodo {
			if a.temGenero(e.MalID, m.genero) {
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoAnimesDistintos:
		vistos := map[int]bool{}
		for _, e := range epsPeriodo {
			if !vistos[e.MalID] {
				vistos[e.MalID] = true
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoComecarAnime:
		for _, e := range epsPeriodo {
			if e.Numero == 1 {
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoLancamento:
		for _, e := range epsPeriodo {
			if e.Lancamento {
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoFoco:
		contagem := map[int]int{}
		melhorAnime := 0
		maiorQtd := 0
		for _, e := range epsPeriodo {
			contagem[e.MalID]++
			if contagem[e.MalID] > maiorQtd {
				maiorQtd = contagem[e.MalID]
				melhorAnime = e.MalID
			}
		}
		for _, e := range epsPeriodo {
			if e.MalID == melhorAnime {
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoDiasAtivos:
		dias := map[int]bool{}
		for _, e := range epsPeriodo {
			d := indiceDoDia(e.Em)
			if !dias[d] {
				dias[d] = true
				evidencias = append(evidencias, evEpisodio(e))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoCompletarObra:
		for _, c := range a.concluidasValidas(m.inicio) {
			evidencias = append(evidencias, evCarta(c))
			if len(evidencias) >= m.Meta {
				break
			}
		}
	case MissaoCompletarDoAno:
		for _, c := range a.concluidasValidas(m.inicio) {
			if a.AnoAtual > 0 && a.Animes[c.MalID].Ano == a.AnoAtual {
				evidencias = append(evidencias, evCarta(c))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoCompletarTemporada:
		for _, c := range a.concluidasValidas(m.inicio) {
			if a.Animes[c.MalID].DaTemporada {
				evidencias = append(evidencias, evCarta(c))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoCompletarGenero:
		for _, c := range a.concluidasValidas(m.inicio) {
			if a.temGenero(c.MalID, m.genero) {
				evidencias = append(evidencias, evCarta(c))
				if len(evidencias) >= m.Meta {
					break
				}
			}
		}
	case MissaoReagirEpisodio:
		for _, r := range a.ReacoesHojeLista {
			evidencias = append(evidencias, map[string]interface{}{
				"tipo_acao":      "reacao",
				"mal_id":         r.MalID,
				"episode_number": r.Numero,
				"reacao":         r.Reacao,
				"acao_em":        r.Em.Format(time.RFC3339),
			})
			if len(evidencias) >= m.Meta {
				break
			}
		}
	case MissaoComentarEpisodio:
		for _, c := range a.ComentariosHojeLista {
			evidencias = append(evidencias, map[string]interface{}{
				"tipo_acao":      "comentario",
				"comment_id":     c.ID,
				"mal_id":         c.MalID,
				"episode_number": c.Numero,
				"acao_em":        c.Em.Format(time.RFC3339),
			})
			if len(evidencias) >= m.Meta {
				break
			}
		}
	case MissaoAvaliarAnime:
		for _, rev := range a.ReviewsAnimeHojeLista {
			evidencias = append(evidencias, map[string]interface{}{
				"tipo_acao": "review_anime",
				"review_id": rev.ID,
				"mal_id":    rev.MalID,
				"acao_em":   rev.Em.Format(time.RFC3339),
			})
			if len(evidencias) >= m.Meta {
				break
			}
		}
	case MissaoAvaliarEpisodio:
		for _, c := range a.AvaliacoesEpHojeLista {
			evidencias = append(evidencias, map[string]interface{}{
				"tipo_acao":      "comentario",
				"comment_id":     c.ID,
				"mal_id":         c.MalID,
				"episode_number": c.Numero,
				"acao_em":        c.Em.Format(time.RFC3339),
			})
			if len(evidencias) >= m.Meta {
				break
			}
		}
	}

	return map[string]interface{}{
		"tipo":           string(m.Tipo),
		"meta":           m.Meta,
		"genero":         m.genero,
		"periodo_inicio": m.inicio.Format(time.RFC3339),
		"periodo_fim":    fim.Format(time.RFC3339),
		"evidencias":     evidencias,
	}
}

// HandleResgatarMissao confere a missão no servidor e paga AniCoins e XP numa transação só.
func (h *MissoesHandler) HandleResgatarMissao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}
	missaoID := chi.URLParam(r, "id")
	if missaoID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID da missão é obrigatório")
		return
	}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	agora := time.Now()
	ajustes := carregarAjustesMissoes(dbClient)
	diarias, semanais := missoesDoUsuario(userID, agora, ajustes)
	var alvo *missaoSorteada
	for i := range diarias {
		if diarias[i].ID == missaoID {
			alvo = &diarias[i]
		}
	}
	for i := range semanais {
		if semanais[i].ID == missaoID {
			alvo = &semanais[i]
		}
	}
	if alvo == nil {
		responderErroJSON(w, http.StatusBadRequest, "Esta missão não está entre as suas missões de agora.")
		return
	}

	atividade := carregarAtividadeMissoes(dbClient, userID, agora)
	if progresso := AvaliarMissao(alvo.ItemCatalogoMissao, alvo.genero, alvo.inicio, atividade); progresso < alvo.Meta {
		responderErroJSON(w, http.StatusBadRequest, fmt.Sprintf("Missão não concluída ainda (%d de %d).", progresso, alvo.Meta))
		return
	}

	srvClient, err := database.ServiceRoleClient()
	if err != nil || srvClient == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco indisponível")
		return
	}

	xp := alvo.XP
	if economia, _, _ := carregarConfigGuilda(dbClient); !economia.Ativo {
		xp = 0
	}
	prefixoXP := "Missão do dia"
	if alvo.periodo == "semana" {
		prefixoXP = "Missão da semana"
	}
	detalhe := evidenciasDaMissao(*alvo, atividade)
	bruto := strings.TrimSpace(srvClient.Rpc("resgatar_missao", "", map[string]interface{}{
		"p_user_id":    userID,
		"p_motivo":     alvo.motivo,
		"p_referencia": alvo.referencia,
		"p_anicoins":   alvo.Recompensa,
		"p_xp":         xp,
		"p_texto_xp":   prefixoXP + ": " + alvo.Titulo,
		"p_detalhe":    detalhe,
	}))
	var res resultadoResgate
	if err := json.Unmarshal([]byte(bruto), &res); err != nil || strings.Contains(bruto, `"code"`) {
		log.Printf("[MISSOES] resgatar_missao falhou (user=%s, missao=%s): %s", userID, missaoID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar o resgate agora. Tente de novo em instantes.")
		return
	}
	if res.LimiteDiario {
		responderErroJSON(w, http.StatusBadRequest, "Esta missão de avaliação vale no máximo uma vez por dia.")
		return
	}
	if res.JaResgatada {
		responderErroJSON(w, http.StatusBadRequest, "Você já resgatou a recompensa desta missão.")
		return
	}

	mensagem := fmt.Sprintf("+%d AniCoins adicionadas à sua carteira!", alvo.Recompensa)
	if res.XP > 0 {
		mensagem = fmt.Sprintf("+%d AniCoins e +%d XP!", alvo.Recompensa, res.XP)
	}
	responderJSON(w, http.StatusOK, map[string]interface{}{
		"ok":         true,
		"novo_saldo": res.Saldo,
		"recompensa": alvo.Recompensa,
		"xp":         res.XP,
		"mensagem":   mensagem,
	})
}

// ItemMissaoAdmin descreve uma missão para edição individual no Painel Admin.
type ItemMissaoAdmin struct {
	ID               string `json:"id"`
	Periodo          string `json:"periodo"`
	Titulo           string `json:"titulo"`
	Descricao        string `json:"descricao"`
	Meta             int    `json:"meta"`
	Recompensa       int    `json:"recompensa"`
	XP               int    `json:"xp"`
	PadraoRecompensa int    `json:"padrao_recompensa"`
	PadraoXP         int    `json:"padrao_xp"`
}

func montarListaMissoesAdmin(ajustes map[string]AjusteMissao) map[string]interface{} {
	diariasPadrao := CatalogoMissoesDiarias()
	semanaisPadrao := CatalogoMissoesSemanais()
	diariasAplicadas := AplicarAjustesMissoes(diariasPadrao, ajustes)
	semanaisAplicadas := AplicarAjustesMissoes(semanaisPadrao, ajustes)

	diarias := make([]ItemMissaoAdmin, 0, len(diariasPadrao))
	for i, pad := range diariasPadrao {
		at := diariasAplicadas[i]
		diarias = append(diarias, ItemMissaoAdmin{
			ID: pad.ID, Periodo: "dia", Titulo: pad.Titulo, Descricao: pad.Descricao, Meta: pad.Meta,
			Recompensa: at.Recompensa, XP: at.XP, PadraoRecompensa: pad.Recompensa, PadraoXP: pad.XP,
		})
	}
	semanais := make([]ItemMissaoAdmin, 0, len(semanaisPadrao))
	for i, pad := range semanaisPadrao {
		at := semanaisAplicadas[i]
		semanais = append(semanais, ItemMissaoAdmin{
			ID: pad.ID, Periodo: "semana", Titulo: pad.Titulo, Descricao: pad.Descricao, Meta: pad.Meta,
			Recompensa: at.Recompensa, XP: at.XP, PadraoRecompensa: pad.Recompensa, PadraoXP: pad.XP,
		})
	}
	return map[string]interface{}{
		"diarias":  diarias,
		"semanais": semanais,
	}
}

// HandleGetAdminMissoesRecompensas lista as missões diárias e semanais com valores padrão e atuais.
func (h *MissoesHandler) HandleGetAdminMissoesRecompensas(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}
	ajustes := carregarAjustesMissoes(dbClient)
	responderJSON(w, http.StatusOK, montarListaMissoesAdmin(ajustes))
}

// HandleSaveAdminMissoesRecompensas valida e grava recompensas individuais em app_settings.
func (h *MissoesHandler) HandleSaveAdminMissoesRecompensas(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	var payload struct {
		Missoes map[string]AjusteMissao `json:"missoes"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	if err := dec.Decode(&payload); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}
	if payload.Missoes == nil {
		payload.Missoes = map[string]AjusteMissao{}
	}
	if motivo := ValidarAjustesMissoes(payload.Missoes); motivo != "" {
		responderErroJSON(w, http.StatusBadRequest, motivo)
		return
	}
	limpo := NormalizarAjustesMissoes(payload.Missoes)
	valorBytes, err := json.Marshal(limpo)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao serializar recompensas")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}
	linha := map[string]interface{}{
		"key":        ChaveMissoesRecompensas,
		"value":      string(valorBytes),
		"updated_at": time.Now().Format(time.RFC3339),
	}
	if _, _, err = dbClient.From("app_settings").Upsert(linha, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[MISSOES] erro ao salvar recompensas no Admin: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao salvar recompensas das missões")
		return
	}
	responderJSON(w, http.StatusOK, montarListaMissoesAdmin(limpo))
}
