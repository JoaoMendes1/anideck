package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestNormalizarConfigInicio_MantemOrdemEPreencheNovasSecoes(t *testing.T) {
	cfg := NormalizarConfigInicio(ConfigInicio{
		Ordem:         []string{"ranking", "desconhecida", "continuar", "ranking", "destaques"},
		Ocultas:       []string{"lacuna", "lacuna", "invalida"},
		Minimizadas:   []string{"trilhas", "ranking"},
		DestaqueFonte: "invalida",
	})

	if cfg.Ordem[0] != "ranking" || cfg.Ordem[1] != "continuar" || cfg.Ordem[2] != "destaques" {
		t.Fatalf("ordem inesperada no início: %v", cfg.Ordem)
	}
	if len(cfg.Ordem) != len(SecoesInicioPadrao) {
		t.Fatalf("esperava %d seções na ordem completa, obteve %d (%v)", len(SecoesInicioPadrao), len(cfg.Ordem), cfg.Ordem)
	}
	if !reflect.DeepEqual(cfg.Ocultas, []string{"lacuna"}) {
		t.Fatalf("ocultas inválidas ou duplicadas: %v", cfg.Ocultas)
	}
	if !reflect.DeepEqual(cfg.Minimizadas, []string{"trilhas", "ranking"}) {
		t.Fatalf("minimizadas inesperadas: %v", cfg.Minimizadas)
	}
	if cfg.DestaqueFonte != "curadoria" {
		t.Fatalf("destaque_fonte deveria cair no padrão curadoria, obteve %q", cfg.DestaqueFonte)
	}
}

func TestNormalizarConfigInicio_AceitaFontesValidas(t *testing.T) {
	for fonte := range FontesDestaqueValidas {
		cfg := NormalizarConfigInicio(ConfigInicio{DestaqueFonte: fonte})
		if cfg.DestaqueFonte != fonte {
			t.Errorf("fonte %q deveria ser preservada, virou %q", fonte, cfg.DestaqueFonte)
		}
	}
}

func TestHandleGetPreferencias_SemAutenticacaoRetorna401(t *testing.T) {
	h := &InicioPreferenciasHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/inicio/preferencias", nil)
	res := httptest.NewRecorder()
	h.HandleGetPreferencias(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem autenticação, obteve %d", res.Code)
	}
}

func TestHandleSalvarPreferencias_CorpoInvalidoRetorna400(t *testing.T) {
	h := &InicioPreferenciasHandler{}
	req := httptest.NewRequest(http.MethodPut, "/api/inicio/preferencias", strings.NewReader("{json inválido"))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "11111111-1111-4111-8111-111111111111")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-teste")
	req = req.WithContext(ctx)

	res := httptest.NewRecorder()
	h.HandleSalvarPreferencias(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400 para JSON inválido, obteve %d", res.Code)
	}
}
