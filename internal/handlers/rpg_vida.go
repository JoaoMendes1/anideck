package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// A Vida fora da batalha é guardada como perda em por mil da Vida máxima (sql/081): 0 é cheia,
// 1000 é zerada. A Vida máxima muda com nível, pontos e itens, e a fração continua valendo.
const perdaTotalPorMil = 1000

// VidaRPG é a Vida do personagem entre as batalhas.
type VidaRPG struct {
	Atual         int `json:"atual"`
	Maxima        int `json:"maxima"`
	PerdidaPorMil int `json:"perdida_por_mil"`
}

// RegrasVida são as regras de recuperação, como rpg_regras_vida() devolve. Em por mil.
type RegrasVida struct {
	RegenPorHora    int `json:"regen_por_hora"`
	PorEpisodio     int `json:"por_episodio"`
	EpisodiosPorDia int `json:"episodios_por_dia"`
	Pocao           int `json:"pocao"`
	PousadaHoras    int `json:"pousada_horas"`
	// Vida mínima para começar uma batalha e Ouro perdido na queda (sql/090).
	VidaMinimaLuta int `json:"vida_minima_luta"`
	QuedaOuroPct   int `json:"queda_ouro_pct"`
}

// Valores do sql/090, usados enquanto o banco ainda não os devolve.
const (
	vidaMinimaLutaPadrao = 300
	quedaOuroPctPadrao   = 10
)

// ComPadroes preenche as regras que o banco ainda não manda: zero é ausente.
func (r RegrasVida) ComPadroes() RegrasVida {
	if r.VidaMinimaLuta <= 0 {
		r.VidaMinimaLuta = vidaMinimaLutaPadrao
	}
	if r.QuedaOuroPct <= 0 {
		r.QuedaOuroPct = quedaOuroPctPadrao
	}
	return r
}

// PodeLutar diz se a Vida guardada alcança o mínimo para começar uma batalha.
func PodeLutar(perdidaPorMil int, regras RegrasVida) bool {
	return perdidaPorMil <= perdaTotalPorMil-regras.ComPadroes().VidaMinimaLuta
}

// CustosRecuperacao é o preço em Ouro de cada forma de recuperar, para o nível do jogador.
type CustosRecuperacao struct {
	Pousada   int `json:"pousada"`
	Pocao     int `json:"pocao"`
	PocaoMana int `json:"pocao_mana"`
	// Fonte termal: HP e Mana cheios, uma vez a cada 24 horas (sql/114).
	Fonte int `json:"fonte"`
}

// MontarVida converte a perda guardada na Vida que a tela mostra. Com qualquer perda abaixo
// da total, sobra ao menos 1 de Vida: só a perda total impede a batalha.
func MontarVida(maxima, perdidaPorMil int) VidaRPG {
	if maxima < 1 {
		maxima = 1
	}
	perdidaPorMil = max(0, min(perdaTotalPorMil, perdidaPorMil))
	atual := maxima * (perdaTotalPorMil - perdidaPorMil) / perdaTotalPorMil
	if perdidaPorMil < perdaTotalPorMil {
		atual = max(1, atual)
	}
	return VidaRPG{Atual: atual, Maxima: maxima, PerdidaPorMil: perdidaPorMil}
}

// PerdaPorMil converte a Vida que sobrou de uma batalha na perda que o banco guarda. Quem
// sobreviveu nunca é gravado como Vida zerada.
func PerdaPorMil(maxima, vidaFinal int) int {
	if maxima < 1 || vidaFinal <= 0 {
		return perdaTotalPorMil
	}
	if vidaFinal >= maxima {
		return 0
	}
	perda := ((maxima-vidaFinal)*perdaTotalPorMil + maxima/2) / maxima
	return min(perda, perdaTotalPorMil-1)
}

// CustosPara dá os preços pelo nível. A Pousada cura tudo e espera 4 horas; a Poção cura 30%
// sem espera, e por isso custa mais por ponto de Vida.
func CustosPara(nivel int) CustosRecuperacao {
	nivel = max(1, nivel)
	return CustosRecuperacao{Pousada: 10 + 2*nivel, Pocao: 5 + nivel, PocaoMana: 4 + nivel, Fonte: 20 + 3*nivel}
}

// CustoDaRecuperacao valida o tipo e devolve o preço. O navegador nunca envia o preço.
func CustoDaRecuperacao(tipo string, nivel int) (int, bool) {
	custos := CustosPara(nivel)
	switch tipo {
	case "pousada":
		return custos.Pousada, true
	case "pocao":
		return custos.Pocao, true
	case "pocao_mana":
		return custos.PocaoMana, true
	case "fonte":
		return custos.Fonte, true
	}
	return 0, false
}

// RespostaRecuperacao é o corpo de POST /api/rpg/recuperar.
type RespostaRecuperacao struct {
	Vida           VidaRPG `json:"vida"`
	Ouro           int     `json:"ouro"`
	VidaRecuperada int     `json:"vida_recuperada"`
}

// HandleRecuperar vende a Pousada, a Fonte termal e as Poções de HP e Mana. O preço sai do nível calculado aqui, e a
// gravação passa pelo service role depois de conferir o usuário pelo token.
func (h *RPGHandler) HandleRecuperar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Tipo string `json:"tipo"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 256)).Decode(&corpo) != nil {
		corpo.Tipo = ""
	}
	tipo := strings.TrimSpace(corpo.Tipo)

	// Autenticação e tipo antes do banco: pedido inválido não gasta consulta.
	userID, okID := r.Context().Value(middleware.UserIDKey).(string)
	token, okToken := r.Context().Value(middleware.TokenKey).(string)
	if !okID || !okToken || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}
	if _, valido := CustoDaRecuperacao(tipo, 1); !valido {
		responderErroJSON(w, http.StatusBadRequest, "Escolha a Pousada, a Fonte termal ou uma Poção.")
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	custo, _ := CustoDaRecuperacao(tipo, sessao.nivel)

	equipamento, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível recuperar agora.")
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível recuperar agora.")
		return
	}

	bruto := strings.TrimSpace(servico.Rpc("rpg_recuperar_vida", "", map[string]interface{}{
		"p_user_id": sessao.userID,
		"p_tipo":    tipo,
		"p_custo":   custo,
	}))
	var retorno struct {
		Ok             bool   `json:"ok"`
		Erro           string `json:"erro"`
		SemOuro        bool   `json:"sem_ouro"`
		EmEspera       bool   `json:"em_espera"`
		VidaCheia      bool   `json:"vida_cheia"`
		ManaCheia      bool   `json:"mana_cheia"`
		VidaRecuperada int    `json:"vida_recuperada"`
		VidaPerdida    int    `json:"vida_perdida"`
		Ouro           int    `json:"ouro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil || (!retorno.Ok && retorno.Erro == "") {
		log.Printf("[RPG] Falha ao recuperar Vida (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível recuperar agora.")
		return
	}
	if retorno.Erro != "" {
		status := http.StatusBadRequest
		if retorno.SemOuro || retorno.EmEspera || retorno.VidaCheia || retorno.ManaCheia {
			status = http.StatusConflict
		}
		responderErroJSON(w, status, retorno.Erro)
		return
	}

	maxima := equipamento.Atributos.Vida
	responderJSON(w, http.StatusOK, RespostaRecuperacao{
		Vida:           MontarVida(maxima, retorno.VidaPerdida),
		Ouro:           retorno.Ouro,
		VidaRecuperada: maxima * retorno.VidaRecuperada / perdaTotalPorMil,
	})
}
