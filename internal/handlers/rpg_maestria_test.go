package handlers

import (
	"math"
	"math/rand"
	"testing"
)

func TestGrauDeMaestria(t *testing.T) {
	casos := []struct{ usos, grau, faltam int }{
		{0, 1, 20}, {-5, 1, 20}, {19, 1, 1}, {20, 2, 40}, {59, 2, 1}, {60, 3, 90}, {149, 3, 1}, {150, 4, 0}, {9999, 4, 0},
	}
	for _, c := range casos {
		if g := GrauDeMaestria(c.usos); g != c.grau {
			t.Errorf("GrauDeMaestria(%d) = %d; queria %d", c.usos, g, c.grau)
		}
		if f := FaltamParaMaestria(c.usos); f != c.faltam {
			t.Errorf("FaltamParaMaestria(%d) = %d; queria %d", c.usos, f, c.faltam)
		}
	}
}

func TestAplicarMaestria(t *testing.T) {
	livro := LivroDeHabilidades(personagemBasePadrao, 60)
	var comum *HabilidadeRPG
	for i := range livro {
		if livro[i].Tipo == "comum" {
			comum = &livro[i]
			break
		}
	}
	if comum == nil {
		t.Fatal("o livro deveria ter habilidades comuns")
	}
	original := *comum
	com := AplicarMaestria(livro, map[string]int{original.ID: 150})

	for _, h := range com {
		switch {
		case h.Tipo == "unica":
			if h.Maestria != 0 || h.Usos != 0 {
				t.Errorf("a única não tem maestria: %+v", h)
			}
		case h.ID == original.ID:
			if h.Maestria != 4 || h.Usos != 150 || h.FaltamMaestria != 0 {
				t.Errorf("grau IV com 150 usos: %+v", h)
			}
			if math.Abs(h.Fator-original.Fator*1.06) > 1e-9 || math.Abs(h.Fator2-original.Fator2*1.06) > 1e-9 {
				t.Errorf("grau IV soma 6%%: %v -> %v", original.Fator, h.Fator)
			}
		default:
			if h.Maestria != 1 || h.FaltamMaestria != 20 {
				t.Errorf("sem usos é grau I: %+v", h)
			}
		}
	}
	if livro[0].Fator != LivroDeHabilidades(personagemBasePadrao, 60)[0].Fator {
		t.Error("AplicarMaestria não pode mudar o livro recebido")
	}
}

func TestSimularBatalha_ContaUsosDasComuns(t *testing.T) {
	jogador := jogadorDoElenco(personagemBasePadrao, 30, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	r := SimularBatalha(jogador, monstroDoNivel(30, "chefe", 2000, 130, 70), rand.New(rand.NewSource(3)))
	total := 0
	for id, n := range r.Usos {
		total += n
		achou := false
		for _, h := range jogador.Habilidades {
			if h.ID == id {
				achou = true
				if h.Tipo != "comum" {
					t.Errorf("só as comuns contam: %s", id)
				}
			}
		}
		if !achou {
			t.Errorf("uso de habilidade que o jogador não tem: %s", id)
		}
	}
	usadas := 0
	for _, turno := range r.Turnos {
		if turno.Atacante == "jogador" && turno.Habilidade != "" {
			usadas++
		}
	}
	if total == 0 || total > usadas {
		t.Errorf("usos contados %d, turnos com habilidade %d", total, usadas)
	}
}
