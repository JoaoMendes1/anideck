package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	supabase "github.com/supabase-community/supabase-go"
)

var nomesPadraoElenco = map[string]string{
	personagemBasePadrao: "Espadachim de Éter",
	"lanceiro_fogo":      "Haruto",
	"assassina_raio":     "Rin",
	"maga_agua":          "Mizuki",
	"guerreiro_terra":    "Brokk",
	"paladina_luz":       "Celestia",
	"arqueiro_trevas":    "Yoru",
}

// NomePadraoElenco devolve o nome de exibição do personagem do elenco.
func NomePadraoElenco(baseID string) string {
	if nome, ok := nomesPadraoElenco[baseID]; ok {
		return nome
	}
	return nomesPadraoElenco[personagemBasePadrao]
}

// ClasseDoPersonagem devolve a classe associada ao personagem do elenco.
func ClasseDoPersonagem(baseID string) string {
	if pb, ok := PersonagensBase()[baseID]; ok {
		return pb.Classe
	}
	return PersonagensBase()[personagemBasePadrao].Classe
}

// HeroiResumoEsquadrao resume um personagem desbloqueado para a formação de esquadrão na UI.
type HeroiResumoEsquadrao struct {
	ID           string       `json:"id"`
	Nome         string       `json:"nome"`
	Classe       string       `json:"classe"`
	Elemento     string       `json:"elemento"`
	Poder        int          `json:"poder"`
	Vida         int          `json:"vida"`
	Ativo        bool         `json:"ativo"`
	NoGrupo      bool         `json:"no_grupo"`
	Pontos       PrimariosRPG `json:"pontos"`
	PontosLivres int          `json:"pontos_livres"`
}

func desbloqueadosNormalizados(linha *linhaPersonagemBanco) []string {
	if linha == nil {
		return []string{personagemBasePadrao}
	}
	return calcularElencoInfo(*linha, linha.PersonagemBase, time.Now().UTC()).Desbloqueados
}

// normalizarAliadosEsquadrao filtra apenas aliados desbloqueados, distintos do líder e sem repetição.
func normalizarAliadosEsquadrao(aliados []string, baseAtual string, desbloqueados []string) []string {
	permitidos := make(map[string]bool, len(desbloqueados))
	for _, id := range desbloqueados {
		permitidos[id] = true
	}
	maxAliados := MaxHeroisNoGrupo - 1
	saida := make([]string, 0, maxAliados)
	visto := map[string]bool{baseAtual: true}
	for _, bruto := range aliados {
		id := strings.TrimSpace(bruto)
		if id == "" || visto[id] || !permitidos[id] {
			continue
		}
		visto[id] = true
		saida = append(saida, id)
		if len(saida) >= maxAliados {
			break
		}
	}
	return saida
}

// validarAliadosPedidos garante que nenhum id inválido ou não desbloqueado seja aceito silenciosamente.
func validarAliadosPedidos(pedidos []string, baseAtual string, desbloqueados []string) ([]string, error) {
	permitidos := make(map[string]bool, len(desbloqueados))
	for _, id := range desbloqueados {
		permitidos[id] = true
	}
	catalogo := PersonagensBase()
	maxAliados := MaxHeroisNoGrupo - 1
	saida := make([]string, 0, maxAliados)
	visto := map[string]bool{baseAtual: true}
	for _, bruto := range pedidos {
		id := strings.TrimSpace(bruto)
		if id == "" {
			continue
		}
		if _, existe := catalogo[id]; !existe {
			return nil, errors.New("Personagem desconhecido no esquadrão.")
		}
		if !permitidos[id] {
			return nil, errors.New("Você só pode usar no esquadrão personagens já desbloqueados.")
		}
		if visto[id] {
			continue
		}
		visto[id] = true
		saida = append(saida, id)
		if len(saida) >= maxAliados {
			break
		}
	}
	return saida, nil
}

