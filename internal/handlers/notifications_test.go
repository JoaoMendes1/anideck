package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
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

func TestHandleRequestBetaInvite_ValidacaoECaminhoFeliz(t *testing.T) {
	orig := registrarSolicitacaoConviteBeta
	t.Cleanup(func() { registrarSolicitacaoConviteBeta = orig })

	var recebidoNome, recebidoEmail string
	registrarSolicitacaoConviteBeta = func(nome, email string) error {
		recebidoNome = nome
		recebidoEmail = email
		return nil
	}

	h := &NotificationsHandler{}

	// 1. Nome muito curto -> 400
	reqInvalido := httptest.NewRequest(http.MethodPost, "/api/beta/request-invite", strings.NewReader(`{"nome":"A","email":"teste@anideck.app"}`))
	recInvalido := httptest.NewRecorder()
	h.HandleRequestBetaInvite(recInvalido, reqInvalido)
	if recInvalido.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400 para nome curto, veio %d", recInvalido.Code)
	}

	// 2. E-mail inválido -> 400
	reqEmailInv := httptest.NewRequest(http.MethodPost, "/api/beta/request-invite", strings.NewReader(`{"nome":"João","email":"invalido-sem-arroba"}`))
	recEmailInv := httptest.NewRecorder()
	h.HandleRequestBetaInvite(recEmailInv, reqEmailInv)
	if recEmailInv.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400 para email inválido, veio %d", recEmailInv.Code)
	}

	// 3. Caminho feliz -> 201 Created
	reqOk := httptest.NewRequest(http.MethodPost, "/api/beta/request-invite", strings.NewReader(`{"nome":"  Maria Silva ","email":"  Maria@Exemplo.com "}`))
	recOk := httptest.NewRecorder()
	h.HandleRequestBetaInvite(recOk, reqOk)
	if recOk.Code != http.StatusCreated {
		t.Fatalf("esperava 201 Created, veio %d (%s)", recOk.Code, recOk.Body.String())
	}
	if recebidoNome != "Maria Silva" || recebidoEmail != "maria@exemplo.com" {
		t.Errorf("esperava nome e email higienizados, veio nome=%q email=%q", recebidoNome, recebidoEmail)
	}
}

func TestEpisodioCuradoNoFuturo(t *testing.T) {
	curadoFuturo := models.CuratedAnime{
		MalID:          100,
		CustomEpisodes: json.RawMessage(`[{"number":19,"aired_at":"2020-01-01"},{"number":20,"aired_at":"2099-12-31"}]`),
	}
	if episodioCuradoNoFuturo(curadoFuturo, 19) {
		t.Errorf("episódio 19 já exibido não deveria estar bloqueado")
	}
	if !episodioCuradoNoFuturo(curadoFuturo, 20) {
		t.Errorf("episódio 20 futuro deveria estar bloqueado")
	}
	if !episodioCuradoNoFuturo(curadoFuturo, 21) {
		t.Errorf("episódio 21 após o próximo lançamento deveria estar bloqueado")
	}
}
