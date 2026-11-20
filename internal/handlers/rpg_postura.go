package handlers

import "strings"

// Postura é a decisão do jogador antes da luta. O combate continua automático; a postura muda
// os números e o momento de se curar, e cada uma rende mais contra um tipo de monstro: a
// Agressiva acaba logo com quem se protege ou se cura, a Defensiva aguenta quem bate forte.
const (
	posturaEquilibrada = "equilibrada"
	posturaAgressiva   = "agressiva"
	posturaDefensiva   = "defensiva"
)

// PosturaValida normaliza a escolha; qualquer outra coisa vira a Equilibrada.
func PosturaValida(p string) string {
	switch strings.ToLower(strings.TrimSpace(p)) {
	case posturaAgressiva:
		return posturaAgressiva
	case posturaDefensiva:
		return posturaDefensiva
	}
	return posturaEquilibrada
}

// aplicarPostura ajusta os atributos do herói para a luta.
// Agressiva: +12% de Ataque e Magia, -30% de Defesa. Defensiva: +25% de Defesa, -8% de
// Ataque e Magia. Calibradas para empatar na média: a escolha vale pelo monstro, não sozinha.
func aplicarPostura(c *CombatenteRPG) {
	a := &c.Atributos
	switch PosturaValida(c.Postura) {
	case posturaAgressiva:
		a.Ataque = a.Ataque * 112 / 100
		a.Magia = a.Magia * 112 / 100
		a.Defesa = a.Defesa * 70 / 100
	case posturaDefensiva:
		a.Defesa = a.Defesa * 125 / 100
		a.Ataque = a.Ataque * 92 / 100
		a.Magia = a.Magia * 92 / 100
	}
}

// Respostas da postura ao que o monstro faz, para a escolha depender da ficha dele:
// a Agressiva quebra a guarda (o escudo do monstro absorve metade) e a Defensiva resiste
// (os efeitos do monstro pegam com metade da chance e os críticos dele doem menos).
func escudoContraPostura(escudo float64, postura string) float64 {
	if PosturaValida(postura) == posturaAgressiva {
		return escudo / 2
	}
	return escudo
}

func resisteAEfeito(postura string, rng interface{ Intn(int) int }) bool {
	return PosturaValida(postura) == posturaDefensiva && rng.Intn(2) == 0
}

func multCriticoContraPostura(mult float64, postura string) float64 {
	if PosturaValida(postura) == posturaDefensiva && mult > 1.25 {
		return mult - 0.25
	}
	return mult
}

// limiarDeCuraPct é a Vida, em porcentagem, abaixo da qual o herói usa a habilidade de cura.
// A Agressiva segura a cura para o fim; a Defensiva se cura cedo.
func limiarDeCuraPct(postura string) int {
	switch PosturaValida(postura) {
	case posturaAgressiva:
		return 30
	case posturaDefensiva:
		return 65
	}
	return 50
}
