// internal/handlers/rpg_duelos.go
// Duelos: o desafiante luta contra uma cópia da ficha de outro jogador (atributos,
// habilidades com maestria e elemento), simulada no servidor. O desafiado não precisa estar
// online e não perde nada; a vitória dá pontos de duelo e um pouco de Ouro.
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

// Regras dos duelos; o limite e os pontos são conferidos de novo no banco (sql/093).
const (
	duelosPorDia        = 3
	pontosPorVitoria    = 3
	ouroPorVitoriaDuelo = 15
)

// duelista é um lado do duelo, com o que muda durante a luta. As regras são as mesmas da
// expedição (rpg_batalha.go): escolha de habilidade, Éter, recargas e habilidade única que
// dispara abaixo da metade da Vida. A diferença é que os dois lados esquivam e usam habilidades.
type duelista struct {
	c              CombatenteRPG
	vida           int
	eter           int
	recargas       map[string]int
	despertou      bool
	multProximo    float64
	ignorarDefesa  bool
	esquivasCertas int
	reducao        float64
	rodadasReducao int
	usos           map[string]int
}

func novoDuelista(c CombatenteRPG) *duelista {
	return &duelista{c: c, vida: c.Atributos.Vida, eter: c.Atributos.Eter, recargas: map[string]int{}, usos: map[string]int{}}
}

func (d *duelista) pronta(h HabilidadeRPG) bool {
	return h.Efeito != efeitoDespertar && d.eter >= h.CustoEter && d.recargas[h.ID] == 0
}

// escolher repete a regra do jogador na expedição: cura abaixo da metade; senão, a
// habilidade de ataque de nível mais alto que o Éter paga; senão, ataque comum.
func (d *duelista) escolher() *HabilidadeRPG {
	if d.vida*2 < d.c.Atributos.Vida {
		for i := range d.c.Habilidades {
			if h := &d.c.Habilidades[i]; h.Efeito == efeitoCura && d.pronta(*h) {
				return h
			}
		}
	}
	var melhor *HabilidadeRPG
	for i := range d.c.Habilidades {
		h := &d.c.Habilidades[i]
		if h.Efeito == efeitoCura || !d.pronta(*h) {
			continue
		}
		if melhor == nil || h.NivelMinimo > melhor.NivelMinimo {
			melhor = h
		}
	}
	return melhor
}

// golpe de d em alvo: esquiva do alvo, crítico, elemento, defesa ignorada, multiplicador do
// próximo golpe e a redução de dano do alvo. Devolve dano, crítico e esquiva.
func (d *duelista) golpe(rng *rand.Rand, ataque int, alvo *duelista) (int, bool, bool) {
	switch {
	case alvo.esquivasCertas > 0:
		alvo.esquivasCertas--
		return 0, false, true
	case rng.Intn(1000) < alvo.c.Atributos.EsquivaPorMil:
		return 0, false, true
	}
	a := d.c.Atributos
	defesa := alvo.c.Atributos.Defesa
	if d.ignorarDefesa {
		defesa = 0
		d.ignorarDefesa = false
	}
	dano, critico := golpe(rng, ataque, defesa, a.CriticoPorMil, float64(a.DanoCritico)/100)
	if m := MultiplicadorElemental(d.c.Elemento, alvo.c.Elemento); m != 1 {
		dano = max(1, int(float64(dano)*m+0.5))
	}
	if d.multProximo > 0 {
		dano = int(float64(dano)*d.multProximo + 0.5)
		d.multProximo = 0
	}
	if alvo.rodadasReducao > 0 {
		dano = max(1, int(float64(dano)*(1-alvo.reducao)+0.5))
	}
	return dano, critico, false
}

