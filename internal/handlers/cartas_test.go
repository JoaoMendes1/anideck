package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCartasSemAutenticacao(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/cartas", nil)
	rec := httptest.NewRecorder()
	h.HandleMinhasCartas(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 para requisição sem token, obteve %d", rec.Code)
	}

	reqFav := httptest.NewRequest(http.MethodGet, "/api/personagens-favoritos", nil)
	recFav := httptest.NewRecorder()
	h.HandleGetPersonagensFavoritos(recFav, reqFav)

	if recFav.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 para requisição sem token em personagens favoritos, obteve %d", recFav.Code)
	}
}

func TestDueloParametrosInvalidos(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/membros/alice/duelo/alice", nil)
	rec := httptest.NewRecorder()
	h.HandleDueloDeGosto(rec, req)

	// Mesmo handle deve retornar 400
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400 ao duelar consigo mesmo, obteve %d", rec.Code)
	}
}

func TestFavoritarPersonagemInvalido(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodPost, "/api/personagens-favoritos", strings.NewReader(`{"character_id": 0}`))
	rec := httptest.NewRecorder()
	h.HandleFavoritarPersonagem(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem autenticação, obteve %d", rec.Code)
	}
}
