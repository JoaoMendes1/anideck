package handlers

import (
	"fmt"
	"sort"
	"strings"
)

// conjuntoRPG é um conjunto de equipamentos: peças com o mesmo `conjunto` em rpg_itens
// (sql/121) dão bônus com 2 e com 4 peças em uso. O bônus de 4 soma ao de 2.
type conjuntoRPG struct {
	nome       string
	duasPecas  ItemRPG
	quatroPeca ItemRPG
}

// conjuntosRPG é a única fonte dos bônus: o banco guarda só o id do conjunto em cada item.
// Os bônus são atributos, como os dos itens, para o combate não precisar de regra nova.
var conjuntosRPG = map[string]conjuntoRPG{
	"glacial":   {nome: "Glacial", duasPecas: ItemRPG{Defesa: 6}, quatroPeca: ItemRPG{Velocidade: 5, CriticoPorMil: 40}},
	"carmesim":  {nome: "Carmesim", duasPecas: ItemRPG{Ataque: 8}, quatroPeca: ItemRPG{DanoCritico: 25}},
	"aurora":    {nome: "Aurora", duasPecas: ItemRPG{Vida: 80}, quatroPeca: ItemRPG{Vida: 120, Defesa: 10}},
	"sombrio":   {nome: "Sombrio", duasPecas: ItemRPG{EsquivaPorMil: 40}, quatroPeca: ItemRPG{CriticoPorMil: 60, Velocidade: 4}},
	"arcano":    {nome: "Arcano", duasPecas: ItemRPG{Magia: 10}, quatroPeca: ItemRPG{Magia: 20}},
	"silvestre": {nome: "Silvestre", duasPecas: ItemRPG{Vida: 60, EsquivaPorMil: 20}},
	"terra":     {nome: "Terra", duasPecas: ItemRPG{Defesa: 8}, quatroPeca: ItemRPG{Vida: 150, Defesa: 8}},
}

// ConjuntoEmUso é o que a tela mostra de um conjunto com ao menos uma peça em uso.
type ConjuntoEmUso struct {
	ID    string `json:"id"`
	Nome  string `json:"nome"`
	Pecas int    `json:"pecas"`
	// Bonus2 e Bonus4 descrevem cada faixa; Ativo2 e Ativo4 dizem se já valem.
	Bonus2 string `json:"bonus_2"`
	Bonus4 string `json:"bonus_4,omitempty"`
	Ativo2 bool   `json:"ativo_2"`
	Ativo4 bool   `json:"ativo_4"`
	// bonusAtivo é a soma das faixas que valem, para SomarAtributos.
	bonusAtivo ItemRPG
}

// ConjuntosEmUso conta as peças de cada conjunto entre os itens em uso. Conjunto que o Go
// não conhece é ignorado: o Admin pode digitar um id novo antes de o bônus existir.
func ConjuntosEmUso(itens []ItemRPG) []ConjuntoEmUso {
	pecas := map[string]int{}
	for _, i := range itens {
		if _, ok := conjuntosRPG[i.Conjunto]; ok {
			pecas[i.Conjunto]++
		}
	}
	saida := make([]ConjuntoEmUso, 0, len(pecas))
	for id, n := range pecas {
		c := conjuntosRPG[id]
		uso := ConjuntoEmUso{ID: id, Nome: c.nome, Pecas: n, Ativo2: n >= 2, Ativo4: n >= 4,
			Bonus2: DescreverBonus(c.duasPecas)}
		uso.Bonus4 = DescreverBonus(c.quatroPeca)
		if uso.Ativo2 {
			uso.bonusAtivo = somarBonus(uso.bonusAtivo, c.duasPecas)
		}
		if uso.Ativo4 {
			uso.bonusAtivo = somarBonus(uso.bonusAtivo, c.quatroPeca)
		}
		saida = append(saida, uso)
	}
	sort.Slice(saida, func(i, j int) bool { return saida[i].ID < saida[j].ID })
	return saida
}

func somarBonus(a, b ItemRPG) ItemRPG {
	a.Vida += b.Vida
	a.Ataque += b.Ataque
	a.Defesa += b.Defesa
	a.Magia += b.Magia
	a.Velocidade += b.Velocidade
	a.CriticoPorMil += b.CriticoPorMil
	a.DanoCritico += b.DanoCritico
	a.EsquivaPorMil += b.EsquivaPorMil
	return a
}

// DescreverBonus escreve o bônus como a tela mostra: "+8 Ataque · +4% Crítico". Bônus
// vazio devolve texto vazio.
func DescreverBonus(b ItemRPG) string {
	partes := []string{}
	add := func(v int, formato string, valor any) {
		if v > 0 {
			partes = append(partes, fmt.Sprintf(formato, valor))
		}
	}
	add(b.Vida, "+%d Vida", b.Vida)
	add(b.Ataque, "+%d Ataque", b.Ataque)
	add(b.Defesa, "+%d Defesa", b.Defesa)
	add(b.Magia, "+%d Magia", b.Magia)
	add(b.Velocidade, "+%d Velocidade", b.Velocidade)
	add(b.CriticoPorMil, "+%s Crítico", porMilEmTexto(b.CriticoPorMil))
	add(b.DanoCritico, "+%d%% Dano Crítico", b.DanoCritico)
	add(b.EsquivaPorMil, "+%s Esquiva", porMilEmTexto(b.EsquivaPorMil))
	return strings.Join(partes, " · ")
}

// porMilEmTexto escreve milésimos em porcento: 40 vira "4%", 15 vira "1,5%".
func porMilEmTexto(v int) string {
	if v%10 == 0 {
		return fmt.Sprintf("%d%%", v/10)
	}
	return fmt.Sprintf("%d,%d%%", v/10, v%10)
}
