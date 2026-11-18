package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	supabase "github.com/supabase-community/supabase-go"
)

// AtributosRPG são os números de combate do personagem, derivados dos primários e somados
// aos itens. Chamam-se Vida e Éter, e não HP e MP, porque Vitalidade e Mana já são da
// comunidade.
type AtributosRPG struct {
	Vida   int `json:"vida"`
	Ataque int `json:"ataque"`
	Defesa int `json:"defesa"`
	// Magia reforça as habilidades arcanas; Éter é o que elas gastam.
	Magia int `json:"magia"`
	Eter  int `json:"eter"`
	// Velocidade decide quem age primeiro na rodada.
	Velocidade int `json:"velocidade"`
	// Chances em milésimos (70 = 7%), para não usar ponto flutuante na resposta.
	CriticoPorMil int `json:"critico_por_mil"`
	// DanoCritico é o multiplicador do crítico, em porcento (150 = 1,5x).
	DanoCritico   int `json:"dano_critico"`
	EsquivaPorMil int `json:"esquiva_por_mil"`
	// SorteItem soma pontos percentuais à chance de item da vitória.
	SorteItem int `json:"sorte_item"`
	// Poder resume tudo num número só, para comparar com um monstro de relance.
	Poder int `json:"poder"`
}

// ItemRPG é um item do catálogo rpg_itens.
type ItemRPG struct {
	ID          string `json:"id"`
	Slot        string `json:"slot"`
	Nome        string `json:"nome"`
	Descricao   string `json:"descricao"`
	Raridade    string `json:"raridade"`
	Vida        int    `json:"vida"`
	Ataque      int    `json:"ataque"`
	Defesa      int    `json:"defesa"`
	NivelMinimo int    `json:"nivel_minimo"`
	// Atributos além de Vida, Ataque e Defesa (sql/121). Chances em milésimos, como em
	// AtributosRPG; DanoCritico soma pontos percentuais ao multiplicador.
	Magia         int `json:"magia"`
	Velocidade    int `json:"velocidade"`
	CriticoPorMil int `json:"critico_por_mil"`
	DanoCritico   int `json:"dano_critico"`
	EsquivaPorMil int `json:"esquiva_por_mil"`
	// Classes que podem usar o item: nil serve a todas, lista vazia não serve a nenhuma.
	Classes []string `json:"classes"`
	// PersonagemExclusivo, quando preenchido, vale no lugar das classes.
	PersonagemExclusivo string `json:"personagem_exclusivo,omitempty"`
	Conjunto            string `json:"conjunto,omitempty"`
	// Aprimoramento é de 0 a 10 (sql/083). Vida, Ataque, Defesa e Magia já vêm com ele somado
	// quando o item é do jogador; no catálogo, é sempre 0.
	Aprimoramento int `json:"aprimoramento"`
}

// ItemDoInventario é o item como a tela o lista: com quantas cópias, se está em uso e se o
// nível do jogador ainda não o alcança.
type ItemDoInventario struct {
	ItemRPG
	Quantidade int  `json:"quantidade"`
	Equipado   bool `json:"equipado"`
	Bloqueado  bool `json:"bloqueado"`
	// NaoServe é o item que a classe do personagem não usa: aparece na lista, mas não equipa.
	NaoServe bool `json:"nao_serve"`
	// AprimoramentoMaximo é o teto da raridade; CustoAprimorar é o preço em Ouro do próximo
	// nível, 0 quando já está no teto.
	AprimoramentoMaximo int `json:"aprimoramento_maximo"`
	CustoAprimorar      int `json:"custo_aprimorar"`
}

// SlotRPG é um dos sete lugares de equipamento. Item nil é slot vazio.
type SlotRPG struct {
	Slot string   `json:"slot"`
	Item *ItemRPG `json:"item,omitempty"`
}

// EstadoEquipamento é o corpo de GET e PUT /api/personagem/equipamentos.
type EstadoEquipamento struct {
	Nivel int `json:"nivel"`
	// Base é sem itens, já com os pontos; Atributos é com tudo.
	Base      AtributosRPG `json:"base"`
	Atributos AtributosRPG `json:"atributos"`
	// Primários: o que o nível dá, os pontos em uso e quantos o nível permite.
	PrimariosBase     PrimariosRPG       `json:"primarios_base"`
	Pontos            PrimariosRPG       `json:"pontos"`
	PontosDisponiveis int                `json:"pontos_disponiveis"`
	Slots             []SlotRPG          `json:"slots"`
	Inventario        []ItemDoInventario `json:"inventario"`
	// Livro de habilidades da classe, com as bloqueadas pelo nível.
	Habilidades []HabilidadeRPG `json:"habilidades"`
	// Ouro disponível para aprimorar (sql/081).
	Ouro int `json:"ouro"`
	// Conjuntos com ao menos uma peça em uso, com o bônus de cada faixa.
	Conjuntos []ConjuntoEmUso `json:"conjuntos"`
}

