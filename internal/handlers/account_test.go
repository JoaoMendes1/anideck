package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

const (
	usuarioComum = "b3de232c-b829-4de8-826b-aa3a4b7ede5a"
	usuarioAdmin = "00000000-0000-0000-0000-000000000001"
	usuarioAlvo  = "99999999-9999-9999-9999-999999999999"
)

var errSimulado = errors.New("falha simulada da API admin")

// Monta a requisicao com o user_id ja no contexto, que e como o RequireAuth
// entrega para o handler em producao.
func requisicaoComUsuario(userID string, body string) *http.Request {
	req := httptest.NewRequest(http.MethodDelete, "/api/account", strings.NewReader(body))
	if userID != "" {
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		ctx = context.WithValue(ctx, middleware.AuthTimeKey, time.Now())
		req = req.WithContext(ctx)
	}
	return req
}

func TestExclusaoSemJWTRecebe401(t *testing.T) {
	chamou := false
	h := &AccountHandler{Deletar: func(string) error { chamou = true; return nil }}

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComUsuario("", ""))

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, queria 401", rec.Code)
	}
	if chamou {
		t.Error("a exclusão foi chamada sem usuário autenticado")
	}
}

// O cenario mais grave: um usuario tentando apagar a conta de outro pelo body.
// Com o CASCADE do sql/021, se o handler lesse o body, apagaria a conta e o
// deck da vitima sem volta.
func TestExclusaoIgnoraUserIDDoBody(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	var idRecebido string
	h := &AccountHandler{Deletar: func(id string) error { idRecebido = id; return nil }}

	body := `{"user_id":"` + usuarioAlvo + `"}`
	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComUsuario(usuarioComum, body))

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, queria 200", rec.Code)
	}
	if idRecebido != usuarioComum {
		t.Errorf("apagou %q, queria %q — o handler leu o body", idRecebido, usuarioComum)
	}
}

func TestExclusaoDaContaAdminRecebe403(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	chamou := false
	h := &AccountHandler{Deletar: func(string) error { chamou = true; return nil }}

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComUsuario(usuarioAdmin, ""))

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, queria 403", rec.Code)
	}
	if chamou {
		t.Error("a exclusão da conta admin chegou a ser executada")
	}
}

func TestExclusaoDeUsuarioComumFunciona(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	var idRecebido string
	h := &AccountHandler{Deletar: func(id string) error { idRecebido = id; return nil }}

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComUsuario(usuarioComum, ""))

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, queria 200", rec.Code)
	}
	if idRecebido != usuarioComum {
		t.Errorf("apagou %q, queria %q", idRecebido, usuarioComum)
	}
}

// Falha na API admin nao pode responder sucesso: o frontend faria signOut e a
// pessoa acharia que a conta sumiu, quando ela continua existindo.
func TestFalhaNaAPIAdminRecebe500(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	h := &AccountHandler{Deletar: func(string) error { return errSimulado }}

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComUsuario(usuarioComum, ""))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, queria 500", rec.Code)
	}
}

func requisicaoComAutenticacaoEm(userID string, autenticadoEm time.Time) *http.Request {
	req := httptest.NewRequest(http.MethodDelete, "/api/account", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.AuthTimeKey, autenticadoEm)
	return req.WithContext(ctx)
}

func TestExclusaoComAutenticacaoAntigaRecebe401(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	chamou := false
	h := &AccountHandler{Deletar: func(string) error { chamou = true; return nil }}

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, requisicaoComAutenticacaoEm(usuarioComum, time.Now().Add(-30*time.Minute)))

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, queria 401", rec.Code)
	}
	if chamou {
		t.Error("a exclusão rodou com autenticação antiga")
	}
}

// Token sem amr legível não pode virar passe livre.
func TestExclusaoSemAuthTimeRecebe401(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", usuarioAdmin)

	chamou := false
	h := &AccountHandler{Deletar: func(string) error { chamou = true; return nil }}

	req := httptest.NewRequest(http.MethodDelete, "/api/account", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, usuarioComum))

	rec := httptest.NewRecorder()
	h.HandleDeleteAccount(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, queria 401", rec.Code)
	}
	if chamou {
		t.Error("a exclusão rodou sem prova de autenticação")
	}
}