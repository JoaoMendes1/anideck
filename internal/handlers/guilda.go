package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

const (
	chaveGuildaEconomia  = "guilda_economia"
	chaveGuildaRanks     = "guilda_ranks"
	chaveGuildaInsignias = "guilda_insignias"
)

// fusoGuilda fixa o corte diário em Brasília (UTC-3), evitando que o teto diário
// resete às 21h locais por causa do relógio UTC do banco.
var fusoGuilda = carregarFusoBrasilia()

func carregarFusoBrasilia() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return time.FixedZone("BRT", -3*3600)
	}
	return loc
}

// EconomiaGuilda reúne os pesos editáveis na aba Guilda do Painel Admin.
type EconomiaGuilda struct {
	Ativo                 bool    `json:"ativo"`
	XPBaseEpisodio        int     `json:"xp_base_episodio"`
	BonusCedo             int     `json:"bonus_cedo"`
	Fator3a5              float64 `json:"fator_3_a_5"`
	Fator6Mais            float64 `json:"fator_6_mais"`
	TetoDiario            int     `json:"teto_diario"`
	EventoInicio          string  `json:"evento_inicio"`
	EventoFim             string  `json:"evento_fim"`
	EventoMultiplicador   float64 `json:"evento_multiplicador"`
	BonusVitalidadeMax    float64 `json:"bonus_vitalidade_max"`
	BonusVitalidadeLimiar int     `json:"bonus_vitalidade_limiar"`
	FatorMaratona         float64 `json:"fator_maratona"`
	MaratonaLimiteEps     int     `json:"maratona_limite_eps"`
	MaratonaJanelaMin     int     `json:"maratona_janela_min"`
	FatorAcervo           float64 `json:"fator_acervo"`
	TetoPendenteDiario    int     `json:"teto_pendente_diario"`
}

// FaixaRank define o nível mínimo e o título de cada classe F → SS.
type FaixaRank struct {
	Rank        string `json:"rank"`
	Titulo      string `json:"titulo"`
	NivelMinimo int    `json:"nivel_minimo"`
}

