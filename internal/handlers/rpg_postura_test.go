package handlers

import (
	"math/rand"
	"testing"
)

func TestPostura_Regras(t *testing.T) {
	if PosturaValida(" Agressiva ") != posturaAgressiva || PosturaValida("x") != posturaEquilibrada || PosturaValida("") != posturaEquilibrada {
		t.Error("normalização da postura")
	}
	c := CombatenteRPG{Atributos: AtributosRPG{Ataque: 100, Magia: 50, Defesa: 100}, Postura: posturaAgressiva}
	aplicarPostura(&c)
	if c.Atributos.Ataque != 112 || c.Atributos.Magia != 56 || c.Atributos.Defesa != 70 {
		t.Errorf("Agressiva: %+v", c.Atributos)
	}
	d := CombatenteRPG{Atributos: AtributosRPG{Ataque: 100, Magia: 50, Defesa: 100}, Postura: posturaDefensiva}
	aplicarPostura(&d)
	if d.Atributos.Ataque != 92 || d.Atributos.Defesa != 125 {
		t.Errorf("Defensiva: %+v", d.Atributos)
	}
	if limiarDeCuraPct(posturaAgressiva) != 30 || limiarDeCuraPct("") != 50 || limiarDeCuraPct(posturaDefensiva) != 65 {
		t.Error("momento da cura por postura")
	}
	if escudoContraPostura(0.4, posturaAgressiva) != 0.2 || escudoContraPostura(0.4, posturaDefensiva) != 0.4 {
		t.Error("a Agressiva quebra metade do escudo")
	}
	if !resisteAEfeito(posturaDefensiva, rngFixo(0)) || resisteAEfeito(posturaDefensiva, rngFixo(1)) || resisteAEfeito(posturaAgressiva, rngFixo(0)) {
		t.Error("a Defensiva resiste a metade dos efeitos")
	}
	if multCriticoContraPostura(1.5, posturaDefensiva) != 1.25 || multCriticoContraPostura(1.5, posturaEquilibrada) != 1.5 {
		t.Error("a Defensiva sofre menos com crítico")
	}
}

// Nenhuma postura pode ser sempre a melhor: na média dos casos de balanceamento do elenco,
// as três ficam perto uma da outra.
func TestPostura_NenhumaDomina(t *testing.T) {
	casos := []struct {
		monstro MonstroRPG
		item    ItemRPG
	}{
		{monstroDoNivel(26, "raro", 1540, 132, 68), ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}},
		{monstroDoNivel(35, "chefe", 2470, 171, 94), ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}},
		{monstroDoNivel(50, "chefe", 4720, 275, 157), ItemRPG{Vida: 400, Ataque: 60, Defesa: 40}},
	}
	taxa := map[string]int{}
	for _, p := range []string{posturaEquilibrada, posturaAgressiva, posturaDefensiva} {
		for _, c := range casos {
			j := jogadorDoElenco("lanceiro_fogo", c.monstro.Nivel, c.item)
			j.Elemento, j.Postura = "fogo", p
			for s := int64(0); s < 150; s++ {
				if SimularBatalha(j, c.monstro, rand.New(rand.NewSource(s))).Venceu {
					taxa[p]++
				}
			}
		}
	}
	menor, maior := taxa[posturaEquilibrada], taxa[posturaEquilibrada]
	for _, v := range taxa {
		menor, maior = min(menor, v), max(maior, v)
	}
	if maior-menor > 45 { // 10% de 450 lutas
		t.Errorf("uma postura domina: %v", taxa)
	}
}
