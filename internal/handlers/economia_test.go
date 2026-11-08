package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestValidarRegrasEconomia(t *testing.T) {
	t.Run("padrao eh valido", func(t *testing.T) {
		padrao := RegrasEconomiaPadrao()
		if msg := ValidarRegrasEconomia(padrao); msg != "" {
			t.Fatalf("Regras padrao deveriam ser validas, recebido: %s", msg)
		}
	})

	t.Run("rejeita teto diario invalido", func(t *testing.T) {
		r := RegrasEconomiaPadrao()
		r.TetoDiarioCristais = 5
		if msg := ValidarRegrasEconomia(r); msg == "" {
			t.Fatal("Deveria rejeitar teto < 10")
		}
	})

	t.Run("rejeita ganho missao maior que teto diario", func(t *testing.T) {
		r := RegrasEconomiaPadrao()
		r.TetoDiarioCristais = 50
		r.GanhoMissaoDiaria = 60
		if msg := ValidarRegrasEconomia(r); msg == "" {
			t.Fatal("Deveria rejeitar ganho de missao > teto diario")
		}
	})

	t.Run("rejeita ganhos invalidos", func(t *testing.T) {
		r := RegrasEconomiaPadrao()
		r.GanhoDesafioSemanal = 0
		if msg := ValidarRegrasEconomia(r); msg == "" {
			t.Fatal("Deveria rejeitar ganho desafio semanal <= 0")
		}

		r = RegrasEconomiaPadrao()
		r.GanhoVitoriaLiga = -10
		if msg := ValidarRegrasEconomia(r); msg == "" {
			t.Fatal("Deveria rejeitar ganho vitoria liga < 0")
		}
	})
}

func TestEconomiaCarteira_NaoAutorizado(t *testing.T) {
	handler := &EconomiaHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/economia/carteira", nil)
	rec := httptest.NewRecorder()

	handler.HandleGetCarteira(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Esperado 401 para usuario sem sessao, recebido: %d", rec.Code)
	}
}

func TestEconomiaAjusteManual_Validacoes(t *testing.T) {
	handler := &EconomiaHandler{}

	t.Run("rejeita user_id vazio", func(t *testing.T) {
		corpo, _ := json.Marshal(AjusteManualPayload{
			UserID:          "",
			Quantidade:      10,
			MotivoDetalhado: "Teste",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/economia/ajuste", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "admin-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleAjusteManual(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para user_id vazio, recebido %d", rec.Code)
		}
	})

	t.Run("rejeita quantidade zero", func(t *testing.T) {
		corpo, _ := json.Marshal(AjusteManualPayload{
			UserID:          "user-1",
			Quantidade:      0,
			MotivoDetalhado: "Teste",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/economia/ajuste", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "admin-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleAjusteManual(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para quantidade zero, recebido %d", rec.Code)
		}
	})

	t.Run("rejeita motivo curto", func(t *testing.T) {
		corpo, _ := json.Marshal(AjusteManualPayload{
			UserID:          "user-1",
			Quantidade:      15,
			MotivoDetalhado: "oi",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/economia/ajuste", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "admin-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleAjusteManual(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para motivo curto, recebido %d", rec.Code)
		}
	})
}

func TestEconomiaTransferir_Validacoes(t *testing.T) {
	handler := &EconomiaHandler{}

	t.Run("rejeita sem autenticacao", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/economia/transferir", nil)
		rec := httptest.NewRecorder()
		handler.HandleTransferirAniCoins(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Esperado 401 para usuario sem sessao, recebido %d", rec.Code)
		}
	})

	t.Run("rejeita handle vazio", func(t *testing.T) {
		corpo, _ := json.Marshal(TransferirPayload{
			DestinatarioHandle: "",
			Quantidade:         10,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/economia/transferir", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-remetente")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleTransferirAniCoins(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para handle vazio, recebido %d", rec.Code)
		}
	})

	t.Run("rejeita quantidade zero ou negativa", func(t *testing.T) {
		corpo, _ := json.Marshal(TransferirPayload{
			DestinatarioHandle: "joao",
			Quantidade:         -5,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/economia/transferir", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-remetente")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleTransferirAniCoins(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para quantidade negativa, recebido %d", rec.Code)
		}
	})

	t.Run("rejeita quantidade acima do teto maximo", func(t *testing.T) {
		corpo, _ := json.Marshal(TransferirPayload{
			DestinatarioHandle: "joao",
			Quantidade:         100000,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/economia/transferir", bytes.NewReader(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user-remetente")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()

		handler.HandleTransferirAniCoins(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Esperado 400 para quantidade acima de 50.000, recebido %d", rec.Code)
		}
	})
}

func TestEconomiaBuscarDestinatario_TermoCurto(t *testing.T) {
	handler := &EconomiaHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/economia/buscar-destinatario?q=a", nil)
	rec := httptest.NewRecorder()

	handler.HandleBuscarDestinatario(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, recebido %d", rec.Code)
	}

	var resultado []DestinatarioSugestao
	json.NewDecoder(rec.Body).Decode(&resultado)
	if len(resultado) != 0 {
		t.Fatalf("Esperado array vazio para termo menor que 2 caracteres, recebido %d itens", len(resultado))
	}
}
