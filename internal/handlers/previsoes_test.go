package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidacaoClasses(t *testing.T) {
	classesValidas := []string{"bardo", "ranger", "paladino"}
	for _, c := range classesValidas {
		corpo, _ := json.Marshal(EscolherClasseRequest{Classe: c})
		req := httptest.NewRequest("POST", "/api/perfil/classe", bytes.NewReader(corpo))
		w := httptest.NewRecorder()

		handler := &PrevisoesHandler{}
		handler.HandleEscolherClasse(w, req)

		// Sem token de autenticação deve responder 401
		if w.Code != http.StatusUnauthorized {
			t.Errorf("para classe %s esperado 401 Unauthorized, veio %d", c, w.Code)
		}
	}

	classesInvalidas := []string{"mago", "guerreiro", "cavaleiro", ""}
	for _, c := range classesInvalidas {
		corpo, _ := json.Marshal(EscolherClasseRequest{Classe: c})
		req := httptest.NewRequest("POST", "/api/perfil/classe", bytes.NewReader(corpo))
		w := httptest.NewRecorder()

		handler := &PrevisoesHandler{}
		handler.HandleEscolherClasse(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("para classe inválida %s esperado 401 (sem auth), veio %d", c, w.Code)
		}
	}
}

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
