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

func contextoComMalID(malID string) context.Context {
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "usuario-teste-123")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-teste")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("mal_id", malID)
	return context.WithValue(ctx, chi.RouteCtxKey, rctx)
}

func TestValidarPedidoSaidaCompleto(t *testing.T) {
	if err := validarPedidoSaidaCompleto("vou_rever", "Assistindo"); err != nil {
		t.Errorf("esperava escolha vou_rever + Assistindo válida, erro: %v", err)
	}
	if err := validarPedidoSaidaCompleto("desisti_ou_errado", "Dropado"); err != nil {
		t.Errorf("esperava escolha desisti_ou_errado + Dropado válida, erro: %v", err)
	}
	if err := validarPedidoSaidaCompleto("outra", "Assistindo"); err == nil {
		t.Errorf("esperava erro para escolha inválida")
	}
	if err := validarPedidoSaidaCompleto("vou_rever", "Completo"); err == nil {
		t.Errorf("esperava erro ao tentar sair de Completo para Completo")
	}
	if err := validarPedidoSaidaCompleto("desisti_ou_errado", ""); err == nil {
		t.Errorf("esperava erro para status vazio")
	}
}

func TestHandlePreviaSaidaCompleto_Validacao(t *testing.T) {
	handler := &EntriesHandler{}

	reqSemAuth := httptest.NewRequest(http.MethodGet, "/api/entries/20/saida-completo", nil)
	wSemAuth := httptest.NewRecorder()
	handler.HandlePreviaSaidaCompleto(wSemAuth, reqSemAuth)
	if wSemAuth.Code != http.StatusUnauthorized {
		t.Errorf("esperava 401 sem autenticação, recebeu: %d", wSemAuth.Code)
	}

	reqInvalido := httptest.NewRequest(http.MethodGet, "/api/entries/0/saida-completo", nil)
	reqInvalido = reqInvalido.WithContext(contextoComMalID("0"))
	wInvalido := httptest.NewRecorder()
	handler.HandlePreviaSaidaCompleto(wInvalido, reqInvalido)
	if wInvalido.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 para mal_id=0, recebeu: %d", wInvalido.Code)
	}
}

func TestHandleExecutarSaidaCompleto_Validacao(t *testing.T) {
	handler := &EntriesHandler{}

	reqSemAuth := httptest.NewRequest(http.MethodPost, "/api/entries/20/saida-completo", strings.NewReader(`{}`))
	wSemAuth := httptest.NewRecorder()
	handler.HandleExecutarSaidaCompleto(wSemAuth, reqSemAuth)
	if wSemAuth.Code != http.StatusUnauthorized {
		t.Errorf("esperava 401 sem autenticação, recebeu: %d", wSemAuth.Code)
	}

	reqEscolhaRuim := httptest.NewRequest(http.MethodPost, "/api/entries/20/saida-completo",
		strings.NewReader(`{"escolha":"burlar","novo_status":"Assistindo"}`))
	reqEscolhaRuim = reqEscolhaRuim.WithContext(contextoComMalID("20"))
	wEscolhaRuim := httptest.NewRecorder()
	handler.HandleExecutarSaidaCompleto(wEscolhaRuim, reqEscolhaRuim)
	if wEscolhaRuim.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 para escolha inválida, recebeu: %d", wEscolhaRuim.Code)
	}

	reqNotaRuim := httptest.NewRequest(http.MethodPost, "/api/entries/20/saida-completo",
		strings.NewReader(`{"escolha":"vou_rever","novo_status":"Assistindo","nota":11}`))
	reqNotaRuim = reqNotaRuim.WithContext(contextoComMalID("20"))
	wNotaRuim := httptest.NewRecorder()
	handler.HandleExecutarSaidaCompleto(wNotaRuim, reqNotaRuim)
	if wNotaRuim.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 para nota > 10, recebeu: %d", wNotaRuim.Code)
	}
}

