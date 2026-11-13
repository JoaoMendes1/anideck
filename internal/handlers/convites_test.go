package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRegrasConvitesPadrao(t *testing.T) {
	regras := RegrasConvitesPadrao()
	if regras.AniCoinsAnfitriao <= 0 {
		t.Errorf("esperava anicoins_anfitriao > 0, obteve %d", regras.AniCoinsAnfitriao)
	}
	if regras.AniCoinsConvidadoAdmin <= regras.AniCoinsConvidado {
		t.Errorf("esperava bônus de admin maior que comum: admin=%d, comum=%d",
			regras.AniCoinsConvidadoAdmin, regras.AniCoinsConvidado)
	}
	if regras.TituloConvidadoAdmin != "Afilhado do Fundador" {
		t.Errorf("título inesperado: %s", regras.TituloConvidadoAdmin)
	}
}

func TestHandleResgatarConviteSemToken(t *testing.T) {
	h := &ConvitesHandler{}
	body, _ := json.Marshal(ResgatarConviteRequest{Codigo: "teste"})
	req := httptest.NewRequest(http.MethodPost, "/api/convites/resgatar", bytes.NewReader(body))
	w := httptest.NewRecorder()

	h.HandleResgatarConvite(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("esperava status 401 para requisição sem token, obteve %d", w.Code)
	}
}

func TestHandleObterMeuConviteSemToken(t *testing.T) {
	h := &ConvitesHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/convites/meu", nil)
	w := httptest.NewRecorder()

	h.HandleObterMeuConvite(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("esperava status 401 para requisição sem token, obteve %d", w.Code)
	}
}
