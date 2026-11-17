// internal/handlers/rpg_cla_expedicao.go
// Expedição de clã: um chefe por clã e por semana. Cada membro ataca uma vez por dia com o
// próprio personagem, e o dano soma. Derrotado, todo membro que atacou na semana recebe Ouro
// e bilhetes, uma vez. O ataque não gasta a Vida do personagem: é esforço coletivo.
package handlers

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"sync"

	"github.com/JoaoMendes1/anideck/internal/database"
)

const (
	// vidaPorMembroDoChefe: o chefe tem a Vida do monstro vezes 3 por membro do clã.
	vidaPorMembroDoChefe = 3
	// vidaDeTreino é a Vida do chefe dentro de um ataque: grande o bastante para ele não cair,
	// e o dano do ataque é o quanto ela baixou.
	vidaDeTreino = 1_000_000_000
	// bilhetesDoChefeDoCla e ouroPorNivelDoChefe: a recompensa de cada participante.
	bilhetesDoChefeDoCla = 3
	ouroMultChefeDoCla   = 4
)

// chefesDoCla são os candidatos, do mais fraco ao mais forte. O clã enfrenta o mais forte
// cujo nível não passa da mediana dos membros mais 3.
var chefesDoCla = []string{"lobo_sombrio", "golem_de_runas", "espectro_do_vazio", "cavaleiro_caido", "dragao_de_eter", "primordial_esquecido"}

// MedianaDosNiveis devolve a mediana; lista vazia é 1.
func MedianaDosNiveis(niveis []int) int {
	if len(niveis) == 0 {
		return 1
	}
	c := append([]int(nil), niveis...)
	sort.Ints(c)
	meio := len(c) / 2
	if len(c)%2 == 1 {
		return c[meio]
	}
	return (c[meio-1] + c[meio]) / 2
}

// EscolherChefeDoCla escolhe o chefe da semana pela força do clã; o primeiro é o piso.
func EscolherChefeDoCla(mediana int, catalogo []MonstroRPG) (MonstroRPG, bool) {
	porID := map[string]MonstroRPG{}
	for _, m := range catalogo {
		porID[m.ID] = m
	}
	var escolhido MonstroRPG
	achou := false
	for _, id := range chefesDoCla {
		m, ok := porID[id]
		if !ok {
			continue
		}
		if !achou || m.Nivel <= mediana+3 {
			escolhido, achou = m, true
		}
	}
	return escolhido, achou
}

// VidaDoChefeDoCla cresce com o número de membros.
func VidaDoChefeDoCla(m MonstroRPG, membros int) int64 {
	return int64(m.Vida) * vidaPorMembroDoChefe * int64(max(1, membros))
}

// RecompensaDoChefeDoCla é o que cada participante recebe quando o chefe cai.
func RecompensaDoChefeDoCla(m MonstroRPG) (ouro, bilhetes int) {
	return (5 + 2*m.Nivel) * ouroMultChefeDoCla, bilhetesDoChefeDoCla
}

// SimularAtaqueAoChefe luta as 20 rodadas contra uma cópia do chefe que não cai e devolve o
// dano causado. Começa com a Vida cheia: o ataque do clã não usa a Vida guardada.
func SimularAtaqueAoChefe(jogador CombatenteRPG, chefe MonstroRPG, rng *rand.Rand) (int, ResultadoSimulado) {
	copia := chefe
	copia.Vida = vidaDeTreino
	if copia.Elemento == "" {
		copia.Elemento = ElementoDoMonstro(chefe.ID)
	}
	// Os poderes que dependem da Vida baixa nunca disparam contra uma Vida que não baixa.
	if copia.Poderes == nil {
		copia.Poderes = PoderesDoMonstro(chefe.ID)
	}
	jogador.VidaInicial = 0
	r := SimularBatalha(jogador, copia, rng)
	vidaFinal := vidaDeTreino
	if len(r.Turnos) > 0 {
		vidaFinal = r.Turnos[len(r.Turnos)-1].VidaMonstro
	}
	return vidaDeTreino - vidaFinal, r
}

// ChefeDoClaNaTela é o chefe com o progresso do clã.
type ChefeDoClaNaTela struct {
	Monstro    MonstroRPG `json:"monstro"`
	VidaMaxima int64      `json:"vida_maxima"`
	Dano       int64      `json:"dano"`
	Derrotado  bool       `json:"derrotado"`
	Ouro       int        `json:"ouro"`
	Bilhetes   int        `json:"bilhetes"`
}

