package handlers

// Maestria (sql/084): cada habilidade comum usada em batalha soma usos, e os usos dão graus.
// É evolução que vem do próprio combate, sem tocar no XP dos animes. A habilidade única não
// tem maestria: já é a mais forte e dispara uma vez por luta.

// marcosDeMaestria são os usos que abrem os graus II, III e IV. O grau I é o de partida.
var marcosDeMaestria = []int{20, 60, 150}

// bonusPorGrauDeMaestria é a força somada a cada grau acima do I: +2%, até +6% no IV. É pouco
// de propósito: o combate é sensível, e o teste de progressão confere o caso com tudo no máximo.
const bonusPorGrauDeMaestria = 0.02

// GrauDeMaestria converte usos em grau, de 1 a 4.
func GrauDeMaestria(usos int) int {
	grau := 1
	for _, marco := range marcosDeMaestria {
		if usos >= marco {
			grau++
		}
	}
	return grau
}

// FaltamParaMaestria diz quantos usos faltam para o próximo grau; 0 no último.
func FaltamParaMaestria(usos int) int {
	for _, marco := range marcosDeMaestria {
		if usos < marco {
			return marco - max(0, usos)
		}
	}
	return 0
}

// AplicarMaestria marca os usos e o grau de cada habilidade comum e multiplica a força dela
// (Fator e Fator2: dano, cura e Magia) pelo grau. Devolve uma cópia; o livro do catálogo não
// muda.
func AplicarMaestria(livro []HabilidadeRPG, usos map[string]int) []HabilidadeRPG {
	saida := make([]HabilidadeRPG, len(livro))
	copy(saida, livro)
	for i := range saida {
		h := &saida[i]
		if h.Tipo != "comum" {
			continue
		}
		h.Usos = max(0, usos[h.ID])
		h.Maestria = GrauDeMaestria(h.Usos)
		h.FaltamMaestria = FaltamParaMaestria(h.Usos)
		mult := 1 + bonusPorGrauDeMaestria*float64(h.Maestria-1)
		h.Fator *= mult
		h.Fator2 *= mult
	}
	return saida
}
