package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestHandleReadAllNotifications_SemAutenticacao(t *testing.T) {
	h := &NotificationsHandler{}
	req := httptest.NewRequest(http.MethodPut, "/api/notifications/read-all", nil)
	rec := httptest.NewRecorder()

	h.HandleReadAllNotifications(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem contexto de autenticação, veio %d", rec.Code)
	}
}

func TestHandleReadAllNotifications_CaminhoFeliz(t *testing.T) {
	orig := marcarTodasNotificacoesNoBanco
	t.Cleanup(func() { marcarTodasNotificacoesNoBanco = orig })

	var recebidoToken, recebidoUser string
	marcarTodasNotificacoesNoBanco = func(token, userID string) error {
		recebidoToken = token
		recebidoUser = userID
		return nil
	}

	h := &NotificationsHandler{}
	req := httptest.NewRequest(http.MethodPut, "/api/notifications/read-all", nil)
	ctx := context.WithValue(req.Context(), middleware.TokenKey, "jwt-token-valido")
	ctx = context.WithValue(ctx, middleware.UserIDKey, "uuid-usuario-123")
	rec := httptest.NewRecorder()

	h.HandleReadAllNotifications(rec, req.WithContext(ctx))

	if rec.Code != http.StatusOK {
		t.Fatalf("esperava 200 OK, veio %d", rec.Code)
	}
	if recebidoToken != "jwt-token-valido" || recebidoUser != "uuid-usuario-123" {
		t.Errorf("esperava token e userID do JWT, veio token=%q user=%q", recebidoToken, recebidoUser)
	}
}

func TestHandleReadAllNotifications_ErroNoBanco(t *testing.T) {
	orig := marcarTodasNotificacoesNoBanco
	t.Cleanup(func() { marcarTodasNotificacoesNoBanco = orig })

	marcarTodasNotificacoesNoBanco = func(_, _ string) error {
		return errors.New("falha simulada no banco")
	}

	h := &NotificationsHandler{}
	req := httptest.NewRequest(http.MethodPut, "/api/notifications/read-all", nil)
	ctx := context.WithValue(req.Context(), middleware.TokenKey, "jwt-token-valido")
	ctx = context.WithValue(ctx, middleware.UserIDKey, "uuid-usuario-123")
	rec := httptest.NewRecorder()

	h.HandleReadAllNotifications(rec, req.WithContext(ctx))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("esperava 500 em erro de banco, veio %d", rec.Code)
	}
}