// agir faz a ação de d contra alvo e devolve o turno, com o nome da habilidade.
func (d *duelista) agir(rng *rand.Rand, alvo *duelista) TurnoBatalha {
	a := d.c.Atributos
	h := d.escolher()
	t := TurnoBatalha{}
	if h != nil {
		d.eter -= h.CustoEter
		d.recargas[h.ID] = h.Recarga
		t.Habilidade = h.Nome
		if h.Tipo == "comum" {
			d.usos[h.ID]++
		}
	}
	soma := func(ataque int) {
		dano, critico, esquivou := d.golpe(rng, ataque, alvo)
		t.Dano += dano
		t.Critico = t.Critico || critico
		t.Esquiva = t.Esquiva || esquivou
	}
	switch {
	case h == nil:
		soma(a.Ataque)
	case h.Efeito == efeitoCura:
		cura := min(int(float64(a.Vida)*h.Fator+0.5), a.Vida-d.vida)
		d.vida += cura
		t.Cura = cura
	case h.Efeito == efeitoGolpeDuplo:
		soma(int(float64(a.Ataque)*h.Fator + 0.5))
		soma(int(float64(a.Ataque)*h.Fator + 0.5))
	case h.Efeito == efeitoArcano:
		soma(int(float64(a.Ataque)*h.Fator + float64(a.Magia)*h.Fator2 + 0.5))
	default:
		soma(int(float64(a.Ataque)*h.Fator + 0.5))
	}
	alvo.vida = max(0, alvo.vida-t.Dano)
	return t
}

// reagir dispara a habilidade única de d abaixo da metade da Vida, uma vez por duelo.
func (d *duelista) reagir() *TurnoBatalha {
	if d.despertou || d.vida == 0 || d.vida*2 >= d.c.Atributos.Vida {
		return nil
	}
	for _, h := range d.c.Habilidades {
		if h.Efeito != efeitoDespertar {
			continue
		}
		cura := min(int(float64(d.c.Atributos.Vida)*h.Fator+0.5), d.c.Atributos.Vida-d.vida)
		d.vida += cura
		d.despertou = true
		d.multProximo = h.Fator2
		d.ignorarDefesa = h.IgnoraDefesa
		d.esquivasCertas = h.Esquivas
		d.reducao, d.rodadasReducao = h.Reducao, h.Rodadas
		return &TurnoBatalha{Habilidade: h.Nome, Cura: cura}
	}
	return nil
}

func (d *duelista) fimDaRodada() {
	d.eter = min(d.c.Atributos.Eter, d.eter+eterPorRodada)
	if d.rodadasReducao > 0 {
		d.rodadasReducao--
	}
	for id, r := range d.recargas {
		if r > 0 {
			d.recargas[id] = r - 1
		}
	}
}

// SimularDuelo resolve o duelo. No registro, "jogador" é o desafiante e "monstro" é o
// oponente, para a tela das expedições servir aos dois. Quem tem mais Velocidade age
// primeiro; empate favorece o oponente, que não escolheu lutar. Sem nocaute em 20 rodadas,
// vence quem terminou com a maior fração da Vida.
func SimularDuelo(desafiante, oponente CombatenteRPG, rng *rand.Rand) ResultadoSimulado {
	a, b := novoDuelista(desafiante), novoDuelista(oponente)
	turnos := make([]TurnoBatalha, 0, maxTurnosBatalha*2)
	registrar := func(t TurnoBatalha, atacante string) {
		t.Atacante, t.VidaJogador, t.VidaMonstro, t.Eter = atacante, a.vida, b.vida, a.eter
		turnos = append(turnos, t)
	}
	fim := func(venceu bool, rodadas int) ResultadoSimulado {
		return ResultadoSimulado{
			Venceu: venceu, Rodadas: rodadas, Turnos: turnos, VidaInicial: desafiante.Atributos.Vida, VidaFinal: a.vida,
			Usos: a.usos, Elemental: RelacaoElemental(desafiante.Elemento, oponente.Elemento),
		}
	}
	// vez faz a ação de quem age e a reação de quem apanhou; devolve true quando o alvo cai.
	vez := func(quem, alvo *duelista, nomeQuem, nomeAlvo string) bool {
		registrar(quem.agir(rng, alvo), nomeQuem)
		if alvo.vida == 0 {
			return true
		}
		if r := alvo.reagir(); r != nil {
			registrar(*r, nomeAlvo)
		}
		return false
	}
	desafiantePrimeiro := desafiante.Atributos.Velocidade > oponente.Atributos.Velocidade
	for rodada := 1; rodada <= maxTurnosBatalha; rodada++ {
		if desafiantePrimeiro {
			if vez(a, b, "jogador", "monstro") {
				return fim(true, rodada)
			}
			if vez(b, a, "monstro", "jogador") {
				return fim(false, rodada)
			}
		} else {
			if vez(b, a, "monstro", "jogador") {
				return fim(false, rodada)
			}
			if vez(a, b, "jogador", "monstro") {
				return fim(true, rodada)
			}
		}
		a.fimDaRodada()
		b.fimDaRodada()
	}
	// Por pontos: fração da Vida restante, em inteiros para não depender de arredondamento.
	return fim(a.vida*oponente.Atributos.Vida > b.vida*desafiante.Atributos.Vida, maxTurnosBatalha)
}

