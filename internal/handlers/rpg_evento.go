// internal/handlers/rpg_evento.go
// Evento da temporada: um arauto por temporada de anime (trimestre), na escala do nível do
// jogador. Uma luta por dia, com a Vida cheia e sem queda. Com 10 vitórias na temporada, o
// jogador ganha um título exclusivo e Ouro, uma vez.
package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
)

const (
	metaDoEvento         = 10
	ouroDoPremioEvento   = 300
	escalaDoArautoPorMil = 850 // o arauto tem 85% dos números do catálogo no mesmo nível
)

// EventoDaTemporada descreve o arauto da temporada.
type EventoDaTemporada struct {
	ID        string `json:"id"`
	Estacao   string `json:"estacao"`
	Ano       int    `json:"ano"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Elemento  string `json:"elemento"`
	Titulo    string `json:"titulo"`
	Inicio    string `json:"inicio"`
	Fim       string `json:"fim"`
}

// estacoesDoEvento seguem as temporadas de anime: inverno começa em janeiro.
var estacoesDoEvento = []struct {
	Estacao, Nome, Descricao, Elemento string
}{
	{"Inverno", "Arauto da Geada", "Chega com a primeira neve das estreias de janeiro.", "agua"},
	{"Primavera", "Arauto das Pétalas", "Floresce junto com a temporada de abril.", "terra"},
	{"Verão", "Arauto do Sol", "Arde nas estreias de julho.", "fogo"},
	{"Outono", "Arauto da Tempestade", "Sopra com os ventos da temporada de outubro.", "raio"},
}

// EventoEm devolve o evento da temporada de t, no fuso de Brasília.
func EventoEm(t time.Time) EventoDaTemporada {
	inicio := InicioTemporadaBrasilia(t).In(fusoGuilda)
	e := estacoesDoEvento[(int(inicio.Month())-1)/3]
	return EventoDaTemporada{
		ID:        fmt.Sprintf("arauto_%s_%d", strings.ToLower(strings.ReplaceAll(e.Estacao, "ã", "a")), inicio.Year()),
		Estacao:   e.Estacao,
		Ano:       inicio.Year(),
		Nome:      e.Nome,
		Descricao: e.Descricao,
		Elemento:  e.Elemento,
		Titulo:    fmt.Sprintf("Caçador do %s %d", e.Estacao, inicio.Year()),
		Inicio:    inicio.Format("2006-01-02"),
		Fim:       inicio.AddDate(0, 3, 0).Format(time.RFC3339),
	}
}

// MonstroDoEvento monta o arauto no nível do jogador, interpolando os números do catálogo
// (sem o tutorial) e aplicando a escala do evento. Fora da faixa do catálogo, os números
// crescem na proporção do nível.
func MonstroDoEvento(evento EventoDaTemporada, nivel int, catalogo []MonstroRPG) MonstroRPG {
	nivel = max(1, nivel)
	pontos := []MonstroRPG{}
	for _, m := range catalogo {
		if m.Nivel >= 10 {
			pontos = append(pontos, m)
		}
	}
	sort.Slice(pontos, func(i, j int) bool { return pontos[i].Nivel < pontos[j].Nivel })
	var vida, ataque, defesa float64
	switch {
	case len(pontos) == 0:
		vida, ataque, defesa = float64(38*nivel), float64(5*nivel), float64(2*nivel)
	case nivel <= pontos[0].Nivel:
		f := float64(nivel) / float64(pontos[0].Nivel)
		vida, ataque, defesa = float64(pontos[0].Vida)*f, float64(pontos[0].Ataque)*f, float64(pontos[0].Defesa)*f
	case nivel >= pontos[len(pontos)-1].Nivel:
		u := pontos[len(pontos)-1]
		f := float64(nivel) / float64(u.Nivel)
		vida, ataque, defesa = float64(u.Vida)*f, float64(u.Ataque)*f, float64(u.Defesa)*f
	default:
		for i := 1; i < len(pontos); i++ {
			a, b := pontos[i-1], pontos[i]
			if nivel <= b.Nivel {
				f := float64(nivel-a.Nivel) / float64(b.Nivel-a.Nivel)
				vida = float64(a.Vida) + f*float64(b.Vida-a.Vida)
				ataque = float64(a.Ataque) + f*float64(b.Ataque-a.Ataque)
				defesa = float64(a.Defesa) + f*float64(b.Defesa-a.Defesa)
				break
			}
		}
	}
	escala := func(v float64) int { return max(1, int(v*escalaDoArautoPorMil/1000+0.5)) }
	return MonstroRPG{
		ID: evento.ID, Nome: evento.Nome, Descricao: evento.Descricao, Tipo: "raro", Nivel: nivel,
		Vida: escala(vida), Ataque: escala(ataque), Defesa: escala(defesa), Elemento: evento.Elemento,
		Poderes: []PoderMonstro{},
	}
}

// EstadoEvento é o corpo de GET /api/rpg/evento.
type EstadoEvento struct {
	Evento    EventoDaTemporada `json:"evento"`
	Monstro   MonstroRPG        `json:"monstro"`
	Vitorias  int               `json:"vitorias"`
	Meta      int               `json:"meta"`
	LutouHoje bool              `json:"lutou_hoje"`
	Premiado  bool              `json:"premiado"`
	Ouro      int               `json:"ouro_premio"`
	Elemental string            `json:"elemental"`
}

// RespostaEvento é o corpo de POST /api/rpg/evento.
type RespostaEvento struct {
	Estado        EstadoEvento      `json:"estado"`
	Resultado     ResultadoSimulado `json:"resultado"`
	Jogador       AtributosRPG      `json:"jogador"`
	PremiadoAgora bool              `json:"premiado_agora"`
}

// lerEstadoEvento conta as vitórias da temporada com o token do usuário (RLS: só as próprias).
func lerEstadoEvento(sessao sessaoRPG, evento EventoDaTemporada) (vitorias int, lutouHoje, premiado bool, err error) {
	hoje := time.Now().In(fusoGuilda).Format("2006-01-02")
	dados, _, e := sessao.dbClient.From("rpg_evento_batalhas").
		Select("dia,venceu", "", false).
		Eq("user_id", sessao.userID).
		Eq("temporada", evento.Inicio).
		Execute()
	if e != nil {
		return 0, false, false, e
	}
	var linhas []struct {
		Dia    string `json:"dia"`
		Venceu bool   `json:"venceu"`
	}
	if e := json.Unmarshal(dados, &linhas); e != nil {
		return 0, false, false, e
	}
	for _, l := range linhas {
		if l.Venceu {
			vitorias++
		}
		if strings.HasPrefix(l.Dia, hoje) {
			lutouHoje = true
		}
	}
	premios, _, e := sessao.dbClient.From("rpg_evento_premios").
		Select("temporada", "", false).
		Eq("user_id", sessao.userID).
		Eq("temporada", evento.Inicio).
		Execute()
	if e == nil {
		var p []json.RawMessage
		premiado = json.Unmarshal(premios, &p) == nil && len(p) > 0
	}
	return vitorias, lutouHoje, premiado, nil
}

func (h *RPGHandler) montarEstadoEvento(sessao sessaoRPG) (EstadoEvento, error) {
	evento := EventoEm(time.Now())
	var (
		catalogo            []MonstroRPG
		errM, errE          error
		vitorias            int
		lutouHoje, premiado bool
		wg                  sync.WaitGroup
	)
	wg.Add(2)
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); vitorias, lutouHoje, premiado, errE = lerEstadoEvento(sessao, evento) }()
	wg.Wait()
	if errM != nil {
		return EstadoEvento{}, errM
	}
	if errE != nil {
		return EstadoEvento{}, errE
	}
	monstro := MonstroDoEvento(evento, sessao.nivel, catalogo)
	return EstadoEvento{
		Evento: evento, Monstro: monstro, Vitorias: vitorias, Meta: metaDoEvento,
		LutouHoje: lutouHoje, Premiado: premiado, Ouro: ouroDoPremioEvento,
		Elemental: RelacaoElemental(elementoDoJogador(sessao.ctx), monstro.Elemento),
	}, nil
}

// HandleGetEvento mostra o arauto da temporada e o progresso das marcas.
func (h *RPGHandler) HandleGetEvento(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	estado, err := h.montarEstadoEvento(sessao)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Evento indisponível no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleLutarNoEvento faz a luta do dia contra o arauto e grava pelo service role.
func (h *RPGHandler) HandleLutarNoEvento(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	var (
		estado      EstadoEvento
		equipamento EstadoEquipamento
		errE, errEq error
		wg          sync.WaitGroup
	)
	wg.Add(2)
	go func() { defer wg.Done(); estado, errE = h.montarEstadoEvento(sessao) }()
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	wg.Wait()
	if errE != nil || errEq != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Evento indisponível no momento.")
		return
	}
	if estado.LutouHoje {
		responderErroJSON(w, http.StatusTooManyRequests, "Você já enfrentou o arauto hoje. Volte amanhã.")
		return
	}
	jogador := CombatenteDoEstado(equipamento)
	jogador.Elemento = elementoDoJogador(sessao.ctx)
	resultado := SimularBatalha(jogador, estado.Monstro, novoGeradorDeBatalha())
	// O evento não usa a Vida guardada nem tem queda: o resultado só diz quem venceu.
	resultado.Caiu = false

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Evento indisponível no momento.")
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_evento_registrar", "", map[string]interface{}{
		"p_user_id":   sessao.userID,
		"p_temporada": estado.Evento.Inicio,
		"p_venceu":    resultado.Venceu,
		"p_meta":      metaDoEvento,
		"p_titulo":    estado.Evento.Titulo,
		"p_ouro":      ouroDoPremioEvento,
	}))
	var registro struct {
		Ok            bool   `json:"ok"`
		Erro          string `json:"erro"`
		Vitorias      int    `json:"vitorias"`
		PremiadoAgora bool   `json:"premiado_agora"`
		Premiado      bool   `json:"premiado"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar evento (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a luta agora.")
		return
	}
	if registro.Erro != "" {
		responderErroJSON(w, http.StatusTooManyRequests, registro.Erro)
		return
	}
	estado.Vitorias, estado.LutouHoje, estado.Premiado = registro.Vitorias, true, registro.Premiado
	responderJSON(w, http.StatusOK, RespostaEvento{Estado: estado, Resultado: resultado, Jogador: equipamento.Atributos, PremiadoAgora: registro.PremiadoAgora})
}