// SlotsRPG devolve os slots na ordem em que a tela os mostra. A lista repete o CHECK de
// rpg_itens e de rpg_equipados e a função rpg_equipar_item (sql/121).
func SlotsRPG() []string {
	return []string{"arma", "elmo", "armadura", "luvas", "capa", "botas", "joia"}
}

// ItemServe diz se o personagem pode usar o item. Repete rpg_item_serve (sql/121): o banco
// recusa equipar, e aqui o item que sobrou num slot deixa de somar.
func ItemServe(item ItemRPG, personagemBase string) bool {
	if personagemBase == "" {
		personagemBase = personagemBasePadrao
	}
	if item.PersonagemExclusivo != "" {
		return item.PersonagemExclusivo == personagemBase
	}
	if item.Classes == nil {
		return true
	}
	base, conhecido := PersonagensBase()[personagemBase]
	if !conhecido {
		base = PersonagensBase()[personagemBasePadrao]
	}
	for _, c := range item.Classes {
		if c == base.Classe {
			return true
		}
	}
	return false
}

// SlotRPGValido diz se o slot existe.
func SlotRPGValido(slot string) bool {
	for _, s := range SlotsRPG() {
		if s == slot {
			return true
		}
	}
	return false
}

// CalcularPoder resume os atributos. Vida vale um décimo porque cresce dez vezes mais
// rápido que ataque e defesa; Magia vale metade porque só entra nas habilidades arcanas.
func CalcularPoder(a AtributosRPG) int {
	return a.Vida/10 + a.Ataque*2 + a.Defesa*2 + a.Magia/2 + a.Velocidade
}

// AtributosBase são os atributos de um personagem sem equipamento e sem pontos. Crescem
// com o nível, que vem só de assistir animes: o equipamento e os pontos ajudam, mas não
// substituem a atividade real.
func AtributosBase(nivel int) AtributosRPG {
	return DerivarAtributos(nivel, PrimariosBase(nivel))
}

// Tetos das chances depois dos itens: acima disso o combate perde a graça (crítico quase
// certo, golpe que quase nunca acerta).
const (
	tetoCriticoPorMil = 750
	tetoEsquivaPorMil = 400
)

// SomarAtributos junta os atributos base aos dos itens equipados e aos bônus de conjunto.
func SomarAtributos(base AtributosRPG, itens []ItemRPG) AtributosRPG {
	total := base
	for _, i := range itens {
		total = somarItem(total, i)
	}
	for _, c := range ConjuntosEmUso(itens) {
		total = somarItem(total, c.bonusAtivo)
	}
	total.CriticoPorMil = min(tetoCriticoPorMil, total.CriticoPorMil)
	total.EsquivaPorMil = min(tetoEsquivaPorMil, total.EsquivaPorMil)
	total.Poder = CalcularPoder(total)
	return total
}

func somarItem(total AtributosRPG, i ItemRPG) AtributosRPG {
	total.Vida += i.Vida
	total.Ataque += i.Ataque
	total.Defesa += i.Defesa
	total.Magia += i.Magia
	total.Velocidade += i.Velocidade
	total.CriticoPorMil += i.CriticoPorMil
	total.DanoCritico += i.DanoCritico
	total.EsquivaPorMil += i.EsquivaPorMil
	return total
}

// linhaInventarioRPG é uma linha de rpg_inventario com o item do catálogo embutido.
type linhaInventarioRPG struct {
	Quantidade    int      `json:"quantidade"`
	Aprimoramento int      `json:"aprimoramento"`
	Item          *ItemRPG `json:"rpg_itens"`
}

// interpretarInventarioRPG lê a resposta do PostgREST. Linha sem item (apagado do catálogo
// ou desativado) é descartada.
func interpretarInventarioRPG(dados []byte) ([]linhaInventarioRPG, error) {
	var linhas []linhaInventarioRPG
	if err := json.Unmarshal(dados, &linhas); err != nil {
		return nil, err
	}
	saida := make([]linhaInventarioRPG, 0, len(linhas))
	for _, l := range linhas {
		if l.Item == nil || l.Item.ID == "" || !SlotRPGValido(l.Item.Slot) {
			continue
		}
		if l.Quantidade < 1 {
			l.Quantidade = 1
		}
		l.Aprimoramento = max(0, min(aprimoramentoMaximoGeral, l.Aprimoramento))
		saida = append(saida, l)
	}
	return saida, nil
}

