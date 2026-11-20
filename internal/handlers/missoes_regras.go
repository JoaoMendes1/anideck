// internal/handlers/missoes_regras.go
// Regras puras das missões: catálogos, sorteio em rodízio sem repetir o período anterior e
// avaliação do progresso a partir de um retrato da atividade do jogador.
package handlers

import (
	"crypto/sha256"
	"encoding/binary"
	"strconv"
	"strings"
	"time"
)

type TipoMissao string

const (
	MissaoEpisodios          TipoMissao = "episodios"
	MissaoEpisodiosGenero    TipoMissao = "episodios_genero"
	MissaoAnimesDistintos    TipoMissao = "animes_distintos"
	MissaoComecarAnime       TipoMissao = "comecar_anime"
	MissaoLancamento         TipoMissao = "lancamento"
	MissaoFoco               TipoMissao = "foco"
	MissaoCompletarObra      TipoMissao = "completar_obra"
	MissaoCompletarDoAno     TipoMissao = "completar_do_ano"
	MissaoCompletarTemporada TipoMissao = "completar_temporada"
	MissaoCompletarGenero    TipoMissao = "completar_genero"
	MissaoDiasAtivos         TipoMissao = "dias_ativos"
	MissaoReagirEpisodio     TipoMissao = "reagir_episodio"
	MissaoComentarEpisodio   TipoMissao = "comentar_episodio"
	MissaoAvaliarAnime       TipoMissao = "avaliar_anime"
	MissaoAvaliarEpisodio    TipoMissao = "avaliar_episodio"
)

// marcadorGenero é trocado pelo gênero sorteado no título e na descrição.
const marcadorGenero = "{genero}"

// Motivos no crystal_ledger: a referência de cada resgate é única por período e missão.
const (
	motivoMissaoDiaria  = "missao_diaria"
	motivoMissaoSemanal = "missao_semanal"
)

// ItemCatalogoMissao é uma missão possível. Principal marca as missões de assistir: o
// sorteio garante um mínimo delas em cada período.
type ItemCatalogoMissao struct {
	ID         string     `json:"id"`
	Tipo       TipoMissao `json:"tipo"`
	Titulo     string     `json:"titulo"`
	Descricao  string     `json:"descricao"`
	Meta       int        `json:"meta"`
	Recompensa int        `json:"recompensa"`
	XP         int        `json:"xp"`
	Icone      string     `json:"icone,omitempty"`
	Principal  bool       `json:"-"`
}

