package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/supabase-community/supabase-go"
)

// Mana gasta por luta (sql/118). A recarga diária gira em torno de 25 a 30 por dia no nível
// 15: dá para as lutas do dia e ainda sobra para comentar; o resto vem de Poção e Fonte.
const (
	CustoManaExpedicao  = 3
	CustoManaDuelo      = 3
	CustoManaChefeDoCla = 5
	CustoManaMasmorra   = 8
)

// CustosManaRPG vai nas respostas de leitura para a tela mostrar o preço antes da luta.
type CustosManaRPG struct {
	Expedicao  int `json:"expedicao"`
	Duelo      int `json:"duelo"`
	ChefeDoCla int `json:"chefe_do_cla"`
	Masmorra   int `json:"masmorra"`
}

// CustosDeMana devolve a tabela de custos atual.
func CustosDeMana() CustosManaRPG {
	return CustosManaRPG{Expedicao: CustoManaExpedicao, Duelo: CustoManaDuelo, ChefeDoCla: CustoManaChefeDoCla, Masmorra: CustoManaMasmorra}
}

// interpretarCobrancaMana lê o retorno de rpg_mana_lutar. Resposta fora do formato (função
// ausente, erro do PostgREST) não impede a luta: cobrou=false e erro vazio.
func interpretarCobrancaMana(bruto string) (cobrou bool, erro string) {
	var r struct {
		Ok   bool   `json:"ok"`
		Erro string `json:"erro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &r) != nil {
		return false, ""
	}
	if r.Erro != "" {
		return false, r.Erro
	}
	return r.Ok, ""
}

// cobrarManaDaLuta cobra antes de registrar a luta. ok=false quer dizer que a resposta de
// erro já foi escrita (Mana insuficiente).
func cobrarManaDaLuta(w http.ResponseWriter, servico *supabase.Client, userID string, custo int) (cobrou, ok bool) {
	bruto := strings.TrimSpace(servico.Rpc("rpg_mana_lutar", "", map[string]interface{}{
		"p_user_id": userID, "p_quantia": custo,
	}))
	cobrou, erro := interpretarCobrancaMana(bruto)
	if erro != "" {
		responderErroJSON(w, http.StatusConflict, erro+" Espere a Mana voltar ou use uma Poção de Mana.")
		return false, false
	}
	if !cobrou {
		log.Printf("[RPG] Mana não cobrada (user=%s): %s", userID, bruto)
	}
	return cobrou, true
}

// devolverManaDaLuta desfaz a cobrança quando a luta não chegou a ser registrada.
func devolverManaDaLuta(servico *supabase.Client, userID string, custo int, cobrou bool) {
	if !cobrou {
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_mana_lutar", "", map[string]interface{}{
		"p_user_id": userID, "p_quantia": -custo,
	}))
	if devolveu, _ := interpretarCobrancaMana(bruto); !devolveu {
		log.Printf("[RPG] Falha ao devolver Mana (user=%s, custo=%d): %s", userID, custo, bruto)
	}
}
