// internal/handlers/rpg_masmorras.go
// Masmorras: andares seguidos com monstros do catálogo, uma por dia, com a Vida passando de
// um andar para o outro sem cura. A simulação inteira roda numa requisição (a mesma
// SimularBatalha das expedições), e o banco grava o resultado com o Ouro calculado lá.
package handlers

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
)

// Masmorra é uma sequência de andares. Fica no código pelo mesmo motivo dos poderes: a
// dificuldade depende da ordem, e ela foi medida (TestMasmorras_Equilibrio).
type Masmorra struct {
	ID          string   `json:"id"`
	Nome        string   `json:"nome"`
	Descricao   string   `json:"descricao"`
	NivelMinimo int      `json:"nivel_minimo"`
	Andares     []string `json:"andares"`
}

// Regras das masmorras.
const (
	// bonusOuroMasmorraCompleta: completar todos os andares dá 50% a mais de Ouro.
	bonusOuroMasmorraCompleta = 50
	// chanceExtraBauMasmorra soma à chance de item do último monstro, no baú do fim.
	chanceExtraBauMasmorra = 25
	// curaEntreAndaresPct: o fôlego entre um andar e outro devolve 25% da Vida máxima. Sem
	// ele, a terceira luta seguida quase nunca era vencida (TestMasmorras_Equilibrio).
	curaEntreAndaresPct = 25
)

// CatalogoMasmorras devolve as masmorras na ordem da tela.
func CatalogoMasmorras() []Masmorra {
	return []Masmorra{
		{ID: "bosque_sombrio", Nome: "Bosque Sombrio", Descricao: "Goblins na trilha e um lobo no fim dela.", NivelMinimo: 8,
			Andares: []string{"goblin_batedor", "goblin_batedor", "lobo_sombrio"}},
		{ID: "ruinas_runicas", Nome: "Ruínas Rúnicas", Descricao: "Corredores guardados por pedra viva.", NivelMinimo: 18,
			Andares: []string{"lobo_sombrio", "golem_de_runas", "golem_de_runas"}},
		{ID: "fenda_do_vazio", Nome: "Fenda do Vazio", Descricao: "Onde os aventureiros perdidos ainda vagam.", NivelMinimo: 28,
			Andares: []string{"golem_de_runas", "espectro_do_vazio", "espectro_do_vazio"}},
		{ID: "fortaleza_caida", Nome: "Fortaleza Caída", Descricao: "O último posto de um reino que não existe mais.", NivelMinimo: 36,
			Andares: []string{"espectro_do_vazio", "cavaleiro_caido"}},
		{ID: "ninho_do_dragao", Nome: "Ninho do Dragão", Descricao: "O cavaleiro guarda a entrada; o dragão, o tesouro.", NivelMinimo: 51,
			Andares: []string{"cavaleiro_caido", "dragao_de_eter"}},
		{ID: "trono_primordial", Nome: "Trono Primordial", Descricao: "A prova final. Poucos chegam ao trono.", NivelMinimo: 60,
			Andares: []string{"dragao_de_eter", "primordial_esquecido"}},
	}
}

// AndarDaMasmorra é a luta de um andar.
type AndarDaMasmorra struct {
	Monstro   MonstroRPG        `json:"monstro"`
	Resultado ResultadoSimulado `json:"resultado"`
}

// ExpedicaoNaMasmorra é a masmorra inteira, antes de gravar.
type ExpedicaoNaMasmorra struct {
	Andares   []AndarDaMasmorra `json:"andares"`
	Vencidos  []string          `json:"-"`
	Completou bool              `json:"completou"`
	Caiu      bool              `json:"caiu"`
	VidaFinal int               `json:"vida_final"`
	Usos      map[string]int    `json:"-"`
}

// SimularMasmorra luta os andares em ordem, com a Vida do fim de um andar, mais o fôlego,
// no começo do próximo. Para no primeiro andar perdido. Função pura, como SimularBatalha.
func SimularMasmorra(jogador CombatenteRPG, monstros []MonstroRPG, rng *rand.Rand) ExpedicaoNaMasmorra {
	r := ExpedicaoNaMasmorra{Usos: map[string]int{}}
	vida := jogador.VidaInicial
	if vida <= 0 || vida > jogador.Atributos.Vida {
		vida = jogador.Atributos.Vida
	}
	for i, m := range monstros {
		if i > 0 {
			vida = min(jogador.Atributos.Vida, vida+jogador.Atributos.Vida*curaEntreAndaresPct/100)
		}
		j := jogador
		j.VidaInicial = vida
		res := SimularBatalha(j, m, rng)
		r.Andares = append(r.Andares, AndarDaMasmorra{Monstro: m, Resultado: res})
		for id, n := range res.Usos {
			r.Usos[id] += n
		}
		vida = res.VidaFinal
		if !res.Venceu {
			r.Caiu = res.Caiu
			r.VidaFinal = vida
			return r
		}
		r.Vencidos = append(r.Vencidos, m.ID)
	}
	r.Completou = true
	r.VidaFinal = vida
	return r
}