// CatalogoMissoesDiarias tem 15 missões: 5 dias de rodízio com 3 por dia.
// Missões sociais simples (reagir, comentar) pagam só AniCoins; avaliações detalhadas
// (obra completa >= 100 chars, episódio >= 60 chars) pagam XP com limite de 1x por dia cada.
func CatalogoMissoesDiarias() []ItemCatalogoMissao {
	return []ItemCatalogoMissao{
		{ID: "ep_hoje", Tipo: MissaoEpisodios, Titulo: "Episódio do Dia", Descricao: "Assista a 1 episódio de qualquer anime", Meta: 1, Recompensa: 10, XP: 5, Icone: "Play", Principal: true},
		{ID: "maratona", Tipo: MissaoEpisodios, Titulo: "Ritmo de Maratona", Descricao: "Assista a 3 episódios hoje", Meta: 3, Recompensa: 20, XP: 10, Icone: "Flame", Principal: true},
		{ID: "maratona_5", Tipo: MissaoEpisodios, Titulo: "Noite Longa", Descricao: "Assista a 5 episódios hoje", Meta: 5, Recompensa: 30, XP: 15, Icone: "Flame", Principal: true},
		{ID: "genero_dia", Tipo: MissaoEpisodiosGenero, Titulo: "Dia de " + marcadorGenero, Descricao: "Assista a 2 episódios de animes de " + marcadorGenero, Meta: 2, Recompensa: 25, XP: 10, Icone: "Compass", Principal: true},
		{ID: "variedade", Tipo: MissaoAnimesDistintos, Titulo: "Paladar Variado", Descricao: "Assista episódios de 2 animes diferentes", Meta: 2, Recompensa: 20, XP: 10, Icone: "Shuffle", Principal: true},
		{ID: "estreia", Tipo: MissaoComecarAnime, Titulo: "Primeiro Passo", Descricao: "Comece um anime: assista ao episódio 1", Meta: 1, Recompensa: 20, XP: 10, Icone: "Rocket", Principal: true},
		{ID: "lancamento", Tipo: MissaoLancamento, Titulo: "Na Crista da Onda", Descricao: "Assista a 1 episódio de um anime em lançamento", Meta: 1, Recompensa: 20, XP: 10, Icone: "Sparkles", Principal: true},
		{ID: "lancamento_2", Tipo: MissaoLancamento, Titulo: "Em Dia com a Temporada", Descricao: "Assista a 2 episódios de animes em lançamento", Meta: 2, Recompensa: 30, XP: 15, Icone: "Calendar", Principal: true},
		{ID: "foco", Tipo: MissaoFoco, Titulo: "Foco Total", Descricao: "Assista a 4 episódios do mesmo anime", Meta: 4, Recompensa: 30, XP: 15, Icone: "Target", Principal: true},
		{ID: "obra_concluida", Tipo: MissaoCompletarObra, Titulo: "Missão Cumprida", Descricao: "Termine um anime que você está assistindo", Meta: 1, Recompensa: 40, XP: 20, Icone: "CheckCircle2", Principal: true},
		{ID: "reacao", Tipo: MissaoReagirEpisodio, Titulo: "Reator Emocional", Descricao: "Deixe sua reação em 2 episódios", Meta: 2, Recompensa: 15, Icone: "Heart"},
		{ID: "comentario", Tipo: MissaoComentarEpisodio, Titulo: "Voz na Comunidade", Descricao: "Escreva um comentário em qualquer episódio", Meta: 1, Recompensa: 20, Icone: "MessageSquare"},
		{ID: "sessao_dupla", Tipo: MissaoEpisodios, Titulo: "Sessão Dupla", Descricao: "Assista a 2 episódios hoje", Meta: 2, Recompensa: 15, XP: 10, Icone: "Play", Principal: true},
		{ID: "avaliar_obra", Tipo: MissaoAvaliarAnime, Titulo: "Crítica da Obra", Descricao: "Avalie um anime Completo com pelo menos 100 caracteres", Meta: 1, Recompensa: 30, XP: 25, Icone: "Star"},
		{ID: "avaliar_episodio", Tipo: MissaoAvaliarEpisodio, Titulo: "Análise de Episódio", Descricao: "Comente um episódio com pelo menos 60 caracteres", Meta: 1, Recompensa: 25, XP: 15, Icone: "PenLine"},
	}
}

