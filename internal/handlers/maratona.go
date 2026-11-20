package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	supabase "github.com/supabase-community/supabase-go"
)

// Missão especial de maratona (sql/133). O jogador inicia a maratona de um anime que já
// terminou e tem 24 horas para marcar todos os episódios, um de cada vez. Cada marcação só
// vale depois de 90% da duração do episódio desde a anterior: quem marca antes perde a
// maratona. Quanto mais perto do tempo do próprio anime termina, maior o prêmio.

const (
	maratonaJanelaSeg   = 24 * 60 * 60
	maratonaMinEpisodio = 6
	maratonaMaxEpisodio = 30
	// Duração assumida quando a obra não informa a do episódio.
	maratonaDuracaoPadrao = 24
)

// FaixaMaratona é um degrau do prêmio: terminar até AteSeg depois do início paga Ouro,
// Bilhetes, XP e AniCoins (o banco paga tudo junto, sql/134).
type FaixaMaratona struct {
	ID       string `json:"id"`
	Nome     string `json:"nome"`
	AteSeg   int    `json:"ate_seg"`
	Ouro     int    `json:"ouro"`
	Bilhetes int    `json:"bilhetes"`
	XP       int    `json:"xp"`
	AniCoins int    `json:"anicoins"`
}

// IntervaloDaMaratona é o tempo mínimo, em segundos, entre duas marcações: 90% da duração do
// episódio. Quem marca logo ao terminar cada episódio fica perto da duração, e a folga de 10%
// absorve créditos pulados sem abrir espaço para marcar em sequência.
func IntervaloDaMaratona(duracaoMin int) int {
	if duracaoMin <= 0 {
		duracaoMin = maratonaDuracaoPadrao
	}
	duracaoMin = min(duracaoMin, 90)
	return max(5*60, duracaoMin*60*9/10)
}

// FaixasDaMaratona monta os degraus pelo tempo do anime (episódios × duração): Relâmpago até
// 1,5 vez esse tempo, Maratona até 2,5 vezes e Fôlego até as 24 horas. Um degrau que passaria
// das 24 horas some. Ouro, XP e AniCoins são por episódio, para o prêmio acompanhar o tamanho
// da obra. O XP entra fora do teto diário (como o das missões): a maratona de 12 episódios já
// enche o teto com o XP de cada episódio, e o prêmio não pode virar zero por causa dele.
func FaixasDaMaratona(total, duracaoMin int) []FaixaMaratona {
	if duracaoMin <= 0 {
		duracaoMin = maratonaDuracaoPadrao
	}
	tempo := total * min(duracaoMin, 90) * 60
	faixas := make([]FaixaMaratona, 0, 3)
	for _, f := range []FaixaMaratona{
		{ID: "relampago", Nome: "Relâmpago", AteSeg: tempo * 3 / 2, Ouro: 30 * total, Bilhetes: 3, XP: 15 * total, AniCoins: 10 * total},
		{ID: "maratona", Nome: "Maratona", AteSeg: tempo * 5 / 2, Ouro: 20 * total, Bilhetes: 2, XP: 10 * total, AniCoins: 7 * total},
	} {
		if f.AteSeg < maratonaJanelaSeg {
			faixas = append(faixas, f)
		}
	}
	return append(faixas, FaixaMaratona{ID: "folego", Nome: "Fôlego", AteSeg: maratonaJanelaSeg, Ouro: 12 * total, Bilhetes: 1, XP: 6 * total, AniCoins: 4 * total})
}

// MotivoSemMaratona diz por que a maratona não pode começar; vazio é que pode.
func MotivoSemMaratona(statusObra string, total, marcados int, statusEntrada string) string {
	switch {
	case statusEntrada == "":
		return "Adicione o anime ao seu Deck para começar a maratona."
	case statusEntrada == "Completo":
		return "Você já completou este anime."
	case ordemDoStatus(statusObra) != 3:
		return "A maratona vale só para animes que já terminaram."
	case total < maratonaMinEpisodio:
		return "A maratona pede um anime com pelo menos 6 episódios."
	case total > maratonaMaxEpisodio:
		return "A maratona vale para animes de até 30 episódios: mais que isso não cabe em 24 horas."
	case marcados > 0:
		return "A maratona começa do primeiro episódio: desmarque os episódios já vistos para iniciar."
	}
	return ""
}

