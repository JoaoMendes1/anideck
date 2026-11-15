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

// AtributosRPG são os números de combate do personagem. Chamam-se Vida, Ataque e Defesa, e
// não HP e MP, porque esses dois já são a Vitalidade e a Mana da comunidade.
type AtributosRPG struct {
	Vida   int `json:"vida"`
	Ataque int `json:"ataque"`
	Defesa int `json:"defesa"`
	// Poder resume os três num número só, para comparar com um monstro de relance.
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
}

// ItemDoInventario é o item como a tela o lista: com quantas cópias, se está em uso e se o
// nível do jogador ainda não o alcança.
type ItemDoInventario struct {
	ItemRPG
	Quantidade int  `json:"quantidade"`
	Equipado   bool `json:"equipado"`
	Bloqueado  bool `json:"bloqueado"`
}

// SlotRPG é um dos cinco lugares de equipamento. Item nil é slot vazio.
type SlotRPG struct {
	Slot string   `json:"slot"`
	Item *ItemRPG `json:"item,omitempty"`
}

// EstadoEquipamento é o corpo de GET e PUT /api/personagem/equipamentos.
type EstadoEquipamento struct {
	Nivel      int                `json:"nivel"`
	Base       AtributosRPG       `json:"base"`
	Atributos  AtributosRPG       `json:"atributos"`
	Slots      []SlotRPG          `json:"slots"`
	Inventario []ItemDoInventario `json:"inventario"`
}

// SlotsRPG devolve os slots na ordem em que a tela os mostra. A lista repete o CHECK de
// rpg_itens e de rpg_equipados e a função rpg_equipar_item (sql/071).
func SlotsRPG() []string {
	return []string{"arma", "armadura", "capa", "botas", "joia"}
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
// rápido que ataque e defesa.
func CalcularPoder(a AtributosRPG) int {
	return a.Vida/10 + a.Ataque*2 + a.Defesa*2
}

// AtributosBase são os atributos de um personagem sem equipamento. Crescem em linha reta
// com o nível, que por sua vez vem só de assistir animes: o equipamento ajuda, mas não
// substitui a atividade real.
func AtributosBase(nivel int) AtributosRPG {
	if nivel < 1 {
		nivel = 1
	}
	a := AtributosRPG{
		Vida:   100 + 20*(nivel-1),
		Ataque: 10 + 3*(nivel-1),
		Defesa: 5 + 2*(nivel-1),
	}
	a.Poder = CalcularPoder(a)
	return a
}

// SomarAtributos junta os atributos base aos dos itens equipados.
func SomarAtributos(base AtributosRPG, itens []ItemRPG) AtributosRPG {
	total := AtributosRPG{Vida: base.Vida, Ataque: base.Ataque, Defesa: base.Defesa}
	for _, i := range itens {
		total.Vida += i.Vida
		total.Ataque += i.Ataque
		total.Defesa += i.Defesa
	}
	total.Poder = CalcularPoder(total)
	return total
}

// linhaInventarioRPG é uma linha de rpg_inventario com o item do catálogo embutido.
type linhaInventarioRPG struct {
	Quantidade int      `json:"quantidade"`
	Item       *ItemRPG `json:"rpg_itens"`
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
		saida = append(saida, l)
	}
	return saida, nil
}

// MontarEstadoEquipamento calcula o que a tela mostra e o que o combate usa. Um item
// equipado só conta se o jogador ainda o possui e se o nível o alcança: desmarcar episódios
// reduz o XP, e o item acima do nível fica no slot sem somar atributo, em vez de dar erro.
func MontarEstadoEquipamento(nivel int, inventario []linhaInventarioRPG, equipados map[string]string) EstadoEquipamento {
	if nivel < 1 {
		nivel = 1
	}
	porID := make(map[string]ItemRPG, len(inventario))
	for _, l := range inventario {
		porID[l.Item.ID] = *l.Item
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
		if nivel >= item.NivelMinimo {
			emUso = append(emUso, item)
		}
	}

	ordemDoSlot := make(map[string]int, len(SlotsRPG()))
	for i, slot := range SlotsRPG() {
		ordemDoSlot[slot] = i
	}
	lista := make([]ItemDoInventario, 0, len(inventario))
	for _, l := range inventario {
		lista = append(lista, ItemDoInventario{
			ItemRPG:    *l.Item,
			Quantidade: l.Quantidade,
			Equipado:   equipadoNoSlot[l.Item.ID],
			Bloqueado:  nivel < l.Item.NivelMinimo,
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

	base := AtributosBase(nivel)
	return EstadoEquipamento{
		Nivel:      nivel,
		Base:       base,
		Atributos:  SomarAtributos(base, emUso),
		Slots:      slots,
		Inventario: lista,
	}
}

// carregarEstadoEquipamento lê inventário e slots do jogador e monta o estado. É a mesma
// conta para a tela e para o combate, que não aceita atributo vindo do navegador.
func carregarEstadoEquipamento(dbClient *supabase.Client, userID string, nivel int) (EstadoEquipamento, error) {
	dados, _, err := dbClient.From("rpg_inventario").
		Select("quantidade,rpg_itens(id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo)", "", false).
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

	return MontarEstadoEquipamento(nivel, inventario, equipados), nil
}

// RPGHandler responde pelas rotas de jogo do personagem: equipamentos, batalhas e invocação.
type RPGHandler struct{}

// sessaoRPG reúne o que toda rota de jogo precisa antes de começar: quem é o jogador, o
// cliente do banco com o token dele e o nível do personagem.
type sessaoRPG struct {
	userID   string
	dbClient *supabase.Client
	nivel    int
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
	}, true
}

// HandleGetEquipamentos devolve atributos, slots e inventário. Garante o kit inicial antes
// de ler: a função do banco não faz nada para quem já o recebeu.
func (h *RPGHandler) HandleGetEquipamentos(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	sessao.dbClient.Rpc("rpg_garantir_kit_inicial", "", map[string]interface{}{})

	estado, err := carregarEstadoEquipamento(sessao.dbClient, sessao.userID, sessao.nivel)
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

	estado, err := carregarEstadoEquipamento(sessao.dbClient, sessao.userID, sessao.nivel)
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
