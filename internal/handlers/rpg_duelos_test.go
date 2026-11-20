package handlers

import (
	"math/rand"
	"testing"
)

func TestSimularDuelo_EspelhoEquilibradoEMaisForteVence(t *testing.T) {
	a := jogadorDoElenco("espadachim_eter", 30, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	vitorias := 0
	for s := int64(0); s < 400; s++ {
		if SimularDuelo(a, a, rand.New(rand.NewSource(s))).Venceu {
			vitorias++
		}
	}
	if vitorias < 80 || vitorias > 260 {
		t.Errorf("espelho deveria ficar equilibrado (empate de velocidade favorece quem bate primeiro): %d de 400", vitorias)
	}
	forte := jogadorDoElenco("espadachim_eter", 45, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40})
	fraco := jogadorDoElenco("espadachim_eter", 20, ItemRPG{Vida: 90, Ataque: 15, Defesa: 11})
	v := 0
	for s := int64(0); s < 200; s++ {
		if SimularDuelo(forte, fraco, rand.New(rand.NewSource(s))).Venceu {
			v++
		}
	}
	if v < 190 {
		t.Errorf("nível 45 com lendários deveria vencer o nível 20: %d de 200", v)
	}
}

func TestSimularDuelo_DoisLadosUsamHabilidadesEMesmaSemente(t *testing.T) {
	a := jogadorDoElenco("assassina_raio", 40, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	a.Elemento = "raio"
	b := jogadorDoElenco("maga_agua", 40, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	b.Elemento = "agua"
	r1 := SimularDuelo(a, b, rand.New(rand.NewSource(7)))
	r2 := SimularDuelo(a, b, rand.New(rand.NewSource(7)))
	if len(r1.Turnos) != len(r2.Turnos) || r1.Venceu != r2.Venceu {
		t.Fatal("mesma semente deveria dar o mesmo duelo")
	}
	if r1.Elemental != "vantagem" {
		t.Errorf("Raio contra Água é vantagem, veio %q", r1.Elemental)
	}
	jogador, oponente := false, false
	for s := int64(0); s < 30 && !(jogador && oponente); s++ {
		for _, turno := range SimularDuelo(a, b, rand.New(rand.NewSource(s))).Turnos {
			if turno.Habilidade != "" && turno.Atacante == "jogador" {
				jogador = true
			}
			if turno.Habilidade != "" && turno.Atacante == "monstro" {
				oponente = true
			}
		}
	}
	if !jogador || !oponente {
		t.Errorf("os dois lados deveriam usar habilidades: desafiante=%v oponente=%v", jogador, oponente)
	}
}

func TestSimularDuelo_SemNocauteVencePelaFracaoDaVida(t *testing.T) {
	tanque := CombatenteRPG{Atributos: AtributosRPG{Vida: 100000, Ataque: 5, Defesa: 100000, Velocidade: 5}}
	ferido := tanque
	r := SimularDuelo(tanque, ferido, rand.New(rand.NewSource(1)))
	if r.Rodadas != maxTurnosBatalha {
		t.Fatalf("duelo de tanques deveria ir até o fim: %d rodadas", r.Rodadas)
	}
	// Vida igual: empate não é vitória do desafiante.
	if r.Venceu {
		t.Error("empate por pontos favorece o oponente")
	}
}

func TestOrdenarOponentes(t *testing.T) {
	lista := []OponenteDeDuelo{
		{Handle: "longe", Nivel: 50},
		{Handle: "ja_feito", Nivel: 20, DueladoHoje: true},
		{Handle: "perto_b", Nivel: 22},
		{Handle: "perto_a", Nivel: 18},
	}
	OrdenarOponentes(lista, 20)
	quer := []string{"perto_a", "perto_b", "longe", "ja_feito"}
	for i, h := range quer {
		if lista[i].Handle != h {
			t.Fatalf("ordem errada: %v", lista)
		}
	}
}
