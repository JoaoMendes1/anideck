package handlers

import (
	"math/rand"
	"testing"
)

// taxaContraOPrimordial é a fração de vitórias no nível 60 com itens lendários, sem e com a
// progressão do RPG no máximo (aprimoramento +10 e maestria IV).
func taxaContraOPrimordial(base string, noMaximo bool) float64 {
	item := ItemRPG{Raridade: "lendario", Vida: 400, Ataque: 60, Defesa: 40}
	if noMaximo {
		item = AplicarAprimoramento(item, 10)
	}
	jogador := jogadorDoElenco(base, 60, item)
	if noMaximo {
		usos := map[string]int{}
		for _, h := range jogador.Habilidades {
			usos[h.ID] = 150
		}
		jogador.Habilidades = AplicarMaestria(jogador.Habilidades, usos)
	}
	primordial := monstroDoNivel(60, "chefe", 6380, 320, 192)
	vitorias := 0
	for semente := int64(0); semente < 300; semente++ {
		if SimularBatalha(jogador, primordial, rand.New(rand.NewSource(semente))).Venceu {
			vitorias++
		}
	}
	return float64(vitorias) / 300
}

// A progressão do RPG tem de ser sentida, mas não pode tornar o chefe final trivial: o
// combate é sensível, e por isso os bônus são pequenos (DECISIONS, 17/11/2026).
func TestProgressaoRPG_TudoNoMaximoContraOChefeFinal(t *testing.T) {
	for base := range PersonagensBase() {
		sem, com := taxaContraOPrimordial(base, false), taxaContraOPrimordial(base, true)
		if com <= sem+0.15 {
			t.Errorf("%s: a progressão no máximo deveria ser sentida (%.0f%% -> %.0f%%)", base, 100*sem, 100*com)
		}
		if com < 0.50 || com > 0.85 {
			t.Errorf("%s: com tudo no máximo, o chefe final deveria ficar entre 50%% e 85%%, ficou %.0f%%", base, 100*com)
		}
	}
}