// LinhaDanoDoCla é a contribuição de um membro na semana.
type LinhaDanoDoCla struct {
	Nome    string `json:"nome"`
	Dano    int64  `json:"dano"`
	Ataques int    `json:"ataques"`
	SouEu   bool   `json:"sou_eu"`
}

// EstadoExpedicaoDoCla é o corpo de GET /api/rpg/cla/expedicao.
type EstadoExpedicaoDoCla struct {
	TemCla     bool              `json:"tem_cla"`
	ClaNome    string            `json:"cla_nome,omitempty"`
	ClaTag     string            `json:"cla_tag,omitempty"`
	Membros    int               `json:"membros"`
	Chefe      *ChefeDoClaNaTela `json:"chefe,omitempty"`
	AtacouHoje bool              `json:"atacou_hoje"`
	Recebeu    bool              `json:"recebeu"`
	Ranking    []LinhaDanoDoCla  `json:"ranking"`
	Elemental  string            `json:"elemental"`
}

// RespostaAtaqueDoCla é o corpo de POST /api/rpg/cla/expedicao.
type RespostaAtaqueDoCla struct {
	Dano      int64                `json:"dano"`
	Resultado ResultadoSimulado    `json:"resultado"`
	Estado    EstadoExpedicaoDoCla `json:"estado"`
	Derrubou  bool                 `json:"derrubou"`
}

type estadoClaBanco struct {
	Ok        bool   `json:"ok"`
	TemCla    bool   `json:"tem_cla"`
	ClaNome   string `json:"cla_nome"`
	ClaTag    string `json:"cla_tag"`
	MembrosXP []int  `json:"membros_xp"`
	Chefe     *struct {
		MonstroID   string `json:"monstro_id"`
		VidaMax     int64  `json:"vida_max"`
		Dano        int64  `json:"dano"`
		DerrotadoEm string `json:"derrotado_em"`
	} `json:"chefe"`
	AtacouHoje bool `json:"atacou_hoje"`
	Recebeu    bool `json:"recebeu"`
	Ranking    []struct {
		UserIDIgual bool   `json:"sou_eu"`
		Nome        string `json:"nome"`
		Dano        int64  `json:"dano"`
		Ataques     int    `json:"ataques"`
	} `json:"ranking"`
}

// lerEstadoDoCla lê o estado e, se a semana ainda não tem chefe, cria o chefe pela força do clã.
func lerEstadoDoCla(sessao sessaoRPG, catalogo []MonstroRPG) (EstadoExpedicaoDoCla, *MonstroRPG, bool) {
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		return EstadoExpedicaoDoCla{}, nil, false
	}
	ler := func() (estadoClaBanco, bool) {
		bruto := strings.TrimSpace(servico.Rpc("rpg_cla_expedicao_estado", "", map[string]interface{}{"p_user_id": sessao.userID}))
		var e estadoClaBanco
		if bruto == "" || json.Unmarshal([]byte(bruto), &e) != nil || !e.Ok {
			log.Printf("[RPG] rpg_cla_expedicao_estado falhou (user=%s): %s", sessao.userID, bruto)
			return e, false
		}
		return e, true
	}
	e, ok := ler()
	if !ok {
		return EstadoExpedicaoDoCla{}, nil, false
	}
	if !e.TemCla {
		return EstadoExpedicaoDoCla{Ranking: []LinhaDanoDoCla{}}, nil, true
	}
	cfg := carregarConfigRPG(sessao.dbClient)
	if e.Chefe == nil {
		niveis := make([]int, 0, len(e.MembrosXP))
		for _, xp := range e.MembrosXP {
			niveis = append(niveis, CalcularNivelERank(xp, cfg.ranks).Nivel)
		}
		chefe, achou := EscolherChefeDoCla(MedianaDosNiveis(niveis), catalogo)
		if !achou {
			return EstadoExpedicaoDoCla{}, nil, false
		}
		servico.Rpc("rpg_cla_garantir_chefe", "", map[string]interface{}{
			"p_user_id": sessao.userID, "p_monstro_id": chefe.ID, "p_vida_max": VidaDoChefeDoCla(chefe, len(e.MembrosXP)),
		})
		if e, ok = ler(); !ok || e.Chefe == nil {
			return EstadoExpedicaoDoCla{}, nil, false
		}
	}
	var monstro *MonstroRPG
	for i := range catalogo {
		if catalogo[i].ID == e.Chefe.MonstroID {
			monstro = &catalogo[i]
		}
	}
	if monstro == nil {
		return EstadoExpedicaoDoCla{}, nil, false
	}
	ouro, bilhetes := RecompensaDoChefeDoCla(*monstro)
	estado := EstadoExpedicaoDoCla{
		TemCla: true, ClaNome: e.ClaNome, ClaTag: e.ClaTag, Membros: len(e.MembrosXP),
		Chefe: &ChefeDoClaNaTela{
			Monstro: *monstro, VidaMaxima: e.Chefe.VidaMax, Dano: min(e.Chefe.Dano, e.Chefe.VidaMax),
			Derrotado: e.Chefe.DerrotadoEm != "", Ouro: ouro, Bilhetes: bilhetes,
		},
		AtacouHoje: e.AtacouHoje, Recebeu: e.Recebeu, Ranking: []LinhaDanoDoCla{},
		Elemental: RelacaoElemental(elementoDoJogador(sessao.ctx), monstro.Elemento),
	}
	for _, l := range e.Ranking {
		estado.Ranking = append(estado.Ranking, LinhaDanoDoCla{Nome: l.Nome, Dano: l.Dano, Ataques: l.Ataques, SouEu: l.UserIDIgual})
	}
	return estado, monstro, true
}

