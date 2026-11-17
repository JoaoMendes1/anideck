package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// Regras do aprimoramento (sql/083). Cada nível soma 5% aos números do item; o teto depende
// da raridade, para um item comum no máximo não valer um raro. Com tudo no teto, o ganho fica
// perto de 40% sobre os números dos itens, e o teste de balanceamento confere esse caso.
const (
	percentualPorAprimoramento = 5
	aprimoramentoMaximoGeral   = 10
)

// TetoDeAprimoramento é o nível máximo de um item, pela raridade.
func TetoDeAprimoramento(raridade string) int {
	switch raridade {
	case "raro":
		return 6
	case "epico":
		return 8
	case "lendario":
		return 10
	}
	return 4
}

// CustoDeAprimoramento é o preço em Ouro para levar o item ao nível `para`. Cresce com o
// nível, então o último degrau custa mais que o primeiro.
func CustoDeAprimoramento(raridade string, para int) int {
	base := 20
	switch raridade {
	case "raro":
		base = 40
	case "epico":
		base = 80
	case "lendario":
		base = 150
	}
	return base * max(1, para)
}

// AplicarAprimoramento devolve o item com Vida, Ataque e Defesa somados ao aprimoramento.
// Arredonda para o inteiro mais próximo; atributo zero continua zero.
func AplicarAprimoramento(item ItemRPG, aprimoramento int) ItemRPG {
	aprimoramento = max(0, min(TetoDeAprimoramento(item.Raridade), aprimoramento))
	soma := func(valor int) int {
		return valor + (valor*percentualPorAprimoramento*aprimoramento+50)/100
	}
	item.Vida, item.Ataque, item.Defesa = soma(item.Vida), soma(item.Ataque), soma(item.Defesa)
	item.Aprimoramento = aprimoramento
	return item
}

// HandleAprimorar sobe um nível de um item do jogador. O preço e o teto saem daqui; o banco
// confere posse, nível atual e saldo, e a gravação passa pelo service role.
func (h *RPGHandler) HandleAprimorar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		ItemID string `json:"item_id"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 512)).Decode(&corpo) != nil {
		corpo.ItemID = ""
	}
	itemID := strings.TrimSpace(corpo.ItemID)

	userID, okID := r.Context().Value(middleware.UserIDKey).(string)
	token, okToken := r.Context().Value(middleware.TokenKey).(string)
	if !okID || !okToken || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	if itemID == "" || len(itemID) > 64 {
		responderErroJSON(w, http.StatusBadRequest, "Escolha um item.")
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	equipamento, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível aprimorar agora.")
		return
	}
	var alvo *ItemDoInventario
	for i := range equipamento.Inventario {
		if equipamento.Inventario[i].ID == itemID {
			alvo = &equipamento.Inventario[i]
			break
		}
	}
	if alvo == nil {
		responderErroJSON(w, http.StatusNotFound, "Você não tem este item.")
		return
	}
	if alvo.CustoAprimorar == 0 {
		responderErroJSON(w, http.StatusConflict, "Este item já está no máximo.")
		return
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível aprimorar agora.")
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_aprimorar_item", "", map[string]interface{}{
		"p_user_id": sessao.userID,
		"p_item_id": itemID,
		"p_de":      alvo.Aprimoramento,
		"p_custo":   alvo.CustoAprimorar,
		"p_teto":    alvo.AprimoramentoMaximo,
	}))
	var retorno struct {
		Ok            bool   `json:"ok"`
		Erro          string `json:"erro"`
		SemItem       bool   `json:"sem_item"`
		SemOuro       bool   `json:"sem_ouro"`
		Mudou         bool   `json:"mudou"`
		NoMaximo      bool   `json:"no_maximo"`
		Aprimoramento int    `json:"aprimoramento"`
		Ouro          int    `json:"ouro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil || (!retorno.Ok && retorno.Erro == "") {
		log.Printf("[RPG] Falha ao aprimorar (user=%s item=%s): %s", sessao.userID, itemID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível aprimorar agora.")
		return
	}
	if retorno.Erro != "" {
		status := http.StatusBadRequest
		switch {
		case retorno.SemItem:
			status = http.StatusNotFound
		case retorno.SemOuro || retorno.Mudou || retorno.NoMaximo:
			status = http.StatusConflict
		}
		responderErroJSON(w, status, retorno.Erro)
		return
	}

	// O estado novo sai do contexto já lido, com a linha atualizada: sem outra ida ao banco.
	ctx := sessao.ctx
	ctx.ouro = retorno.Ouro
	if ctx.inventarioLido && len(ctx.inventario) > 0 {
		inventario := make([]linhaInventarioRPG, len(ctx.inventario))
		copy(inventario, ctx.inventario)
		for i := range inventario {
			if inventario[i].Item.ID == itemID {
				inventario[i].Aprimoramento = retorno.Aprimoramento
			}
		}
		ctx.inventario = inventario
	}
	novo, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "O item foi aprimorado. Atualize a tela.")
		return
	}
	responderJSON(w, http.StatusOK, novo)
}