// MaratonaRPG é a linha de rpg_maratonas como a tela recebe, com os prazos já calculados.
type MaratonaRPG struct {
	MalID        int             `json:"mal_id"`
	Total        int             `json:"total"`
	IntervaloSeg int             `json:"intervalo_seg"`
	Faixas       []FaixaMaratona `json:"faixas"`
	IniciadaEm   time.Time       `json:"iniciada_em"`
	UltimoEm     *time.Time      `json:"ultimo_em"`
	Episodios    []int           `json:"episodios"`
	Status       string          `json:"status"`
	Motivo       *string         `json:"motivo"`
	Faixa        *string         `json:"faixa"`
	Ouro         int             `json:"ouro"`
	Bilhetes     int             `json:"bilhetes"`
	XP           int             `json:"xp"`
	AniCoins     int             `json:"anicoins"`
	TerminadaEm  *time.Time      `json:"terminada_em"`
	// Calculados no Go para a tela: quando acaba o prazo e quando o próximo episódio libera.
	PrazoEm   time.Time `json:"prazo_em"`
	ProximoEm time.Time `json:"proximo_em"`
}

// completarPrazos preenche os campos calculados e encerra por tempo a que passou das 24 horas
// (o banco grava isso na próxima ação; a tela já mostra).
func (m *MaratonaRPG) completarPrazos(agora time.Time) {
	m.PrazoEm = m.IniciadaEm.Add(maratonaJanelaSeg * time.Second)
	base := m.IniciadaEm
	if m.UltimoEm != nil {
		base = *m.UltimoEm
	}
	m.ProximoEm = base.Add(time.Duration(m.IntervaloSeg) * time.Second)
	if m.Status == "ativa" && agora.After(m.PrazoEm) {
		motivo := "tempo"
		m.Status, m.Motivo = "falhou", &motivo
	}
}

// RespostaMaratona é o que a página do anime precisa para o card.
type RespostaMaratona struct {
	Pode         bool            `json:"pode"`
	Motivo       string          `json:"motivo,omitempty"`
	Total        int             `json:"total"`
	DuracaoMin   int             `json:"duracao_min"`
	IntervaloSeg int             `json:"intervalo_seg"`
	Faixas       []FaixaMaratona `json:"faixas"`
	Maratona     *MaratonaRPG    `json:"maratona,omitempty"`
	// OutraAtiva é o mal_id da maratona em andamento em outro anime, quando há.
	OutraAtiva int `json:"outra_ativa,omitempty"`
	// Maratonas concluídas nesta semana e o limite do Painel Admin (0 = pausada).
	SemanaFeitas int `json:"semana_feitas"`
	SemanaLimite int `json:"semana_limite"`
}

// MaratonasNaSemana conta as concluídas desde segunda 00:00 de Brasília, a mesma semana das
// missões semanais. O banco faz a mesma conta ao iniciar (sql/135); esta serve para explicar.
func MaratonasNaSemana(ms []MaratonaRPG, agora time.Time) int {
	inicio := inicioDaSemanaBrasilia(agora)
	n := 0
	for _, m := range ms {
		if m.Status == "concluida" && m.TerminadaEm != nil && !m.TerminadaEm.Before(inicio) {
			n++
		}
	}
	return n
}

// MotivoDoLimiteSemanal explica por que o limite da semana impede uma nova maratona, ou
// devolve vazio quando ainda cabe.
func MotivoDoLimiteSemanal(feitas, limite int) string {
	switch {
	case limite <= 0:
		return "A missão de maratona está pausada no momento."
	case feitas < limite:
		return ""
	case limite == 1:
		return "Você já concluiu a maratona desta semana. A próxima libera na segunda-feira."
	default:
		return fmt.Sprintf("Você já concluiu as %d maratonas desta semana. As próximas liberam na segunda-feira.", limite)
	}
}

type MaratonaHandler struct {
	AniListClient anilist.Service
}

