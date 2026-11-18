package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/supabase-community/supabase-go"
)

// TipoDeLuta identifica o custo de Mana nas regras (sql/118).
type TipoDeLuta string

const (
	LutaExpedicao  TipoDeLuta = "expedicao"
	LutaDuelo      TipoDeLuta = "duelo"
	LutaChefeDoCla TipoDeLuta = "chefe_do_cla"
	LutaMasmorra   TipoDeLuta = "masmorra"
)

// CustosManaRPG vai nas respostas de leitura para a tela mostrar o preço antes da luta.
type CustosManaRPG struct {
	Expedicao  int `json:"expedicao"`
	Duelo      int `json:"duelo"`
	ChefeDoCla int `json:"chefe_do_cla"`
	Masmorra   int `json:"masmorra"`
}

// CustoDeMana é a porcentagem do tipo de luta sobre a Mana máxima do nível, arredondada para
// cima: com porcentagem acima de zero, a luta custa pelo menos 1.
func CustoDeMana(tipo TipoDeLuta, nivel int, r RegrasComunidade) int {
	pct := map[TipoDeLuta]int{
		LutaExpedicao: r.MPCustoExpedicaoPct, LutaDuelo: r.MPCustoDueloPct,
		LutaChefeDoCla: r.MPCustoChefePct, LutaMasmorra: r.MPCustoMasmorraPct,
	}[tipo]
	if pct <= 0 {
		return 0
	}
	return (CalcularManaMaxima(nivel, r)*pct + 99) / 100
}

// CustosDeMana devolve a tabela de custos para o nível.
func CustosDeMana(nivel int, r RegrasComunidade) CustosManaRPG {
	return CustosManaRPG{
		Expedicao: CustoDeMana(LutaExpedicao, nivel, r), Duelo: CustoDeMana(LutaDuelo, nivel, r),
		ChefeDoCla: CustoDeMana(LutaChefeDoCla, nivel, r), Masmorra: CustoDeMana(LutaMasmorra, nivel, r),
	}
}

// OuroComRegra aplica a porcentagem de Ouro das recompensas calculadas no Go (duelo, clã).
func OuroComRegra(base int, r RegrasComunidade) int {
	if r.OuroRecompensaPct <= 0 {
		return base
	}
	return (base*r.OuroRecompensaPct + 50) / 100
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
	if custo <= 0 {
		return false, true
	}
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
