package handlers

import (
	"math/rand"
	"testing"
	"time"
)

func TestRelacaoElemental(t *testing.T) {
	casos := []struct{ a, d, quer string }{
		{"fogo", "terra", "vantagem"}, {"terra", "raio", "vantagem"}, {"raio", "agua", "vantagem"}, {"agua", "fogo", "vantagem"},
		{"terra", "fogo", "desvantagem"}, {"agua", "raio", "desvantagem"},
		{"luz", "trevas", "vantagem"}, {"trevas", "luz", "vantagem"},
		{"eter", "fogo", "neutro"}, {"fogo", "eter", "neutro"}, {"", "eter", "neutro"}, {"", "neutro", "neutro"}, {"fogo", "fogo", "neutro"},
	}
	for _, c := range casos {
		if got := RelacaoElemental(c.a, c.d); got != c.quer {
			t.Errorf("%q contra %q: quer %s, veio %s", c.a, c.d, c.quer, got)
		}
	}
	if MultiplicadorElemental("fogo", "terra") <= 1 || MultiplicadorElemental("terra", "fogo") >= 1 || MultiplicadorElemental("eter", "luz") != 1 {
		t.Error("multiplicadores fora do esperado")
	}
}

// catalogoDeExpedicoes repete os números do sql/078 e um item da faixa de cada nível.
func catalogoDeExpedicoes() []struct {
	m    MonstroRPG
	item ItemRPG
} {
	mk := func(id string, nivel int, tipo string, v, a, d int) MonstroRPG {
		return MonstroRPG{ID: id, Nome: id, Tipo: tipo, Nivel: nivel, Vida: v, Ataque: a, Defesa: d}
	}
	raros, epicos, lendarios := ItemRPG{Vida: 90, Ataque: 15, Defesa: 11}, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40}
	return []struct {
		m    MonstroRPG
		item ItemRPG
	}{
		{mk("lobo_sombrio", 10, "comum", 380, 48, 24), raros},
		{mk("golem_de_runas", 18, "raro", 900, 70, 50), raros},
		{mk("espectro_do_vazio", 26, "raro", 1400, 120, 62), epicos},
		{mk("cavaleiro_caido", 35, "chefe", 2100, 145, 80), epicos},
		{mk("dragao_de_eter", 50, "chefe", 3600, 210, 120), lendarios},
	}
}

func taxaDeVitoria(j CombatenteRPG, m MonstroRPG, lutas int) float64 {
	v := 0
	for s := int64(0); s < int64(lutas); s++ {
		if SimularBatalha(j, m, rand.New(rand.NewSource(s))).Venceu {
			v++
		}
	}
	return float64(v) / float64(lutas)
}

// Com elementos e poderes, no próprio nível: luta neutra segue vencível, vantagem ajuda e
// desvantagem pesa sem fechar a porta. Trocar de personagem é a resposta à desvantagem.
func TestCombateAvancado_EquilibrioNoCatalogo(t *testing.T) {
	for base, pb := range PersonagensBase() {
		for _, c := range catalogoDeExpedicoes() {
			j := jogadorDoElenco(base, c.m.Nivel, c.item)
			j.Elemento = pb.Elemento
			taxa := taxaDeVitoria(j, c.m, 300)
			minimo := 0.78
			switch RelacaoElemental(pb.Elemento, ElementoDoMonstro(c.m.ID)) {
			case "vantagem":
				minimo = 0.95
			case "desvantagem":
				minimo = 0.25
			}
			if taxa < minimo {
				t.Errorf("%s contra %s no nível %d: venceu %.0f%%, mínimo %.0f%%", base, c.m.ID, c.m.Nivel, taxa*100, minimo*100)
			}
		}
		j := jogadorDoElenco(base, 60, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40})
		j.Elemento = pb.Elemento
		primordial := MonstroRPG{ID: "primordial_esquecido", Tipo: "chefe", Nivel: 60, Vida: 4800, Ataque: 255, Defesa: 155}
		if taxa := taxaDeVitoria(j, primordial, 300); taxa < 0.03 || taxa > 0.50 {
			t.Errorf("%s contra o chefe final real: venceu %.0f%%, esperava entre 3%% e 50%%", base, taxa*100)
		}
	}
}

