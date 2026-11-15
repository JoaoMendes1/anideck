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
	jogador := AtributosBase(10)
	monstro := monstroTeste(300, 40, 20)
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
	for semente := int64(0); semente < 50; semente++ {
		r := SimularBatalha(AtributosBase(5), monstroTeste(150, 20, 8), rand.New(rand.NewSource(semente)))
		if len(r.Turnos) == 0 || r.Turnos[0].Atacante != "jogador" {
			t.Fatalf("o jogador ataca primeiro: %+v", r.Turnos)
		}
		for i := 1; i < len(r.Turnos); i++ {
			if r.Turnos[i].Atacante == r.Turnos[i-1].Atacante {
				t.Fatalf("os ataques se alternam: turno %d", i)
			}
		}
		ultimo := r.Turnos[len(r.Turnos)-1]
		if r.Venceu && (ultimo.VidaMonstro != 0 || ultimo.Atacante != "jogador") {
			t.Fatalf("vitória termina com o monstro em zero: %+v", ultimo)
		}
		if !r.Venceu && ultimo.VidaJogador != 0 && r.Rodadas != maxTurnosBatalha {
			t.Fatalf("derrota é por vida zerada ou por tempo: %+v", r)
		}
		for _, turno := range r.Turnos {
			if turno.Dano < 1 || turno.VidaJogador < 0 || turno.VidaMonstro < 0 {
				t.Fatalf("dano mínimo 1 e vida nunca negativa: %+v", turno)
			}
		}
	}
}

func TestSimularBatalha_ForcaDecide(t *testing.T) {
	forte, fraco := 0, 0
	for semente := int64(0); semente < 100; semente++ {
		if SimularBatalha(AtributosBase(30), monstroTeste(60, 8, 3), rand.New(rand.NewSource(semente))).Venceu {
			forte++
		}
		if SimularBatalha(AtributosBase(1), monstroTeste(3000, 190, 120), rand.New(rand.NewSource(semente))).Venceu {
			fraco++
		}
	}
	if forte != 100 || fraco != 0 {
		t.Errorf("nível 30 contra slime deveria sempre vencer (%d/100) e nível 1 contra chefe sempre perder (%d/100)", forte, fraco)
	}
}

func TestSimularBatalha_EmpateDefensivoAcabaEmDerrota(t *testing.T) {
	jogador := AtributosRPG{Vida: 100000, Ataque: 1, Defesa: 1000}
	r := SimularBatalha(jogador, monstroTeste(100000, 1, 1000), rand.New(rand.NewSource(1)))
	if r.Venceu || r.Rodadas != maxTurnosBatalha || len(r.Turnos) != maxTurnosBatalha*2 {
		t.Fatalf("luta sem fim deveria parar no limite como derrota: venceu=%v rodadas=%d turnos=%d", r.Venceu, r.Rodadas, len(r.Turnos))
	}
}

// Confere o balanceamento inicial do sql/072: um jogador no nível do monstro, com itens da
// mesma faixa, vence na maior parte das vezes.
func TestBalanceamentoInicial(t *testing.T) {
	casos := []struct {
		nome    string
		nivel   int
		equipo  AtributosRPG
		monstro MonstroRPG
	}{
		{"slime, nível 1 com kit", 1, AtributosRPG{Vida: 30, Ataque: 5, Defesa: 4}, monstroTeste(60, 8, 3)},
		{"lobo, nível 10 com raros", 10, AtributosRPG{Vida: 90, Ataque: 15, Defesa: 11}, monstroTeste(300, 40, 20)},
		{"cavaleiro, nível 35 com épicos", 35, AtributosRPG{Vida: 220, Ataque: 34, Defesa: 27}, monstroTeste(1300, 105, 60)},
		{"dragão, nível 55 com lendários", 55, AtributosRPG{Vida: 400, Ataque: 60, Defesa: 40}, monstroTeste(2200, 150, 90)},
	}
	for _, c := range casos {
		jogador := SomarAtributos(AtributosBase(c.nivel), []ItemRPG{{Vida: c.equipo.Vida, Ataque: c.equipo.Ataque, Defesa: c.equipo.Defesa}})
		vitorias := 0
		for semente := int64(0); semente < 200; semente++ {
			if SimularBatalha(jogador, c.monstro, rand.New(rand.NewSource(semente))).Venceu {
				vitorias++
			}
		}
		if vitorias < 120 {
			t.Errorf("%s: venceu só %d de 200", c.nome, vitorias)
		}
	}
}

func TestDificuldadeContra(t *testing.T) {
	monstro := monstroTeste(300, 40, 20)
	poder := CalcularPoder(AtributosRPG{Vida: 300, Ataque: 40, Defesa: 20})
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
