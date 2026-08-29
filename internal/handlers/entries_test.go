package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func TestSanitizacaoRemoveTagsHTML(t *testing.T) {
	entrada := "<script>alert('hack')</script> Texto normal aqui"
	resultado := sanitizer.Sanitize(entrada)

	if strings.Contains(resultado, "<script>") {
		t.Errorf("esperava que a tag <script> fosse removida, mas resultado foi: %s", resultado)
	}
	if !strings.Contains(resultado, "Texto normal aqui") {
		t.Errorf("esperava que o texto legítimo sobrevivesse, mas resultado foi: %s", resultado)
	}
}

func TestHandleCreate_SemAutenticacao(t *testing.T) {
	handler := &EntriesHandler{}

	// Requisição SEM passar pelo middleware — contexto não tem UserIDKey
	req := httptest.NewRequest(http.MethodPost, "/api/entries", strings.NewReader(`{"mal_id": 20}`))
	w := httptest.NewRecorder()

	handler.HandleCreate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("esperava 401 sem autenticação, recebeu: %d", w.Code)
	}
}

func TestHandleCreate_CorpoInvalido(t *testing.T) {
	handler := &EntriesHandler{}

	// Contexto COM usuário válido, mas corpo da requisição quebrado.
	// O handler exige UserIDKey e TokenKey: sem os dois ele corta em 401
	// antes de tentar ler o corpo, e o teste nunca chegaria no 400.
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "usuario-teste-123")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-teste")
	req := httptest.NewRequest(http.MethodPost, "/api/entries", strings.NewReader(`{corpo quebrado`))
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	handler.HandleCreate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 com corpo inválido, recebeu: %d", w.Code)
	}

}

// contextoAutenticado monta o contexto que o middleware montaria em produção,
// junto do parâmetro de rota que o chi extrairia da URL.
//
// Os dois valores de autenticação são obrigatórios: sem eles o handler corta em
// 401 antes de chegar na validação do id, e o teste passaria a medir outra coisa.
func contextoAutenticado(idDaRota string) context.Context {
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "usuario-teste-123")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-teste")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", idDaRota)
	return context.WithValue(ctx, chi.RouteCtxKey, rctx)
}

func TestHandleUpdate_IDInvalido(t *testing.T) {
	handler := &EntriesHandler{}

	// "nova" é exatamente o valor que o frontend enviava antes da correção.
	// O corpo é JSON válido de propósito: se o teste passasse por causa de um
	// corpo quebrado, ele estaria verificando a validação errada.
	req := httptest.NewRequest(http.MethodPut, "/api/entries/nova", strings.NewReader(`{"mal_id": 20}`))
	req = req.WithContext(contextoAutenticado("nova"))
	w := httptest.NewRecorder()

	handler.HandleUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 com id que não é UUID, recebeu: %d", w.Code)
	}
}

func TestHandleDelete_IDInvalido(t *testing.T) {
	handler := &EntriesHandler{}

	req := httptest.NewRequest(http.MethodDelete, "/api/entries/nova", nil)
	req = req.WithContext(contextoAutenticado("nova"))
	w := httptest.NewRecorder()

	handler.HandleDelete(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 com id que não é UUID, recebeu: %d", w.Code)
	}
}
