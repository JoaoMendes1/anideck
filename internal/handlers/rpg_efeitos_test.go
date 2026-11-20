package handlers

import (
	"math/rand"
	"testing"
)

// rngFixo sempre sorteia o mesmo número: 0 aplica tudo, 999 não aplica nada.
type rngFixo int

func (r rngFixo) Intn(int) int { return int(r) }

func TestEfeitos_DanoPorRodada(t *testing.T) {
	var s statusNaLuta
	if _, ok := s.tentarAplicar(rngFixo(999), "fogo", 100, true, false); ok {
		t.Fatal("sorteio alto não aplica")
	}
	if ef, ok := s.tentarAplicar(rngFixo(0), "fogo", 100, false, false); !ok || ef.Nome != "Queimadura" {
		t.Fatalf("fogo deveria queimar: %+v", ef)
	}
	total := 0
	for range 4 {
		d, _ := s.fimDaRodada()
		total += d
	}
	if total != 3*20 {
		t.Errorf("Queimadura: 3 rodadas de 20%% do Ataque, deu %d", total)
	}

	var v statusNaLuta
	for range 4 {
		v.tentarAplicar(rngFixo(0), "trevas", 100, false, false)
	}
	if d, nomes := v.fimDaRodada(); d != 3*10 || nomes != "Veneno" {
		t.Errorf("Veneno acumula até 3 doses de 10%%: %d %q", d, nomes)
	}
}

func TestEfeitos_Atordoamento(t *testing.T) {
	var s statusNaLuta
	s.tentarAplicar(rngFixo(0), "raio", 100, false, false)
	if !s.perderVez() || s.perderVez() {
		t.Fatal("atordoado perde uma ação só")
	}
	if _, ok := s.tentarAplicar(rngFixo(0), "raio", 100, false, false); ok {
		t.Error("não pode ser atordoado de novo logo em seguida")
	}
	s.fimDaRodada()
	s.fimDaRodada()
	if _, ok := s.tentarAplicar(rngFixo(0), "raio", 100, false, false); !ok {
		t.Error("depois de duas rodadas, pode de novo")
	}
	// Chance pela metade: 99 aplicaria Queimadura (200), mas não Atordoamento (100).
	var c statusNaLuta
	if _, ok := c.tentarAplicar(rngFixo(120), "raio", 100, false, false); ok {
		t.Error("Atordoamento tem metade da chance")
	}
}

func TestEfeitos_Modificadores(t *testing.T) {
	var s statusNaLuta
	s.tentarAplicar(rngFixo(0), "agua", 100, false, false)
	s.tentarAplicar(rngFixo(0), "terra", 100, false, false)
	if s.danoCausado(100) != 75 || s.defesaEfetiva(100) != 70 {
		t.Errorf("Congelamento -25%% de dano e Rachadura -30%% de Defesa: %d, %d", s.danoCausado(100), s.defesaEfetiva(100))
	}
	s.fimDaRodada()
	s.fimDaRodada()
	if s.danoCausado(100) != 100 || s.defesaEfetiva(100) != 100 {
		t.Error("os dois duram 2 rodadas")
	}
	s.tentarAplicar(rngFixo(0), "luz", 100, false, false)
	if !s.errou(rngFixo(0)) || s.errou(rngFixo(500)) {
		t.Error("Ofuscamento erra 30% dos golpes")
	}
	// O monstro aplica com 3/4 da chance: 160 passa para o herói (200) e não para ele (150).
	var m statusNaLuta
	if _, ok := m.tentarAplicar(rngFixo(160), "fogo", 100, false, true); ok {
		t.Error("o monstro tem chance menor")
	}
	if _, ok := EfeitoDoElemento(""); ok {
		t.Error("neutro não tem efeito")
	}
}

// Numa luta longa, o herói de Fogo deixa Queimadura e ela aparece no registro.
func TestEfeitos_NaLuta(t *testing.T) {
	jogador := combatente(30, AtributosRPG{Vida: 900, Ataque: 60, Defesa: 30, Eter: 40})
	jogador.Elemento = "fogo"
	monstro := monstroDoNivel(30, "raro", 2000, 50, 30)
	aplicou, doeu := false, false
	for semente := int64(0); semente < 30 && !(aplicou && doeu); semente++ {
		for _, tu := range SimularBatalha(jogador, monstro, rand.New(rand.NewSource(semente))).Turnos {
			if tu.Atacante == "jogador" && tu.Efeito == "Queimadura" {
				aplicou = true
			}
			if tu.Atacante == "jogador" && tu.Tique != "" && tu.Dano > 0 {
				doeu = true
			}
		}
	}
	if !aplicou || !doeu {
		t.Errorf("a Queimadura deveria aparecer aplicada (%v) e doendo (%v)", aplicou, doeu)
	}
}
