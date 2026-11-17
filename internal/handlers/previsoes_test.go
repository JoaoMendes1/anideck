package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidacaoApostaMana(t *testing.T) {
	manasInvalidas := []int{0, 2, 4, 26, 50, -10}
	for _, m := range manasInvalidas {
		corpo, _ := json.Marshal(ApostarPrevisaoRequest{OpcaoID: 1, Mana: m})
		req := httptest.NewRequest("POST", "/api/previsoes/123/apostar", bytes.NewReader(corpo))
		w := httptest.NewRecorder()

		handler := &PrevisoesHandler{}
		handler.HandleApostarPrevisao(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("para mana %d esperado 401, veio %d", m, w.Code)
		}
	}
}
