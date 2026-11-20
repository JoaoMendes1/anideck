package handlers

import "math/rand"

// Luta em grupo: até três heróis contra o mesmo monstro. Cada herói tem a sua
// lutaEmAndamento (Vida, Éter, recargas, habilidade única); todas apontam para o mesmo
// estadoDoMonstro e escrevem no mesmo diário, com o campo Heroi dizendo quem agiu.

const (
	// MaxHeroisNoGrupo conta o líder.
	MaxHeroisNoGrupo = 3
	// vidaExtraPorHeroiPct: cada herói a mais dá ao monstro 60% da Vida dele, para o grupo
	// não transformar todo monstro em luta fácil.
	vidaExtraPorHeroiPct = 60
)

// HeroiNoResultado é o que a luta deixou para um herói do grupo.
type HeroiNoResultado struct {
	VidaInicial int  `json:"vida_inicial"`
	VidaFinal   int  `json:"vida_final"`
	VidaMaxima  int  `json:"vida_maxima"`
	Caiu        bool `json:"caiu"`
	// Fora: o herói já tinha caído num andar anterior da masmorra e não lutou.
	Fora bool           `json:"fora,omitempty"`
	Usos map[string]int `json:"-"`
}

// ResultadoEmGrupo é a luta inteira, para a tela reproduzir e para gravar a de cada um.
type ResultadoEmGrupo struct {
	Venceu      bool               `json:"venceu"`
	Rodadas     int                `json:"rodadas"`
	Turnos      []TurnoBatalha     `json:"turnos"`
	Herois      []HeroiNoResultado `json:"herois"`
	VidaMonstro int                `json:"vida_monstro"`
}

// MonstroParaGrupo aumenta a Vida do monstro pelo tamanho do grupo.
func MonstroParaGrupo(m MonstroRPG, herois int) MonstroRPG {
	if herois > 1 {
		m.Vida = m.Vida * (100 + vidaExtraPorHeroiPct*(herois-1)) / 100
	}
	return m
}

// SimularBatalhaEmGrupo resolve a luta do grupo. A Vida do monstro já vem ajustada (use
// MonstroParaGrupo). Em cada rodada, os heróis mais rápidos que o monstro agem antes dele,
// os outros depois; o monstro ataca um herói de pé sorteado. O grupo vence quando o monstro
// cai e perde quando todos caem ou o tempo acaba.
func SimularBatalhaEmGrupo(herois []CombatenteRPG, monstro MonstroRPG, rng *rand.Rand) ResultadoEmGrupo {
	return simularGrupo(herois, nil, monstro, rng)
}

// simularGrupo aceita a lista de quem está fora (caído antes, na masmorra).
func simularGrupo(herois []CombatenteRPG, fora []bool, monstro MonstroRPG, rng *rand.Rand) ResultadoEmGrupo {
	EnriquecerMonstro(&monstro)
	diario := make([]TurnoBatalha, 0, maxTurnosBatalha*len(herois)*2)
	mon := &estadoDoMonstro{vida: monstro.Vida, eter: monstro.Eter, usosPoder: map[string]int{}}
	lutas := make([]*lutaEmAndamento, len(herois))
	res := ResultadoEmGrupo{Herois: make([]HeroiNoResultado, len(herois)), VidaMonstro: monstro.Vida}
	for i, h := range herois {
		aplicarPostura(&h)
		vida := h.Atributos.Vida
		if h.VidaInicial > 0 && h.VidaInicial < vida {
			vida = h.VidaInicial
		}
		if i < len(fora) && fora[i] {
			vida = 0
			res.Herois[i].Fora = true
		}
		lutas[i] = &lutaEmAndamento{
			j: h, m: monstro, mon: mon, rng: rng,
			vidaJogador: vida,
			eter:        h.Atributos.Eter,
			recargas:    map[string]int{},
			usos:        map[string]int{},
			diario:      &diario,
			heroi:       i + 1,
		}
		res.Herois[i].VidaInicial = vida
		res.Herois[i].VidaMaxima = h.Atributos.Vida
	}

	vivos := func() []*lutaEmAndamento {
		var v []*lutaEmAndamento
		for _, l := range lutas {
			if l.vidaJogador > 0 {
				v = append(v, l)
			}
		}
		return v
	}
	fim := func(venceu bool, rodadas int) ResultadoEmGrupo {
		res.Venceu, res.Rodadas, res.Turnos = venceu, rodadas, diario
		for i, l := range lutas {
			res.Herois[i].VidaFinal = l.vidaJogador
			res.Herois[i].Caiu = !res.Herois[i].Fora && l.vidaJogador == 0
			res.Herois[i].Usos = l.usos
		}
		return res
	}
	if len(vivos()) == 0 {
		return fim(false, 0)
	}

	// vezDosHerois faz agir os heróis de pé do lado indicado (antes ou depois do monstro).
	vezDosHerois := func(antes bool) bool {
		for _, l := range lutas {
			if l.vidaJogador == 0 || (l.j.Atributos.Velocidade >= monstro.Velocidade) != antes {
				continue
			}
			if l.vezDoJogador() {
				return true
			}
		}
		return false
	}

	for rodada := 1; rodada <= maxTurnosBatalha; rodada++ {
		mon.rodada = rodada
		if vezDosHerois(true) {
			return fim(true, rodada)
		}
		de := vivos()
		de[rng.Intn(len(de))].vezDoMonstro()
		if len(vivos()) == 0 {
			return fim(false, rodada)
		}
		if vezDosHerois(false) {
			return fim(true, rodada)
		}
		// Efeitos no fim da rodada: os do monstro uma vez (o estado dele é um só), os de cada
		// herói de pé.
		if v := vivos(); len(v) > 0 && v[0].efeitosNoMonstro() {
			return fim(true, rodada)
		}
		for _, l := range lutas {
			if l.vidaJogador > 0 {
				l.efeitosNoHeroi()
			}
		}
		if len(vivos()) == 0 {
			return fim(false, rodada)
		}
		for _, l := range lutas {
			if l.vidaJogador == 0 {
				continue
			}
			l.eter = min(l.j.Atributos.Eter, l.eter+eterPorRodada)
			if l.rodadasReducao > 0 {
				l.rodadasReducao--
			}
			for id, r := range l.recargas {
				if r > 0 {
					l.recargas[id] = r - 1
				}
			}
		}
		if mon.rodadasEscudo > 0 {
			mon.rodadasEscudo--
		}
		if monstro.Eter > 0 {
			mon.eter = min(monstro.Eter, mon.eter+eterPorRodada)
		}
	}
	return fim(false, maxTurnosBatalha)
}