// CatalogoMissoesSemanais tem 12 missões longas: 4 semanas de rodízio com 3 por semana.
// Principal marca as de terminar anime, e toda semana traz pelo menos uma.
func CatalogoMissoesSemanais() []ItemCatalogoMissao {
	return []ItemCatalogoMissao{
		{ID: "anime_do_ano", Tipo: MissaoCompletarDoAno, Titulo: "Safra do Ano", Descricao: "Termine um anime lançado este ano", Meta: 1, Recompensa: 80, XP: 50, Icone: "Trophy", Principal: true},
		{ID: "anime_da_temporada", Tipo: MissaoCompletarTemporada, Titulo: "Fechou a Temporada", Descricao: "Termine um anime da temporada atual", Meta: 1, Recompensa: 100, XP: 60, Icone: "Calendar", Principal: true},
		{ID: "genero_semana", Tipo: MissaoCompletarGenero, Titulo: "Semana de " + marcadorGenero, Descricao: "Termine um anime de " + marcadorGenero, Meta: 1, Recompensa: 80, XP: 40, Icone: "Compass", Principal: true},
		{ID: "dupla", Tipo: MissaoCompletarObra, Titulo: "Dose Dupla", Descricao: "Termine 2 animes nesta semana", Meta: 2, Recompensa: 100, XP: 60, Icone: "CheckCircle2", Principal: true},
		{ID: "dias_ativos", Tipo: MissaoDiasAtivos, Titulo: "Constância", Descricao: "Assista a episódios em 5 dias diferentes", Meta: 5, Recompensa: 70, XP: 40, Icone: "CalendarCheck"},
		{ID: "eps_semana", Tipo: MissaoEpisodios, Titulo: "Vinte na Semana", Descricao: "Assista a 20 episódios nesta semana", Meta: 20, Recompensa: 70, XP: 40, Icone: "Flame"},
		{ID: "lancamentos_semana", Tipo: MissaoLancamento, Titulo: "Semanal em Dia", Descricao: "Assista a 5 episódios de animes em lançamento", Meta: 5, Recompensa: 60, XP: 30, Icone: "Sparkles"},
		{ID: "variedade_semana", Tipo: MissaoAnimesDistintos, Titulo: "Explorador", Descricao: "Assista episódios de 4 animes diferentes", Meta: 4, Recompensa: 50, XP: 30, Icone: "Shuffle"},
		{ID: "estreias_semana", Tipo: MissaoComecarAnime, Titulo: "Três Estreias", Descricao: "Comece 3 animes nesta semana", Meta: 3, Recompensa: 50, XP: 30, Icone: "Rocket"},
		{ID: "eps_35", Tipo: MissaoEpisodios, Titulo: "Maratonista", Descricao: "Assista a 35 episódios nesta semana", Meta: 35, Recompensa: 100, XP: 60, Icone: "Flame"},
		{ID: "imersao", Tipo: MissaoFoco, Titulo: "Imersão", Descricao: "Assista a 10 episódios do mesmo anime nesta semana", Meta: 10, Recompensa: 70, XP: 40, Icone: "Target"},
		{ID: "mergulho_genero", Tipo: MissaoEpisodiosGenero, Titulo: "Mergulho em " + marcadorGenero, Descricao: "Assista a 6 episódios de animes de " + marcadorGenero, Meta: 6, Recompensa: 60, XP: 30, Icone: "Compass"},
	}
}

// generosDasMissoes são os gêneros que podem cair no dia ou na semana: os nomes de exibição
// da genre_taxonomy com acervo grande o bastante para a missão ser possível.
var generosDasMissoes = []string{
	"Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance", "Ficção Científica",
	"Mistério", "Slice of Life", "Esporte", "Suspense", "Shounen", "Isekai", "Seinen",
}

// --- Períodos -------------------------------------------------------------------------

// indiceDoDia conta os dias desde 01/01/1970 pela data de Brasília.
func indiceDoDia(t time.Time) int {
	l := t.In(fusoGuilda)
	d := time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, time.UTC)
	return int(d.Unix() / 86400)
}

// indiceDaSemana conta as semanas (segunda a domingo) desde 05/01/1970, a primeira segunda.
func indiceDaSemana(t time.Time) int {
	return divisaoInteira(indiceDoDia(t)-4, 7)
}

// inicioDaSemanaBrasilia devolve a segunda-feira 00:00 de Brasília da semana de t, em UTC.
func inicioDaSemanaBrasilia(t time.Time) time.Time {
	l := t.In(fusoGuilda)
	recuo := (int(l.Weekday()) + 6) % 7
	seg := time.Date(l.Year(), l.Month(), l.Day()-recuo, 0, 0, 0, 0, fusoGuilda)
	return seg.UTC()
}

// fimDaTemporadaBrasilia devolve o início do trimestre seguinte ao de t.
func fimDaTemporadaBrasilia(t time.Time) time.Time {
	return InicioTemporadaBrasilia(t).In(fusoGuilda).AddDate(0, 3, 0).UTC()
}

func divisaoInteira(a, b int) int {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}

// --- Sorteio --------------------------------------------------------------------------