// MontarEstadoEquipamento calcula o que a tela mostra e o que o combate usa. Um item
// equipado só conta se o jogador ainda o possui, se serve ao personagem e se o nível o
// alcança: desmarcar episódios reduz o XP, e o item acima do nível fica no slot sem somar
// atributo, em vez de dar erro.
func MontarEstadoEquipamento(nivel int, personagemBase string, inventario []linhaInventarioRPG, equipados map[string]string, pontos PrimariosRPG) EstadoEquipamento {
	if nivel < 1 {
		nivel = 1
	}
	porID := make(map[string]ItemRPG, len(inventario))
	for _, l := range inventario {
		porID[l.Item.ID] = AplicarAprimoramento(*l.Item, l.Aprimoramento)
	}

	slots := make([]SlotRPG, 0, len(SlotsRPG()))
	emUso := make([]ItemRPG, 0, len(SlotsRPG()))
	equipadoNoSlot := make(map[string]bool, len(SlotsRPG()))
	for _, slot := range SlotsRPG() {
		item, possui := porID[equipados[slot]]
		if !possui || item.Slot != slot {
			slots = append(slots, SlotRPG{Slot: slot})
			continue
		}
		copia := item
		slots = append(slots, SlotRPG{Slot: slot, Item: &copia})
		equipadoNoSlot[item.ID] = true
		if nivel >= item.NivelMinimo && ItemServe(item, personagemBase) {
			emUso = append(emUso, item)
		}
	}

	ordemDoSlot := make(map[string]int, len(SlotsRPG()))
	for i, slot := range SlotsRPG() {
		ordemDoSlot[slot] = i
	}
	lista := make([]ItemDoInventario, 0, len(inventario))
	for _, l := range inventario {
		teto := TetoDeAprimoramento(l.Item.Raridade)
		custo := 0
		if l.Aprimoramento < teto {
			custo = CustoDeAprimoramento(l.Item.Raridade, l.Aprimoramento+1)
		}
		lista = append(lista, ItemDoInventario{
			ItemRPG:             porID[l.Item.ID],
			Quantidade:          l.Quantidade,
			Equipado:            equipadoNoSlot[l.Item.ID],
			Bloqueado:           nivel < l.Item.NivelMinimo,
			NaoServe:            !ItemServe(*l.Item, personagemBase),
			AprimoramentoMaximo: teto,
			CustoAprimorar:      custo,
		})
	}
	sort.SliceStable(lista, func(i, j int) bool {
		if lista[i].Slot != lista[j].Slot {
			return ordemDoSlot[lista[i].Slot] < ordemDoSlot[lista[j].Slot]
		}
		if lista[i].NivelMinimo != lista[j].NivelMinimo {
			return lista[i].NivelMinimo < lista[j].NivelMinimo
		}
		return lista[i].Nome < lista[j].Nome
	})

	disponiveis := PontosDisponiveis(nivel)
	pontos = LimitarPontos(pontos, disponiveis)
	primariosBase := PrimariosBase(nivel)
	base := DerivarAtributos(nivel, primariosBase.Somar(pontos))
	return EstadoEquipamento{
		Nivel:             nivel,
		Base:              base,
		Atributos:         SomarAtributos(base, emUso),
		PrimariosBase:     primariosBase,
		Pontos:            pontos,
		PontosDisponiveis: disponiveis,
		Slots:             slots,
		Inventario:        lista,
		Conjuntos:         ConjuntosEmUso(emUso),
	}
}

// carregarEstadoEquipamento lê inventário e slots do jogador e monta o estado. É a mesma
// conta para a tela e para o combate, que não aceita atributo vindo do navegador.
func carregarEstadoEquipamento(dbClient *supabase.Client, userID, personagemBase string, nivel int, pontos PrimariosRPG) (EstadoEquipamento, error) {
	// Sem as colunas do sql/121: esta é a leitura de reserva (primeira visita, kit inicial),
	// e pedir coluna que ainda não existe derrubaria a leitura inteira.
	dados, _, err := dbClient.From("rpg_inventario").
		Select("quantidade,aprimoramento,rpg_itens(id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo)", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return EstadoEquipamento{}, err
	}
	inventario, err := interpretarInventarioRPG(dados)
	if err != nil {
		return EstadoEquipamento{}, err
	}

	dadosEq, _, err := dbClient.From("rpg_equipados").
		Select("slot,item_id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return EstadoEquipamento{}, err
	}
	var linhasEq []struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
	}
	if err := json.Unmarshal(dadosEq, &linhasEq); err != nil {
		return EstadoEquipamento{}, err
	}
	equipados := make(map[string]string, len(linhasEq))
	for _, l := range linhasEq {
		equipados[l.Slot] = l.ItemID
	}

	return MontarEstadoEquipamento(nivel, personagemBase, inventario, equipados, pontos), nil
}