// melhoresEquipadosParaBase aproveita os itens já equipados compatíveis e, nos demais slots,
// seleciona automaticamente o item mais forte da mochila compatível com a classe/nível do aliado.
func melhoresEquipadosParaBase(nivel int, base string, inventario []linhaInventarioRPG, equipadosAtuais map[string]string, pontos PrimariosRPG) map[string]string {
	primarios := PrimariosBase(nivel).Somar(pontos)
	elemento := ElementoDoPersonagem(base)

	porID := make(map[string]ItemRPG, len(inventario))
	sirveNoNivel := func(l linhaInventarioRPG) (ItemRPG, bool) {
		if l.Item == nil {
			return ItemRPG{}, false
		}
		it := AplicarAprimoramento(*l.Item, l.Aprimoramento)
		if nivel < it.NivelMinimo || !ItemServe(it, base) {
			return it, false
		}
		if req := RequisitosDoItem(*l.Item); temRequisito(req) && FaltaDeRequisito(req, primarios) != "" {
			return it, false
		}
		return it, true
	}
	for _, l := range inventario {
		if it, ok := sirveNoNivel(l); ok {
			porID[it.ID] = it
		}
	}

	escolha := make(map[string]string, len(SlotsRPG()))
	for _, slot := range SlotsRPG() {
		if idAtual := equipadosAtuais[slot]; idAtual != "" {
			if _, ok := porID[idAtual]; ok {
				escolha[slot] = idAtual
				continue
			}
		}
		melhorID := ""
		melhorNota := -1
		for _, l := range inventario {
			if l.Item == nil || l.Item.Slot != slot {
				continue
			}
			it, ok := sirveNoNivel(l)
			if !ok {
				continue
			}
			sint := AplicarSintonia(it, elemento)
			nota := CalcularPoder(SomarAtributos(AtributosRPG{}, []ItemRPG{sint})) * 10
			if EmSintonia(it, elemento) {
				nota += 5
			}
			if nota > melhorNota {
				melhorNota = nota
				melhorID = it.ID
			}
		}
		if melhorID != "" {
			escolha[slot] = melhorID
		}
	}
	return escolha
}

// carregarInventarioBruto lê inventário e slots quando ctx ainda não os trouxe da leitura única.
func carregarInventarioBruto(dbClient *supabase.Client, userID string) ([]linhaInventarioRPG, map[string]string, error) {
	dados, _, err := dbClient.From("rpg_inventario").
		Select("quantidade,aprimoramento,rpg_itens(id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo,magia,velocidade,critico_por_mil,dano_critico,esquiva_por_mil,classes,personagem_exclusivo,conjunto,elemento)", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		dados, _, err = dbClient.From("rpg_inventario").
			Select("quantidade,aprimoramento,rpg_itens(id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo)", "", false).
			Eq("user_id", userID).
			Execute()
	}
	if err != nil {
		return nil, nil, err
	}
	inventario, err := interpretarInventarioRPG(dados)
	if err != nil {
		return nil, nil, err
	}
	dadosEq, _, err := dbClient.From("rpg_equipados").
		Select("slot,item_id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return nil, nil, err
	}
	var linhasEq []struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
	}
	if err := json.Unmarshal(dadosEq, &linhasEq); err != nil {
		return nil, nil, err
	}
	eq := make(map[string]string, len(linhasEq))
	for _, l := range linhasEq {
		eq[l.Slot] = l.ItemID
	}
	return inventario, eq, nil
}

// EstadoParaBase calcula EstadoEquipamento para outro personagem desbloqueado usando
// exclusivamente os slots equipados próprios daquele herói (nunca herdando do líder).
func EstadoParaBase(nivel int, base string, inventario []linhaInventarioRPG, equipadosHeroi map[string]string, pontos PrimariosRPG, maestria map[string]int) EstadoEquipamento {
	return EstadoParaBaseComCopias(nivel, base, inventario, equipadosHeroi, nil, nil, pontos, maestria)
}

// EstadoParaBaseComCopias calcula EstadoEquipamento considerando a cópia exata vestida por cada herói.
func EstadoParaBaseComCopias(nivel int, base string, inventario []linhaInventarioRPG, equipadosHeroi map[string]string, equipadosPorHeroi map[string]map[string]string, copiasPorHeroi map[string]map[string]int, pontos PrimariosRPG, maestria map[string]int) EstadoEquipamento {
	est := MontarEstadoEquipamentoCompleto(nivel, base, inventario, equipadosHeroi, pontos, equipadosPorHeroi, copiasPorHeroi)
	est.Habilidades = AplicarMaestria(LivroDeHabilidades(base, nivel), maestria)
	return est
}