// numeroDaSemente tira um número estável de um texto e de um índice.
func numeroDaSemente(semente string, i int) uint32 {
	h := sha256.Sum256([]byte(semente + ":" + strconv.Itoa(i)))
	return binary.BigEndian.Uint32(h[:4])
}

// embaralhar é um Fisher-Yates com números tirados da semente: mesmo usuário e mesmo
// ciclo dão sempre a mesma ordem, sem guardar nada no banco.
func embaralhar(catalogo []ItemCatalogoMissao, semente string) []ItemCatalogoMissao {
	pool := make([]ItemCatalogoMissao, len(catalogo))
	copy(pool, catalogo)
	for i := len(pool) - 1; i > 0; i-- {
		j := int(numeroDaSemente(semente, i) % uint32(i+1))
		pool[i], pool[j] = pool[j], pool[i]
	}
	return pool
}

// rodizio guarda a forma do sorteio: quantas missões por período e o mínimo de principais.
type rodizio struct {
	porPeriodo   int
	minPrincipal int
	janelas      int
}

func novoRodizio(tamanho, porPeriodo, minPrincipal int) rodizio {
	j := 1
	if porPeriodo > 0 {
		j = tamanho / porPeriodo
	}
	if j < 1 {
		j = 1
	}
	return rodizio{porPeriodo: porPeriodo, minPrincipal: minPrincipal, janelas: j}
}

func (r rodizio) janelaDe(pos int) int {
	if pos >= r.janelas*r.porPeriodo {
		return -1 // sobra: não aparece neste ciclo
	}
	return pos / r.porPeriodo
}

func (r rodizio) principaisNa(pool []ItemCatalogoMissao, janela int) int {
	n := 0
	for p := janela * r.porPeriodo; p < (janela+1)*r.porPeriodo; p++ {
		if pool[p].Principal {
			n++
		}
	}
	return n
}

// trocaValida diz se trocar as posições a e b mantém o mínimo de principais nas duas janelas.
func (r rodizio) trocaValida(pool []ItemCatalogoMissao, a, b int) bool {
	pool[a], pool[b] = pool[b], pool[a]
	ok := true
	for _, j := range []int{r.janelaDe(a), r.janelaDe(b)} {
		if j >= 0 && r.principaisNa(pool, j) < r.minPrincipal {
			ok = false
		}
	}
	pool[a], pool[b] = pool[b], pool[a]
	return ok
}

// ajustarMinimo leva missões principais para as janelas que ficaram abaixo do mínimo.
func (r rodizio) ajustarMinimo(pool []ItemCatalogoMissao) {
	for j := 0; j < r.janelas; j++ {
		for r.principaisNa(pool, j) < r.minPrincipal {
			trocou := false
			for p := j * r.porPeriodo; p < (j+1)*r.porPeriodo && !trocou; p++ {
				if pool[p].Principal {
					continue
				}
				for q := range pool {
					jq := r.janelaDe(q)
					if jq == j || !pool[q].Principal {
						continue
					}
					if jq >= 0 && r.principaisNa(pool, jq) <= r.minPrincipal {
						continue
					}
					pool[p], pool[q] = pool[q], pool[p]
					trocou = true
					break
				}
			}
			if !trocou {
				break
			}
		}
	}
}

// baseDoCiclo é a ordem do ciclo antes de olhar o ciclo anterior. A última janela sai
// daqui e nunca muda depois, o que deixa o ciclo seguinte conferir com quem ela termina.
func (r rodizio) baseDoCiclo(catalogo []ItemCatalogoMissao, semente string, ciclo int) []ItemCatalogoMissao {
	pool := embaralhar(catalogo, semente+":"+strconv.Itoa(ciclo))
	r.ajustarMinimo(pool)
	return pool
}

