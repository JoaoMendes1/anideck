package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func TestValidarReview(t *testing.T) {
	curto := strings.Repeat("a", 99)
	if _, _, msg := validarReview(curto, nil); msg == "" {
		t.Fatal("esperado erro para avaliação abaixo de 100 caracteres")
	}

	longo := strings.Repeat("b", 2001)
	if _, _, msg := validarReview(longo, nil); msg == "" {
		t.Fatal("esperado erro para avaliação acima de 2000 caracteres")
	}

	notaAlta := 10.5
	valido := strings.Repeat("Excelente ", 12)
	if _, _, msg := validarReview(valido, &notaAlta); msg == "" {
		t.Fatal("esperado erro para nota acima de 10")
	}

	notaBaixa := 0.5
	if _, _, msg := validarReview(valido, &notaBaixa); msg == "" {
		t.Fatal("esperado erro para nota abaixo de 1")
	}

	notaOk := 8.546
	txt, n, msg := validarReview("  "+valido+"  ", &notaOk)
	if msg != "" {
		t.Fatalf("não deveria falhar: %s", msg)
	}
	if len([]rune(txt)) < 100 {
		t.Fatalf("texto deveria estar validado: %d", len([]rune(txt)))
	}
	if n == nil || *n != 8.55 {
		t.Fatalf("nota arredondada inesperada: %v", n)
	}
}

func TestMontarReviews_FiltraBloqueadosEOcultosSemVazarUserID(t *testing.T) {
	nota := 9.0
	linhas := []linhaReview{
		{ID: "r1", UserID: "u1", MalID: 10, Nota: &nota, Texto: strings.Repeat("x", 120), ContemSpoiler: true},
		{ID: "r2", UserID: "u2", MalID: 10, Texto: strings.Repeat("y", 120)},
		{ID: "r3", UserID: "u3", MalID: 10, Texto: strings.Repeat("z", 120), Oculto: true},
	}
	autores := map[string]autorComentario{
		"u1": {Handle: "ana", Nome: "Ana"},
		"u2": {Handle: "bia", Nome: "Bia"},
		"u3": {Handle: "cris", Nome: "Cris"},
	}
	bloqueados := map[string]bool{"u2": true}

	lista, minha := montarReviews(linhas, autores, bloqueados, "u1")
	if len(lista) != 1 {
		t.Fatalf("esperada apenas 1 review visível, veio %d", len(lista))
	}
	if !lista[0].Meu || !lista[0].ContemSpoiler || lista[0].Autor.Handle != "ana" {
		t.Fatalf("dados inesperados na review montada: %+v", lista[0])
	}
	if minha == nil || minha.ID != "r1" {
		t.Fatalf("minha review deveria ser r1: %+v", minha)
	}
}

func TestReviewsHandlers_AuthERotas(t *testing.T) {
	h := &ReviewsHandler{}
	r := chi.NewRouter()
	r.Get("/api/anime/{id}/reviews", h.HandleListarReviews)
	r.Put("/api/anime/{id}/reviews", h.HandleSalvarReview)
	r.Delete("/api/anime/{id}/reviews", h.HandleApagarReview)

	// ID inválido na listagem devolve 400
	req := httptest.NewRequest(http.MethodGet, "/api/anime/0/reviews", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400 para mal_id 0, veio %d", rec.Code)
	}

	// Salvar e apagar exigem auth (401)
	for _, method := range []string{http.MethodPut, http.MethodDelete} {
		reqAuth := httptest.NewRequest(method, "/api/anime/10/reviews", bytes.NewBufferString(`{}`))
		recAuth := httptest.NewRecorder()
		r.ServeHTTP(recAuth, reqAuth)
		if recAuth.Code != http.StatusUnauthorized {
			t.Fatalf("%s sem auth deveria dar 401, deu %d", method, recAuth.Code)
		}
	}

	// Texto menor que 100 caracteres autenticado devolve 400 antes do banco
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "u1")
	ctx = context.WithValue(ctx, middleware.TokenKey, "tok")
	reqCurto := httptest.NewRequest(http.MethodPut, "/api/anime/10/reviews", bytes.NewBufferString(`{"texto":"curto","contem_spoiler":false}`)).WithContext(ctx)
	recCurto := httptest.NewRecorder()
	r.ServeHTTP(recCurto, reqCurto)
	if recCurto.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400 para texto curto, veio %d (%s)", recCurto.Code, recCurto.Body.String())
	}
}