// MontarEsquadraoDoContexto monta os combatentes e as fichas de grupo para 1..3 heróis do usuário.
// Se aliadosPedidos for nil, usa o esquadrão salvo em ctx.linha.Esquadrao.
func MontarEsquadraoDoContexto(dbClient *supabase.Client, userID string, ctx contextoPersonagem, vidaPerdidaPorMil int, passiva *PassivaEspecialidade, postura string, aliadosPedidos []string) ([]CombatenteRPG, []FichaDeGrupo, error) {
	eqLider, err := equipamentoDoContexto(dbClient, userID, ctx)
	if err != nil {
		return nil, nil, err
	}
	nivel := eqLider.Nivel
	baseLider := personagemBasePadrao
	nomeLider := NomePadraoElenco(baseLider)
	if ctx.linha != nil {
		if ctx.linha.PersonagemBase != "" {
			baseLider = ctx.linha.PersonagemBase
		}
		if ctx.linha.Nome != "" {
			nomeLider = ctx.linha.Nome
		}
	}

	vidaLider := MontarVida(eqLider.Atributos.Vida, vidaPerdidaPorMil)
	lider := CombatenteDoEstado(eqLider)
	lider.VidaInicial = vidaLider.Atual
	lider.Elemento = ElementoDoPersonagem(baseLider)
	lider.Classe = ClasseDoPersonagem(baseLider)
	lider.Passiva = passiva
	lider.Postura = PosturaValida(postura)

	fichaLider := FichaDeGrupo{
		Nome:        nomeLider,
		Personagem:  baseLider,
		Nivel:       nivel,
		Poder:       eqLider.Atributos.Poder,
		Atributos:   eqLider.Atributos,
		Maestria:    ctx.maestria,
		Elemento:    lider.Elemento,
		VidaInicial: vidaLider.Atual,
	}

	desbloqueados := desbloqueadosNormalizados(ctx.linha)
	var aliados []string
	if aliadosPedidos != nil {
		aliados, err = validarAliadosPedidos(aliadosPedidos, baseLider, desbloqueados)
		if err != nil {
			return nil, nil, err
		}
	} else if ctx.linha != nil {
		aliados = normalizarAliadosEsquadrao(ctx.linha.Esquadrao, baseLider, desbloqueados)
	}

	combatentes := []CombatenteRPG{lider}
	fichas := []FichaDeGrupo{fichaLider}
	if len(aliados) == 0 {
		return combatentes, fichas, nil
	}

	inv := ctx.inventario
	if !ctx.inventarioLido {
		inv, _, err = carregarInventarioBruto(dbClient, userID)
		if err != nil {
			return nil, nil, err
		}
	}

	fatorVida := float64(max(1, 1000-min(1000, max(0, vidaPerdidaPorMil)))) / 1000.0
	for _, allyBase := range aliados {
		pontosAlly := LimitarPontos(ctx.PontosDoHeroi(allyBase), PontosDisponiveis(nivel))
		est := EstadoParaBaseComCopias(nivel, allyBase, inv, ctx.EquipadosDoHeroi(allyBase), ctx.equipadosPorHeroi, ctx.copiasPorHeroi, pontosAlly, ctx.maestria)
		vidaAlly := max(1, int(float64(est.Atributos.Vida)*fatorVida+0.5))
		c := CombatenteDoEstado(est)
		c.VidaInicial = vidaAlly
		c.Elemento = ElementoDoPersonagem(allyBase)
		c.Classe = ClasseDoPersonagem(allyBase)
		c.Passiva = passiva
		c.Postura = PosturaValida(postura)
		combatentes = append(combatentes, c)
		fichas = append(fichas, FichaDeGrupo{
			Nome:        NomePadraoElenco(allyBase),
			Personagem:  allyBase,
			Nivel:       nivel,
			Poder:       est.Atributos.Poder,
			Atributos:   est.Atributos,
			Maestria:    ctx.maestria,
			Elemento:    c.Elemento,
			VidaInicial: vidaAlly,
		})
	}
	return combatentes, fichas, nil
}

