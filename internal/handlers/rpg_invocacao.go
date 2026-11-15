package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

// ChancesInvocacao são as chances em por mil, como rpg_chances_invocacao() devolve. A tela
// mostra estes números, que são os mesmos do sorteio.
type ChancesInvocacao struct {
	Comum    int `json:"comum"`
	Raro     int `json:"raro"`
	Epico    int `json:"epico"`
	Lendario int `json:"lendario"`
	Garantia int `json:"garantia"`
}

// ItemInvocado é um item sorteado, com a marca de quando veio pela garantia.
type ItemInvocado struct {
	ItemRPG
	Garantida bool `json:"garantida"`
}

// EstadoInvocacao é o corpo de GET e POST /api/rpg/invocacao. Itens só vem no POST.
type EstadoInvocacao struct {
	Bilhetes int              `json:"bilhetes"`
	SemEpico int              `json:"sem_epico"`
	Chances  ChancesInvocacao `json:"chances"`
	Itens    []ItemInvocado   `json:"itens,omitempty"`
}

// QuantidadeDeInvocacaoValida aceita só 1 ou 10, a mesma regra de rpg_invocar.
func QuantidadeDeInvocacaoValida(vezes int) bool {
	return vezes == 1 || vezes == 10
}

// lerRetornoInvocacao interpreta o JSON das funções de invocação. `falhou` é resposta fora do
// formato (banco fora do ar, função ausente); `erro` é regra recusada (sem bilhetes).
func lerRetornoInvocacao(bruto string) (estado EstadoInvocacao, erro string, semBilhetes bool, falhou bool) {
	var r struct {
		EstadoInvocacao
		Ok          bool   `json:"ok"`
		Erro        string `json:"erro"`
		SemBilhetes bool   `json:"sem_bilhetes"`
	}
	if strings.TrimSpace(bruto) == "" || json.Unmarshal([]byte(bruto), &r) != nil {
		return EstadoInvocacao{}, "", false, true
	}
	if r.Erro != "" {
		return EstadoInvocacao{}, r.Erro, r.SemBilhetes, false
	}
	if !r.Ok {
		return EstadoInvocacao{}, "", false, true
	}
	return r.EstadoInvocacao, "", false, false
}

// HandleGetInvocacao devolve bilhetes, garantia e chances.
func (h *RPGHandler) HandleGetInvocacao(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	bruto := sessao.dbClient.Rpc("rpg_estado_invocacao", "", map[string]interface{}{})
	estado, erro, _, falhou := lerRetornoInvocacao(bruto)
	if falhou || erro != "" {
		log.Printf("[RPG] Falha ao ler invocação (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Invocação indisponível no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleInvocar gasta bilhetes e sorteia. O sorteio, o débito e a garantia acontecem numa
// transação da função do banco; o navegador escolhe só 1 ou 10.
func (h *RPGHandler) HandleInvocar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Vezes int `json:"vezes"`
	}
	if r.Body == nil || json.NewDecoder(r.Body).Decode(&corpo) != nil {
		corpo.Vezes = 0
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	if !QuantidadeDeInvocacaoValida(corpo.Vezes) {
		responderErroJSON(w, http.StatusBadRequest, "Invoque 1 ou 10 de cada vez.")
		return
	}

	bruto := sessao.dbClient.Rpc("rpg_invocar", "", map[string]interface{}{"p_vezes": corpo.Vezes})
	estado, erro, semBilhetes, falhou := lerRetornoInvocacao(bruto)
	if falhou {
		log.Printf("[RPG] Falha ao invocar (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível invocar agora.")
		return
	}
	if erro != "" {
		status := http.StatusBadRequest
		if semBilhetes {
			status = http.StatusConflict
		}
		responderErroJSON(w, status, erro)
		return
	}
	responderJSON(w, http.StatusOK, estado)
}