// O lobo chama o ajudante, o ajudante ataca, e o jogador bate nele antes de chegar ao lobo.
func TestCombateAvancado_InvocacaoProtegeOMonstro(t *testing.T) {
	j := jogadorDoElenco("espadachim_eter", 10, ItemRPG{Vida: 90, Ataque: 15, Defesa: 11})
	lobo := MonstroRPG{ID: "lobo_sombrio", Tipo: "comum", Nivel: 10, Vida: 380, Ataque: 48, Defesa: 24}
	for s := int64(0); s < 200; s++ {
		r := SimularBatalha(j, lobo, rand.New(rand.NewSource(s)))
		invocou, atacou, protegeu := false, false, false
		for _, turno := range r.Turnos {
			invocou = invocou || turno.Invocado == "Lobo Jovem"
			atacou = atacou || (turno.Atacante == "ajudante" && turno.Alvo == "Lobo Jovem")
			protegeu = protegeu || (turno.Atacante == "jogador" && turno.Alvo == "Lobo Jovem")
		}
		if invocou && atacou && protegeu {
			return
		}
	}
	t.Fatal("em 200 lutas, nenhuma teve o lobo jovem chamado, atacando e recebendo golpe")
}

// Escudo, dreno e fúria aparecem no registro, e o resultado diz a relação de elemento.
func TestCombateAvancado_PoderesNoRegistro(t *testing.T) {
	casos := []struct {
		monstro MonstroRPG
		poder   string
		nivel   int
		item    ItemRPG
	}{
		{MonstroRPG{ID: "golem_de_runas", Tipo: "raro", Nivel: 18, Vida: 900, Ataque: 70, Defesa: 50}, "Muralha de Runas", 18, ItemRPG{Vida: 90, Ataque: 15, Defesa: 11}},
		{MonstroRPG{ID: "espectro_do_vazio", Tipo: "raro", Nivel: 26, Vida: 1400, Ataque: 120, Defesa: 62}, "Toque do Vazio", 26, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}},
		{MonstroRPG{ID: "dragao_de_eter", Tipo: "chefe", Nivel: 50, Vida: 3600, Ataque: 210, Defesa: 120}, "Fúria Ancestral", 50, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40}},
	}
	for _, c := range casos {
		achou := false
		for s := int64(0); s < 100 && !achou; s++ {
			r := SimularBatalha(jogadorDoElenco("espadachim_eter", c.nivel, c.item), c.monstro, rand.New(rand.NewSource(s)))
			for _, turno := range r.Turnos {
				if turno.Poder == c.poder {
					achou = true
				}
			}
		}
		if !achou {
			t.Errorf("%s nunca usou %s em 100 lutas", c.monstro.ID, c.poder)
		}
	}
	j := jogadorDoElenco("guerreiro_terra", 35, ItemRPG{Vida: 220, Ataque: 34, Defesa: 27})
	j.Elemento = "terra"
	r := SimularBatalha(j, MonstroRPG{ID: "cavaleiro_caido", Tipo: "chefe", Nivel: 35, Vida: 2100, Ataque: 145, Defesa: 80}, rand.New(rand.NewSource(1)))
	if r.Elemental != "desvantagem" {
		t.Errorf("Terra contra Fogo deveria ser desvantagem, veio %q", r.Elemental)
	}
}

