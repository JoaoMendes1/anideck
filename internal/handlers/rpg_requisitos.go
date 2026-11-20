package handlers

import (
	"fmt"
	"sort"
	"strings"
)

// Requisitos de atributo para equipar. Eles saem dos números do próprio item, sem
// cadastro: cada atributo de combate pertence a um primário (Ataque à Força, Magia à
// Inteligência, Vida e Defesa à Constituição, Velocidade e Esquiva à Agilidade, Crítico e
// Dano crítico à Destreza). O primário mais forte do item vira o requisito principal; o
// segundo, quando pesa, vira o secundário. Assim um item novo do Admin já nasce com requisito,
// e uma armadura pede Constituição enquanto a arma pede Força: quem põe tudo num atributo só
// não veste o conjunto inteiro.

// fracaoDoRequisito é a parte dos pontos do nível do item que o requisito pede, além do que
// o nível já dá: principal e secundário, por raridade. Comum não pede nada.
var fracaoDoRequisito = map[string][2]float64{
	"raro":     {0.12, 0},
	"epico":    {0.18, 0.08},
	"lendario": {0.22, 0.10},
}

// primarioDoItem é o peso de cada primário nos números do item, em pontos equivalentes.
type primarioDoItem struct {
	campo string
	peso  float64
}

func pesosDoItem(item ItemRPG) []primarioDoItem {
	pesos := []primarioDoItem{
		{"forca", float64(item.Ataque) / 2},
		{"inteligencia", float64(item.Magia) / 2},
		{"constituicao", float64(item.Vida)/10 + float64(item.Defesa)/2},
		{"agilidade", float64(item.Velocidade) + float64(item.EsquivaPorMil)/7},
		{"destreza", float64(item.CriticoPorMil)/7 + float64(item.DanoCritico)/2},
	}
	sort.SliceStable(pesos, func(i, j int) bool { return pesos[i].peso > pesos[j].peso })
	return pesos
}

// RequisitosDoItem devolve o mínimo de cada primário para o item valer. Zero é sem requisito.
// Usa os números do catálogo (sem aprimoramento): aprimorar não deve trancar o item.
func RequisitosDoItem(item ItemRPG) PrimariosRPG {
	var req PrimariosRPG
	fracao, ok := fracaoDoRequisito[item.Raridade]
	if !ok {
		return req
	}
	nivel := max(1, item.NivelMinimo)
	base := PrimariosBase(nivel)
	pontos := float64(PontosDisponiveis(nivel))
	pesos := pesosDoItem(item)
	definir := func(campo string, extra int) {
		if extra < 1 {
			return
		}
		switch campo {
		case "forca":
			req.Forca = base.Forca + extra
		case "inteligencia":
			req.Inteligencia = base.Inteligencia + extra
		case "constituicao":
			req.Constituicao = base.Constituicao + extra
		case "agilidade":
			req.Agilidade = base.Agilidade + extra
		case "destreza":
			req.Destreza = base.Destreza + extra
		}
	}
	if pesos[0].peso <= 0 {
		return req
	}
	definir(pesos[0].campo, int(fracao[0]*pontos+0.5))
	// O secundário só entra quando pesa ao menos um terço do principal.
	if fracao[1] > 0 && pesos[1].peso >= pesos[0].peso/3 {
		definir(pesos[1].campo, int(fracao[1]*pontos+0.5))
	}
	return req
}

// nomesDosPrimarios na ordem da tela de atributos.
var nomesDosPrimarios = []struct {
	nome  string
	valor func(PrimariosRPG) int
}{
	{"Força", func(p PrimariosRPG) int { return p.Forca }},
	{"Inteligência", func(p PrimariosRPG) int { return p.Inteligencia }},
	{"Constituição", func(p PrimariosRPG) int { return p.Constituicao }},
	{"Agilidade", func(p PrimariosRPG) int { return p.Agilidade }},
	{"Destreza", func(p PrimariosRPG) int { return p.Destreza }},
}

// FaltaDeRequisito diz o que falta para o item valer, em texto para a tela ("Exige Força 30
// (você tem 25)"). Vazio é que o personagem cumpre tudo.
func FaltaDeRequisito(req, tem PrimariosRPG) string {
	var partes []string
	for _, p := range nomesDosPrimarios {
		if precisa := p.valor(req); precisa > 0 && p.valor(tem) < precisa {
			partes = append(partes, fmt.Sprintf("%s %d (você tem %d)", p.nome, precisa, p.valor(tem)))
		}
	}
	if len(partes) == 0 {
		return ""
	}
	return "Exige " + strings.Join(partes, " e ")
}

// temRequisito diz se o item pede algum atributo.
func temRequisito(req PrimariosRPG) bool {
	return req.Forca > 0 || req.Inteligencia > 0 || req.Constituicao > 0 || req.Agilidade > 0 || req.Destreza > 0
}