// ordemDoCiclo tira da primeira janela as missões que fecharam o ciclo anterior, trocando
// com as janelas do meio ou com as sobras. A última janela fica intacta.
func (r rodizio) ordemDoCiclo(catalogo []ItemCatalogoMissao, semente string, ciclo int) []ItemCatalogoMissao {
	pool := r.baseDoCiclo(catalogo, semente, ciclo)
	if r.janelas < 2 {
		return pool
	}
	anterior := r.baseDoCiclo(catalogo, semente, ciclo-1)
	ultimas := map[string]bool{}
	for p := (r.janelas - 1) * r.porPeriodo; p < r.janelas*r.porPeriodo; p++ {
		ultimas[anterior[p].ID] = true
	}
	var candidatas []int
	for q := r.porPeriodo; q < len(pool); q++ {
		if j := r.janelaDe(q); j != r.janelas-1 {
			candidatas = append(candidatas, q)
		}
	}
	for p := 0; p < r.porPeriodo; p++ {
		if !ultimas[pool[p].ID] {
			continue
		}
		// Primeiro procura uma troca entre missões do mesmo tipo (principal com principal).
		for passo := 0; passo < 2 && ultimas[pool[p].ID]; passo++ {
			for _, q := range candidatas {
				if ultimas[pool[q].ID] {
					continue
				}
				if passo == 0 && pool[q].Principal != pool[p].Principal {
					continue
				}
				if r.trocaValida(pool, p, q) {
					pool[p], pool[q] = pool[q], pool[p]
					break
				}
			}
		}
	}
	return pool
}

// sortear devolve as missões do período: períodos seguidos nunca repetem missão.
func (r rodizio) sortear(catalogo []ItemCatalogoMissao, semente string, periodo int) []ItemCatalogoMissao {
	if len(catalogo) <= r.porPeriodo {
		return append([]ItemCatalogoMissao(nil), catalogo...)
	}
	ciclo := divisaoInteira(periodo, r.janelas)
	janela := periodo - ciclo*r.janelas
	pool := r.ordemDoCiclo(catalogo, semente, ciclo)
	return append([]ItemCatalogoMissao(nil), pool[janela*r.porPeriodo:(janela+1)*r.porPeriodo]...)
}

// SortearMissoesDoDia sorteia 3 missões diárias, com pelo menos 2 de assistir.
func SortearMissoesDoDia(catalogo []ItemCatalogoMissao, userID string, agora time.Time) []ItemCatalogoMissao {
	r := novoRodizio(len(catalogo), 3, 2)
	return r.sortear(catalogo, "dia:"+userID, indiceDoDia(agora))
}

// SortearMissoesDaSemana sorteia 3 missões longas, com pelo menos 1 de terminar anime.
func SortearMissoesDaSemana(catalogo []ItemCatalogoMissao, userID string, agora time.Time) []ItemCatalogoMissao {
	r := novoRodizio(len(catalogo), 3, 1)
	return r.sortear(catalogo, "semana:"+userID, indiceDaSemana(agora))
}

// GeneroDoPeriodo escolhe o gênero do dia ou da semana. Períodos seguidos trocam de gênero.
func GeneroDoPeriodo(userID, tipo string, periodo int) string {
	n := len(generosDasMissoes)
	base := int(numeroDaSemente("genero:"+tipo+":"+userID, 0) % uint32(n))
	// O passo é primo com 14, então percorre todos os gêneros antes de repetir.
	return generosDasMissoes[((base+periodo*5)%n+n)%n]
}

// comGenero troca o marcador pelo gênero sorteado.
func comGenero(m ItemCatalogoMissao, genero string) ItemCatalogoMissao {
	m.Titulo = strings.ReplaceAll(m.Titulo, marcadorGenero, genero)
	m.Descricao = strings.ReplaceAll(m.Descricao, marcadorGenero, genero)
	return m
}

// --- Avaliação ------------------------------------------------------------------------

// EpisodioDaMissao é um episódio marcado como visto, com a hora real em que foi visto.
type EpisodioDaMissao struct {
	MalID      int
	Numero     int
	Em         time.Time
	Lancamento bool
}

// ObraConcluida é um anime terminado: vem da carta de coleção, criada uma vez por anime.
type ObraConcluida struct {
	MalID int
	Em    time.Time
}