// Monstro sem id do catálogo (testes antigos, monstro novo) não tem elemento nem poder.
func TestCombateAvancado_MonstroForaDoCatalogoNaoMuda(t *testing.T) {
	m := monstroDoNivel(18, "raro", 900, 70, 50)
	j := jogadorDoElenco("assassina_raio", 18, ItemRPG{Vida: 90, Ataque: 15, Defesa: 11})
	j.Elemento = "raio"
	r := SimularBatalha(j, m, rand.New(rand.NewSource(3)))
	if r.Elemental != "neutro" {
		t.Errorf("monstro fora do catálogo deveria ser neutro, veio %q", r.Elemental)
	}
	for _, turno := range r.Turnos {
		if turno.Poder != "" || turno.Invocado != "" || turno.Atacante == "ajudante" {
			t.Fatalf("monstro fora do catálogo usou poder: %+v", turno)
		}
	}
}

// Caiu só quando a Vida chega a zero; derrota por tempo não é queda.
func TestCombateAvancado_Queda(t *testing.T) {
	iniciante := jogadorDoElenco("espadachim_eter", 1, ItemRPG{})
	r := SimularBatalha(iniciante, MonstroRPG{ID: "dragao_de_eter", Tipo: "chefe", Nivel: 50, Vida: 3600, Ataque: 210, Defesa: 120}, rand.New(rand.NewSource(1)))
	if r.Venceu || !r.Caiu || r.VidaFinal != 0 {
		t.Errorf("nível 1 contra o dragão deveria cair: %+v", r.VidaFinal)
	}
	tanque := CombatenteRPG{Atributos: AtributosRPG{Vida: 100000, Ataque: 1, Defesa: 100000, Velocidade: 1}}
	r = SimularBatalha(tanque, monstroDoNivel(1, "comum", 100000, 1, 100000), rand.New(rand.NewSource(1)))
	if r.Venceu || r.Caiu {
		t.Errorf("derrota por tempo não é queda: venceu=%v caiu=%v", r.Venceu, r.Caiu)
	}
}

func TestRegioesMapa_DestaqueEDicaTatica(t *testing.T) {
	regioes := CatalogoRegioes()
	if len(regioes) != 4 {
		t.Fatalf("esperava 4 regiões no mapa, veio %d", len(regioes))
	}
	vistos := map[string]bool{}
	for _, r := range regioes {
		for _, id := range r.MonstroIDs {
			vistos[id] = true
			if tip := DicaTaticaDoMonstro(id, 0); tip != "" {
				t.Errorf("%s não deveria liberar dica tática com 0 vitórias, veio %q", id, tip)
			}
			if tip := DicaTaticaDoMonstro(id, 1); tip == "" {
				t.Errorf("%s deveria liberar dica tática após a 1ª vitória", id)
			}
			m := MonstroRPG{ID: id, Nivel: 10, Vida: 100, Ataque: 10, Defesa: 5}
			EnriquecerMonstro(&m)
			if m.Eter == 0 || m.Magia == 0 || m.Comportamento == "" || m.Regiao != r.ID || m.Habitat == "" {
				t.Errorf("monstro %s não foi enriquecido corretamente: %+v", id, m)
			}
		}
	}
	if len(vistos) != 8 {
		t.Errorf("esperava os 8 monstros no mapa, vieram %d", len(vistos))
	}

	dia1 := time.Date(2026, 11, 18, 12, 0, 0, 0, fusoGuilda)
	destaques := map[string]bool{}
	for d := range 4 {
		destaques[RegiaoEmDestaqueEm(dia1.AddDate(0, 0, d))] = true
	}
	if len(destaques) != 4 {
		t.Errorf("rotação diária deveria cobrir todas as 4 regiões, cobriu %d", len(destaques))
	}
}