// dadosDaObra lê o status e a duração da obra pela AniList com a curadoria por cima, como a
// página do anime. ok false quando não dá para saber se a obra terminou.
func (h *MaratonaHandler) dadosDaObra(ctx context.Context, malID int) (status string, duracao int, ok bool) {
	var curado *models.CuratedAnime
	if database.Client != nil {
		dados, _, err := database.Client.From("curated_animes").Select("*", "exact", false).Eq("mal_id", strconv.Itoa(malID)).Execute()
		var curados []models.CuratedAnime
		if err == nil && json.Unmarshal(dados, &curados) == nil && len(curados) > 0 {
			curado = &curados[0]
		}
	}
	if h.AniListClient != nil {
		prazo, cancelar := context.WithTimeout(ctx, prazoDaAniListNaTela)
		defer cancelar()
		if r, err := h.AniListClient.GetAnimeById(prazo, strconv.Itoa(malID)); err == nil && r != nil {
			anime := r.Data
			if curado != nil {
				AplicarCuradoria(&anime, *curado)
			}
			return anime.Status, anime.Duration, true
		}
	}
	// Sem a AniList, só a curadoria finalizada responde com segurança.
	if curado != nil && ordemDoStatus(curado.CustomStatus) == 3 {
		duracao := 0
		if curado.CustomDurationMinutes != nil {
			duracao = *curado.CustomDurationMinutes
		}
		return statusFinalizado, duracao, true
	}
	return "", 0, false
}

func lerMaratonas(dbClient *supabase.Client, userID string) []MaratonaRPG {
	dados, _, err := dbClient.From("rpg_maratonas").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		return nil
	}
	var linhas []MaratonaRPG
	if json.Unmarshal(dados, &linhas) != nil {
		return nil
	}
	agora := time.Now()
	for i := range linhas {
		linhas[i].completarPrazos(agora)
	}
	return linhas
}

func autenticacaoMaratona(w http.ResponseWriter, r *http.Request) (token, userID string, malID int, ok bool) {
	token, tok := r.Context().Value(middleware.TokenKey).(string)
	userID, uok := r.Context().Value(middleware.UserIDKey).(string)
	if !tok || !uok {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return "", "", 0, false
	}
	malID, err := strconv.Atoi(chi.URLParam(r, "mal_id"))
	if err != nil || malID <= 0 {
		responderErroJSON(w, http.StatusBadRequest, "Anime inválido.")
		return "", "", 0, false
	}
	return token, userID, malID, true
}

// montarResposta junta as regras da obra, a maratona deste anime e a ativa em outro.
func (h *MaratonaHandler) montarResposta(ctx context.Context, dbClient *supabase.Client, userID string, malID int) (RespostaMaratona, bool) {
	statusObra, duracao, ok := h.dadosDaObra(ctx, malID)
	if !ok {
		return RespostaMaratona{}, false
	}
	numeros := numerosDeEpisodios(dbClient, malID)
	total := len(numeros)
	resp := RespostaMaratona{
		Total:        total,
		DuracaoMin:   max(duracao, 0),
		IntervaloSeg: IntervaloDaMaratona(duracao),
		Faixas:       FaixasDaMaratona(total, duracao),
	}
	// Gamificação pausada pelo admin: a maratona não promete XP, como as missões.
	if economia, _, _ := carregarConfigGuilda(dbClient); !economia.Ativo {
		for i := range resp.Faixas {
			resp.Faixas[i].XP = 0
		}
	}
	maratonas := lerMaratonas(dbClient, userID)
	resp.SemanaFeitas = MaratonasNaSemana(maratonas, time.Now())
	resp.SemanaLimite = lerRegrasComunidade(dbClient).MaratonasPorSemana
	for _, m := range maratonas {
		m := m
		if m.MalID == malID {
			resp.Maratona = &m
		} else if m.Status == "ativa" {
			resp.OutraAtiva = m.MalID
		}
	}
	resp.Motivo = MotivoSemMaratona(statusObra, total, len(episodiosJaMarcados(dbClient, userID, malID)), statusDaEntrada(dbClient, userID, malID))
	if resp.Motivo == "" && resp.OutraAtiva > 0 {
		resp.Motivo = "Você já tem uma maratona em andamento em outro anime."
	}
	if resp.Motivo == "" && resp.Maratona != nil && resp.Maratona.Status == "concluida" {
		resp.Motivo = "Você já fez a maratona deste anime."
	}
	if resp.Motivo == "" {
		resp.Motivo = MotivoDoLimiteSemanal(resp.SemanaFeitas, resp.SemanaLimite)
	}
	resp.Pode = resp.Motivo == ""
	return resp, true
}