// InfoAnimeMissao traz o que as missões precisam saber de cada anime.
type InfoAnimeMissao struct {
	Generos     []string
	Ano         int
	DaTemporada bool
}

// ComentarioDaMissao identifica um comentário de episódio usado como evidência.
type ComentarioDaMissao struct {
	ID     string
	MalID  int
	Numero int
	Em     time.Time
}

// ReviewDaMissao identifica uma avaliação pública de obra completa usada como evidência.
type ReviewDaMissao struct {
	ID    string
	MalID int
	Em    time.Time
}

// ReacaoDaMissao identifica uma reação de episódio usada como evidência.
type ReacaoDaMissao struct {
	MalID  int
	Numero int
	Reacao string
	Em     time.Time
}

// AtividadeMissoes é o retrato da semana do jogador, lido uma vez por requisição.
type AtividadeMissoes struct {
	Episodios             []EpisodioDaMissao
	Concluidas            []ObraConcluida
	ReacoesHoje           int
	ComentariosHoje       int
	ReviewsAnimeHoje      int
	AvaliacoesEpHoje      int
	ReacoesHojeLista      []ReacaoDaMissao
	ComentariosHojeLista  []ComentarioDaMissao
	ReviewsAnimeHojeLista []ReviewDaMissao
	AvaliacoesEpHojeLista []ComentarioDaMissao
	Animes                map[int]InfoAnimeMissao
	AnoAtual              int
}

func (a AtividadeMissoes) temGenero(malID int, genero string) bool {
	for _, g := range a.Animes[malID].Generos {
		if strings.EqualFold(g, genero) {
			return true
		}
	}
	return false
}

// concluidasValidas são as obras terminadas no período das quais o jogador viu algum
// episódio na semana. Marcar como completo um anime visto há anos não conclui missão.
func (a AtividadeMissoes) concluidasValidas(inicio time.Time) []ObraConcluida {
	vistos := map[int]bool{}
	for _, e := range a.Episodios {
		vistos[e.MalID] = true
	}
	var r []ObraConcluida
	for _, c := range a.Concluidas {
		if !c.Em.Before(inicio) && vistos[c.MalID] {
			r = append(r, c)
		}
	}
	return r
}

// AvaliarMissao devolve o progresso da missão desde o início do período, limitado à meta.
func AvaliarMissao(m ItemCatalogoMissao, genero string, inicio time.Time, a AtividadeMissoes) int {
	var eps []EpisodioDaMissao
	for _, e := range a.Episodios {
		if !e.Em.Before(inicio) {
			eps = append(eps, e)
		}
	}
	progresso := 0
	switch m.Tipo {
	case MissaoEpisodios:
		progresso = len(eps)
	case MissaoEpisodiosGenero:
		for _, e := range eps {
			if a.temGenero(e.MalID, genero) {
				progresso++
			}
		}
	case MissaoAnimesDistintos:
		distintos := map[int]bool{}
		for _, e := range eps {
			distintos[e.MalID] = true
		}
		progresso = len(distintos)
	case MissaoComecarAnime:
		for _, e := range eps {
			if e.Numero == 1 {
				progresso++
			}
		}
	case MissaoLancamento:
		for _, e := range eps {
			if e.Lancamento {
				progresso++
			}
		}
	case MissaoFoco:
		porAnime := map[int]int{}
		for _, e := range eps {
			porAnime[e.MalID]++
			if porAnime[e.MalID] > progresso {
				progresso = porAnime[e.MalID]
			}
		}
	case MissaoDiasAtivos:
		dias := map[int]bool{}
		for _, e := range eps {
			dias[indiceDoDia(e.Em)] = true
		}
		progresso = len(dias)
	case MissaoCompletarObra:
		progresso = len(a.concluidasValidas(inicio))
	case MissaoCompletarDoAno:
		for _, c := range a.concluidasValidas(inicio) {
			if a.AnoAtual > 0 && a.Animes[c.MalID].Ano == a.AnoAtual {
				progresso++
			}
		}
	case MissaoCompletarTemporada:
		for _, c := range a.concluidasValidas(inicio) {
			if a.Animes[c.MalID].DaTemporada {
				progresso++
			}
		}
	case MissaoCompletarGenero:
		for _, c := range a.concluidasValidas(inicio) {
			if a.temGenero(c.MalID, genero) {
				progresso++
			}
		}
	case MissaoReagirEpisodio:
		progresso = a.ReacoesHoje
	case MissaoComentarEpisodio:
		progresso = a.ComentariosHoje
	case MissaoAvaliarAnime:
		progresso = max(a.ReviewsAnimeHoje, len(a.ReviewsAnimeHojeLista))
	case MissaoAvaliarEpisodio:
		progresso = max(a.AvaliacoesEpHoje, len(a.AvaliacoesEpHojeLista))
	}
	if progresso > m.Meta {
		progresso = m.Meta
	}
	return progresso
}