// AndarEmGrupo é um andar da masmorra jogado pelo grupo.
type AndarEmGrupo struct {
	Monstro   MonstroRPG       `json:"monstro"`
	Resultado ResultadoEmGrupo `json:"resultado"`
}

// MasmorraEmGrupo é a masmorra inteira do grupo.
type MasmorraEmGrupo struct {
	Andares   []AndarEmGrupo     `json:"andares"`
	Vencidos  []string           `json:"vencidos"`
	Completou bool               `json:"completou"`
	Herois    []HeroiNoResultado `json:"herois"`
}

// SimularMasmorraEmGrupo encadeia os andares: a Vida de cada herói passa de um andar para o
// outro, com a mesma cura entre andares da masmorra solo para quem está de pé; quem cai fica
// fora até o fim. O grupo para no primeiro andar perdido.
func SimularMasmorraEmGrupo(herois []CombatenteRPG, monstros []MonstroRPG, rng *rand.Rand) MasmorraEmGrupo {
	r := MasmorraEmGrupo{Herois: make([]HeroiNoResultado, len(herois))}
	vida := make([]int, len(herois))
	fora := make([]bool, len(herois))
	usos := make([]map[string]int, len(herois))
	for i, h := range herois {
		vida[i] = h.Atributos.Vida
		if h.VidaInicial > 0 && h.VidaInicial < vida[i] {
			vida[i] = h.VidaInicial
		}
		r.Herois[i] = HeroiNoResultado{VidaInicial: vida[i], VidaMaxima: h.Atributos.Vida}
		usos[i] = map[string]int{}
	}
	fechar := func() MasmorraEmGrupo {
		for i := range herois {
			r.Herois[i].VidaFinal = vida[i]
			r.Herois[i].Caiu = fora[i]
			r.Herois[i].Usos = usos[i]
		}
		return r
	}
	for andar, m := range monstros {
		copia := make([]CombatenteRPG, len(herois))
		for i, h := range herois {
			if andar > 0 && !fora[i] {
				vida[i] = min(h.Atributos.Vida, vida[i]+h.Atributos.Vida*curaEntreAndaresPct/100)
			}
			copia[i] = h
			copia[i].VidaInicial = vida[i]
		}
		res := simularGrupo(copia, fora, MonstroParaGrupo(m, len(herois)), rng)
		r.Andares = append(r.Andares, AndarEmGrupo{Monstro: m, Resultado: res})
		for i, h := range res.Herois {
			if h.Fora {
				continue
			}
			vida[i] = h.VidaFinal
			if h.VidaFinal == 0 {
				fora[i] = true
			}
			for id, n := range h.Usos {
				usos[i][id] += n
			}
		}
		if !res.Venceu {
			return fechar()
		}
		r.Vencidos = append(r.Vencidos, m.ID)
	}
	r.Completou = true
	return fechar()
}
