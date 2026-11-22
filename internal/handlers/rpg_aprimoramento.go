package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// Regras do aprimoramento (sql/083). Cada nível soma 1% a cada número do item, e no mínimo 1
// ponto, para o ganho aparecer também nos itens pequenos. O teto depende da raridade, para um
// item comum no máximo não valer um raro. Os números são pequenos de propósito: o combate é
// sensível, e +9% de dano já dobra a vitória contra o chefe final. O teste de progressão
// (rpg_progressao_test.go) confere o caso com tudo no máximo.
const (
	percentualPorAprimoramento = 1
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

// AplicarAprimoramento devolve o item com Vida, Ataque e Defesa somados ao aprimoramento:
// 1% por nível, arredondado, e no mínimo 1 ponto por nível. Atributo zero continua zero.
func AplicarAprimoramento(item ItemRPG, aprimoramento int) ItemRPG {
	aprimoramento = max(0, min(TetoDeAprimoramento(item.Raridade), aprimoramento))
	soma := func(valor int) int {
		if valor <= 0 || aprimoramento == 0 {
			return valor
		}
		return valor + max(aprimoramento, (valor*percentualPorAprimoramento*aprimoramento+50)/100)
	}
	item.Vida, item.Ataque, item.Defesa, item.Magia = soma(item.Vida), soma(item.Ataque), soma(item.Defesa), soma(item.Magia)
	item.Aprimoramento = aprimoramento
	return item
}

// HandleAprimorar sobe um nível de um item do jogador. O preço e o teto saem daqui; o banco
// confere posse, nível atual e saldo, e a gravação passa pelo service role.
func (h *RPGHandler) HandleAprimorar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		ItemID string `json:"item_id"`
		Copia  int    `json:"copia"`
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

	copiaAlvo := corpo.Copia
	if copiaAlvo <= 0 {
		copiaAlvo = alvo.CopiaAlvo
	}
	if copiaAlvo <= 0 {
		if len(alvo.EmUsoPor) == 1 {
			responderErroJSON(w, http.StatusBadRequest, fmt.Sprintf("Este item está em uso por %s. Desequipe ou troque para ele para aprimorar.", alvo.EmUsoPor[0]))
		} else {
			responderErroJSON(w, http.StatusBadRequest, "Desequipe uma cópia de outro personagem antes de aprimorar.")
		}
		return
	}

	nivelAtual := alvo.Aprimoramento
	if copiaAlvo >= 1 && copiaAlvo <= len(alvo.Aprimoramentos) {
		nivelAtual = alvo.Aprimoramentos[copiaAlvo-1]
	}
	custo := 0
	if nivelAtual < alvo.AprimoramentoMaximo {
		custo = CustoDeAprimoramento(alvo.Raridade, nivelAtual+1)
	}
	if custo == 0 {
		responderErroJSON(w, http.StatusConflict, "Este item já está no máximo.")
		return
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível aprimorar agora.")
		return
	}
	params := map[string]interface{}{
		"p_user_id": sessao.userID,
		"p_item_id": itemID,
		"p_de":      nivelAtual,
		"p_custo":   custo,
		"p_teto":    alvo.AprimoramentoMaximo,
		"p_copia":   copiaAlvo,
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_aprimorar_item", "", params))
	var retorno struct {
		Ok             bool   `json:"ok"`
		Erro           string `json:"erro"`
		SemItem        bool   `json:"sem_item"`
		SemOuro        bool   `json:"sem_ouro"`
		Mudou          bool   `json:"mudou"`
		NoMaximo       bool   `json:"no_maximo"`
		Aprimoramento  int    `json:"aprimoramento"`
		Aprimoramentos []int  `json:"aprimoramentos"`
		Ouro           int    `json:"ouro"`
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

	// O estado novo sai do contexto já lido, com a cópia atualizada: sem outra ida ao banco.
	ctx := sessao.ctx
	ctx.ouro = retorno.Ouro
	if ctx.inventarioLido && len(ctx.inventario) > 0 {
		inventario := make([]linhaInventarioRPG, len(ctx.inventario))
		copy(inventario, ctx.inventario)
		for i := range inventario {
			if inventario[i].Item.ID == itemID {
				niveis := inventario[i].NiveisDasCopias()
				if len(retorno.Aprimoramentos) > 0 {
					niveis = retorno.Aprimoramentos
				} else if copiaAlvo >= 1 && copiaAlvo <= len(niveis) {
					niveis[copiaAlvo-1] = retorno.Aprimoramento
				}
				inventario[i].Aprimoramentos = niveis
				maxLv := 0
				for _, nv := range niveis {
					if nv > maxLv {
						maxLv = nv
					}
				}
				inventario[i].Aprimoramento = maxLv
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