// InsigniaConfig descreve uma carta colecionável avaliada sobre as métricas do usuário.
type InsigniaConfig struct {
	ID        string `json:"id"`
	Icone     string `json:"icone"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Regra     string `json:"regra"`
	Meta      int    `json:"meta"`
	Estilo    string `json:"estilo"`
}

// StatusNivelGuilda resume a posição atual do usuário na curva de progressão.
type StatusNivelGuilda struct {
	Nivel            int     `json:"nivel"`
	XPTotal          int     `json:"xp_total"`
	XPNoNivel        int     `json:"xp_no_nivel"`
	XPParaProximo    int     `json:"xp_para_proximo"`
	ProgressoPct     int     `json:"progresso_pct"`
	Rank             string  `json:"rank"`
	TituloRank       string  `json:"titulo_rank"`
	ProximoRank      string  `json:"proximo_rank,omitempty"`
	NivelProximoRank int     `json:"nivel_proximo_rank,omitempty"`
	XPHoje           int     `json:"xp_hoje"`
	TetoDiario       int     `json:"teto_diario"`
	StreakAtual      int     `json:"streak_atual"`
	MaiorStreak      int     `json:"maior_streak"`
	GamificacaoAtiva bool    `json:"gamificacao_ativa"`
	PesoMaximoVoto   float64 `json:"peso_maximo_voto"`
	// Ouro do RPG. Só o resumo da barra do topo preenche; nas outras respostas fica de fora.
	Ouro                  *int   `json:"ouro,omitempty"`
	UltimoEstornoMissaoEm string `json:"ultimo_estorno_missao_em,omitempty"`
	XPPendenteTotal       int    `json:"xp_pendente_total,omitempty"`
}

// AfinidadeGeneroInput representa uma linha lida de view_user_genre_affinity.
type AfinidadeGeneroInput struct {
	Genre        string  `json:"genre"`
	TotalWatched int     `json:"total_watched"`
	MediaNota    float64 `json:"media_nota_genero"`
	Tier         string  `json:"tier"`
}

// EspecialistaGenero traduz o volume assistido no gênero em nível N1..N5 e peso de voto.
type EspecialistaGenero struct {
	Genero       string  `json:"genero"`
	TotalVistos  int     `json:"total_vistos"`
	Nivel        int     `json:"nivel"`
	RotuloNivel  string  `json:"rotulo_nivel"`
	TituloNivel  string  `json:"titulo_nivel"`
	PesoVoto     float64 `json:"peso_voto"`
	ProximoAlvo  int     `json:"proximo_alvo"`
	ProgressoPct int     `json:"progresso_pct"`
}

// MetricasUsuarioGuilda agrega os contadores usados para avaliar o catálogo de insígnias.
type MetricasUsuarioGuilda struct {
	Madrugadas    int
	CuradosVistos int
	MaiorStreak   int
	CedoMarcados  int
	GenerosN3Mais int
	NivelAtual    int
}

// InsigniaStatus é a carta pronta para renderizar na tela da Guilda.
type InsigniaStatus struct {
	ID             string `json:"id"`
	Icone          string `json:"icone"`
	Nome           string `json:"nome"`
	Descricao      string `json:"descricao"`
	Regra          string `json:"regra"`
	Estilo         string `json:"estilo"`
	Desbloqueada   bool   `json:"desbloqueada"`
	ProgressoAtual int    `json:"progresso_atual"`
	Meta           int    `json:"meta"`
}

// ItemLedgerGuilda representa uma linha do extrato de XP exibida ao usuário.
type ItemLedgerGuilda struct {
	MalID         int    `json:"mal_id"`
	TituloAnime   string `json:"titulo_anime"`
	EpisodeNumber int    `json:"episode_number"`
	XPEarned      int    `json:"xp_earned"`
	Reason        string `json:"reason"`
	EarnedAt      string `json:"earned_at"`
	DeHoje        bool   `json:"de_hoje"`
}

// ItemPendenteGuilda representa uma entrada aguardando liberação gradual na fila de acervo.
type ItemPendenteGuilda struct {
	MalID         int    `json:"mal_id"`
	TituloAnime   string `json:"titulo_anime"`
	EpisodeNumber int    `json:"episode_number"`
	XPPendente    int    `json:"xp_pendente"`
	Motivo        string `json:"motivo"`
	CriadoEm      string `json:"criado_em"`
}

// EconomiaPadrao devolve os valores de referência quando a chave não existe no banco.
func EconomiaPadrao() EconomiaGuilda {
	return EconomiaGuilda{
		Ativo:                 true,
		XPBaseEpisodio:        25,
		BonusCedo:             10,
		Fator3a5:              0.75,
		Fator6Mais:            0.50,
		TetoDiario:            180,
		EventoInicio:          "",
		EventoFim:             "",
		EventoMultiplicador:   2.0,
		BonusVitalidadeMax:    0.10,
		BonusVitalidadeLimiar: 80,
		FatorMaratona:         0.30,
		MaratonaLimiteEps:     6,
		MaratonaJanelaMin:     30,
		FatorAcervo:           0.15,
		TetoPendenteDiario:    50,
	}
}

// RanksPadrao devolve as 8 faixas F → SS da Guilda.
func RanksPadrao() []FaixaRank {
	return []FaixaRank{
		{Rank: "F", Titulo: "Novato da Guilda", NivelMinimo: 1},
		{Rank: "E", Titulo: "Aprendiz de Campo", NivelMinimo: 5},
		{Rank: "D", Titulo: "Batedor", NivelMinimo: 10},
		{Rank: "C", Titulo: "Rastreador de Prata", NivelMinimo: 18},
		{Rank: "B", Titulo: "Veterano de Missão", NivelMinimo: 28},
		{Rank: "A", Titulo: "Vanguarda", NivelMinimo: 40},
		{Rank: "S", Titulo: "Mestre do Acervo", NivelMinimo: 55},
		{Rank: "SS", Titulo: "Lenda Viva", NivelMinimo: 75},
	}
}

// InsigniasPadrao devolve o catálogo inicial de cartas colecionáveis.
func InsigniasPadrao() []InsigniaConfig {
	return []InsigniaConfig{
		{ID: "coruja", Icone: "🌙", Nome: "Coruja da Guilda", Descricao: "12 madrugadas assistindo", Regra: "madrugadas", Meta: 12, Estilo: "foil"},
		{ID: "arquivista", Icone: "📚", Nome: "Arquivista", Descricao: "25 curados no deck", Regra: "curados_vistos", Meta: 25, Estilo: "foil2"},
		{ID: "chama", Icone: "🔥", Nome: "Chama Inabalável", Descricao: "14 dias de streak", Regra: "maior_streak", Meta: 14, Estilo: "foil"},
		{ID: "cedo", Icone: "⚡", Nome: "Sempre em Dia", Descricao: "10 episódios no lançamento", Regra: "cedo_marcados", Meta: 10, Estilo: "foil2"},
		{ID: "especialista", Icone: "🧭", Nome: "Mestre de Gênero", Descricao: "Nível N3 em um gênero", Regra: "genero_n3", Meta: 1, Estilo: "foil"},
		{ID: "voz_guilda", Icone: "👑", Nome: "Voz da Guilda", Descricao: "Alcançar o Rank S", Regra: "rank_s", Meta: 55, Estilo: "foil2"},
	}
}

// EventoAtivo verifica se o instante cai dentro da janela configurada de XP dobrado.
func EventoAtivo(cfg EconomiaGuilda, agora time.Time) bool {
	if strings.TrimSpace(cfg.EventoInicio) == "" || strings.TrimSpace(cfg.EventoFim) == "" || cfg.EventoMultiplicador <= 1 {
		return false
	}
	ini, errIni := time.Parse(time.RFC3339, strings.TrimSpace(cfg.EventoInicio))
	fim, errFim := time.Parse(time.RFC3339, strings.TrimSpace(cfg.EventoFim))
	if errIni != nil || errFim != nil || !fim.After(ini) {
		return false
	}
	return !agora.Before(ini) && !agora.After(fim)
}

// CalcularXPEpisodio aplica retorno decrescente, bônus de lançamento, evento e teto diário.
// Recebe ordemNoDia começando em 1 (1 = primeiro episódio marcado pelo usuário hoje).
func CalcularXPEpisodio(ordemNoDia int, xpAcumuladoHoje int, ehLancamentoRecente bool, cfg EconomiaGuilda, agora time.Time) (int, string) {
	return CalcularXPEpisodioComVitalidade(ordemNoDia, xpAcumuladoHoje, ehLancamentoRecente, 0, cfg, agora)
}

// CalcularXPEpisodioComVitalidade inclui o bônus de constância recente (Vitalidade alta) antes do teto diário (Fase 16, #169).
func CalcularXPEpisodioComVitalidade(ordemNoDia int, xpAcumuladoHoje int, ehLancamentoRecente bool, hp int, cfg EconomiaGuilda, agora time.Time) (int, string) {
	return CalcularXPEpisodioComFaixa(ordemNoDia, xpAcumuladoHoje, ehLancamentoRecente, false, false, hp, cfg, agora)
}

// CalcularXPEpisodioComFaixa escolhe a faixa do episódio individual ("Ao vivo" ou "Maratona"):
//   - "Ao vivo" (fora da janela de maratona OU até 24h após o episódio ir ao ar): regra cheia.
//   - "Maratona" (acima de MaratonaLimiteEps episódios da mesma obra na janela): ~30% do base.
func CalcularXPEpisodioComFaixa(
	ordemNoDia int,
	xpAcumuladoHoje int,
	ehLancamentoRecente bool,
	ehMaratona bool,
	saiuAte24h bool,
	hp int,
	cfg EconomiaGuilda,
	agora time.Time,
) (int, string) {
	if !cfg.Ativo {
		return 0, "gamificação pausada"
	}
	if cfg.TetoDiario > 0 && xpAcumuladoHoje >= cfg.TetoDiario {
		return 0, "teto diário atingido"
	}

	if ehMaratona && !saiuAte24h {
		fator := cfg.FatorMaratona
		if fator <= 0 {
			fator = 0.30
		}
		xp := int(math.Floor(float64(cfg.XPBaseEpisodio) * fator))
		if xp < 1 && cfg.XPBaseEpisodio > 0 {
			xp = 1
		}
		motivo := fmt.Sprintf("maratona · %d%%", int(math.Round(fator*100)))
		if cfg.TetoDiario > 0 && xpAcumuladoHoje+xp > cfg.TetoDiario {
			xp = cfg.TetoDiario - xpAcumuladoHoje
			if xp < 0 {
				xp = 0
			}
			motivo = "teto diário atingido"
		}
		return xp, motivo
	}

	if ordemNoDia <= 0 {
		ordemNoDia = 1
	}

	xp := cfg.XPBaseEpisodio
	motivo := "episódio base · 100%"

	if ordemNoDia >= 3 && ordemNoDia <= 5 {
		xp = int(math.Floor(float64(cfg.XPBaseEpisodio) * cfg.Fator3a5))
		motivo = fmt.Sprintf("retorno decrescente · %d%%", int(math.Round(cfg.Fator3a5*100)))
	} else if ordemNoDia >= 6 {
		xp = int(math.Floor(float64(cfg.XPBaseEpisodio) * cfg.Fator6Mais))
		motivo = fmt.Sprintf("retorno decrescente · %d%%", int(math.Round(cfg.Fator6Mais*100)))
	}

	if ehLancamentoRecente && cfg.BonusCedo > 0 {
		xp += cfg.BonusCedo
		motivo = fmt.Sprintf("antes do próximo sair · +%d", cfg.BonusCedo)
	}

	if ehLancamentoRecente && EventoAtivo(cfg, agora) {
		xp = int(math.Round(float64(xp) * cfg.EventoMultiplicador))
		motivo += " · evento XP"
	}

	// Bônus de Vitalidade alta (Fase 16, #169): até +10% de XP
	limiar := cfg.BonusVitalidadeLimiar
	if limiar <= 0 {
		limiar = 80
	}
	bonusMax := cfg.BonusVitalidadeMax
	if bonusMax <= 0 {
		bonusMax = 0.10
	}

	if hp > limiar && limiar < 100 {
		fracao := float64(hp-limiar) / float64(100-limiar)
		if fracao > 1.0 {
			fracao = 1.0
		}
		pctBonus := int(math.Round(fracao * bonusMax * 100))
		if pctBonus > 0 {
			bonusXP := int(math.Round(float64(xp) * (float64(pctBonus) / 100.0)))
			if bonusXP < 1 && xp > 0 {
				bonusXP = 1
			}
			xp += bonusXP
			motivo += fmt.Sprintf(" · bônus Vitalidade +%d%%", pctBonus)
		}
	}

	if xp < 0 {
		xp = 0
	}

	if cfg.TetoDiario > 0 && xpAcumuladoHoje+xp > cfg.TetoDiario {
		xp = cfg.TetoDiario - xpAcumuladoHoje
		if xp < 0 {
			xp = 0
		}
		motivo = "teto diário atingido"
	}

	return xp, motivo
}

// CustoProximoNivel devolve o XP exigido para subir do nível L para L+1.
func CustoProximoNivel(nivel int) int {
	if nivel < 1 {
		nivel = 1
	}
	return 100 + (nivel-1)*30
}

// CalcularNivelERank converte o XP total acumulado em nível, progresso na barra e classe F → SS.
func CalcularNivelERank(xpTotal int, ranks []FaixaRank) StatusNivelGuilda {
	if xpTotal < 0 {
		xpTotal = 0
	}
	if len(ranks) == 0 {
		ranks = RanksPadrao()
	}

	ordenados := make([]FaixaRank, len(ranks))
	copy(ordenados, ranks)
	sort.Slice(ordenados, func(i, j int) bool {
		return ordenados[i].NivelMinimo < ordenados[j].NivelMinimo
	})

	nivel := 1
	restante := xpTotal
	for {
		custo := CustoProximoNivel(nivel)
		if restante < custo {
			break
		}
		restante -= custo
		nivel++
	}

	custoAtual := CustoProximoNivel(nivel)
	pct := 0
	if custoAtual > 0 {
		pct = int(math.Round(float64(restante) * 100.0 / float64(custoAtual)))
		if pct > 100 {
			pct = 100
		}
	}

	rankAtual := ordenados[0]
	var proximoRank *FaixaRank
	for i, r := range ordenados {
		if nivel >= r.NivelMinimo {
			rankAtual = r
			if i+1 < len(ordenados) {
				prox := ordenados[i+1]
				proximoRank = &prox
			} else {
				proximoRank = nil
			}
		}
	}

	res := StatusNivelGuilda{
		Nivel:          nivel,
		XPTotal:        xpTotal,
		XPNoNivel:      restante,
		XPParaProximo:  custoAtual,
		ProgressoPct:   pct,
		Rank:           rankAtual.Rank,
		TituloRank:     rankAtual.Titulo,
		PesoMaximoVoto: 1.0,
	}
	if proximoRank != nil {
		res.ProximoRank = proximoRank.Rank
		res.NivelProximoRank = proximoRank.NivelMinimo
	}
	return res
}

var escadaEspecialista = []struct {
	Nivel  int
	Minimo int
	Titulo string
	Peso   float64
}{
	{Nivel: 1, Minimo: 3, Titulo: "Iniciado", Peso: 1.1},
	{Nivel: 2, Minimo: 8, Titulo: "Conhecedor", Peso: 1.3},
	{Nivel: 3, Minimo: 15, Titulo: "Especialista", Peso: 1.6},
	{Nivel: 4, Minimo: 25, Titulo: "Autoridade", Peso: 1.8},
	{Nivel: 5, Minimo: 40, Titulo: "Grão-Mestre", Peso: 2.0},
}

// CalcularEspecialistasGenero classifica o domínio do usuário em cada gênero/demografia.
func CalcularEspecialistasGenero(afinidades []AfinidadeGeneroInput) []EspecialistaGenero {
	resultado := make([]EspecialistaGenero, 0, len(afinidades))
	for _, a := range afinidades {
		if a.Tier == "tag_tematica" || a.Tier == "ignorado" || a.TotalWatched <= 0 {
			continue
		}
		nivel := 0
		titulo := "Explorador"
		peso := 1.0
		proximoAlvo := escadaEspecialista[0].Minimo

		for i, degrau := range escadaEspecialista {
			if a.TotalWatched >= degrau.Minimo {
				nivel = degrau.Nivel
				titulo = degrau.Titulo
				peso = degrau.Peso
				if i+1 < len(escadaEspecialista) {
					proximoAlvo = escadaEspecialista[i+1].Minimo
				} else {
					proximoAlvo = degrau.Minimo
				}
			}
		}

		pct := 100
		if nivel < 5 && proximoAlvo > 0 {
			pct = int(math.Round(float64(a.TotalWatched) * 100.0 / float64(proximoAlvo)))
			if pct > 100 {
				pct = 100
			}
		}

		rotulo := fmt.Sprintf("N%d", nivel)
		if nivel == 0 {
			rotulo = "N0"
		}

		resultado = append(resultado, EspecialistaGenero{
			Genero:       a.Genre,
			TotalVistos:  a.TotalWatched,
			Nivel:        nivel,
			RotuloNivel:  rotulo,
			TituloNivel:  titulo,
			PesoVoto:     peso,
			ProximoAlvo:  proximoAlvo,
			ProgressoPct: pct,
		})
	}

	sort.Slice(resultado, func(i, j int) bool {
		if resultado[i].TotalVistos != resultado[j].TotalVistos {
			return resultado[i].TotalVistos > resultado[j].TotalVistos
		}
		return resultado[i].Genero < resultado[j].Genero
	})
	return resultado
}

// AvaliarInsignias cruza o catálogo de cartas com os números reais do usuário.
func AvaliarInsignias(m MetricasUsuarioGuilda, catalogo []InsigniaConfig) []InsigniaStatus {
	if len(catalogo) == 0 {
		catalogo = InsigniasPadrao()
	}
	saida := make([]InsigniaStatus, 0, len(catalogo))
	for _, c := range catalogo {
		meta := c.Meta
		if meta <= 0 {
			meta = 1
		}
		atual := 0
		switch c.Regra {
		case "madrugadas":
			atual = m.Madrugadas
		case "curados_vistos":
			atual = m.CuradosVistos
		case "maior_streak":
			atual = m.MaiorStreak
		case "cedo_marcados":
			atual = m.CedoMarcados
		case "genero_n3":
			atual = m.GenerosN3Mais
		case "rank_s":
			atual = m.NivelAtual
		}

		saida = append(saida, InsigniaStatus{
			ID:             c.ID,
			Icone:          c.Icone,
			Nome:           c.Nome,
			Descricao:      c.Descricao,
			Regra:          c.Regra,
			Estilo:         c.Estilo,
			Desbloqueada:   atual >= meta,
			ProgressoAtual: atual,
			Meta:           meta,
		})
	}
	return saida
}

// carregarConfigGuilda lê economia, faixas e insígnias de app_settings em uma única consulta,
// caindo para os padrões quando alguma chave ainda não existe.
func carregarConfigGuilda(dbClient *supabase.Client) (EconomiaGuilda, []FaixaRank, []InsigniaConfig) {
	economia := EconomiaPadrao()
	ranks := RanksPadrao()
	insignias := InsigniasPadrao()

	cliente := dbClient
	if cliente == nil {
		cliente = database.Client
	}
	if cliente == nil {
		return economia, ranks, insignias
	}

	data, _, err := cliente.From("app_settings").
		Select("key,value", "", false).
		In("key", []string{chaveGuildaEconomia, chaveGuildaRanks, chaveGuildaInsignias}).
		Execute()
	if err != nil {
		return economia, ranks, insignias
	}

	var linhas []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	if json.Unmarshal(data, &linhas) != nil {
		return economia, ranks, insignias
	}

	for _, l := range linhas {
		raw := strings.TrimSpace(l.Value)
		if raw == "" {
			continue
		}
		switch l.Key {
		case chaveGuildaEconomia:
			ec := EconomiaPadrao()
			if json.Unmarshal([]byte(raw), &ec) == nil && ec.XPBaseEpisodio > 0 {
				if ec.FatorMaratona <= 0 {
					ec.FatorMaratona = 0.30
				}
				if ec.MaratonaLimiteEps <= 0 {
					ec.MaratonaLimiteEps = 6
				}
				if ec.MaratonaJanelaMin <= 0 {
					ec.MaratonaJanelaMin = 30
				}
				if ec.FatorAcervo <= 0 {
					ec.FatorAcervo = 0.15
				}
				if ec.TetoPendenteDiario <= 0 {
					ec.TetoPendenteDiario = 50
				}
				economia = ec
			}
		case chaveGuildaRanks:
			var rk []FaixaRank
			if json.Unmarshal([]byte(raw), &rk) == nil && len(rk) > 0 {
				ranks = rk
			}
		case chaveGuildaInsignias:
			var ins []InsigniaConfig
			if json.Unmarshal([]byte(raw), &ins) == nil && len(ins) > 0 {
				insignias = ins
			}
		}
	}
	return economia, ranks, insignias
}

// inicioDoDiaBrasilia devolve o instante UTC correspondente às 00:00 de hoje em Brasília.
func inicioDoDiaBrasilia(agora time.Time) time.Time {
	local := agora.In(fusoGuilda)
	meiaNoite := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, fusoGuilda)
	return meiaNoite.UTC()
}

// episodioEhLancamentoRecente verifica se o episódio marcado pertence a uma obra em lançamento
// ou foi exibido nos últimos 7 dias segundo a curadoria.
func episodioEhLancamentoRecente(curado *models.CuratedAnime, episodeNumber int, agora time.Time) bool {
	if curado == nil {
		return false
	}
	if !jsonAusente(curado.CustomEpisodes) {
		var episodios []episodioCurado
		if json.Unmarshal(curado.CustomEpisodes, &episodios) == nil {
			for _, ep := range episodios {
				if ep.Number == episodeNumber && strings.TrimSpace(ep.AiredAt) != "" {
					for _, layout := range formatosDeTimestamp {
						if t, err := time.Parse(layout, strings.TrimSpace(ep.AiredAt)); err == nil {
							diff := agora.Sub(t)
							return diff >= -2*time.Hour && diff <= 7*24*time.Hour
						}
					}
				}
			}
		}
	}
	status := strings.ToUpper(strings.TrimSpace(curado.CustomStatus))
	return status == "RELEASING" || status == "EM LANÇAMENTO"
}

// episodioSaiuAte24h verifica pela data do episódio na curadoria se ele foi ao ar há no máximo 24h.
// Episódios nessa janela pertencem à faixa "Ao vivo" e não sofrem redução de maratona.
func episodioSaiuAte24h(curado *models.CuratedAnime, episodeNumber int, agora time.Time) bool {
	if curado == nil || jsonAusente(curado.CustomEpisodes) {
		return false
	}
	var episodios []episodioCurado
	if json.Unmarshal(curado.CustomEpisodes, &episodios) != nil {
		return false
	}
	for _, ep := range episodios {
		if ep.Number != episodeNumber {
			continue
		}
		bruto := strings.TrimSpace(ep.AiredAt)
		if bruto == "" {
			return false
		}
		for _, layout := range formatosDeTimestamp {
			if t, err := time.Parse(layout, bruto); err == nil {
				diff := agora.Sub(t)
				return diff >= -2*time.Hour && diff <= 24*time.Hour
			}
		}
		if tDia, err := time.ParseInLocation("2006-01-02", bruto, fusoGuilda); err == nil {
			diff := agora.Sub(tDia)
			return diff >= 0 && diff <= 48*time.Hour
		}
	}
	return false
}

// episodioEmMaratona indica se a marcação atual excede o limite de episódios do mesmo anime na janela curta.
func episodioEmMaratona(dbClient *supabase.Client, userID string, malID int, agora time.Time, cfg EconomiaGuilda) bool {
	limite := cfg.MaratonaLimiteEps
	if limite <= 0 {
		limite = 6
	}
	janelaMin := cfg.MaratonaJanelaMin
	if janelaMin <= 0 {
		janelaMin = 30
	}
	corte := agora.Add(-time.Duration(janelaMin) * time.Minute).Format(time.RFC3339)
	data, _, err := dbClient.From("episode_progress").
		Select("episode_number", "", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Not("watched_at", "is", "null").
		Gte("watched_at", corte).
		Execute()
	if err != nil {
		return false
	}
	var rows []struct {
		EpisodeNumber int `json:"episode_number"`
	}
	if json.Unmarshal(data, &rows) != nil {
		return false
	}
	return len(rows) > limite
}

// RegistrarXPEpisodio grava o ganho de XP ao marcar um episódio.
// Nunca falha a operação principal: se a tabela xp_ledger ainda não existir, apenas loga.
func RegistrarXPEpisodio(dbClient *supabase.Client, userID string, malID, episodeNumber int, curado *models.CuratedAnime) (int, string) {
	if dbClient == nil || userID == "" || malID <= 0 || episodeNumber <= 0 {
		return 0, ""
	}

	agora := time.Now().UTC()
	if revBytes, _, errRev := dbClient.From("revisoes").
		Select("id", "", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Eq("ativa", "true").
		Limit(1, "").
		Execute(); errRev == nil {
		var revRows []struct {
			ID string `json:"id"`
		}
		if json.Unmarshal(revBytes, &revRows) == nil && len(revRows) > 0 {
			return 0, "revisão · histórico preservado"
		}
	}

	economia, _, _ := carregarConfigGuilda(dbClient)
	if !economia.Ativo {
		return 0, "gamificação pausada"
	}

	inicioDia := inicioDoDiaBrasilia(agora).Format(time.RFC3339)
	// mal_id 0 é XP sem episódio (missão, convite): não gasta o teto diário dos episódios.
	dataHoje, _, errHoje := dbClient.From("xp_ledger").
		Select("xp_earned", "", false).
		Eq("user_id", userID).
		Gt("mal_id", "0").
		Gte("earned_at", inicioDia).
		Execute()
	if errHoje != nil {
		log.Printf("[GUILDA XP] Falha ao consultar ledger do dia (user=%s): %v", userID, errHoje)
		return 0, ""
	}

	var linhasHoje []struct {
		XPEarned int `json:"xp_earned"`
	}
	_ = json.Unmarshal(dataHoje, &linhasHoje)

	xpHoje := 0
	for _, l := range linhasHoje {
		xpHoje += l.XPEarned
	}
	ordemNoDia := len(linhasHoje) + 1
	ehCedo := episodioEhLancamentoRecente(curado, episodeNumber, agora)
	saiuAte24h := episodioSaiuAte24h(curado, episodeNumber, agora)
	ehMaratona := !saiuAte24h && episodioEmMaratona(dbClient, userID, malID, agora, economia)

	hp := 0
	if resHP := strings.TrimSpace(dbClient.Rpc("vitalidade_atual", "", map[string]interface{}{"p_user": userID})); resHP != "" && !strings.Contains(resHP, "error") {
		hp, _ = strconv.Atoi(resHP)
	}

	xpGanho, motivo := CalcularXPEpisodioComFaixa(ordemNoDia, xpHoje, ehCedo, ehMaratona, saiuAte24h, hp, economia, agora)

	novaLinha := map[string]interface{}{
		"user_id":        userID,
		"mal_id":         malID,
		"episode_number": episodeNumber,
		"xp_earned":      xpGanho,
		"reason":         motivo,
		"earned_at":      agora.Format(time.RFC3339),
	}

	if _, _, errIns := dbClient.From("xp_ledger").Insert(novaLinha, true, "user_id,mal_id,episode_number", "minimal", "").Execute(); errIns != nil {
		log.Printf("[GUILDA XP] Falha ao gravar xp_ledger (user=%s, mal_id=%d, ep=%d): %v", userID, malID, episodeNumber, errIns)
		return 0, ""
	}

	return xpGanho, motivo
}

// GuildaHandler responde pelas rotas de leitura da Guilda do usuário.
type GuildaHandler struct{}

type linhaLedgerBanco struct {
	MalID         int    `json:"mal_id"`
	EpisodeNumber int    `json:"episode_number"`
	XPEarned      int    `json:"xp_earned"`
	Reason        string `json:"reason"`
	EarnedAt      string `json:"earned_at"`
}

// carregarLedgerUsuario busca todas as entradas de XP do usuário, da mais recente para a
// mais antiga. Pagina por id: o Limit(5000) de antes esbarrava no teto de 1.000 linhas do
// PostgREST, e o XP total pararia de crescer na milésima entrada (PITFALLS, item 28).
func carregarLedgerUsuario(dbClient *supabase.Client, userID string) []linhaLedgerBanco {
	linhas, err := paginar[linhaLedgerBanco](func(de, ate int) ([]byte, error) {
		dados, _, errPagina := dbClient.From("xp_ledger").
			Select("mal_id,episode_number,xp_earned,reason,earned_at", "", false).
			Eq("user_id", userID).
			Order("id", &postgrest.OrderOpts{Ascending: true}).
			Range(de, ate, "").
			Execute()
		return dados, errPagina
	}, tamanhoPaginaPostgREST)
	if err != nil {
		log.Printf("[GUILDA] Falha ao ler xp_ledger (user=%s): %v", userID, err)
		return nil
	}
	ordenarLedgerRecentePrimeiro(linhas)
	return linhas
}

// ordenarLedgerRecentePrimeiro põe a entrada mais nova na frente, comparando o instante e
// não o texto (a fração de segundo do Postgres varia de tamanho).
func ordenarLedgerRecentePrimeiro(linhas []linhaLedgerBanco) {
	instante := func(l linhaLedgerBanco) time.Time {
		t, err := time.Parse(time.RFC3339Nano, l.EarnedAt)
		if err != nil {
			return time.Time{}
		}
		return t
	}
	sort.SliceStable(linhas, func(i, j int) bool { return instante(linhas[i]).After(instante(linhas[j])) })
}

type linhaPendenteBanco struct {
	MalID         int    `json:"mal_id"`
	EpisodeNumber int    `json:"episode_number"`
	XPPendente    int    `json:"xp_pendente"`
	Motivo        string `json:"motivo"`
	CriadoEm      string `json:"criado_em"`
}

// liberarXPPendenteUsuario dispara a liberação diária do próprio usuário apenas se existir
// fila pendente, evitando chamadas RPC desnecessárias quando o acervo já foi todo liberado.
func liberarXPPendenteUsuario(dbClient *supabase.Client, userID string) {
	if dbClient == nil || userID == "" {
		return
	}
	checkBytes, _, errCheck := dbClient.From("xp_pendente").
		Select("id", "", false).
		Eq("user_id", userID).
		Is("liberado_em", "null").
		Limit(1, "").
		Execute()
	if errCheck != nil {
		return
	}
	var tem []struct {
		ID string `json:"id"`
	}
	if json.Unmarshal(checkBytes, &tem) != nil || len(tem) == 0 {
		return
	}
	srvClient, errSrv := database.ServiceRoleClient()
	if errSrv != nil || srvClient == nil {
		return
	}
	_ = srvClient.Rpc("liberar_xp_pendente", "", map[string]interface{}{"p_user_id": userID})
}

func carregarPendentesGuilda(dbClient *supabase.Client, userID string, curados map[int]models.CuratedAnime) (int, int, []ItemPendenteGuilda) {
	linhas, err := paginar[linhaPendenteBanco](func(de, ate int) ([]byte, error) {
		dados, _, errPagina := dbClient.From("xp_pendente").
			Select("mal_id,episode_number,xp_pendente,motivo,criado_em", "", false).
			Eq("user_id", userID).
			Is("liberado_em", "null").
			Order("id", &postgrest.OrderOpts{Ascending: true}).
			Range(de, ate, "").
			Execute()
		return dados, errPagina
	}, tamanhoPaginaPostgREST)
	if err != nil || len(linhas) == 0 {
		return 0, 0, []ItemPendenteGuilda{}
	}

	sort.SliceStable(linhas, func(i, j int) bool {
		if linhas[i].CriadoEm != linhas[j].CriadoEm {
			return linhas[i].CriadoEm < linhas[j].CriadoEm
		}
		if linhas[i].MalID != linhas[j].MalID {
			return linhas[i].MalID < linhas[j].MalID
		}
		return linhas[i].EpisodeNumber < linhas[j].EpisodeNumber
	})

	totalXP := 0
	for _, l := range linhas {
		totalXP += l.XPPendente
	}

	limite := 20
	if len(linhas) < limite {
		limite = len(linhas)
	}
	recorte := linhas[:limite]
	paraResolver := make([]linhaLedgerBanco, 0, len(recorte))
	for _, l := range recorte {
		paraResolver = append(paraResolver, linhaLedgerBanco{MalID: l.MalID})
	}
	titulos := resolverTitulosLedger(dbClient, paraResolver, curados)

	itens := make([]ItemPendenteGuilda, 0, len(recorte))
	for _, l := range recorte {
		titulo := titulos[l.MalID]
		if titulo == "" {
			titulo = fmt.Sprintf("Anime #%d", l.MalID)
		}
		itens = append(itens, ItemPendenteGuilda{
			MalID:         l.MalID,
			TituloAnime:   titulo,
			EpisodeNumber: l.EpisodeNumber,
			XPPendente:    l.XPPendente,
			Motivo:        l.Motivo,
			CriadoEm:      l.CriadoEm,
		})
	}
	return totalXP, len(linhas), itens
}

// HandleResumoGuilda devolve apenas os indicadores da pílula da Navbar e do menu de Perfil.
func (h *GuildaHandler) HandleResumoGuilda(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	liberarXPPendenteUsuario(dbClient, userID)

	economia, ranks, _ := carregarConfigGuilda(dbClient)
	linhas := carregarLedgerUsuario(dbClient, userID)
	totalPendenteXP, _, _ := carregarPendentesGuilda(dbClient, userID, nil)

	agora := time.Now().UTC()
	inicioDia := inicioDoDiaBrasilia(agora)
	xpTotal := 0
	xpHoje := 0
	for _, l := range linhas {
		xpTotal += l.XPEarned
		if t, errT := time.Parse(time.RFC3339, l.EarnedAt); errT == nil && !t.Before(inicioDia) && l.MalID > 0 {
			xpHoje += l.XPEarned
		}
	}

	var datasRows []struct {
		Dia string `json:"dia"`
	}
	if dBytes, _, errD := dbClient.From("view_user_watch_dates").Select("dia", "", false).Execute(); errD == nil {
		_ = json.Unmarshal(dBytes, &datasRows)
	}
	datas := make([]string, 0, len(datasRows))
	for _, d := range datasRows {
		if d.Dia != "" {
			datas = append(datas, d.Dia)
		}
	}
	streakAtual, maiorStreak := CalculateStreak(datas, agora.In(fusoGuilda))

	status := CalcularNivelERank(xpTotal, ranks)
	status.XPHoje = xpHoje
	status.TetoDiario = economia.TetoDiario
	status.StreakAtual = streakAtual
	status.MaiorStreak = maiorStreak
	status.GamificacaoAtiva = economia.Ativo
	status.Ouro = lerOuroDoJogador(dbClient, userID)
	status.XPPendenteTotal = totalPendenteXP

	var estornosRows []struct {
		EstornadaEm string `json:"estornada_em"`
	}
	if eBytes, _, errE := dbClient.From("missoes_resgates").
		Select("estornada_em", "", false).
		Eq("user_id", userID).
		Gt("xp", "0").
		Not("estornada_em", "is", "null").
		Order("estornada_em", &postgrest.OrderOpts{Ascending: false}).
		Limit(1, "").
		Execute(); errE == nil {
		_ = json.Unmarshal(eBytes, &estornosRows)
	}
	if len(estornosRows) > 0 {
		status.UltimoEstornoMissaoEm = estornosRows[0].EstornadaEm
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(status)
}

// lerOuroDoJogador lê o Ouro em rpg_recursos com o token do usuário (a RLS só devolve a
// linha dele). Sem linha, quem ainda não lutou, o Ouro é 0. Falha de leitura devolve nil,
// e a barra esconde o Ouro em vez de mostrar um zero falso.
func lerOuroDoJogador(dbClient *supabase.Client, userID string) *int {
	dados, _, err := dbClient.From("rpg_recursos").Select("ouro", "", false).Eq("user_id", userID).Execute()
	if err != nil {
		log.Printf("[GUILDA] Falha ao ler o Ouro (user=%s): %v", userID, err)
		return nil
	}
	return ouroDaLeitura(dados)
}

// ouroDaLeitura interpreta a resposta do PostgREST: lista vazia é Ouro 0.
func ouroDaLeitura(dados []byte) *int {
	var linhas []struct {
		Ouro int `json:"ouro"`
	}
	if err := json.Unmarshal(dados, &linhas); err != nil {
		return nil
	}
	ouro := 0
	if len(linhas) > 0 {
		ouro = linhas[0].Ouro
	}
	return &ouro
}

// HandleGetGuilda devolve o estado completo da página /guilda.
func (h *GuildaHandler) HandleGetGuilda(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	liberarXPPendenteUsuario(dbClient, userID)

	economia, ranks, catalogoInsignias := carregarConfigGuilda(dbClient)
	linhasLedger := carregarLedgerUsuario(dbClient, userID)

	var afinidades []AfinidadeGeneroInput
	if afBytes, _, errAf := dbClient.From("view_user_genre_affinity").Select("*", "", false).Execute(); errAf == nil {
		_ = json.Unmarshal(afBytes, &afinidades)
	}

	var datasRows []struct {
		Dia string `json:"dia"`
	}
	if dBytes, _, errD := dbClient.From("view_user_watch_dates").Select("dia", "", false).Execute(); errD == nil {
		_ = json.Unmarshal(dBytes, &datasRows)
	}
	datas := make([]string, 0, len(datasRows))
	for _, d := range datasRows {
		if d.Dia != "" {
			datas = append(datas, d.Dia)
		}
	}

	var tsRows []map[string]interface{}
	if tsBytes, _, errTS := dbClient.From("view_user_watch_timestamps").Select("watched_at", "", false).Execute(); errTS == nil {
		_ = json.Unmarshal(tsBytes, &tsRows)
	}

	var entriesRows []struct {
		MalID  int    `json:"mal_id"`
		Status string `json:"status"`
	}
	if eBytes, _, errE := dbClient.From("media_entries").Select("mal_id,status", "", false).Eq("user_id", userID).Execute(); errE == nil {
		_ = json.Unmarshal(eBytes, &entriesRows)
	}

	curados := CarregarCuradoria(dbClient)
	totalPendenteXP, totalPendenteEps, itensPendentes := carregarPendentesGuilda(dbClient, userID, curados)

	agora := time.Now().UTC()
	inicioDia := inicioDoDiaBrasilia(agora)

	xpTotal := 0
	xpHoje := 0
	cedoMarcados := 0
	for _, l := range linhasLedger {
		xpTotal += l.XPEarned
		if strings.Contains(l.Reason, "antes do próximo sair") {
			cedoMarcados++
		}
		if t, errT := time.Parse(time.RFC3339, l.EarnedAt); errT == nil && !t.Before(inicioDia) && l.MalID > 0 {
			xpHoje += l.XPEarned
		}
	}

	streakAtual, maiorStreak := CalculateStreak(datas, agora.In(fusoGuilda))
	especialistas := CalcularEspecialistasGenero(afinidades)

	pesoMaximo := 1.0
	generosN3 := 0
	for _, esp := range especialistas {
		if esp.PesoVoto > pesoMaximo {
			pesoMaximo = esp.PesoVoto
		}
		if esp.Nivel >= 3 {
			generosN3++
		}
	}

	status := CalcularNivelERank(xpTotal, ranks)
	status.XPHoje = xpHoje
	status.TetoDiario = economia.TetoDiario
	status.StreakAtual = streakAtual
	status.MaiorStreak = maiorStreak
	status.GamificacaoAtiva = economia.Ativo
	status.PesoMaximoVoto = pesoMaximo
	status.XPPendenteTotal = totalPendenteXP

	// Contagem de sessões ou marcações na madrugada (00h–05h no fuso de Brasília).
	madrugadas := 0
	for _, ts := range parseTimestamps(tsRows) {
		horaLocal := ts.In(fusoGuilda).Hour()
		if horaLocal >= 0 && horaLocal < 6 {
			madrugadas++
		}
	}

	// Quantas obras do catálogo curado o usuário assiste ou completou.
	curadosVistos := 0
	for _, e := range entriesRows {
		if e.Status == "Completo" || e.Status == "Em Dia" || e.Status == "Assistindo" {
			if _, ehCurado := curados[e.MalID]; ehCurado {
				curadosVistos++
			}
		}
	}

	insignias := AvaliarInsignias(MetricasUsuarioGuilda{
		Madrugadas:    madrugadas,
		CuradosVistos: curadosVistos,
		MaiorStreak:   maiorStreak,
		CedoMarcados:  cedoMarcados,
		GenerosN3Mais: generosN3,
		NivelAtual:    status.Nivel,
	}, catalogoInsignias)

	// Monta a primeira página (20 itens mais recentes) do extrato com títulos resolvidos pela curadoria/cache.
	limiteExtrato := tamanhoPaginaExtratoGuilda
	if len(linhasLedger) < limiteExtrato {
		limiteExtrato = len(linhasLedger)
	}
	recorteLedger := linhasLedger[:limiteExtrato]
	titulos := resolverTitulosLedger(dbClient, recorteLedger, curados)
	extrato := montarItensLedgerGuilda(recorteLedger, titulos, inicioDia)

	resposta := map[string]interface{}{
		"status":                status,
		"economia":              economia,
		"ranks":                 ranks,
		"extrato":               extrato,
		"extrato_total":         len(linhasLedger),
		"extrato_total_paginas": calcularTotalPaginasExtrato(len(linhasLedger), tamanhoPaginaExtratoGuilda),
		"pendentes":             itensPendentes,
		"xp_pendente_total":     totalPendenteXP,
		"pendentes_total_eps":   totalPendenteEps,
		"especialistas":         especialistas,
		"especialidade":         CalcularEspecialidade(especialistas),
		"insignias":             insignias,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resposta)
}

const tamanhoPaginaExtratoGuilda = 20

// RespostaExtratoGuilda representa uma página do histórico de XP na tela da Guilda.
type RespostaExtratoGuilda struct {
	Itens        []ItemLedgerGuilda `json:"itens"`
	Pagina       int                `json:"pagina"`
	TotalPaginas int                `json:"total_paginas"`
	Total        int                `json:"total"`
}

func normalizarPaginaExtrato(valor string) int {
	p, err := strconv.Atoi(strings.TrimSpace(valor))
	if err != nil || p < 1 {
		return 1
	}
	return p
}

func calcularTotalPaginasExtrato(total int, porPagina int) int {
	if porPagina <= 0 || total <= 0 {
		return 1
	}
	return (total + porPagina - 1) / porPagina
}

// tituloXPSemEpisodio nomeia, no extrato, o XP que não veio de episódio (mal_id 0).
const tituloXPSemEpisodio = "Bônus de XP"

func montarItensLedgerGuilda(linhas []linhaLedgerBanco, titulos map[int]string, inicioDia time.Time) []ItemLedgerGuilda {
	extrato := make([]ItemLedgerGuilda, 0, len(linhas))
	for _, l := range linhas {
		deHoje := false
		if t, errT := time.Parse(time.RFC3339, l.EarnedAt); errT == nil && !t.Before(inicioDia) {
			deHoje = true
		}
		titulo := titulos[l.MalID]
		if l.MalID == 0 {
			titulo = tituloXPSemEpisodio
		} else if titulo == "" {
			titulo = fmt.Sprintf("Anime #%d", l.MalID)
		}
		extrato = append(extrato, ItemLedgerGuilda{
			MalID:         l.MalID,
			TituloAnime:   titulo,
			EpisodeNumber: l.EpisodeNumber,
			XPEarned:      l.XPEarned,
			Reason:        l.Reason,
			EarnedAt:      l.EarnedAt,
			DeHoje:        deHoje,
		})
	}
	return extrato
}

// HandleExtratoGuilda devolve uma página de 20 linhas do extrato de XP do usuário autenticado.
func (h *GuildaHandler) HandleExtratoGuilda(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	pagina := normalizarPaginaExtrato(r.URL.Query().Get("pagina"))

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	de := (pagina - 1) * tamanhoPaginaExtratoGuilda
	ate := de + tamanhoPaginaExtratoGuilda - 1

	dadosBytes, totalCount, errLedger := dbClient.From("xp_ledger").
		Select("mal_id,episode_number,xp_earned,reason,earned_at", "exact", false).
		Eq("user_id", userID).
		Order("earned_at", &postgrest.OrderOpts{Ascending: false}).
		Range(de, ate, "").
		Execute()
	if errLedger != nil {
		log.Printf("[GUILDA] Falha ao paginar xp_ledger (user=%s, pagina=%d): %v", userID, pagina, errLedger)
		http.Error(w, "Falha ao carregar extrato de XP", http.StatusInternalServerError)
		return
	}

	var linhas []linhaLedgerBanco
	if len(dadosBytes) > 0 {
		if errU := json.Unmarshal(dadosBytes, &linhas); errU != nil {
			log.Printf("[GUILDA] Falha ao decodificar xp_ledger (user=%s, pagina=%d): %v", userID, pagina, errU)
		}
	}

	curados := CarregarCuradoria(dbClient)
	titulos := resolverTitulosLedger(dbClient, linhas, curados)
	inicioDia := inicioDoDiaBrasilia(time.Now().UTC())
	itens := montarItensLedgerGuilda(linhas, titulos, inicioDia)

	total := int(totalCount)
	if total < len(itens) {
		total = len(itens)
	}
	totalPaginas := calcularTotalPaginasExtrato(total, tamanhoPaginaExtratoGuilda)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(RespostaExtratoGuilda{
		Itens:        itens,
		Pagina:       pagina,
		TotalPaginas: totalPaginas,
		Total:        total,
	})
}

func resolverTitulosLedger(dbClient *supabase.Client, itens []linhaLedgerBanco, curados map[int]models.CuratedAnime) map[int]string {
	titulos := make(map[int]string, len(itens))
	faltamIDs := make([]string, 0)
	vistos := make(map[int]bool)

	for _, it := range itens {
		if c, ok := curados[it.MalID]; ok && strings.TrimSpace(c.CustomTitle) != "" {
			titulos[it.MalID] = c.CustomTitle
			continue
		}
		if !vistos[it.MalID] && it.MalID > 0 {
			vistos[it.MalID] = true
			faltamIDs = append(faltamIDs, strconv.Itoa(it.MalID))
		}
	}

	if len(faltamIDs) > 0 && dbClient != nil {
		if cacheBytes, _, err := dbClient.From("anime_metadata_cache").
			Select("mal_id,title", "", false).
			In("mal_id", faltamIDs).
			Execute(); err == nil {
			var rows []struct {
				MalID int    `json:"mal_id"`
				Title string `json:"title"`
			}
			if json.Unmarshal(cacheBytes, &rows) == nil {
				for _, r := range rows {
					if strings.TrimSpace(r.Title) != "" {
						titulos[r.MalID] = r.Title
					}
				}
			}
		}
	}
	return titulos
}
