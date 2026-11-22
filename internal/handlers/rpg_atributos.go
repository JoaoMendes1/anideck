package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// PrimariosRPG são os seis atributos de um isekai de fantasia. Nenhum é gravado pronto: o
// valor é a base do nível mais os pontos que o jogador distribuiu (rpg_atributos, sql/077).
type PrimariosRPG struct {
	Forca        int `json:"forca"`
	Inteligencia int `json:"inteligencia"`
	Constituicao int `json:"constituicao"`
	Agilidade    int `json:"agilidade"`
	Destreza     int `json:"destreza"`
	Sorte        int `json:"sorte"`
}

// Total soma os seis.
func (p PrimariosRPG) Total() int {
	return p.Forca + p.Inteligencia + p.Constituicao + p.Agilidade + p.Destreza + p.Sorte
}

// Somar junta dois conjuntos (base mais pontos).
func (p PrimariosRPG) Somar(o PrimariosRPG) PrimariosRPG {
	return PrimariosRPG{
		Forca:        p.Forca + o.Forca,
		Inteligencia: p.Inteligencia + o.Inteligencia,
		Constituicao: p.Constituicao + o.Constituicao,
		Agilidade:    p.Agilidade + o.Agilidade,
		Destreza:     p.Destreza + o.Destreza,
		Sorte:        p.Sorte + o.Sorte,
	}
}

// PontosDisponiveis é quantos pontos o nível dá: 2 a cada nível ganho (nível 1 = 0). A mesma
// conta está em rpg_distribuir_pontos (sql/126).
func PontosDisponiveis(nivel int) int {
	if nivel <= 1 {
		return 0
	}
	return (nivel - 1) * 2
}

// PrimariosBase é o que o nível dá sozinho ao Espadachim. Força e Constituição crescem um
// por nível; os outros, mais devagar.
func PrimariosBase(nivel int) PrimariosRPG {
	if nivel < 1 {
		nivel = 1
	}
	k := nivel - 1
	return PrimariosRPG{
		Forca:        5 + k,
		Inteligencia: 3 + k/2,
		Constituicao: 5 + k,
		Agilidade:    5 + k/2,
		Destreza:     5 + k/2,
		Sorte:        5 + k/4,
	}
}

// LimitarPontos corta o que passa do que o nível dá, quando o XP cai. Nada é apagado no
// banco; o corte vale só na leitura, tirando primeiro de Sorte e por último de Força.
func LimitarPontos(p PrimariosRPG, disponiveis int) PrimariosRPG {
	if disponiveis < 0 {
		disponiveis = 0
	}
	campos := []*int{&p.Sorte, &p.Destreza, &p.Agilidade, &p.Inteligencia, &p.Constituicao, &p.Forca}
	for _, c := range campos {
		if *c < 0 {
			*c = 0
		}
	}
	excesso := p.Total() - disponiveis
	for _, c := range campos {
		if excesso <= 0 {
			break
		}
		corte := min(*c, excesso)
		*c -= corte
		excesso -= corte
	}
	return p
}

// limiarPontosSemRetornoDecrescente define quantos pontos distribuídos num único
// atributo rendem 1:1 antes do retorno decrescente entrar em vigor.
const limiarPontosSemRetornoDecrescente = 60

// DerivarAtributos transforma nível e primários nos números de combate, sem os itens.
// Com os primários da base, Vida, Ataque e Defesa são os mesmos de antes do sql/077:
// 100+20k, 10+3k e 5+2k; pontos distribuídos acima do limiar seguem retorno decrescente.
func DerivarAtributos(nivel int, p PrimariosRPG) AtributosRPG {
	if nivel < 1 {
		nivel = 1
	}
	k := nivel - 1
	base := PrimariosBase(nivel)
	ajustar := func(total, baseVal int) int {
		extra := total - baseVal
		if extra <= limiarPontosSemRetornoDecrescente {
			return total
		}
		return baseVal + EscalarAtributo(extra, limiarPontosSemRetornoDecrescente)
	}
	efetivo := PrimariosRPG{
		Forca:        ajustar(p.Forca, base.Forca),
		Inteligencia: ajustar(p.Inteligencia, base.Inteligencia),
		Constituicao: ajustar(p.Constituicao, base.Constituicao),
		Agilidade:    ajustar(p.Agilidade, base.Agilidade),
		Destreza:     ajustar(p.Destreza, base.Destreza),
		Sorte:        ajustar(p.Sorte, base.Sorte),
	}
	a := AtributosRPG{
		Vida:          50 + efetivo.Constituicao*10 + k*10,
		Ataque:        efetivo.Forca*2 + k,
		Defesa:        efetivo.Constituicao + k,
		Magia:         efetivo.Inteligencia*2 + k,
		Eter:          10 + efetivo.Inteligencia,
		Velocidade:    efetivo.Agilidade + k/2,
		CriticoPorMil: min(400, 50+efetivo.Destreza*2),
		DanoCritico:   min(220, 150+efetivo.Destreza/2),
		EsquivaPorMil: min(250, efetivo.Agilidade*2),
		SorteItem:     min(10, efetivo.Sorte/5),
	}
	a.Poder = CalcularPoder(a)
	return a
}