// HandleObter devolve as regras e o estado da maratona do anime.
func (h *MaratonaHandler) HandleObter(w http.ResponseWriter, r *http.Request) {
	token, userID, malID, ok := autenticacaoMaratona(w, r)
	if !ok {
		return
	}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Maratona indisponível agora.")
		return
	}
	resp, ok := h.montarResposta(r.Context(), dbClient, userID, malID)
	if !ok {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não deu para conferir agora se a obra terminou. Tente de novo em instantes.")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleIniciar começa a maratona, conferindo de novo as regras no servidor.
func (h *MaratonaHandler) HandleIniciar(w http.ResponseWriter, r *http.Request) {
	token, userID, malID, ok := autenticacaoMaratona(w, r)
	if !ok {
		return
	}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Maratona indisponível agora.")
		return
	}
	resp, ok := h.montarResposta(r.Context(), dbClient, userID, malID)
	if !ok {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não deu para conferir agora se a obra terminou. Tente de novo em instantes.")
		return
	}
	if !resp.Pode {
		responderErroJSON(w, http.StatusBadRequest, resp.Motivo)
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Maratona indisponível agora.")
		return
	}
	faixas, _ := json.Marshal(resp.Faixas)
	bruto := strings.TrimSpace(servico.Rpc("rpg_iniciar_maratona", "", map[string]interface{}{
		"p_user_id":       userID,
		"p_mal_id":        malID,
		"p_total":         resp.Total,
		"p_intervalo_seg": resp.IntervaloSeg,
		"p_faixas":        json.RawMessage(faixas),
	}))
	var retorno struct {
		Ok   bool   `json:"ok"`
		Erro string `json:"erro"`
	}
	if json.Unmarshal([]byte(bruto), &retorno) != nil {
		log.Printf("[MARATONA] Resposta inesperada ao iniciar (user=%s, mal=%d): %s", userID, malID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Maratona indisponível agora.")
		return
	}
	if !retorno.Ok {
		responderErroJSON(w, http.StatusBadRequest, retorno.Erro)
		return
	}
	resp, _ = h.montarResposta(r.Context(), dbClient, userID, malID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// ResultadoMaratonaEpisodio é o que a marcação do episódio devolve sobre a maratona.
type ResultadoMaratonaEpisodio struct {
	Status   string `json:"status"`
	Motivo   string `json:"motivo,omitempty"`
	Marcados int    `json:"marcados"`
	Total    int    `json:"total"`
	Faixa    string `json:"faixa,omitempty"`
	Ouro     int    `json:"ouro,omitempty"`
	Bilhetes int    `json:"bilhetes,omitempty"`
	XP       int    `json:"xp,omitempty"`
	AniCoins int    `json:"anicoins,omitempty"`
}

// registrarEpisodioNaMaratona avisa a maratona do anime, se houver uma ativa. nil quando não
// há maratona ou quando o banco não respondeu: a marcação do episódio já valeu de todo jeito.
func registrarEpisodioNaMaratona(userID string, malID, episodio int) *ResultadoMaratonaEpisodio {
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		return nil
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_maratona_episodio", "", map[string]interface{}{
		"p_user_id": userID, "p_mal_id": malID, "p_episodio": episodio,
	}))
	var retorno struct {
		Maratona *MaratonaRPG `json:"maratona"`
	}
	if json.Unmarshal([]byte(bruto), &retorno) != nil || retorno.Maratona == nil {
		return nil
	}
	m := retorno.Maratona
	res := &ResultadoMaratonaEpisodio{Status: m.Status, Marcados: len(m.Episodios), Total: m.Total, Ouro: m.Ouro, Bilhetes: m.Bilhetes, XP: m.XP, AniCoins: m.AniCoins}
	if m.Motivo != nil {
		res.Motivo = *m.Motivo
	}
	if m.Faixa != nil {
		res.Faixa = *m.Faixa
	}
	return res
}