// HandleGetExpedicaoDoCla mostra o chefe da semana do clã do jogador.
func (h *RPGHandler) HandleGetExpedicaoDoCla(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	catalogo, err := lerMonstros(sessao.dbClient)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedição do clã indisponível no momento.")
		return
	}
	estado, _, ok := lerEstadoDoCla(sessao, catalogo)
	if !ok {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedição do clã indisponível no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleAtacarChefeDoCla faz o ataque do dia: simula aqui e soma o dano no banco.
func (h *RPGHandler) HandleAtacarChefeDoCla(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	var (
		catalogo    []MonstroRPG
		equipamento EstadoEquipamento
		errM, errEq error
		wg          sync.WaitGroup
	)
	wg.Add(2)
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	wg.Wait()
	if errM != nil || errEq != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedição do clã indisponível no momento.")
		return
	}
	estado, monstro, ok := lerEstadoDoCla(sessao, catalogo)
	switch {
	case !ok:
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedição do clã indisponível no momento.")
		return
	case !estado.TemCla:
		responderErroJSON(w, http.StatusForbidden, "Entre num clã para participar da expedição.")
		return
	case estado.Chefe.Derrotado:
		responderErroJSON(w, http.StatusConflict, "O chefe desta semana já caiu. Um novo aparece na segunda.")
		return
	case estado.AtacouHoje:
		responderErroJSON(w, http.StatusTooManyRequests, "Você já atacou hoje. Volte amanhã.")
		return
	}

	jogador := CombatenteDoEstado(equipamento)
	jogador.Elemento = elementoDoJogador(sessao.ctx)
	dano, resultado := SimularAtaqueAoChefe(jogador, *monstro, novoGeradorDeBatalha())
	ouro, bilhetes := RecompensaDoChefeDoCla(*monstro)

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedição do clã indisponível no momento.")
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_cla_atacar", "", map[string]interface{}{
		"p_user_id": sessao.userID, "p_dano": dano, "p_ouro": ouro, "p_bilhetes": bilhetes,
	}))
	var registro struct {
		Ok       bool   `json:"ok"`
		Erro     string `json:"erro"`
		Derrubou bool   `json:"derrubou"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar ataque do clã (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar o ataque agora.")
		return
	}
	if registro.Erro != "" {
		responderErroJSON(w, http.StatusConflict, registro.Erro)
		return
	}
	novo, _, ok := lerEstadoDoCla(sessao, catalogo)
	if !ok {
		novo = estado
	}
	// O registro completo do ataque teria 40 golpes contra uma Vida de um bilhão; a tela só
	// precisa do dano, e os turnos ficam de fora para a resposta não pesar.
	resultado.Turnos = nil
	responderJSON(w, http.StatusOK, RespostaAtaqueDoCla{Dano: int64(dano), Resultado: resultado, Estado: novo, Derrubou: registro.Derrubou})
}
