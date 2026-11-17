package handlers

// Bestiário (sql/085): vencer o mesmo monstro várias vezes dá marcos, e cada marco dá mais Ouro
// nas vitórias contra ele. É um objetivo de longo prazo por monstro, sem tocar no XP e sem somar
// poder: a medição mostrou que +9% de dano já dobra a vitória contra o chefe final.

// marcosDoBestiario são as vitórias que abrem os marcos 1, 2 e 3.
var marcosDoBestiario = []int{10, 50, 150}

// bonusDeOuroPorMarco é o Ouro a mais, em porcento, por marco: até +30%. O mesmo número está
// em rpg_concluir_batalha (sql/085), que é quem concede o Ouro.
const bonusDeOuroPorMarco = 10

// MarcoDoBestiario converte vitórias em marco, de 0 a 3.
func MarcoDoBestiario(vitorias int) int {
	marco := 0
	for _, m := range marcosDoBestiario {
		if vitorias >= m {
			marco++
		}
	}
	return marco
}

// FaltamParaMarco diz quantas vitórias faltam para o próximo marco; 0 depois do último.
func FaltamParaMarco(vitorias int) int {
	for _, m := range marcosDoBestiario {
		if vitorias < m {
			return m - max(0, vitorias)
		}
	}
	return 0
}

// BonusDeOuroNoBestiario é o Ouro a mais, em porcento, contra um monstro com estas vitórias.
func BonusDeOuroNoBestiario(vitorias int) int {
	return MarcoDoBestiario(vitorias) * bonusDeOuroPorMarco
}

// BestiarioDoMonstro é o que a tela mostra de um monstro no bestiário.
type BestiarioDoMonstro struct {
	Vitorias    int `json:"vitorias"`
	Marco       int `json:"marco"`
	FaltamMarco int `json:"faltam_marco"`
	BonusOuro   int `json:"bonus_ouro"`
	// NovoMarco só vem na resposta da batalha: a vitória de agora abriu um marco.
	NovoMarco bool `json:"novo_marco,omitempty"`
}

// MontarBestiario monta a entrada de um monstro a partir das vitórias.
func MontarBestiario(vitorias int) BestiarioDoMonstro {
	vitorias = max(0, vitorias)
	return BestiarioDoMonstro{
		Vitorias:    vitorias,
		Marco:       MarcoDoBestiario(vitorias),
		FaltamMarco: FaltamParaMarco(vitorias),
		BonusOuro:   BonusDeOuroNoBestiario(vitorias),
	}
}
