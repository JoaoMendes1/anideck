package handlers

import (
	"testing"
	"time"
)

func TestEventoEm_EstacoesDasTemporadas(t *testing.T) {
	casos := []struct {
		quando  time.Time
		estacao string
		id      string
		titulo  string
	}{
		{time.Date(2026, 1, 1, 1, 0, 0, 0, fusoGuilda), "Inverno", "arauto_inverno_2026", "Caçador do Inverno 2026"},
		{time.Date(2026, 5, 20, 12, 0, 0, 0, fusoGuilda), "Primavera", "arauto_primavera_2026", "Caçador do Primavera 2026"},
		{time.Date(2026, 8, 2, 12, 0, 0, 0, fusoGuilda), "Verão", "arauto_verao_2026", "Caçador do Verão 2026"},
		{time.Date(2026, 11, 17, 12, 0, 0, 0, fusoGuilda), "Outono", "arauto_outono_2026", "Caçador do Outono 2026"},
	}
	for _, c := range casos {
		e := EventoEm(c.quando)
		if e.Estacao != c.estacao || e.ID != c.id || e.Titulo != c.titulo {
			t.Errorf("%v: %+v", c.quando, e)
		}
	}
	if EventoEm(time.Date(2026, 11, 17, 12, 0, 0, 0, fusoGuilda)).Inicio != "2026-10-01" {
		t.Error("a temporada de outono começa em 1º de outubro")
	}
}

func TestMonstroDoEvento_EscalaPeloNivel(t *testing.T) {
	cat := catalogoParaMasmorras()
	e := EventoEm(time.Date(2026, 11, 17, 12, 0, 0, 0, fusoGuilda))
	no18 := MonstroDoEvento(e, 18, cat)
	if no18.Vida != 765 || no18.Ataque != 60 || no18.Defesa != 43 || no18.Elemento != "raio" {
		t.Errorf("no nível do golem, 85%% dos números dele: %+v", no18)
	}
	anterior := MonstroDoEvento(e, 1, cat)
	for nivel := 2; nivel <= 80; nivel++ {
		m := MonstroDoEvento(e, nivel, cat)
		if m.Vida < anterior.Vida || m.Ataque < anterior.Ataque {
			t.Fatalf("o arauto enfraqueceu do nível %d para o %d", nivel-1, nivel)
		}
		anterior = m
	}
}

// O arauto é vencível na maior parte das vezes em qualquer nível, sem ser trivial no fim.
func TestMonstroDoEvento_Equilibrio(t *testing.T) {
	cat := catalogoParaMasmorras()
	e := EventoEm(time.Date(2026, 11, 17, 12, 0, 0, 0, fusoGuilda))
	for _, nivel := range []int{10, 18, 26, 35, 50, 60} {
		for base, pb := range PersonagensBase() {
			j := jogadorDoElenco(base, nivel, itemDaFaixa(nivel))
			j.Elemento = pb.Elemento
			taxa := taxaDeVitoria(j, MonstroDoEvento(e, nivel, cat), 200)
			if taxa < 0.55 {
				t.Errorf("%s no nível %d venceu %.0f%% do arauto", base, nivel, taxa*100)
			}
		}
	}
}