// ResumoElencoEsquadrao devolve todos os heróis desbloqueados com poder e vida calculados no servidor.
func ResumoElencoEsquadrao(dbClient *supabase.Client, userID string, ctx contextoPersonagem, eqLider EstadoEquipamento) []HeroiResumoEsquadrao {
	if ctx.linha == nil {
		return nil
	}
	baseLider := ctx.linha.PersonagemBase
	if baseLider == "" {
		baseLider = personagemBasePadrao
	}
	nomeLider := ctx.linha.Nome
	if nomeLider == "" {
		nomeLider = NomePadraoElenco(baseLider)
	}
	desbloqueados := desbloqueadosNormalizados(ctx.linha)
	salvos := map[string]bool{baseLider: true}
	for _, a := range normalizarAliadosEsquadrao(ctx.linha.Esquadrao, baseLider, desbloqueados) {
		salvos[a] = true
	}

	inv := ctx.inventario
	if !ctx.inventarioLido && len(desbloqueados) > 1 {
		if lInv, _, err := carregarInventarioBruto(dbClient, userID); err == nil {
			inv = lInv
		}
	}

	disponiveis := PontosDisponiveis(eqLider.Nivel)
	pontosLider := LimitarPontos(ctx.PontosDoHeroi(baseLider), disponiveis)
	saida := make([]HeroiResumoEsquadrao, 0, len(desbloqueados))
	saida = append(saida, HeroiResumoEsquadrao{
		ID:           baseLider,
		Nome:         nomeLider,
		Classe:       ClasseDoPersonagem(baseLider),
		Elemento:     ElementoDoPersonagem(baseLider),
		Poder:        eqLider.Atributos.Poder,
		Vida:         eqLider.Atributos.Vida,
		Ativo:        true,
		NoGrupo:      true,
		Pontos:       pontosLider,
		PontosLivres: max(0, disponiveis-pontosLider.Total()),
	})
	for _, id := range desbloqueados {
		if id == baseLider {
			continue
		}
		pontosAlly := LimitarPontos(ctx.PontosDoHeroi(id), disponiveis)
		est := EstadoParaBaseComCopias(eqLider.Nivel, id, inv, ctx.EquipadosDoHeroi(id), ctx.equipadosPorHeroi, ctx.copiasPorHeroi, pontosAlly, ctx.maestria)
		saida = append(saida, HeroiResumoEsquadrao{
			ID:           id,
			Nome:         NomePadraoElenco(id),
			Classe:       ClasseDoPersonagem(id),
			Elemento:     ElementoDoPersonagem(id),
			Poder:        est.Atributos.Poder,
			Vida:         est.Atributos.Vida,
			Ativo:        false,
			NoGrupo:      salvos[id],
			Pontos:       pontosAlly,
			PontosLivres: max(0, disponiveis-pontosAlly.Total()),
		})
	}
	return saida
}

// HandleSalvarEsquadrao persiste a formação padrão de aliados desbloqueados (PUT /api/personagem/esquadrao).
func (h *RPGHandler) HandleSalvarEsquadrao(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Esquadrao []string `json:"esquadrao"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	baseLider := sessao.ctx.linha.PersonagemBase
	if baseLider == "" {
		baseLider = personagemBasePadrao
	}
	limpo, err := validarAliadosPedidos(corpo.Esquadrao, baseLider, desbloqueadosNormalizados(sessao.ctx.linha))
	if err != nil {
		responderErroJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	bruto := strings.TrimSpace(sessao.dbClient.Rpc("rpg_salvar_esquadrao", "", map[string]interface{}{
		"p_esquadrao": limpo,
	}))
	var retorno struct {
		Ok        bool     `json:"ok"`
		Erro      string   `json:"erro"`
		Esquadrao []string `json:"esquadrao"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil || (!retorno.Ok && retorno.Erro == "") {
		responderErroJSON(w, http.StatusServiceUnavailable, "Formação de esquadrão indisponível no momento.")
		return
	}
	if retorno.Erro != "" {
		responderErroJSON(w, http.StatusBadRequest, retorno.Erro)
		return
	}
	responderJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "esquadrao": retorno.Esquadrao})
}
