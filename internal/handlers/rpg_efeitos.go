package handlers

import "strings"

// Efeitos de status por elemento. Quem acerta um golpe pode deixar no alvo o efeito do
// próprio elemento: o herói pelo elemento do personagem, o monstro pelo dele. Cada elemento
// tem um efeito só, para o jogador aprender o que esperar de cada monstro pela cor.

// EfeitoDeElemento descreve o efeito para a tela (ficha do monstro e do herói).
type EfeitoDeElemento struct {
	ID        string `json:"id"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
}

const (
	efeitoQueimadura   = "queimadura"
	efeitoVeneno       = "veneno"
	efeitoSangramento  = "sangramento"
	efeitoAtordoamento = "atordoamento"
	efeitoCongelamento = "congelamento"
	efeitoRachadura    = "rachadura"
	efeitoOfuscamento  = "ofuscamento"
	efeitoDrenoDeEter  = "dreno_de_eter"
)

var efeitosDosElementos = map[string]EfeitoDeElemento{
	"fogo":   {efeitoQueimadura, "Queimadura", "Arde por 3 rodadas: a cada rodada, 20% do Ataque de quem aplicou, sem passar pela Defesa."},
	"trevas": {efeitoVeneno, "Veneno", "Acumula até 3 doses por 3 rodadas: a cada rodada, 10% do Ataque de quem aplicou por dose."},
	"vento":  {efeitoSangramento, "Sangramento", "Corta por 2 rodadas: a cada rodada, 25% do Ataque de quem aplicou."},
	"raio":   {efeitoAtordoamento, "Atordoamento", "O alvo perde a próxima ação. Chance menor, e não se repete logo em seguida."},
	"agua":   {efeitoCongelamento, "Congelamento", "O alvo causa 25% menos dano por 2 rodadas."},
	"terra":  {efeitoRachadura, "Armadura Rachada", "O alvo fica com 30% menos Defesa por 2 rodadas."},
	"luz":    {efeitoOfuscamento, "Ofuscamento", "O alvo tem 30% de chance de errar os golpes por 2 rodadas."},
	"eter":   {efeitoDrenoDeEter, "Dreno de Éter", "Rouba 10 de Éter do alvo para quem aplicou: menos habilidades e poderes para ele."},
}

// EfeitoDoElemento devolve o efeito do elemento; ok false para elemento neutro.
func EfeitoDoElemento(elemento string) (EfeitoDeElemento, bool) {
	e, ok := efeitosDosElementos[elemento]
	return e, ok
}

// Chances, em milésimos, de o golpe deixar o efeito. Habilidades e poderes pesam mais que o
// ataque comum; o atordoamento, que tira uma ação inteira, vale metade.
const (
	chanceEfeitoGolpe      = 200
	chanceEfeitoHabilidade = 350
	eterDrenado            = 10
	errarOfuscadoPorMil    = 300
)

// statusNaLuta é o que um lado carrega de efeitos durante a luta.
type statusNaLuta struct {
	queimadura, danoQueimadura   int // rodadas restantes e dano por rodada
	sangramento, danoSangramento int
	venenoDoses, venenoRodadas   int
	danoVenenoPorDose            int
	atordoado                    bool
	semAtordoar                  int // rodadas em que não pode ser atordoado de novo
	congelamento                 int
	rachadura                    int
	ofuscamento                  int
}

// tentarAplicar sorteia o efeito do elemento no alvo. ataque é o Ataque de quem aplicou, base
// dos efeitos de dano. Devolve o efeito aplicado, ou ok false. O Dreno de Éter é imediato e
// fica para quem chama (mexe no Éter dos dois lados).
func (s *statusNaLuta) tentarAplicar(rng interface{ Intn(int) int }, elemento string, ataque int, habilidade, doMonstro bool) (EfeitoDeElemento, bool) {
	ef, ok := efeitosDosElementos[elemento]
	if !ok {
		return ef, false
	}
	chance := chanceEfeitoGolpe
	if habilidade {
		chance = chanceEfeitoHabilidade
	}
	// O monstro aplica com 3/4 da chance: o efeito é antes uma arma do herói.
	if doMonstro {
		chance = chance * 3 / 4
	}
	if ef.ID == efeitoAtordoamento {
		if s.atordoado || s.semAtordoar > 0 {
			return ef, false
		}
		chance /= 2
	}
	if rng.Intn(1000) >= chance {
		return ef, false
	}
	switch ef.ID {
	case efeitoQueimadura:
		s.queimadura, s.danoQueimadura = 3, max(1, ataque/5)
	case efeitoVeneno:
		s.venenoDoses = min(3, s.venenoDoses+1)
		s.venenoRodadas, s.danoVenenoPorDose = 3, max(1, ataque/10)
	case efeitoSangramento:
		s.sangramento, s.danoSangramento = 2, max(1, ataque/4)
	case efeitoAtordoamento:
		s.atordoado = true
	case efeitoCongelamento:
		s.congelamento = 2
	case efeitoRachadura:
		s.rachadura = 2
	case efeitoOfuscamento:
		s.ofuscamento = 2
	}
	return ef, true
}

// perderVez consome o atordoamento: true quando o lado perde esta ação.
func (s *statusNaLuta) perderVez() bool {
	if !s.atordoado {
		return false
	}
	s.atordoado, s.semAtordoar = false, 2
	return true
}

// errou sorteia o golpe perdido pelo Ofuscamento.
func (s *statusNaLuta) errou(rng interface{ Intn(int) int }) bool {
	return s.ofuscamento > 0 && rng.Intn(1000) < errarOfuscadoPorMil
}

// danoCausado aplica o Congelamento ao dano que este lado causa.
func (s *statusNaLuta) danoCausado(dano int) int {
	if s.congelamento > 0 && dano > 0 {
		return max(1, dano*3/4)
	}
	return dano
}

// defesaEfetiva aplica a Armadura Rachada à Defesa deste lado.
func (s *statusNaLuta) defesaEfetiva(defesa int) int {
	if s.rachadura > 0 {
		return defesa * 7 / 10
	}
	return defesa
}

// fimDaRodada aplica o dano dos efeitos e passa uma rodada em todos. Devolve o dano e os
// nomes dos efeitos que doeram, para o registro da luta.
func (s *statusNaLuta) fimDaRodada() (int, string) {
	dano := 0
	var nomes []string
	if s.queimadura > 0 {
		dano += s.danoQueimadura
		nomes = append(nomes, efeitosDosElementos["fogo"].Nome)
		s.queimadura--
	}
	if s.venenoRodadas > 0 {
		dano += s.venenoDoses * s.danoVenenoPorDose
		nomes = append(nomes, efeitosDosElementos["trevas"].Nome)
		s.venenoRodadas--
		if s.venenoRodadas == 0 {
			s.venenoDoses = 0
		}
	}
	if s.sangramento > 0 {
		dano += s.danoSangramento
		nomes = append(nomes, efeitosDosElementos["vento"].Nome)
		s.sangramento--
	}
	for _, r := range []*int{&s.congelamento, &s.rachadura, &s.ofuscamento, &s.semAtordoar} {
		if *r > 0 {
			*r--
		}
	}
	return dano, strings.Join(nomes, " e ")
}
