package handlers

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/supabase-go"
)

// Luta em grupo (sql/120). O que o Go faz: monta a ficha de combate de quem abre ou aceita
// (com o token da própria pessoa) e, quando o líder manda lutar, cobra a Mana de cada um,
// simula a luta com todos e grava a luta de cada um pelas mesmas funções da luta solo.
// Convidar, recusar, sair e ler o grupo são chamadas diretas do cliente ao banco.

// FichaDeGrupo é o retrato do herói no momento em que entrou no grupo. Guarda o que
// reconstrói as habilidades (personagem, nível e maestria), porque os efeitos delas não
// passam pelo JSON.
type FichaDeGrupo struct {
	Nome        string         `json:"nome"`
	Personagem  string         `json:"personagem"`
	Nivel       int            `json:"nivel"`
	Poder       int            `json:"poder"`
	Atributos   AtributosRPG   `json:"atributos"`
	Maestria    map[string]int `json:"maestria"`
	Elemento    string         `json:"elemento"`
	VidaInicial int            `json:"vida_inicial"`
}

// Combatente reconstrói o herói para a simulação.
func (f FichaDeGrupo) Combatente() CombatenteRPG {
	c := CombatenteDoEstado(EstadoEquipamento{
		Atributos:   f.Atributos,
		Habilidades: AplicarMaestria(LivroDeHabilidades(f.Personagem, f.Nivel), f.Maestria),
	})
	c.Elemento = f.Elemento
	if pb, ok := PersonagensBase()[f.Personagem]; ok {
		c.Classe = pb.Classe
	}
	c.VidaInicial = f.VidaInicial
	return c
}

// RecompensaNoGrupo é o que a luta deu a um membro; Erro quando a luta dele não contou.
type RecompensaNoGrupo struct {
	Ouro        int      `json:"ouro"`
	OuroPerdido int      `json:"ouro_perdido"`
	Bilhetes    int      `json:"bilhetes"`
	Item        *ItemRPG `json:"item,omitempty"`
	Mana        int      `json:"mana"`
	Erro        string   `json:"erro,omitempty"`
}

// ResultadoDoGrupo vai para o banco e para a tela de todos.
type ResultadoDoGrupo struct {
	Modo     string             `json:"modo"`
	Herois   []HeroiDoResultado `json:"herois"`
	Monstro  *MonstroRPG        `json:"monstro,omitempty"`
	Luta     *ResultadoEmGrupo  `json:"luta,omitempty"`
	Masmorra *MasmorraEmGrupo   `json:"masmorra,omitempty"`
	Venceu   bool               `json:"venceu"`
}

// HeroiDoResultado identifica cada posição do grupo na tela.
type HeroiDoResultado struct {
	Nome       string `json:"nome"`
	Personagem string `json:"personagem"`
	Nivel      int    `json:"nivel"`
	// Fora: não entrou na luta (sem Mana na hora, por exemplo).
	Fora string `json:"fora,omitempty"`
}

