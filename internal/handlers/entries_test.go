package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
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

	// Contexto COM usuário válido, mas corpo da requisição quebrado
	ctx := context.WithValue(context.Background(), middleware.UserIDKey, "usuario-teste-123")
	req := httptest.NewRequest(http.MethodPost, "/api/entries", strings.NewReader(`{corpo quebrado`))
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	handler.HandleCreate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("esperava 400 com corpo inválido, recebeu: %d", w.Code)
	}
}