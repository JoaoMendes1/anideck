package handlers

// Regras dinâmicas de combate (#347): crítico, esquiva, bloqueio, resistência, fúria,
// contra-ataque, sobrecarga de Éter e simulação de iniciativa ATB por Velocidade.
// Todas são funções puras para permitir auditoria, simulação determinística e testes.

// EstadoATB resume a ordem de iniciativa baseada na Velocidade de cada combatente.
type EstadoATB struct {
	VelocidadeJogador int      `json:"velocidade_jogador"`
	VelocidadeMonstro int      `json:"velocidade_monstro"`
	RitmoJogador      int      `json:"ritmo_jogador"`
	RitmoMonstro      int      `json:"ritmo_monstro"`
	AtbJogador        int      `json:"atb_jogador"`
	AtbMonstro        int      `json:"atb_monstro"`
	Primeiro          string   `json:"primeiro"`
	ProximaOrdem      []string `json:"proxima_ordem"`
}

// EscalarAtributo aplica retorno decrescente suave acima de um limiar, evitando que
// concentrar todos os pontos num único atributo torne builds híbridas inviáveis.
func EscalarAtributo(valor, limiar int) int {
	if valor <= limiar || limiar < 0 {
		return valor
	}
	excesso := valor - limiar
	if excesso <= 30 {
		return limiar + excesso*3/4
	}
	return limiar + 22 + (excesso-30)/2
}

// ChanceCriticoDinamica ajusta a chance base de crítico (em milésimos) pela diferença
// de Ataque contra Defesa e de Velocidade entre atacante e defensor.
func ChanceCriticoDinamica(basePorMil, ataque, defesaAlvo, velAtacante, velAlvo int) int {
	ajusteAtaque := max(-20, min(20, (ataque-defesaAlvo)/20))
	ajusteVel := max(-15, min(20, velAtacante-velAlvo))
	c := basePorMil + ajusteAtaque + ajusteVel
	if c < 20 {
		return 20
	}
	if c > 850 {
		return 850
	}
	return c
}

// ChanceEsquivaDinamica ajusta a esquiva base (em milésimos) pela diferença de Velocidade.
// Defensores com esquiva base zero só ganham chance mínima quando são muito mais rápidos.
func ChanceEsquivaDinamica(esquivaBase, velDefensor, velAtacante int) int {
	if esquivaBase >= 1000 {
		return 1000
	}
	diffVel := velDefensor - velAtacante
	if esquivaBase <= 0 {
		if diffVel <= 8 {
			return 0
		}
		return min(100, (diffVel-8)*6)
	}
	ajuste := max(-50, min(60, diffVel*2))
	e := esquivaBase + ajuste
	if e < 0 {
		return 0
	}
	if e > 500 {
		return 500
	}
	return e
}

// ChanceBloqueioDinamica calcula a chance (em milésimos) de o defensor aparar parcialmente
// um golpe físico ou mágico quando sua Defesa acompanha o Ataque do atacante.
func ChanceBloqueioDinamica(defesaDefensor, ataqueAtacante int) int {
	if defesaDefensor <= 0 || ataqueAtacante <= 0 {
		return 0
	}
	limiar := ataqueAtacante * 48 / 100
	if defesaDefensor <= limiar {
		return 0
	}
	return min(110, (defesaDefensor-limiar)*3/2)
}

// ResistenciaElementalPorMil deriva a resistência a efeitos e desvantagens elementais
// a partir de Defesa e Magia do combatente (0 a 160 em milésimos).
func ResistenciaElementalPorMil(defesa, magia int) int {
	if defesa < 0 {
		defesa = 0
	}
	if magia < 0 {
		magia = 0
	}
	return min(160, defesa/5+magia/4)
}

// BonusFuria retorna o multiplicador de ataque concedido pela Fúria quando a Vida cai.
func BonusFuria(vidaAtual, vidaMax int) float64 {
	if vidaMax <= 0 || vidaAtual <= 0 {
		return 1.0
	}
	pct := vidaAtual * 100 / vidaMax
	switch {
	case pct <= 25:
		return 1.08
	case pct <= 45:
		return 1.04
	default:
		return 1.0
	}
}

// DanoContraAtaque calcula o dano devolvido ao atacante quando o defensor executa um
// contra-ataque após defender ou esquivar.
func DanoContraAtaque(ataqueDefensor, defesaAtacante int) int {
	return max(1, int(CalcularDano(ataqueDefensor, defesaAtacante)*0.45+0.5))
}

// CustoEterComSobrecarga define quanto Éter uma habilidade consome e o bônus de potência
// quando o combatente tem reserva abundante de Éter e Magia.
func CustoEterComSobrecarga(eterAtual, custoBase, magia int) (int, float64) {
	if custoBase <= 0 {
		return 0, 1.0
	}
	if eterAtual >= custoBase+10 && magia >= 20 {
		extra := min(4, max(2, magia/25))
		if eterAtual >= custoBase+extra {
			return custoBase + extra, 1.10
		}
	}
	return custoBase, 1.0
}

// CalcularIniciativaATB simula uma barra de ATB (0..100) pela Velocidade de cada lado e
// devolve o ritmo relativo e a ordem prevista dos próximos 6 turnos.
func CalcularIniciativaATB(velJogador, velMonstro int) EstadoATB {
	rj := max(5, velJogador+5)
	rm := max(5, velMonstro+5)
	primeiro := "jogador"
	if velMonstro > velJogador {
		primeiro = "monstro"
	}

	ordem := make([]string, 0, 6)
	simJ, simM := 0, 0
	for len(ordem) < 6 {
		simJ += rj
		simM += rm
		for (simJ >= 100 || simM >= 100) && len(ordem) < 6 {
			if simJ >= 100 && (simJ >= simM || simM < 100) {
				ordem = append(ordem, "jogador")
				simJ -= 100
			} else if simM >= 100 {
				ordem = append(ordem, "monstro")
				simM -= 100
			}
		}
	}
	atbJ := min(100, rj*100/max(1, max(rj, rm)))
	atbM := min(100, rm*100/max(1, max(rj, rm)))

	return EstadoATB{
		VelocidadeJogador: velJogador,
		VelocidadeMonstro: velMonstro,
		RitmoJogador:      rj,
		RitmoMonstro:      rm,
		AtbJogador:        atbJ,
		AtbMonstro:        atbM,
		Primeiro:          primeiro,
		ProximaOrdem:      ordem,
	}
}