// MasmorraNaLista é a masmorra com o estado do jogador.
type MasmorraNaLista struct {
	Masmorra
	Monstros    []MonstroRPG `json:"monstros"`
	Bloqueada   bool         `json:"bloqueada"`
	Dificuldade string       `json:"dificuldade"`
}

// EstadoMasmorras é o corpo de GET /api/rpg/masmorras.
type EstadoMasmorras struct {
	Atributos AtributosRPG      `json:"atributos"`
	Elemento  string            `json:"elemento"`
	Vida      VidaRPG           `json:"vida"`
	Hoje      HojeRPG           `json:"hoje"`
	FeitaHoje string            `json:"feita_hoje"`
	Masmorras []MasmorraNaLista `json:"masmorras"`
	// Mana de cada tipo de luta (sql/118).
	CustosMana CustosManaRPG `json:"custos_mana"`
}

// RespostaMasmorra é o corpo de POST /api/rpg/masmorras.
type RespostaMasmorra struct {
	Masmorra   Masmorra            `json:"masmorra"`
	Jogador    AtributosRPG        `json:"jogador"`
	Expedicao  ExpedicaoNaMasmorra `json:"expedicao"`
	Recompensa RecompensaBatalha   `json:"recompensa"`
	Vida       VidaRPG             `json:"vida"`
}

func masmorraPorID(id string) (Masmorra, bool) {
	for _, m := range CatalogoMasmorras() {
		if m.ID == id {
			return m, true
		}
	}
	return Masmorra{}, false
}

// monstrosDosAndares troca os ids pelos monstros ativos do catálogo; falta um, a masmorra
// fica fora (o admin desativou um monstro dela).
func monstrosDosAndares(m Masmorra, catalogo []MonstroRPG) ([]MonstroRPG, bool) {
	porID := map[string]MonstroRPG{}
	for _, c := range catalogo {
		porID[c.ID] = c
	}
	lista := make([]MonstroRPG, 0, len(m.Andares))
	for _, id := range m.Andares {
		c, ok := porID[id]
		if !ok {
			return nil, false
		}
		lista = append(lista, c)
	}
	return lista, true
}