// Tetos de Esquiva e Crítico com o bônus dos pontos (sql/131). Sem pontos, valem os tetos de
// DerivarAtributos (25% e 40%).
const (
	tetoEsquivaComPontos = 350
	tetoCriticoComPontos = 500
)

// AplicarBonusDosPontos soma o que os pontos distribuídos em Agilidade e Destreza dão além da
// conta da base: +0,5% de Esquiva e de Crítico por ponto, 0,7% no total. Com 2 pontos por
// nível, a 0,2% por ponto elas ficavam muito atrás da Força. Só os pontos ganham o extra: a
// base do nível continua a mesma, e com ela a calibração dos monstros e do chefe final.
func AplicarBonusDosPontos(a AtributosRPG, pontos PrimariosRPG) AtributosRPG {
	agiEfetiva := EscalarAtributo(pontos.Agilidade, limiarPontosSemRetornoDecrescente)
	desEfetiva := EscalarAtributo(pontos.Destreza, limiarPontosSemRetornoDecrescente)
	if agiEfetiva > 0 {
		a.EsquivaPorMil = min(tetoEsquivaComPontos, a.EsquivaPorMil+agiEfetiva*5)
	}
	if desEfetiva > 0 {
		a.CriticoPorMil = min(tetoCriticoComPontos, a.CriticoPorMil+desEfetiva*5)
	}
	a.Poder = CalcularPoder(a)
	return a
}

// ValidarDistribuicao confere os pontos antes de ir ao banco: nenhum negativo e o total
// dentro do que o nível dá. O banco confere de novo (rpg_distribuir_pontos), com o nível
// calculado lá.
func ValidarDistribuicao(p PrimariosRPG, nivel int) string {
	if p.Forca < 0 || p.Inteligencia < 0 || p.Constituicao < 0 || p.Agilidade < 0 || p.Destreza < 0 || p.Sorte < 0 {
		return "Pontos inválidos."
	}
	if disponiveis := PontosDisponiveis(nivel); p.Total() > disponiveis {
		return fmt.Sprintf("Você tem %d pontos para distribuir.", disponiveis)
	}
	return ""
}

// HandleDistribuirPontos grava a distribuição inteira (redistribuir é livre) e devolve o
// estado do jogo já com os novos atributos.
func (h *RPGHandler) HandleDistribuirPontos(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}

	var corpo struct {
		Forca          int    `json:"forca"`
		Inteligencia   int    `json:"inteligencia"`
		Constituicao   int    `json:"constituicao"`
		Agilidade      int    `json:"agilidade"`
		Destreza       int    `json:"destreza"`
		Sorte          int    `json:"sorte"`
		PersonagemBase string `json:"personagem_base"`
	}
	decodificador := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decodificador.DisallowUnknownFields()
	if err := decodificador.Decode(&corpo); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}
	pontos := PrimariosRPG{
		Forca:        corpo.Forca,
		Inteligencia: corpo.Inteligencia,
		Constituicao: corpo.Constituicao,
		Agilidade:    corpo.Agilidade,
		Destreza:     corpo.Destreza,
		Sorte:        corpo.Sorte,
	}
	// Antes do banco: recusa negativo sem gastar consulta.
	if msg := ValidarDistribuicao(pontos, 1<<20); msg != "" {
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	if msg := ValidarDistribuicao(pontos, sessao.nivel); msg != "" {
		responderErroJSON(w, http.StatusBadRequest, msg)
		return
	}

	baseAlvo := strings.TrimSpace(corpo.PersonagemBase)
	if baseAlvo != "" {
		desbloqueados := desbloqueadosNormalizados(sessao.ctx.linha)
		permitido := false
		for _, id := range desbloqueados {
			if id == baseAlvo {
				permitido = true
				break
			}
		}
		if !permitido {
			responderErroJSON(w, http.StatusBadRequest, "Desbloqueie este personagem antes de configurar os atributos dele.")
			return
		}
	} else if sessao.ctx.linha != nil {
		baseAlvo = sessao.ctx.linha.PersonagemBase
	}

	params := map[string]interface{}{
		"p_forca":        pontos.Forca,
		"p_inteligencia": pontos.Inteligencia,
		"p_constituicao": pontos.Constituicao,
		"p_agilidade":    pontos.Agilidade,
		"p_destreza":     pontos.Destreza,
		"p_sorte":        pontos.Sorte,
	}
	if baseAlvo != "" {
		params["p_base"] = baseAlvo
	}

	bruto := strings.TrimSpace(sessao.dbClient.Rpc("rpg_distribuir_pontos", "", params))
	erroDaRegra, falhou := lerRetornoRPG(bruto)
	if falhou {
		log.Printf("[RPG] Falha ao distribuir pontos (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível salvar os pontos agora.")
		return
	}
	if erroDaRegra != "" {
		responderErroJSON(w, http.StatusBadRequest, erroDaRegra)
		return
	}

	ctx, err := carregarContextoPersonagem(sessao.dbClient, sessao.userID)
	if err != nil || ctx.linha == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível salvar os pontos agora.")
		return
	}
	estado, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível salvar os pontos agora.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}
