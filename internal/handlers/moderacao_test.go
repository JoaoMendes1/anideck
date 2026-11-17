package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidarDenuncia(t *testing.T) {
	ok := pedidoDenuncia{Tipo: "perfil", Alvo: "beto", Motivo: "ofensa"}
	if msg := validarDenuncia(ok); msg != "" {
		t.Fatalf("pedido válido recusado: %s", msg)
	}
	casos := map[string]pedidoDenuncia{
		"tipo":    {Tipo: "cla", Alvo: "x", Motivo: "spam"},
		"motivo":  {Tipo: "perfil", Alvo: "x", Motivo: "raiva"},
		"alvo":    {Tipo: "perfil", Alvo: "  ", Motivo: "spam"},
		"detalhe": {Tipo: "perfil", Alvo: "x", Motivo: "spam", Detalhe: strings.Repeat("a", 301)},
	}
	for nome, p := range casos {
		if validarDenuncia(p) == "" {
			t.Errorf("%s inválido deveria ser recusado", nome)
		}
	}
}

func TestValidarPunicao(t *testing.T) {
	dias := 7
	ok := PedidoPunicao{Handle: "beto", Tipo: "silenciar", Gravidade: "leve", Motivo: "Spoiler repetido", Dias: &dias}
	if msg := validarPunicao(ok); msg != "" {
		t.Fatalf("pedido válido recusado: %s", msg)
	}
	zero, muitos := 0, 4000
	casos := map[string]PedidoPunicao{
		"multa vazia":    {Tipo: "multa", Gravidade: "media", Motivo: "Ofensa"},
		"sem motivo":     {Tipo: "advertencia", Gravidade: "leve", Motivo: "x"},
		"gravidade":      {Tipo: "advertencia", Gravidade: "extrema", Motivo: "Ofensa"},
		"multa negativa": {Tipo: "multa", Gravidade: "leve", Motivo: "Ofensa", AniCoins: -5, XP: 10},
		"dias zero":      {Tipo: "banir", Gravidade: "grave", Motivo: "Ofensa", Dias: &zero},
		"dias demais":    {Tipo: "banir", Gravidade: "grave", Motivo: "Ofensa", Dias: &muitos},
		"tipo inventado": {Tipo: "exilar", Gravidade: "grave", Motivo: "Ofensa"},
	}
	for nome, p := range casos {
		if validarPunicao(p) == "" {
			t.Errorf("%s deveria ser recusado", nome)
		}
	}
}

func TestDuracaoDoBanimento(t *testing.T) {
	sete := 7
	if d := duracaoDoBanimento(&sete); d != "168h" {
		t.Errorf("7 dias = %s, quer 168h", d)
	}
	if d := duracaoDoBanimento(nil); d != "876000h" {
		t.Errorf("sem fim = %s, quer 876000h", d)
	}
}

func TestDenunciar_SemLogin(t *testing.T) {
	w := httptest.NewRecorder()
	(&ModeracaoHandler{}).HandleDenunciar(w, httptest.NewRequest(http.MethodPost, "/api/denuncias", strings.NewReader(`{}`)))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sem login: esperado 401, veio %d", w.Code)
	}
}
