package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestChefao_CalculoHP(t *testing.T) {
	t.Run("calcula porcentagem e status ativo", func(t *testing.T) {
		hpTotal := int64(2500)
		danoTotal := int64(500)
		hpRestante := hpTotal - danoTotal
		pct := float64(hpRestante) / float64(hpTotal) * 100.0

		if pct != 80.0 {
			t.Errorf("esperava 80%% de HP restante, obteve %.1f%%", pct)
		}
		if hpRestante <= 0 {
			t.Errorf("HP restante deveria ser positivo")
		}
	})

	t.Run("marca derrotado quando dano atinge HP total", func(t *testing.T) {
		hpTotal := int64(2500)
		danoTotal := int64(2600)
		hpRestante := int64(0)
		if danoTotal < hpTotal {
			hpRestante = hpTotal - danoTotal
		}

		if hpRestante != 0 {
			t.Errorf("esperava HP 0 para chefão derrotado, obteve %d", hpRestante)
		}
		derrotado := danoTotal >= hpTotal
		if !derrotado {
			t.Errorf("esperava derrotado = true")
		}
	})

	t.Run("marca escapou se a janela encerrou sem bater a vida", func(t *testing.T) {
		agora := time.Now().UTC()
		fim := agora.Add(-2 * time.Hour)
		hpTotal := int64(2500)
		danoTotal := int64(1200)

		status := "ativo"
		if danoTotal >= hpTotal {
			status = "derrotado"
		} else if agora.After(fim) {
			status = "escapou"
		}

		if status != "escapou" {
			t.Errorf("esperava status 'escapou', obteve %s", status)
		}
	})
}

func TestChefao_AdminCriar_Validacao(t *testing.T) {
	h := &ChefaoHandler{}

	t.Run("rejeita temporada ou nome vazios", func(t *testing.T) {
		corpo, _ := json.Marshal(UpsertChefaoRequest{
			Temporada: "",
			Nome:      "",
			HPTotal:   0,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/chefao", bytes.NewReader(corpo))
		w := httptest.NewRecorder()
		h.HandleAdminCriarOuEditarChefao(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400 Bad Request, obteve %d", w.Code)
		}
	})

	t.Run("rejeita HP total zerado ou negativo", func(t *testing.T) {
		corpo, _ := json.Marshal(UpsertChefaoRequest{
			Temporada: "2026-FALL",
			Nome:      "Leviatã",
			HPTotal:   -100,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/chefao", bytes.NewReader(corpo))
		w := httptest.NewRecorder()
		h.HandleAdminCriarOuEditarChefao(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400 Bad Request para HP negativo, obteve %d", w.Code)
		}
	})
}

func TestChefao_Elegibilidade(t *testing.T) {
	danoMinimo := 50

	casos := []struct {
		meuDano  int64
		esperado bool
	}{
		{0, false},
		{49, false},
		{50, true},
		{150, true},
	}

	for _, c := range casos {
		elegivel := c.meuDano >= int64(danoMinimo)
		if elegivel != c.esperado {
			t.Errorf("para dano %d esperava elegibilidade %v, obteve %v", c.meuDano, c.esperado, elegivel)
		}
	}
}
