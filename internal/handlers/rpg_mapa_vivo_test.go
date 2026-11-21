package handlers

import (
	"math/rand"
	"testing"
	"time"
)

func TestPortalDimensionalAtivoEm_AlternaEDevovleRegiaoValida(t *testing.T) {
	t1 := time.Date(2026, 11, 20, 12, 15, 0, 0, time.UTC)
	p1 := PortalDimensionalAtivoEm(t1)
	if p1.RegiaoID == "" || p1.Titulo == "" || p1.MinutosRestantes <= 0 {
		t.Fatalf("portal inválido em t1: %+v", p1)
	}

	t2 := t1.Add(2 * time.Hour)
	p2 := PortalDimensionalAtivoEm(t2)
	if p2.RegiaoID == p1.RegiaoID {
		t.Fatalf("esperava rotação de região em janela seguinte, manteve %s", p2.RegiaoID)
	}
}

func TestNormalizarEAplicarSelosDesafio(t *testing.T) {
	selos := NormalizarSelosDesafio([]string{"pressa_mortal", "invalido", "pressa_mortal", "sem_cura"})
	if len(selos) != 2 || selos[0] != "pressa_mortal" || selos[1] != "sem_cura" {
		t.Fatalf("normalização inesperada: %v", selos)
	}

	herois := []CombatenteRPG{{
		Atributos: AtributosRPG{Defesa: 100},
		Habilidades: []HabilidadeRPG{
			{ID: "golpe", Efeito: "golpe"},
			{ID: "curar", Efeito: efeitoCura},
		},
	}}
	monstro := MonstroRPG{Ataque: 100, Magia: 40}
	AplicarSelosNoCombate(herois, &monstro, selos)

	if herois[0].Atributos.Defesa != 80 {
		t.Fatalf("pressa_mortal deveria reduzir defesa para 80, veio %d", herois[0].Atributos.Defesa)
	}
	if monstro.Ataque != 115 {
		t.Fatalf("pressa_mortal deveria elevar ataque do monstro para 115, veio %d", monstro.Ataque)
	}
	if len(herois[0].Habilidades) != 1 || herois[0].Habilidades[0].ID != "golpe" {
		t.Fatalf("sem_cura deveria remover habilidades de cura: %+v", herois[0].Habilidades)
	}
}

func TestSortearMateriaisMapaVivo_PagaPortalESelos(t *testing.T) {
	rng := rand.New(rand.NewSource(33))
	if mat := SortearMateriaisMapaVivo(rng, false, true, 2); mat != nil {
		t.Fatalf("derrota não deve premiar materiais: %+v", mat)
	}
	mat := SortearMateriaisMapaVivo(rng, true, true, 2)
	total := 0
	for _, q := range mat {
		total += q
	}
	if total != 3 {
		t.Fatalf("esperava 3 materiais (1 portal + 2 selos), veio %d (%+v)", total, mat)
	}
}
