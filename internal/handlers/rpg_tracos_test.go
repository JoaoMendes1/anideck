package handlers

import (
	"math/rand"
	"testing"
)

// Somando o catálogo inteiro, nenhuma classe pode ganhar ou perder mais de 2% com os traços.
func TestTracos_NenhumaClasseSaiNaFrente(t *testing.T) {
	classes := map[string]bool{}
	for _, pb := range PersonagensBase() {
		classes[pb.Classe] = true
	}
	for classe := range classes {
		soma, n := 0.0, 0
		for id := range elementoDosMonstros {
			soma += FatorDeClasse(classe, TracosDoMonstro(id))
			n++
		}
		if media := soma / float64(n); media < 0.98 || media > 1.02 {
			t.Errorf("%s: média %.3f no catálogo", classe, media)
		}
	}
	// Todo traço tem fator para todas as classes do elenco, e todo monstro com traço existe.
	for traco, porClasse := range fatorDoTraco {
		for classe := range classes {
			if _, ok := porClasse[classe]; !ok {
				t.Errorf("traço %s sem fator para %s", traco, classe)
			}
		}
	}
	for id := range tracosDosMonstros {
		if _, ok := elementoDosMonstros[id]; !ok {
			t.Errorf("traço para monstro desconhecido: %s", id)
		}
	}
	if len(tracosDosMonstros["primordial_esquecido"]) > 0 {
		t.Error("o chefe final fica sem traço")
	}
}

func TestTracos_FatorEFicha(t *testing.T) {
	voador := TracosDoMonstro("grifo_dourado")
	if len(voador) != 1 || voador[0].Nome != "Voador" {
		t.Fatalf("grifo é voador: %+v", voador)
	}
	if FatorDeClasse("arqueiro", voador) != 1.20 || FatorDeClasse("guerreiro", voador) != 0.85 || FatorDeClasse("", voador) != 1 {
		t.Error("fatores do voador")
	}
	if TracosDoMonstro("lobo_sombrio") != nil {
		t.Error("lobo não tem traço")
	}
	m := MonstroRPG{ID: "beholder_abissal"}
	EnriquecerMonstro(&m)
	if len(m.Tracos) != 1 || m.Tracos[0].ID != tracoAntimagia {
		t.Errorf("EnriquecerMonstro deveria pôr os traços: %+v", m.Tracos)
	}
}

// Com os mesmos números, o arqueiro vence um voador mais vezes que o guerreiro.
func TestTracos_NaLuta(t *testing.T) {
	monstro := monstroDoNivel(30, "raro", 1300, 75, 40)
	monstro.ID = "grifo_dourado"
	vitorias := map[string]int{}
	for _, classe := range []string{"arqueiro", "guerreiro"} {
		j := combatente(30, AtributosRPG{Vida: 900, Ataque: 70, Defesa: 40, Eter: 40})
		j.Classe = classe
		for s := int64(0); s < 200; s++ {
			if SimularBatalha(j, monstro, rand.New(rand.NewSource(s))).Venceu {
				vitorias[classe]++
			}
		}
	}
	if vitorias["arqueiro"] <= vitorias["guerreiro"] {
		t.Errorf("arqueiro deveria vencer mais o voador: %v", vitorias)
	}
}
