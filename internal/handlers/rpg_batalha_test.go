package handlers

import (
	"bytes"
	"context"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func monstroTeste(vida, ataque, defesa int) MonstroRPG {
	return MonstroRPG{ID: "teste", Nome: "Teste", Tipo: "comum", Nivel: 1, Vida: vida, Ataque: ataque, Defesa: defesa}
}

func monstroDoNivel(nivel int, tipo string, vida, ataque, defesa int) MonstroRPG {
	return MonstroRPG{ID: "teste", Nome: "Teste", Tipo: tipo, Nivel: nivel, Vida: vida, Ataque: ataque, Defesa: defesa}
}

// combatente monta o Espadachim de um nível, com o livro de habilidades daquele nível.
func combatente(nivel int, a AtributosRPG) CombatenteRPG {
	return CombatenteDoEstado(EstadoEquipamento{Atributos: a, Habilidades: LivroDeHabilidades(personagemBasePadrao, nivel)})
}

func TestCalcularDano(t *testing.T) {
	if d := CalcularDano(10, 0); d != 10 {
		t.Errorf("sem defesa, o dano é o ataque: %v", d)
	}
	if d := CalcularDano(10, 10); d != 5 {
		t.Errorf("defesa igual ao ataque divide o dano por dois: %v", d)
	}
	if d := CalcularDano(0, 100); d <= 0 {
		t.Errorf("o dano nunca chega a zero: %v", d)
	}
}

func TestSimularBatalha_MesmaSementeMesmaLuta(t *testing.T) {
	jogador := combatente(30, AtributosBase(30))
	monstro := monstroDoNivel(30, "raro", 1200, 95, 55)
	a := SimularBatalha(jogador, monstro, rand.New(rand.NewSource(42)))
	b := SimularBatalha(jogador, monstro, rand.New(rand.NewSource(42)))
	if a.Venceu != b.Venceu || len(a.Turnos) != len(b.Turnos) {
		t.Fatalf("a mesma semente deveria dar a mesma luta: %+v x %+v", a, b)
	}
	for i := range a.Turnos {
		if a.Turnos[i] != b.Turnos[i] {
			t.Fatalf("turno %d diferente: %+v x %+v", i, a.Turnos[i], b.Turnos[i])
		}
	}
}

func TestSimularBatalha_RegrasDaLuta(t *testing.T) {
	for semente := int64(0); semente < 100; semente++ {
		jogador := combatente(30, AtributosBase(30))
		r := SimularBatalha(jogador, monstroDoNivel(30, "comum", 1200, 95, 55), rand.New(rand.NewSource(semente)))
		if len(r.Turnos) == 0 || r.Turnos[0].Atacante != "jogador" {
			t.Fatalf("mais rápido, o jogador age primeiro: %+v", r.Turnos)
		}
		ultimo := r.Turnos[len(r.Turnos)-1]
		if r.Venceu && (ultimo.VidaMonstro != 0 || ultimo.Atacante != "jogador") {
			t.Fatalf("vitória termina com o monstro em zero: %+v", ultimo)
		}
		if !r.Venceu && ultimo.VidaJogador != 0 && r.Rodadas != maxTurnosBatalha {
			t.Fatalf("derrota é por vida zerada ou por tempo: %+v", r)
		}
		despertares := 0
		for _, turno := range r.Turnos {
			if turno.VidaJogador < 0 || turno.VidaMonstro < 0 || turno.VidaJogador > jogador.Atributos.Vida {
				t.Fatalf("vida fora da faixa: %+v", turno)
			}
			if turno.Eter < 0 || turno.Eter > jogador.Atributos.Eter {
				t.Fatalf("Éter fora da faixa: %+v", turno)
			}
			if turno.Esquiva && turno.Dano != 0 {
				t.Fatalf("esquiva não leva dano: %+v", turno)
			}
			if turno.Cura == 0 && !turno.Esquiva && turno.Dano < 1 {
				t.Fatalf("golpe que acerta dá pelo menos 1: %+v", turno)
			}
			if turno.Habilidade == "Despertar do Éter" {
				despertares++
			}
		}
		if despertares > 1 {
			t.Fatalf("o despertar é uma vez por luta: %d", despertares)
		}
	}
}

func TestSimularBatalha_MonstroMaisRapidoAgePrimeiro(t *testing.T) {
	lento := combatente(1, AtributosBase(1))
	r := SimularBatalha(lento, monstroDoNivel(50, "chefe", 2200, 150, 90), rand.New(rand.NewSource(3)))
	if r.Turnos[0].Atacante != "monstro" {
		t.Fatalf("o chefe é mais rápido e age primeiro: %+v", r.Turnos[0])
	}
}

func TestSimularBatalha_UsaHabilidades(t *testing.T) {
	vistas := map[string]bool{}
	for semente := int64(0); semente < 50; semente++ {
		r := SimularBatalha(combatente(45, AtributosBase(45)), monstroDoNivel(45, "chefe", 4000, 140, 80), rand.New(rand.NewSource(semente)))
		for _, turno := range r.Turnos {
			if turno.Habilidade != "" {
				vistas[turno.Habilidade] = true
			}
		}
	}
	for _, nome := range []string{"Golpe Firme", "Tempestade de Aço", "Despertar do Éter"} {
		if !vistas[nome] {
			t.Errorf("%s nunca foi usada: %v", nome, vistas)
		}
	}
	// Nível 1 só tem o Golpe Firme.
	r := SimularBatalha(combatente(1, AtributosBase(1)), monstroTeste(60, 8, 3), rand.New(rand.NewSource(1)))
	for _, turno := range r.Turnos {
		if turno.Habilidade != "" && turno.Habilidade != "Golpe Firme" {
			t.Fatalf("habilidade acima do nível: %s", turno.Habilidade)
		}
	}
}

func TestSimularBatalha_ForcaDecide(t *testing.T) {
	forte, fraco := 0, 0
	for semente := int64(0); semente < 100; semente++ {
		if SimularBatalha(combatente(30, AtributosBase(30)), monstroTeste(60, 8, 3), rand.New(rand.NewSource(semente))).Venceu {
			forte++
		}
		if SimularBatalha(combatente(1, AtributosBase(1)), monstroDoNivel(50, "chefe", 3000, 190, 120), rand.New(rand.NewSource(semente))).Venceu {
			fraco++
		}
	}
	if forte != 100 || fraco != 0 {
		t.Errorf("nível 30 contra slime deveria sempre vencer (%d/100) e nível 1 contra chefe sempre perder (%d/100)", forte, fraco)
	}
}

func TestSimularBatalha_EmpateDefensivoAcabaEmDerrota(t *testing.T) {
	jogador := CombatenteRPG{Atributos: AtributosRPG{Vida: 100000, Ataque: 1, Defesa: 1000, Velocidade: 10}}
	r := SimularBatalha(jogador, monstroTeste(100000, 1, 1000), rand.New(rand.NewSource(1)))
	if r.Venceu || r.Rodadas != maxTurnosBatalha || len(r.Turnos) != maxTurnosBatalha*2 {
		t.Fatalf("luta sem fim deveria parar no limite como derrota: venceu=%v rodadas=%d turnos=%d", r.Venceu, r.Rodadas, len(r.Turnos))
	}
}

// Confere o balanceamento do sql/072 + sql/078: um jogador no nível do monstro, com os pontos
// divididos entre Força e Constituição e itens da faixa, vence em pelo menos 60% das lutas —
// exceto contra o Primordial Esquecido (chefe final, nível 60), calibrado para 10% a 50%.
func TestBalanceamentoInicial(t *testing.T) {
	montarJogador := func(nivel int, equipo AtributosRPG) CombatenteRPG {
		pts := PontosDisponiveis(nivel)
		prim := PrimariosBase(nivel).Somar(PrimariosRPG{
			Forca:        (pts + 1) / 2,
			Constituicao: pts / 2,
		})
		base := DerivarAtributos(nivel, prim)
		total := SomarAtributos(base, []ItemRPG{{Vida: equipo.Vida, Ataque: equipo.Ataque, Defesa: equipo.Defesa}})
		return combatente(nivel, total)
	}

	casos := []struct {
		nome    string
		nivel   int
		equipo  AtributosRPG
		monstro MonstroRPG
	}{
		{"slime, nível 1 com kit", 1, AtributosRPG{Vida: 30, Ataque: 5, Defesa: 4}, monstroDoNivel(1, "comum", 60, 8, 3)},
		{"goblin, nível 4 com kit", 4, AtributosRPG{Vida: 30, Ataque: 5, Defesa: 4}, monstroDoNivel(4, "comum", 120, 14, 6)},
		{"lobo, nível 10 com raros", 10, AtributosRPG{Vida: 90, Ataque: 15, Defesa: 11}, monstroDoNivel(10, "comum", 380, 48, 24)},
		{"golem, nível 18 com raros", 18, AtributosRPG{Vida: 90, Ataque: 15, Defesa: 11}, monstroDoNivel(18, "raro", 900, 70, 50)},
		{"espectro, nível 26 com épicos", 26, AtributosRPG{Vida: 220, Ataque: 34, Defesa: 27}, monstroDoNivel(26, "raro", 1400, 120, 62)},
		{"cavaleiro, nível 35 com épicos", 35, AtributosRPG{Vida: 220, Ataque: 34, Defesa: 27}, monstroDoNivel(35, "raro", 2100, 145, 80)},
		{"dragão, nível 50 com lendários", 50, AtributosRPG{Vida: 400, Ataque: 60, Defesa: 40}, monstroDoNivel(50, "chefe", 3600, 210, 120)},
	}
	for _, c := range casos {
		jogador := montarJogador(c.nivel, c.equipo)
		vitorias := 0
		for semente := int64(0); semente < 200; semente++ {
			if SimularBatalha(jogador, c.monstro, rand.New(rand.NewSource(semente))).Venceu {
				vitorias++
			}
		}
		if vitorias < 120 {
			t.Errorf("%s: esperava >= 120/200 (60%%), venceu só %d de 200", c.nome, vitorias)
		}
	}

	// Caso próprio do chefe final: Primordial Esquecido no nível 60 com lendários fica entre 10% e 50%.
	primordial := monstroDoNivel(60, "chefe", 6380, 320, 192)
	jogador60 := montarJogador(60, AtributosRPG{Vida: 400, Ataque: 60, Defesa: 40})
	vitoriasPrimordial := 0
	for semente := int64(0); semente < 300; semente++ {
		if SimularBatalha(jogador60, primordial, rand.New(rand.NewSource(semente))).Venceu {
			vitoriasPrimordial++
		}
	}
	if vitoriasPrimordial < 30 || vitoriasPrimordial > 150 {
		t.Errorf("primordial, nível 60 com lendários: esperava entre 10%% e 50%% (30 a 150 em 300), venceu %d de 300", vitoriasPrimordial)
	}

	// Nível 1 perde para os chefões.
	iniciante := montarJogador(1, AtributosRPG{Vida: 30, Ataque: 5, Defesa: 4})
	for semente := int64(0); semente < 50; semente++ {
		if SimularBatalha(iniciante, primordial, rand.New(rand.NewSource(semente))).Venceu {
			t.Fatalf("nível 1 não deveria vencer o Primordial Esquecido (semente %d)", semente)
		}
	}
}

func TestDificuldadeContra(t *testing.T) {
	monstro := monstroTeste(300, 40, 20)
	poder := PoderDoMonstro(monstro)
	casos := map[int]string{poder * 2: "facil", poder: "equilibrada", poder * 8 / 10: "dificil", poder / 2: "perigosa"}
	for p, esperado := range casos {
		if d := DificuldadeContra(AtributosRPG{Poder: p}, monstro); d != esperado {
			t.Errorf("poder %d contra %d: esperava %s, veio %s", p, poder, esperado, d)
		}
	}
}

func TestEscolherItemDaRecompensa(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	if id := EscolherItemDaRecompensa(rng, 0, []string{"a"}); id != "" {
		t.Errorf("chance zero nunca dá item: %q", id)
	}
	if id := EscolherItemDaRecompensa(rng, 100, nil); id != "" {
		t.Errorf("sem candidatos não há item: %q", id)
	}
	for i := 0; i < 20; i++ {
		if id := EscolherItemDaRecompensa(rng, 100, []string{"a", "b"}); id != "a" && id != "b" {
			t.Fatalf("chance 100 sempre dá um dos candidatos: %q", id)
		}
	}
	saiu := 0
	for i := 0; i < 1000; i++ {
		if EscolherItemDaRecompensa(rng, 25, []string{"a"}) != "" {
			saiu++
		}
	}
	if saiu < 180 || saiu > 320 {
		t.Errorf("chance de 25%% deveria dar perto de 250 em 1000, deu %d", saiu)
	}
}

func TestHandleBatalhar_SemAutenticacao(t *testing.T) {
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleBatalhar(w, httptest.NewRequest(http.MethodPost, "/api/rpg/batalhas", bytes.NewReader([]byte(`{"monstro_id":"slime_de_eter"}`))))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401, recebeu %d", w.Code)
	}
	w2 := httptest.NewRecorder()
	(&RPGHandler{}).HandleGetExpedicoes(w2, httptest.NewRequest(http.MethodGet, "/api/rpg/batalhas", nil))
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("GET sem auth: esperava 401, recebeu %d", w2.Code)
	}
}

// Sem personagem, a rota responde 404 antes de qualquer simulação. O stub do banco devolve
// lista vazia, que é o caso de quem não despertou.
func TestHandleBatalhar_SemPersonagem(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/rpg/batalhas", bytes.NewReader([]byte(`{"monstro_id":"slime_de_eter"}`)))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleBatalhar(w, req.WithContext(ctx))
	if w.Code != http.StatusNotFound && w.Code != http.StatusServiceUnavailable {
		t.Fatalf("sem personagem: esperava 404 (ou 503 sem banco), recebeu %d", w.Code)
	}
}
