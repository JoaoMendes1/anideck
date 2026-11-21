package handlers

import "testing"

func TestBuscarReacaoElemental_SimetricaESemNeutro(t *testing.T) {
	r1, ok1 := BuscarReacaoElemental("fogo", "agua")
	r2, ok2 := BuscarReacaoElemental("agua", "fogo")
	if !ok1 || !ok2 || r1.ID != "vaporizacao" || r2.ID != r1.ID {
		t.Fatalf("esperava Vaporização simétrica, obtido (%v,%v) (%v,%v)", ok1, r1, ok2, r2)
	}

	if _, ok := BuscarReacaoElemental("fogo", "fogo"); ok {
		t.Error("elementos iguais não deveriam reagir")
	}
	if _, ok := BuscarReacaoElemental("neutro", "fogo"); ok {
		t.Error("elemento neutro não deveria reagir")
	}

	// Todos os 7 personagens jogáveis combinados aos pares devem produzir uma reação válida.
	jogaveis := make([]string, 0, len(PersonagensBase()))
	for _, p := range PersonagensBase() {
		jogaveis = append(jogaveis, p.Elemento)
	}
	for i := 0; i < len(jogaveis); i++ {
		for j := i + 1; j < len(jogaveis); j++ {
			if r, ok := BuscarReacaoElemental(jogaveis[i], jogaveis[j]); !ok || r.Nome == "" || r.BonusDanoPct <= 0 {
				t.Errorf("par (%s, %s) deveria gerar reação válida: ok=%v %+v", jogaveis[i], jogaveis[j], ok, r)
			}
		}
	}
}
