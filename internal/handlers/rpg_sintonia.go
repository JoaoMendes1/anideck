package handlers

// Sintonia elemental: o item do mesmo elemento do personagem rende mais, e quem junta várias
// peças do próprio elemento ganha a Ressonância. Item sem elemento (neutro) nunca entra.
const (
	// Quanto a peça em sintonia rende a mais, em porcento, em todos os atributos dela.
	bonusSintoniaPct = 15
	// Peças em sintonia, em uso, para a Ressonância.
	pecasDaRessonancia = 4
	// A Ressonância soma esta porcentagem à Vida, ao Ataque e à Magia totais.
	bonusRessonanciaPct = 5
)

// ElementoDoPersonagem devolve o elemento do personagem; desconhecido é o do padrão.
func ElementoDoPersonagem(personagemBase string) string {
	base, ok := PersonagensBase()[personagemBase]
	if !ok {
		base = PersonagensBase()[personagemBasePadrao]
	}
	return base.Elemento
}

// EmSintonia diz se o item é do mesmo elemento do personagem.
func EmSintonia(item ItemRPG, elemento string) bool {
	return item.Elemento != "" && item.Elemento != "neutro" && item.Elemento == elemento
}

// AplicarSintonia devolve o item com os atributos aumentados, se estiver em sintonia.
// Arredonda para o inteiro mais próximo, como o aprimoramento.
func AplicarSintonia(item ItemRPG, elemento string) ItemRPG {
	if !EmSintonia(item, elemento) {
		return item
	}
	mais := func(v int) int { return (v*(100+bonusSintoniaPct) + 50) / 100 }
	item.Vida, item.Ataque, item.Defesa, item.Magia = mais(item.Vida), mais(item.Ataque), mais(item.Defesa), mais(item.Magia)
	item.Velocidade, item.CriticoPorMil = mais(item.Velocidade), mais(item.CriticoPorMil)
	item.DanoCritico, item.EsquivaPorMil = mais(item.DanoCritico), mais(item.EsquivaPorMil)
	return item
}

// AplicarRessonancia soma o bônus da Ressonância ao total, quando há peças suficientes.
func AplicarRessonancia(total AtributosRPG, pecasEmSintonia int) AtributosRPG {
	if pecasEmSintonia < pecasDaRessonancia {
		return total
	}
	total.Vida += (total.Vida*bonusRessonanciaPct + 50) / 100
	total.Ataque += (total.Ataque*bonusRessonanciaPct + 50) / 100
	total.Magia += (total.Magia*bonusRessonanciaPct + 50) / 100
	total.Poder = CalcularPoder(total)
	return total
}