// masmorraFeitaHoje lê, com o token do usuário, a masmorra de hoje (RLS: só a própria).
func masmorraFeitaHoje(sessao sessaoRPG) string {
	dia := time.Now().In(fusoGuilda).Format("2006-01-02")
	dados, _, err := sessao.dbClient.From("rpg_masmorras_execucoes").
		Select("masmorra_id", "", false).
		Eq("user_id", sessao.userID).
		Eq("dia", dia).
		Execute()
	if err != nil {
		return ""
	}
	var linhas []struct {
		MasmorraID string `json:"masmorra_id"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return ""
	}
	return linhas[0].MasmorraID
}

// dificuldadeDaMasmorra usa o andar mais forte.
func dificuldadeDaMasmorra(a AtributosRPG, monstros []MonstroRPG) string {
	pior := "facil"
	ordem := map[string]int{"facil": 0, "equilibrada": 1, "dificil": 2, "perigosa": 3}
	for _, m := range monstros {
		if d := DificuldadeContra(a, m); ordem[d] > ordem[pior] {
			pior = d
		}
	}
	return pior
}

// HandleGetMasmorras lista as masmorras com o que falta para cada uma.
func (h *RPGHandler) HandleGetMasmorras(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	var (
		equipamento       EstadoEquipamento
		catalogo          []MonstroRPG
		hoje              HojeRPG
		feita             string
		errEq, errM, errH error
		wg                sync.WaitGroup
	)
	wg.Add(4)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
	go func() { defer wg.Done(); feita = masmorraFeitaHoje(sessao) }()
	wg.Wait()
	if errEq != nil || errM != nil || errH != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	lista := []MasmorraNaLista{}
	for _, m := range CatalogoMasmorras() {
		monstros, ok := monstrosDosAndares(m, catalogo)
		if !ok {
			continue
		}
		lista = append(lista, MasmorraNaLista{
			Masmorra: m, Monstros: monstros,
			Bloqueada:   sessao.nivel < m.NivelMinimo,
			Dificuldade: dificuldadeDaMasmorra(equipamento.Atributos, monstros),
		})
	}
	hoje.Regras = hoje.Regras.ComPadroes()
	responderJSON(w, http.StatusOK, EstadoMasmorras{
		Atributos: equipamento.Atributos, Elemento: elementoDoJogador(sessao.ctx),
		Vida: MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida), Hoje: hoje,
		FeitaHoje: feita, Masmorras: lista, CustosMana: CustosDeMana(),
	})
}

// HandleEntrarNaMasmorra simula a masmorra inteira e grava pelo service role.
func (h *RPGHandler) HandleEntrarNaMasmorra(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		MasmorraID string `json:"masmorra_id"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 256)).Decode(&corpo) != nil {
		corpo.MasmorraID = ""
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	masmorra, existe := masmorraPorID(strings.TrimSpace(corpo.MasmorraID))
	if !existe {
		responderErroJSON(w, http.StatusBadRequest, "Escolha uma masmorra.")
		return
	}
	if sessao.nivel < masmorra.NivelMinimo {
		responderErroJSON(w, http.StatusForbidden, "Seu nível ainda não alcança esta masmorra.")
		return
	}

	var (
		equipamento       EstadoEquipamento
		catalogo          []MonstroRPG
		hoje              HojeRPG
		errEq, errM, errH error
		wg                sync.WaitGroup
	)
	wg.Add(3)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
	wg.Wait()
	if errEq != nil || errM != nil || errH != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	monstros, ok := monstrosDosAndares(masmorra, catalogo)
	if !ok {
		responderErroJSON(w, http.StatusConflict, "Esta masmorra está fechada no momento.")
		return
	}
	vida := MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida)
	if !PodeLutar(vida.PerdidaPorMil, hoje.Regras) {
		responderErroJSON(w, http.StatusConflict, "Seu personagem precisa de pelo menos 30% de Vida para entrar. Descanse, assista a um episódio ou use a Pousada.")
		return
	}

	rng := novoGeradorDeBatalha()
	combatente := CombatenteDoEstado(equipamento)
	combatente.VidaInicial = vida.Atual
	combatente.Elemento = elementoDoJogador(sessao.ctx)
	expedicao := SimularMasmorra(combatente, monstros, rng)

	var itemSorteado *ItemRPG
	if expedicao.Completou {
		ultimo := monstros[len(monstros)-1]
		candidatos := lerItensDaRaridade(sessao.dbClient, ultimo.RaridadeItem)
		ids := make([]string, 0, len(candidatos))
		for _, c := range candidatos {
			ids = append(ids, c.ID)
		}
		chance := ultimo.ChanceItem + chanceExtraBauMasmorra + equipamento.Atributos.SorteItem
		if id := EscolherItemDaRecompensa(rng, chance, ids); id != "" {
			for i := range candidatos {
				if candidatos[i].ID == id {
					itemSorteado = &candidatos[i]
				}
			}
		}
	}
	itemID := ""
	if itemSorteado != nil {
		itemID = itemSorteado.ID
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	vencidos := expedicao.Vencidos
	if vencidos == nil {
		vencidos = []string{}
	}
	cobrou, ok := cobrarManaDaLuta(w, servico, sessao.userID, CustoManaMasmorra)
	if !ok {
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_concluir_masmorra", "", map[string]interface{}{
		"p_user_id":      sessao.userID,
		"p_masmorra_id":  masmorra.ID,
		"p_vencidos":     vencidos,
		"p_completou":    expedicao.Completou,
		"p_caiu":         expedicao.Caiu,
		"p_bonus_pct":    bonusOuroMasmorraCompleta,
		"p_item_id":      itemID,
		"p_vida_perdida": PerdaPorMil(equipamento.Atributos.Vida, expedicao.VidaFinal),
	}))
	var registro struct {
		Ok          bool    `json:"ok"`
		Erro        string  `json:"erro"`
		JaFeita     bool    `json:"ja_feita"`
		SemVida     bool    `json:"sem_vida"`
		Ouro        int     `json:"ouro_ganho"`
		OuroPerdido int     `json:"ouro_perdido"`
		Bilhetes    int     `json:"bilhetes_ganhos"`
		ItemID      *string `json:"item_id"`
		VidaPerdida int     `json:"vida_perdida"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar masmorra (user=%s): %s", sessao.userID, bruto)
		devolverManaDaLuta(servico, sessao.userID, CustoManaMasmorra, cobrou)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a masmorra agora.")
		return
	}
	if registro.Erro != "" {
		status := http.StatusBadRequest
		switch {
		case registro.JaFeita:
			status = http.StatusTooManyRequests
		case registro.SemVida:
			status = http.StatusConflict
		}
		devolverManaDaLuta(servico, sessao.userID, CustoManaMasmorra, cobrou)
		responderErroJSON(w, status, registro.Erro)
		return
	}
	if len(expedicao.Usos) > 0 {
		if b := strings.TrimSpace(servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{
			"p_user_id": sessao.userID, "p_usos": expedicao.Usos,
		})); !strings.Contains(b, `"ok"`) {
			log.Printf("[RPG] Falha ao registrar maestria da masmorra (user=%s): %s", sessao.userID, b)
		}
	}
	recompensa := RecompensaBatalha{Bilhetes: registro.Bilhetes, Ouro: registro.Ouro, OuroPerdido: registro.OuroPerdido}
	if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
		recompensa.Item = itemSorteado
	}
	responderJSON(w, http.StatusOK, RespostaMasmorra{
		Masmorra: masmorra, Jogador: equipamento.Atributos, Expedicao: expedicao,
		Recompensa: recompensa, Vida: MontarVida(equipamento.Atributos.Vida, registro.VidaPerdida),
	})
}
