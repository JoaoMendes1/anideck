package handlers

import (
	"math/rand"
	"testing"
)

func TestMedianaDosNiveis(t *testing.T) {
	casos := map[string]struct {
		niveis []int
		quer   int
	}{
		"vazio": {nil, 1}, "um": {[]int{12}, 12}, "ímpar": {[]int{40, 10, 20}, 20}, "par": {[]int{10, 30, 20, 40}, 25},
	}
	for nome, c := range casos {
		if got := MedianaDosNiveis(c.niveis); got != c.quer {
			t.Errorf("%s: quer %d, veio %d", nome, c.quer, got)
		}
	}
}

func TestEscolherChefeDoCla(t *testing.T) {
	cat := catalogoParaMasmorras()
	casos := map[int]string{1: "lobo_sombrio", 15: "golem_de_runas", 24: "espectro_do_vazio", 33: "cavaleiro_caido", 48: "dragao_de_eter", 70: "primordial_esquecido"}
	for mediana, quer := range casos {
		m, ok := EscolherChefeDoCla(mediana, cat)
		if !ok || m.ID != quer {
			t.Errorf("mediana %d: quer %s, veio %s", mediana, quer, m.ID)
		}
	}
	if _, ok := EscolherChefeDoCla(30, nil); ok {
		t.Error("sem catálogo não há chefe")
	}
}

func TestVidaERecompensaDoChefeDoCla(t *testing.T) {
	cavaleiro := MonstroRPG{ID: "cavaleiro_caido", Nivel: 35, Vida: 2100}
	if VidaDoChefeDoCla(cavaleiro, 5) != 2100*3*5 || VidaDoChefeDoCla(cavaleiro, 0) != 2100*3 {
		t.Error("Vida do chefe deveria ser a do monstro vezes 3 por membro")
	}
	if ouro, bil := RecompensaDoChefeDoCla(cavaleiro); ouro != 75*4 || bil != 3 {
		t.Errorf("recompensa errada: %d de Ouro, %d bilhetes", ouro, bil)
	}
}

func TestSimularAtaqueAoChefe(t *testing.T) {
	cavaleiro := MonstroRPG{ID: "cavaleiro_caido", Tipo: "chefe", Nivel: 35, Vida: 2100, Ataque: 145, Defesa: 80}
	forte := jogadorDoElenco("espadachim_eter", 40, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	fraco := jogadorDoElenco("espadachim_eter", 15, ItemRPG{Vida: 90, Ataque: 15, Defesa: 11})
	d1, r := SimularAtaqueAoChefe(forte, cavaleiro, rand.New(rand.NewSource(1)))
	d2, _ := SimularAtaqueAoChefe(forte, cavaleiro, rand.New(rand.NewSource(1)))
	if d1 <= 0 || d1 != d2 || r.Venceu {
		t.Fatalf("ataque deveria causar dano, repetir com a mesma semente e o chefe não cai: %d %d %v", d1, d2, r.Venceu)
	}
	somaForte, somaFraco := 0, 0
	for s := int64(0); s < 50; s++ {
		a, _ := SimularAtaqueAoChefe(forte, cavaleiro, rand.New(rand.NewSource(s)))
		b, _ := SimularAtaqueAoChefe(fraco, cavaleiro, rand.New(rand.NewSource(s)))
		somaForte += a
		somaFraco += b
	}
	if somaForte <= somaFraco*2 {
		t.Errorf("o nível 40 deveria causar bem mais dano que o 15: %d contra %d", somaForte, somaFraco)
	}
	// Um clã de 5 membros perto do nível derruba o chefe na semana com metade dos ataques.
	if int64(somaForte/50)*5*7/2 < VidaDoChefeDoCla(cavaleiro, 5) {
		t.Errorf("chefe de 5 membros forte demais: média %d por ataque, Vida %d", somaForte/50, VidaDoChefeDoCla(cavaleiro, 5))
	}
}
