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

func TestMontarVida(t *testing.T) {
	casos := []struct {
		maxima, perda, atual, perdaEsperada int
	}{
		{300, 0, 300, 0},
		{300, 500, 150, 500},
		{300, 1000, 0, 1000},
		{300, 999, 1, 999},   // quem tem perda menor que a total nunca aparece com 0
		{300, -20, 300, 0},   // valor fora da faixa é cortado
		{300, 1500, 0, 1000}, // idem
		{0, 0, 1, 0},         // Vida máxima ausente vira 1, sem divisão por zero
		{1234, 80, 1135, 80}, // 8% de um episódio
	}
	for _, c := range casos {
		v := MontarVida(c.maxima, c.perda)
		if v.Atual != c.atual || v.PerdidaPorMil != c.perdaEsperada {
			t.Errorf("MontarVida(%d, %d) = %+v; queria atual %d e perda %d", c.maxima, c.perda, v, c.atual, c.perdaEsperada)
		}
	}
}

func TestPerdaPorMil(t *testing.T) {
	casos := []struct {
		maxima, final, perda int
	}{
		{300, 300, 0},
		{300, 400, 0},
		{300, 150, 500},
		{300, 0, 1000},
		{300, -5, 1000},
		{300, 1, 997},
		{100000, 1, 999}, // sobrevivente nunca é gravado como Vida zerada
		{0, 50, 1000},
	}
	for _, c := range casos {
		if p := PerdaPorMil(c.maxima, c.final); p != c.perda {
			t.Errorf("PerdaPorMil(%d, %d) = %d; queria %d", c.maxima, c.final, p, c.perda)
		}
	}
	// Ida e volta: gravar e ler de novo não muda a Vida em mais de um ponto.
	for final := 1; final <= 300; final++ {
		v := MontarVida(300, PerdaPorMil(300, final))
		if diff := v.Atual - final; diff < -1 || diff > 1 {
			t.Fatalf("Vida %d gravada voltou como %d", final, v.Atual)
		}
	}
}

func TestCustosDaRecuperacao(t *testing.T) {
	if c := CustosPara(30); c.Pousada != 70 || c.Pocao != 35 {
		t.Errorf("custos no nível 30: %+v", c)
	}
	if c := CustosPara(0); c.Pousada != 12 || c.Pocao != 6 {
		t.Errorf("nível abaixo de 1 vale como 1: %+v", c)
	}
	if custo, ok := CustoDaRecuperacao("pousada", 10); !ok || custo != 30 {
		t.Errorf("pousada no nível 10: %d %v", custo, ok)
	}
	if custo, ok := CustoDaRecuperacao("pocao", 10); !ok || custo != 15 {
		t.Errorf("poção no nível 10: %d %v", custo, ok)
	}
	for _, tipo := range []string{"", "POUSADA", "elixir", "pousada "} {
		if _, ok := CustoDaRecuperacao(tipo, 10); ok {
			t.Errorf("%q deveria ser recusado", tipo)
		}
	}
}

func TestSimularBatalha_ComecaComAVidaGuardada(t *testing.T) {
	jogador := combatente(30, AtributosBase(30))
	monstro := monstroDoNivel(30, "comum", 1200, 95, 55)

	cheia := SimularBatalha(jogador, monstro, rand.New(rand.NewSource(7)))
	jogador.VidaInicial = jogador.Atributos.Vida + 500 // acima da máxima vale como cheia
	acima := SimularBatalha(jogador, monstro, rand.New(rand.NewSource(7)))
	if cheia.VidaFinal != acima.VidaFinal || len(cheia.Turnos) != len(acima.Turnos) {
		t.Fatalf("Vida acima da máxima deveria ser a luta com Vida cheia")
	}

	jogador.VidaInicial = 40
	ferido := SimularBatalha(jogador, monstro, rand.New(rand.NewSource(7)))
	for _, turno := range ferido.Turnos {
		if turno.VidaJogador > jogador.Atributos.Vida {
			t.Fatalf("a Vida nunca passa da máxima: %+v", turno)
		}
	}
	primeiro := ferido.Turnos[0]
	if primeiro.Atacante == "jogador" && primeiro.Cura == 0 && primeiro.VidaJogador != 40 {
		t.Errorf("o primeiro golpe do jogador não muda a Vida dele: %+v", primeiro)
	}
	if ferido.VidaInicial != 40 || cheia.VidaInicial != jogador.Atributos.Vida {
		t.Errorf("VidaInicial: ferido %d, cheia %d", ferido.VidaInicial, cheia.VidaInicial)
	}
	ultimo := ferido.Turnos[len(ferido.Turnos)-1]
	if ferido.VidaFinal != ultimo.VidaJogador {
		t.Errorf("VidaFinal %d diferente do último turno %d", ferido.VidaFinal, ultimo.VidaJogador)
	}
}

func TestSimularBatalha_DerrotaTerminaSemVida(t *testing.T) {
	jogador := combatente(1, AtributosBase(1))
	for semente := int64(0); semente < 30; semente++ {
		r := SimularBatalha(jogador, monstroDoNivel(60, "chefe", 4800, 255, 155), rand.New(rand.NewSource(semente)))
		if r.Venceu || r.VidaFinal != 0 {
			t.Fatalf("nível 1 contra o chefe final cai com Vida zero: venceu=%v final=%d", r.Venceu, r.VidaFinal)
		}
		if PerdaPorMil(jogador.Atributos.Vida, r.VidaFinal) != perdaTotalPorMil {
			t.Fatalf("derrota grava a perda total")
		}
	}
}

func requisicaoRPG(metodo, rota, corpo string, autenticado bool) *http.Request {
	req := httptest.NewRequest(metodo, rota, bytes.NewReader([]byte(corpo)))
	if !autenticado {
		return req
	}
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
	return req.WithContext(ctx)
}

func TestHandleRecuperar(t *testing.T) {
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleRecuperar(w, requisicaoRPG(http.MethodPost, "/api/rpg/recuperar", `{"tipo":"pousada"}`, false))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sem autenticação: esperava 401, recebeu %d", w.Code)
	}

	for _, corpo := range []string{`{"tipo":"elixir"}`, `{}`, `nada`} {
		w = httptest.NewRecorder()
		(&RPGHandler{}).HandleRecuperar(w, requisicaoRPG(http.MethodPost, "/api/rpg/recuperar", corpo, true))
		if w.Code != http.StatusBadRequest {
			t.Errorf("corpo %q: esperava 400, recebeu %d", corpo, w.Code)
		}
	}

	// Tipo válido passa da validação e só para no banco, que não existe no teste.
	w = httptest.NewRecorder()
	(&RPGHandler{}).HandleRecuperar(w, requisicaoRPG(http.MethodPost, "/api/rpg/recuperar", `{"tipo":"pocao"}`, true))
	if w.Code != http.StatusNotFound && w.Code != http.StatusServiceUnavailable {
		t.Fatalf("tipo válido sem banco: esperava 404 ou 503, recebeu %d", w.Code)
	}
}