// OponenteDeDuelo é um jogador que pode ser desafiado. Sem user_id: a tela só vê o @.
type OponenteDeDuelo struct {
	Handle         string `json:"handle"`
	Nome           string `json:"nome"`
	PersonagemBase string `json:"personagem_base"`
	Elemento       string `json:"elemento"`
	Nivel          int    `json:"nivel"`
	DueladoHoje    bool   `json:"duelado_hoje"`
	Pontos         int    `json:"pontos"`
}

// LinhaRankingDuelo é uma linha do ranking da temporada.
type LinhaRankingDuelo struct {
	Posicao  int    `json:"posicao"`
	Handle   string `json:"handle"`
	Nome     string `json:"nome"`
	Pontos   int    `json:"pontos"`
	Vitorias int    `json:"vitorias"`
}

// EstadoDuelos é o corpo de GET /api/rpg/duelos.
type EstadoDuelos struct {
	Atributos AtributosRPG        `json:"atributos"`
	Elemento  string              `json:"elemento"`
	Feitos    int                 `json:"feitos"`
	Limite    int                 `json:"limite"`
	Pontos    int                 `json:"pontos"`
	Oponentes []OponenteDeDuelo   `json:"oponentes"`
	Ranking   []LinhaRankingDuelo `json:"ranking"`
	TemPerfil bool                `json:"tem_perfil"`
}

// RespostaDuelo é o corpo de POST /api/rpg/duelos.
type RespostaDuelo struct {
	Oponente   OponenteDeDuelo   `json:"oponente"`
	Jogador    AtributosRPG      `json:"jogador"`
	Adversario AtributosRPG      `json:"adversario"`
	Resultado  ResultadoSimulado `json:"resultado"`
	Pontos     int               `json:"pontos_ganhos"`
	Ouro       int               `json:"ouro_ganho"`
	Feitos     int               `json:"feitos"`
	Limite     int               `json:"limite"`
}

// linhaOponenteBanco é a linha de rpg_duelos_estado(); o nível sai do XP aqui, no Go.
type linhaOponenteBanco struct {
	Handle         string `json:"handle"`
	Nome           string `json:"nome"`
	PersonagemBase string `json:"personagem_base"`
	XPTotal        int    `json:"xp_total"`
	DueladoHoje    bool   `json:"duelado_hoje"`
	Pontos         int    `json:"pontos"`
}

// OrdenarOponentes põe primeiro quem ainda não foi desafiado hoje e, depois, o nível mais
// perto do seu. Função pura, testada.
func OrdenarOponentes(lista []OponenteDeDuelo, meuNivel int) {
	dist := func(n int) int {
		if n > meuNivel {
			return n - meuNivel
		}
		return meuNivel - n
	}
	sort.SliceStable(lista, func(i, j int) bool {
		if lista[i].DueladoHoje != lista[j].DueladoHoje {
			return !lista[i].DueladoHoje
		}
		if dist(lista[i].Nivel) != dist(lista[j].Nivel) {
			return dist(lista[i].Nivel) < dist(lista[j].Nivel)
		}
		return lista[i].Handle < lista[j].Handle
	})
}

