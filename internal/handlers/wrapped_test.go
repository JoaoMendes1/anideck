package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestWrapped_ValidacaoAnoInvalido(t *testing.T) {
	h := NewWrappedHandler()

	r := chi.NewRouter()
	r.Get("/api/wrapped/{ano}", h.HandleGetMeuWrapped)

	// Ano com texto
	req := httptest.NewRequest(http.MethodGet, "/api/wrapped/invalido", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperava status 400 para ano não numérico, recebeu %d", w.Code)
	}

	// Ano muito antigo
	req2 := httptest.NewRequest(http.MethodGet, "/api/wrapped/1990", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusBadRequest {
		t.Fatalf("Esperava status 400 para ano anterior a 2000, recebeu %d", w2.Code)
	}

	// Ano muito no futuro
	req3 := httptest.NewRequest(http.MethodGet, "/api/wrapped/2999", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusBadRequest {
		t.Fatalf("Esperava status 400 para ano distante no futuro, recebeu %d", w3.Code)
	}
}

func TestWrapped_SemTokenRecebe401(t *testing.T) {
	h := NewWrappedHandler()

	r := chi.NewRouter()
	r.Get("/api/wrapped/{ano}", h.HandleGetMeuWrapped)

	req := httptest.NewRequest(http.MethodGet, "/api/wrapped/2026", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Esperava status 401 sem JWT, recebeu %d", w.Code)
	}
}

func TestWrappedPublico_HandleVazioOuAnoInvalido(t *testing.T) {
	h := NewWrappedHandler()

	r := chi.NewRouter()
	r.Get("/api/u/{handle}/wrapped/{ano}", h.HandleGetWrappedPublico)

	req := httptest.NewRequest(http.MethodGet, "/api/u/alguem/wrapped/ano-invalido", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperava status 400 para ano inválido no wrapped público, recebeu %d", w.Code)
	}
}