// montarFicha confere se a pessoa pode lutar agora e tira a ficha. ok=false: resposta já escrita.
func montarFicha(w http.ResponseWriter, sessao sessaoRPG, tipo, alvoID string) (FichaDeGrupo, bool) {
	equipamento, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return FichaDeGrupo{}, false
	}
	hoje, err := lerHojeRPG(sessao.dbClient)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return FichaDeGrupo{}, false
	}
	if tipo == "masmorra" {
		m, existe := masmorraPorID(alvoID)
		if !existe {
			responderErroJSON(w, http.StatusBadRequest, "Masmorra desconhecida.")
			return FichaDeGrupo{}, false
		}
		if sessao.nivel < m.NivelMinimo {
			responderErroJSON(w, http.StatusForbidden, "Seu nível ainda não alcança esta masmorra.")
			return FichaDeGrupo{}, false
		}
	} else if hoje.Feitas >= hoje.Limite {
		responderErroJSON(w, http.StatusTooManyRequests, "Você já fez todas as batalhas de hoje. Volte amanhã.")
		return FichaDeGrupo{}, false
	}
	vida := MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida)
	if !PodeLutar(vida.PerdidaPorMil, hoje.Regras) {
		responderErroJSON(w, http.StatusConflict, "Seu personagem precisa de pelo menos 30% de HP para lutar. Descanse, assista a um episódio ou use a Pousada.")
		return FichaDeGrupo{}, false
	}
	regras := lerRegrasComunidade(sessao.dbClient)
	custo := CustoDeMana(tipoDeLutaDoGrupo(tipo), sessao.nivel, regras)
	if mana := lerMinhaMana(sessao.dbClient, CalcularManaMaxima(sessao.nivel, regras)); custo > 0 && int(mana) < custo {
		responderErroJSON(w, http.StatusConflict, "Mana insuficiente para esta luta. Espere ela voltar ou use uma Poção de Mana.")
		return FichaDeGrupo{}, false
	}

	f := FichaDeGrupo{
		Nivel:       sessao.nivel,
		Poder:       equipamento.Atributos.Poder,
		Atributos:   equipamento.Atributos,
		Maestria:    sessao.ctx.maestria,
		Elemento:    elementoDoJogador(sessao.ctx),
		VidaInicial: vida.Atual,
	}
	if sessao.ctx.linha != nil {
		f.Nome, f.Personagem = sessao.ctx.linha.Nome, sessao.ctx.linha.PersonagemBase
	}
	return f, true
}

func tipoDeLutaDoGrupo(tipo string) TipoDeLuta {
	if tipo == "masmorra" {
		return LutaMasmorra
	}
	return LutaExpedicao
}

// lerRetornoGrupo lê {"ok":...} ou {"erro":...} das funções do grupo.
func lerRetornoGrupo(bruto string, destino interface{}) (erro string, falhou bool) {
	var base struct {
		Ok   bool   `json:"ok"`
		Erro string `json:"erro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &base) != nil {
		return "", true
	}
	if base.Erro != "" {
		return base.Erro, false
	}
	if !base.Ok {
		return "", true
	}
	if destino != nil && json.Unmarshal([]byte(bruto), destino) != nil {
		return "", true
	}
	return "", false
}

// HandleCriarGrupo abre o grupo para um monstro ou masmorra, com o líder já dentro.
func (h *RPGHandler) HandleCriarGrupo(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		AlvoTipo string `json:"alvo_tipo"`
		AlvoID   string `json:"alvo_id"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 512)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}
	tipo, alvo := strings.TrimSpace(corpo.AlvoTipo), strings.TrimSpace(corpo.AlvoID)
	if (tipo != "monstro" && tipo != "masmorra") || alvo == "" || len(alvo) > 40 {
		responderErroJSON(w, http.StatusBadRequest, "Escolha um monstro ou uma masmorra.")
		return
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	nome := ""
	if tipo == "masmorra" {
		if m, existe := masmorraPorID(alvo); existe {
			nome = m.Nome
		}
	} else {
		monstros, err := lerMonstros(sessao.dbClient)
		if err != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
			return
		}
		for _, m := range monstros {
			if m.ID == alvo {
				nome = m.Nome
			}
		}
		if nome == "" {
			responderErroJSON(w, http.StatusBadRequest, "Monstro desconhecido.")
			return
		}
	}
	ficha, ok := montarFicha(w, sessao, tipo, alvo)
	if !ok {
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return
	}
	var criado struct {
		GrupoID string `json:"grupo_id"`
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_grupo_criar", "", map[string]interface{}{
		"p_user": sessao.userID, "p_tipo": tipo, "p_alvo": alvo, "p_alvo_nome": nome, "p_ficha": ficha,
	}))
	if erro, falhou := lerRetornoGrupo(bruto, &criado); falhou || erro != "" {
		if erro == "" {
			log.Printf("[RPG] Falha ao abrir grupo (user=%s): %s", sessao.userID, bruto)
			erro = "Não foi possível abrir o grupo agora."
		}
		responderErroJSON(w, http.StatusConflict, erro)
		return
	}
	responderJSON(w, http.StatusOK, map[string]string{"grupo_id": criado.GrupoID})
}