// fichaDeDuelo monta o combatente de um contexto lido pelo service role. Sem inventário
// (quem nunca abriu a ficha), luta só com a base: o kit é entregue na primeira visita dele.
func fichaDeDuelo(ctx contextoPersonagem) CombatenteRPG {
	nivel := CalcularNivelERank(ctx.xpTotal, ctx.ranks).Nivel
	base := ""
	if ctx.linha != nil {
		base = ctx.linha.PersonagemBase
	}
	estado := MontarEstadoEquipamento(nivel, base, ctx.inventario, ctx.equipados, ctx.PontosDoHeroi(base))
	estado.Habilidades = AplicarMaestria(LivroDeHabilidades(base, nivel), ctx.maestria)
	c := CombatenteDoEstado(estado)
	c.Elemento = elementoDoJogador(ctx)
	return c
}

func (h *RPGHandler) lerEstadoDuelos(sessao sessaoRPG) (estado EstadoDuelos, ok bool) {
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		return estado, false
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_duelos_estado", "", map[string]interface{}{"p_user_id": sessao.userID}))
	var banco struct {
		Ok        bool                 `json:"ok"`
		TemPerfil bool                 `json:"tem_perfil"`
		Feitos    int                  `json:"feitos"`
		Pontos    int                  `json:"pontos"`
		Oponentes []linhaOponenteBanco `json:"oponentes"`
		Ranking   []LinhaRankingDuelo  `json:"ranking"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &banco) != nil || !banco.Ok {
		log.Printf("[RPG] rpg_duelos_estado falhou (user=%s): %s", sessao.userID, bruto)
		return estado, false
	}
	cfg := carregarConfigRPG(sessao.dbClient)
	estado = EstadoDuelos{Feitos: banco.Feitos, Limite: duelosPorDia, Pontos: banco.Pontos, TemPerfil: banco.TemPerfil, Ranking: banco.Ranking}
	if estado.Ranking == nil {
		estado.Ranking = []LinhaRankingDuelo{}
	}
	for _, o := range banco.Oponentes {
		elemento := elementoNeutro
		if pb, ok := PersonagensBase()[o.PersonagemBase]; ok {
			elemento = pb.Elemento
		}
		estado.Oponentes = append(estado.Oponentes, OponenteDeDuelo{
			Handle: o.Handle, Nome: o.Nome, PersonagemBase: o.PersonagemBase, Elemento: elemento,
			Nivel: CalcularNivelERank(o.XPTotal, cfg.ranks).Nivel, DueladoHoje: o.DueladoHoje, Pontos: o.Pontos,
		})
	}
	if estado.Oponentes == nil {
		estado.Oponentes = []OponenteDeDuelo{}
	}
	OrdenarOponentes(estado.Oponentes, sessao.nivel)
	return estado, true
}

// HandleGetDuelos lista oponentes, o limite do dia e o ranking da temporada.
func (h *RPGHandler) HandleGetDuelos(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	var (
		equipamento EstadoEquipamento
		errEq       error
		estado      EstadoDuelos
		okEstado    bool
		wg          sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); estado, okEstado = h.lerEstadoDuelos(sessao) }()
	wg.Wait()
	if errEq != nil || !okEstado {
		responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
		return
	}
	estado.Atributos = equipamento.Atributos
	estado.Elemento = elementoDoJogador(sessao.ctx)
	responderJSON(w, http.StatusOK, estado)
}

// HandleDuelar simula o duelo contra a ficha do @ escolhido e grava pelo service role.
func (h *RPGHandler) HandleDuelar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Handle string `json:"handle"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 256)).Decode(&corpo) != nil {
		corpo.Handle = ""
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	handle, problema := formatoDeHandle(corpo.Handle)
	if problema != "" {
		responderErroJSON(w, http.StatusBadRequest, "Escolha um oponente.")
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
		return
	}

	// A ficha do oponente vem pelo @ e só de perfil público com personagem; o banco nunca
	// devolve o user_id dele para a tela.
	var (
		equipamento EstadoEquipamento
		errEq       error
		brutoFicha  string
		wg          sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() {
		defer wg.Done()
		brutoFicha = servico.Rpc("rpg_ficha_de_duelo", "", map[string]interface{}{"p_desafiante": sessao.userID, "p_handle": handle})
	}()
	wg.Wait()
	if errEq != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
		return
	}
	// O erro vem no campo "erro" do próprio estado (estadoJogadorBanco.Erro).
	var ficha struct {
		estadoJogadorBanco
		Nome string `json:"nome_perfil"`
	}
	if json.Unmarshal([]byte(strings.TrimSpace(brutoFicha)), &ficha) != nil {
		log.Printf("[RPG] rpg_ficha_de_duelo falhou (user=%s): %s", sessao.userID, brutoFicha)
		responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
		return
	}
	if ficha.Erro != "" || !ficha.Ok || ficha.Personagem == nil {
		msg := ficha.Erro
		if msg == "" {
			msg = "Oponente não encontrado."
		}
		responderErroJSON(w, http.StatusNotFound, msg)
		return
	}
	ctxOponente, err := contextoDoEstado(ficha.estadoJogadorBanco, carregarConfigRPG(sessao.dbClient))
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
		return
	}
	oponente := fichaDeDuelo(ctxOponente)
	desafiante := CombatenteDoEstado(equipamento)
	desafiante.Elemento = elementoDoJogador(sessao.ctx)
	resultado := SimularDuelo(desafiante, oponente, novoGeradorDeBatalha())

	regras := lerRegrasComunidade(sessao.dbClient)
	custoMana := CustoDeMana(LutaDuelo, sessao.nivel, regras)
	cobrou, ok := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
	if !ok {
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_registrar_duelo", "", map[string]interface{}{
		"p_user_id": sessao.userID,
		"p_handle":  handle,
		"p_venceu":  resultado.Venceu,
		"p_turnos":  len(resultado.Turnos),
		"p_pontos":  pontosPorVitoria,
		"p_ouro":    OuroComRegra(ouroPorVitoriaDuelo, regras),
		"p_por_dia": duelosPorDia,
	}))
	var registro struct {
		Ok             bool   `json:"ok"`
		Erro           string `json:"erro"`
		LimiteAtingido bool   `json:"limite_atingido"`
		Pontos         int    `json:"pontos_ganhos"`
		Ouro           int    `json:"ouro_ganho"`
		Feitos         int    `json:"feitos"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar duelo (user=%s): %s", sessao.userID, bruto)
		devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar o duelo agora.")
		return
	}
	if registro.Erro != "" {
		status := http.StatusBadRequest
		if registro.LimiteAtingido {
			status = http.StatusTooManyRequests
		}
		devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
		responderErroJSON(w, status, registro.Erro)
		return
	}
	nivelOponente := CalcularNivelERank(ctxOponente.xpTotal, ctxOponente.ranks).Nivel
	responderJSON(w, http.StatusOK, RespostaDuelo{
		Oponente: OponenteDeDuelo{
			Handle: handle, Nome: ficha.Nome, PersonagemBase: ctxOponente.linha.PersonagemBase,
			Elemento: oponente.Elemento, Nivel: nivelOponente,
		},
		Jogador: equipamento.Atributos, Adversario: oponente.Atributos, Resultado: resultado,
		Pontos: registro.Pontos, Ouro: registro.Ouro, Feitos: registro.Feitos, Limite: duelosPorDia,
	})
}