// AjusteMissao guarda as recompensas customizadas pelo Painel Admin para uma missão.
type AjusteMissao struct {
	Recompensa int `json:"recompensa"`
	XP         int `json:"xp"`
}

func mapaMissoesPadrao() map[string]ItemCatalogoMissao {
	diarias := CatalogoMissoesDiarias()
	semanais := CatalogoMissoesSemanais()
	mapa := make(map[string]ItemCatalogoMissao, len(diarias)+len(semanais))
	for _, m := range diarias {
		mapa[m.ID] = m
	}
	for _, m := range semanais {
		mapa[m.ID] = m
	}
	return mapa
}

// ValidarAjustesMissoes confere se todos os IDs existem no catálogo e se os valores
// de AniCoins e XP estão entre 0 e 5000.
func ValidarAjustesMissoes(ajustes map[string]AjusteMissao) string {
	padrao := mapaMissoesPadrao()
	for id, aj := range ajustes {
		item, ok := padrao[id]
		if !ok {
			return "Missão desconhecida: " + id
		}
		if aj.Recompensa < 0 || aj.Recompensa > 5000 {
			return "AniCoins da missão '" + item.Titulo + "' devem estar entre 0 e 5000."
		}
		if aj.XP < 0 || aj.XP > 5000 {
			return "XP da missão '" + item.Titulo + "' deve estar entre 0 e 5000."
		}
	}
	return ""
}

// NormalizarAjustesMissoes remove entradas idênticas ao padrão do código, mantendo só
// as missões alteradas pelo Admin.
func NormalizarAjustesMissoes(ajustes map[string]AjusteMissao) map[string]AjusteMissao {
	padrao := mapaMissoesPadrao()
	limpo := make(map[string]AjusteMissao)
	for id, aj := range ajustes {
		item, ok := padrao[id]
		if !ok {
			continue
		}
		if aj.Recompensa < 0 {
			aj.Recompensa = 0
		} else if aj.Recompensa > 5000 {
			aj.Recompensa = 5000
		}
		if aj.XP < 0 {
			aj.XP = 0
		} else if aj.XP > 5000 {
			aj.XP = 5000
		}
		if aj.Recompensa == item.Recompensa && aj.XP == item.XP {
			continue
		}
		limpo[id] = aj
	}
	return limpo
}

// AplicarAjustesMissoes devolve cópia do catálogo com os ajustes do Admin aplicados.
func AplicarAjustesMissoes(catalogo []ItemCatalogoMissao, ajustes map[string]AjusteMissao) []ItemCatalogoMissao {
	saida := make([]ItemCatalogoMissao, len(catalogo))
	copy(saida, catalogo)
	if len(ajustes) == 0 {
		return saida
	}
	for i := range saida {
		if aj, ok := ajustes[saida[i].ID]; ok {
			if aj.Recompensa >= 0 && aj.Recompensa <= 5000 {
				saida[i].Recompensa = aj.Recompensa
			}
			if aj.XP >= 0 && aj.XP <= 5000 {
				saida[i].XP = aj.XP
			}
		}
	}
	return saida
}