// HandleAceitarConvite entra no grupo com a ficha de agora.
func (h *RPGHandler) HandleAceitarConvite(w http.ResponseWriter, r *http.Request) {
	grupoID := chi.URLParam(r, "id")
	if !uuidValido(grupoID) {
		responderErroJSON(w, http.StatusNotFound, "Convite não encontrado.")
		return
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return
	}
	var alvo struct {
		AlvoTipo string `json:"alvo_tipo"`
		AlvoID   string `json:"alvo_id"`
		Status   string `json:"status"`
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_grupo_alvo", "", map[string]interface{}{"p_grupo": grupoID}))
	if bruto == "" || bruto == "null" || json.Unmarshal([]byte(bruto), &alvo) != nil || alvo.AlvoTipo == "" {
		responderErroJSON(w, http.StatusNotFound, "Convite não encontrado.")
		return
	}
	if alvo.Status != "aberto" {
		responderErroJSON(w, http.StatusConflict, "Este convite não vale mais: o grupo já lutou ou foi fechado.")
		return
	}
	ficha, ok := montarFicha(w, sessao, alvo.AlvoTipo, alvo.AlvoID)
	if !ok {
		return
	}
	bruto = strings.TrimSpace(servico.Rpc("rpg_grupo_aceitar", "", map[string]interface{}{
		"p_user": sessao.userID, "p_grupo": grupoID, "p_ficha": ficha,
	}))
	if erro, falhou := lerRetornoGrupo(bruto, nil); falhou || erro != "" {
		if erro == "" {
			log.Printf("[RPG] Falha ao aceitar convite (user=%s): %s", sessao.userID, bruto)
			erro = "Não foi possível entrar no grupo agora."
		}
		responderErroJSON(w, http.StatusConflict, erro)
		return
	}
	responderJSON(w, http.StatusOK, map[string]string{"grupo_id": grupoID})
}

// membroParaLutar é cada aceito, com a ficha guardada no banco.
type membroParaLutar struct {
	UserID string       `json:"user_id"`
	Ficha  FichaDeGrupo `json:"ficha"`
}

// HandleLutarEmGrupo é o líder mandando lutar.
func (h *RPGHandler) HandleLutarEmGrupo(w http.ResponseWriter, r *http.Request) {
	grupoID := chi.URLParam(r, "id")
	if !uuidValido(grupoID) {
		responderErroJSON(w, http.StatusNotFound, "Grupo não encontrado.")
		return
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return
	}
	var separado struct {
		AlvoTipo string            `json:"alvo_tipo"`
		AlvoID   string            `json:"alvo_id"`
		Membros  []membroParaLutar `json:"membros"`
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_grupo_para_lutar", "", map[string]interface{}{"p_lider": sessao.userID, "p_grupo": grupoID}))
	if erro, falhou := lerRetornoGrupo(bruto, &separado); falhou || erro != "" {
		if erro == "" {
			log.Printf("[RPG] Falha ao separar grupo (user=%s): %s", sessao.userID, bruto)
			erro = "Não foi possível começar a luta agora."
		}
		responderErroJSON(w, http.StatusConflict, erro)
		return
	}
	reabrir := func() { servico.Rpc("rpg_grupo_reabrir", "", map[string]interface{}{"p_grupo": grupoID}) }

	catalogo, err := lerMonstros(sessao.dbClient)
	if err != nil {
		reabrir()
		responderErroJSON(w, http.StatusServiceUnavailable, "Lutas em grupo indisponíveis no momento.")
		return
	}
	regras := lerRegrasComunidade(sessao.dbClient)

	// Mana de cada um. Quem não tem na hora fica fora; sem o líder, a luta não começa.
	resultado := ResultadoDoGrupo{Modo: "na_hora"}
	recompensas := make([]RecompensaNoGrupo, len(separado.Membros))
	var lutam []int
	for i, m := range separado.Membros {
		resultado.Herois = append(resultado.Herois, HeroiDoResultado{Nome: m.Ficha.Nome, Personagem: m.Ficha.Personagem, Nivel: m.Ficha.Nivel})
		custo := CustoDeMana(tipoDeLutaDoGrupo(separado.AlvoTipo), m.Ficha.Nivel, regras)
		recompensas[i].Mana = custo
		if custo > 0 {
			b := strings.TrimSpace(servico.Rpc("rpg_mana_lutar", "", map[string]interface{}{"p_user_id": m.UserID, "p_quantia": custo}))
			if _, erro := interpretarCobrancaMana(b); erro != "" {
				resultado.Herois[i].Fora = "sem Mana na hora da luta"
				recompensas[i] = RecompensaNoGrupo{Erro: "Sem Mana na hora da luta."}
				continue
			}
		}
		lutam = append(lutam, i)
	}
	if len(lutam) == 0 || lutam[0] != 0 {
		for _, i := range lutam {
			devolverManaDaLuta(servico, separado.Membros[i].UserID, recompensas[i].Mana, true)
		}
		reabrir()
		responderErroJSON(w, http.StatusConflict, "Você precisa de Mana para começar a luta.")
		return
	}

	herois := make([]CombatenteRPG, len(lutam))
	for k, i := range lutam {
		herois[k] = separado.Membros[i].Ficha.Combatente()
	}
	rng := novoGeradorDeBatalha()

	switch separado.AlvoTipo {
	case "masmorra":
		masmorra, existe := masmorraPorID(separado.AlvoID)
		monstros, aberta := monstrosDosAndares(masmorra, catalogo)
		if !existe || !aberta {
			devolverTodos(servico, separado.Membros, lutam, recompensas)
			reabrir()
			responderErroJSON(w, http.StatusConflict, "Esta masmorra está fechada no momento.")
			return
		}
		sim := SimularMasmorraEmGrupo(herois, monstros, rng)
		resultado.Masmorra, resultado.Venceu = &sim, sim.Completou
		vencidos := sim.Vencidos
		if vencidos == nil {
			vencidos = []string{}
		}
		for k, i := range lutam {
			m, heroi := separado.Membros[i], sim.Herois[k]
			itemID, item := "", (*ItemRPG)(nil)
			if sim.Completou {
				ultimo := monstros[len(monstros)-1]
				item = sortearItem(sessao.dbClient, rng, ultimo.RaridadeItem, ultimo.ChanceItem+chanceExtraBauMasmorra+m.Ficha.Atributos.SorteItem)
				if item != nil {
					itemID = item.ID
				}
			}
			b := strings.TrimSpace(servico.Rpc("rpg_concluir_masmorra", "", map[string]interface{}{
				"p_user_id": m.UserID, "p_masmorra_id": masmorra.ID, "p_vencidos": vencidos,
				"p_completou": sim.Completou, "p_caiu": heroi.Caiu, "p_bonus_pct": bonusOuroMasmorraCompleta,
				"p_item_id": itemID, "p_vida_perdida": PerdaPorMil(m.Ficha.Atributos.Vida, heroi.VidaFinal),
			}))
			recompensas[i] = registroDoMembro(servico, b, m.UserID, recompensas[i].Mana, item, heroi.Usos)
		}
	default:
		var monstro *MonstroRPG
		for i := range catalogo {
			if catalogo[i].ID == separado.AlvoID {
				monstro = &catalogo[i]
			}
		}
		if monstro == nil {
			devolverTodos(servico, separado.Membros, lutam, recompensas)
			reabrir()
			responderErroJSON(w, http.StatusConflict, "Monstro desconhecido.")
			return
		}
		sim := SimularBatalhaEmGrupo(herois, MonstroParaGrupo(*monstro, len(herois)), rng)
		resultado.Monstro, resultado.Luta, resultado.Venceu = monstro, &sim, sim.Venceu
		for k, i := range lutam {
			m, heroi := separado.Membros[i], sim.Herois[k]
			itemID, item := "", (*ItemRPG)(nil)
			if sim.Venceu {
				item = sortearItem(sessao.dbClient, rng, monstro.RaridadeItem, monstro.ChanceItem+m.Ficha.Atributos.SorteItem)
				if item != nil {
					itemID = item.ID
				}
			}
			b := strings.TrimSpace(servico.Rpc("rpg_concluir_batalha", "", map[string]interface{}{
				"p_user_id": m.UserID, "p_monstro_id": monstro.ID, "p_venceu": sim.Venceu,
				"p_turnos": len(sim.Turnos), "p_item_id": itemID,
				"p_vida_perdida": PerdaPorMil(m.Ficha.Atributos.Vida, heroi.VidaFinal),
			}))
			recompensas[i] = registroDoMembro(servico, b, m.UserID, recompensas[i].Mana, item, heroi.Usos)
		}
	}

	lista := make([]map[string]interface{}, len(separado.Membros))
	for i, m := range separado.Membros {
		lista[i] = map[string]interface{}{"user_id": m.UserID, "recompensa": recompensas[i]}
	}
	servico.Rpc("rpg_grupo_concluir", "", map[string]interface{}{"p_grupo": grupoID, "p_resultado": resultado, "p_recompensas": lista})
	responderJSON(w, http.StatusOK, map[string]interface{}{"resultado": resultado, "minha_recompensa": recompensas[0]})
}

// sortearItem sorteia o item da vitória para um membro, com a sorte dele, pela mesma regra
// da luta solo.
func sortearItem(dbClient *supabase.Client, rng *rand.Rand, raridade string, chance int) *ItemRPG {
	candidatos := lerItensDaRaridade(dbClient, raridade)
	ids := make([]string, len(candidatos))
	for i, c := range candidatos {
		ids[i] = c.ID
	}
	id := EscolherItemDaRecompensa(rng, chance, ids)
	for i := range candidatos {
		if candidatos[i].ID == id {
			return &candidatos[i]
		}
	}
	return nil
}

var padraoUUID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// uuidValido evita mandar ao banco um id que nem é UUID.
func uuidValido(id string) bool { return padraoUUID.MatchString(strings.ToLower(id)) }

// registroDoMembro lê o registro da luta de um membro; se não contou, devolve a Mana dele.
func registroDoMembro(servico *supabase.Client, bruto, userID string, mana int, item *ItemRPG, usos map[string]int) RecompensaNoGrupo {
	var reg struct {
		Ok          bool    `json:"ok"`
		Erro        string  `json:"erro"`
		Ouro        int     `json:"ouro_ganho"`
		OuroPerdido int     `json:"ouro_perdido"`
		Bilhetes    int     `json:"bilhetes_ganhos"`
		ItemID      *string `json:"item_id"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &reg) != nil || (!reg.Ok && reg.Erro == "") {
		log.Printf("[RPG] Falha ao registrar luta em grupo (user=%s): %s", userID, bruto)
		devolverManaDaLuta(servico, userID, mana, mana > 0)
		return RecompensaNoGrupo{Erro: "Não foi possível registrar a sua luta."}
	}
	if reg.Erro != "" {
		devolverManaDaLuta(servico, userID, mana, mana > 0)
		return RecompensaNoGrupo{Erro: reg.Erro}
	}
	if len(usos) > 0 {
		servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{"p_user_id": userID, "p_usos": usos})
	}
	r := RecompensaNoGrupo{Ouro: reg.Ouro, OuroPerdido: reg.OuroPerdido, Bilhetes: reg.Bilhetes, Mana: mana}
	if reg.ItemID != nil && item != nil && *reg.ItemID == item.ID {
		r.Item = item
	}
	return r
}

func devolverTodos(servico *supabase.Client, membros []membroParaLutar, lutam []int, recompensas []RecompensaNoGrupo) {
	for _, i := range lutam {
		devolverManaDaLuta(servico, membros[i].UserID, recompensas[i].Mana, recompensas[i].Mana > 0)
	}
}