// RPGHandler responde pelas rotas de jogo do personagem: equipamentos, batalhas e invocação.
type RPGHandler struct{}

// sessaoRPG reúne o que toda rota de jogo precisa antes de começar: quem é o jogador, o
// cliente do banco com o token dele e o nível do personagem.
type sessaoRPG struct {
	userID   string
	dbClient *supabase.Client
	nivel    int
	ctx      contextoPersonagem
}

// abrirSessaoRPG confere a autenticação e a existência do personagem. Quando devolve false,
// a resposta de erro já foi escrita.
func abrirSessaoRPG(w http.ResponseWriter, r *http.Request) (sessaoRPG, bool) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return sessaoRPG{}, false
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil || dbClient == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return sessaoRPG{}, false
	}

	ctx, err := carregarContextoPersonagem(dbClient, userID)
	if err != nil {
		log.Printf("[RPG] Falha ao ler personagem (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return sessaoRPG{}, false
	}
	if ctx.linha == nil {
		responderErroJSON(w, http.StatusNotFound, "Desperte o seu personagem primeiro.")
		return sessaoRPG{}, false
	}

	return sessaoRPG{
		userID:   userID,
		dbClient: dbClient,
		nivel:    CalcularNivelERank(ctx.xpTotal, ctx.ranks).Nivel,
		ctx:      ctx,
	}, true
}

// HandleGetEquipamentos devolve atributos, slots e inventário. Garante o kit inicial antes
// de ler: a função do banco não faz nada para quem já o recebeu.
func (h *RPGHandler) HandleGetEquipamentos(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	estado, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	if err != nil {
		log.Printf("[RPG] Falha ao ler equipamentos (user=%s): %v", sessao.userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Equipamentos indisponíveis no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleEquiparItemRPG equipa um item num slot, ou esvazia o slot com item_id vazio. Posse,
// slot e nível são conferidos pela função do banco, que é quem grava.
func (h *RPGHandler) HandleEquiparItemRPG(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}

	var corpo struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&corpo); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}
	slot := strings.TrimSpace(corpo.Slot)
	itemID := strings.TrimSpace(corpo.ItemID)
	if !SlotRPGValido(slot) {
		responderErroJSON(w, http.StatusBadRequest, "Slot inválido.")
		return
	}
	if utf8.RuneCountInString(itemID) > 40 {
		responderErroJSON(w, http.StatusBadRequest, "Item desconhecido.")
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	bruto := strings.TrimSpace(sessao.dbClient.Rpc("rpg_equipar_item", "", map[string]interface{}{
		"p_slot":    slot,
		"p_item_id": itemID,
	}))
	erroDaRegra, falhou := lerRetornoRPG(bruto)
	if falhou {
		log.Printf("[RPG] Falha ao equipar (user=%s, slot=%s): %s", sessao.userID, slot, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível trocar o equipamento agora.")
		return
	}
	if erroDaRegra != "" {
		responderErroJSON(w, http.StatusBadRequest, erroDaRegra)
		return
	}

	// Lê de novo para devolver o estado já com a troca: uma ida ao banco pela leitura única.
	ctx, err := carregarContextoPersonagem(sessao.dbClient, sessao.userID)
	if err != nil || ctx.linha == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Equipamentos indisponíveis no momento.")
		return
	}
	estado, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Equipamentos indisponíveis no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// lerRetornoRPG interpreta o JSON que as funções rpg_* devolvem: {"ok":true,...} ou
// {"erro":"..."}. `falhou` é true quando a resposta não tem nenhum dos dois formatos, que é
// o caso de resposta vazia ou de erro do próprio PostgREST.
func lerRetornoRPG(bruto string) (erroDaRegra string, falhou bool) {
	var retorno struct {
		Ok   bool   `json:"ok"`
		Erro string `json:"erro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil {
		return "", true
	}
	if retorno.Erro != "" {
		return retorno.Erro, false
	}
	if !retorno.Ok {
		return "", true
	}
	return "", false
}