func TestIATatica_NaoDesperdicaESemEterNaoUsaPoder(t *testing.T) {
	diario := []TurnoBatalha{}
	base := &lutaEmAndamento{
		j:   CombatenteRPG{Atributos: AtributosRPG{Vida: 1000, Ataque: 100, Defesa: 50}},
		m:   MonstroRPG{ID: "cavaleiro_caido", Vida: 2000, Ataque: 140, Eter: 40, Poderes: []PoderMonstro{
			{ID: "escudo", Nome: "Escudo", Tipo: poderEscudo, CustoEter: 10, ChancePorMil: 1000, Fator: 0.4, Rodadas: 2},
			{ID: "furia", Nome: "Fúria", Tipo: poderFuria, CustoEter: 10, ChancePorMil: 1000, Fator: 1.15},
			{ID: "invocar", Nome: "Invocar", Tipo: poderInvocar, CustoEter: 10, ChancePorMil: 1000, Ajudante: "Guarda", AjudanteVidaPct: 10, AjudanteAtqPct: 10},
		}},
		mon: &estadoDoMonstro{
			vida: 2000, eter: 40, rodada: 3, usosPoder: map[string]int{},
			rodadasEscudo: 1, furia: 1.15, ajudantes: []AjudanteNaLuta{{Nome: "Guarda", Vida: 10}},
		},
		rng:    rand.New(rand.NewSource(1)),
		diario: &diario,
	}
	if p := base.escolherPoder(); p != nil {
		t.Fatalf("não deveria usar escudo/fúria/invocação já ativos, escolheu %q", p.ID)
	}

	// Sem Éter suficiente, poder com CustoEter não é escolhido.
	semEter := *base
	semEter.mon = &estadoDoMonstro{vida: 2000, eter: 4, rodada: 3, usosPoder: map[string]int{}}
	if p := semEter.escolherPoder(); p != nil {
		t.Fatalf("sem Éter não deveria escolher poder, escolheu %q", p.ID)
	}
}

func TestMonstro_EsquivaEDanoArcano(t *testing.T) {
	diario := []TurnoBatalha{}
	l := &lutaEmAndamento{
		j:   CombatenteRPG{Atributos: AtributosRPG{Vida: 1000, Ataque: 100, Defesa: 100}},
		m:   MonstroRPG{ID: "teste", Vida: 500, Ataque: 80, Defesa: 20, EsquivaPorMil: 1000},
		mon: &estadoDoMonstro{vida: 500, usosPoder: map[string]int{}},
		rng: rand.New(rand.NewSource(2)), vidaJogador: 1000, diario: &diario,
	}
	if caiu := l.vezDoJogador(); caiu || len(diario) != 1 || !diario[0].Esquiva || diario[0].Dano != 0 {
		t.Fatalf("esperava esquiva do monstro com dano 0, veio %+v", diario)
	}

	// Golpe arcano reduz a defesa efetiva do jogador (de 200 para 150) e causa mais dano médio que físico.
	somaFis, somaArc := 0, 0
	for s := int64(0); s < 100; s++ {
		lF := &lutaEmAndamento{
			j: CombatenteRPG{Atributos: AtributosRPG{Vida: 10000, Defesa: 200}}, m: MonstroRPG{CriticoPorMil: 100, DanoCritico: 150},
			mon: &estadoDoMonstro{}, rng: rand.New(rand.NewSource(s)), vidaJogador: 10000,
		}
		dF, _ := lF.golpeNoJogadorComTipo(120, false)
		lA := &lutaEmAndamento{
			j: CombatenteRPG{Atributos: AtributosRPG{Vida: 10000, Defesa: 200}}, m: MonstroRPG{CriticoPorMil: 100, DanoCritico: 150},
			mon: &estadoDoMonstro{}, rng: rand.New(rand.NewSource(s)), vidaJogador: 10000,
		}
		dA, _ := lA.golpeNoJogadorComTipo(120, true)
		somaFis += dF.valor
		somaArc += dA.valor
	}
	if somaArc <= somaFis {
		t.Errorf("golpe arcano (%d) deveria causar mais dano que físico (%d) contra Defesa alta", somaArc, somaFis)
	}
}

