package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestHandleGetRatingAnimes(t *testing.T) {
	orig := buscarAnimesPorNota
	t.Cleanup(func() { buscarAnimesPorNota = orig })

	h := &StatsHandler{}

	t.Run("rejeita requisicao sem autenticacao", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/stats/rating?nota=9.5", nil)
		rec := httptest.NewRecorder()
		h.HandleGetRatingAnimes(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("esperava 401, veio %d", rec.Code)
		}
	})

	t.Run("rejeita nota fora do intervalo 0-10", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middleware.TokenKey, "jwt")
		ctx = context.WithValue(ctx, middleware.UserIDKey, "u-1")
		req := httptest.NewRequest(http.MethodGet, "/api/stats/rating?nota=12", nil).WithContext(ctx)
		rec := httptest.NewRecorder()
		h.HandleGetRatingAnimes(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400, veio %d", rec.Code)
		}
	})

	t.Run("devolve animes da nota do usuario autenticado", func(t *testing.T) {
		buscarAnimesPorNota = func(token, userID string, nota float64) ([]map[string]interface{}, error) {
			if userID != "u-1" || nota != 9.5 {
				t.Fatalf("parametros inesperados: user=%s nota=%v", userID, nota)
			}
			return []map[string]interface{}{
				{"mal_id": 52991, "title": "Sousou no Frieren", "nota": 9.5, "status": "Completo"},
			}, nil
		}

		ctx := context.WithValue(context.Background(), middleware.TokenKey, "jwt")
		ctx = context.WithValue(ctx, middleware.UserIDKey, "u-1")
		req := httptest.NewRequest(http.MethodGet, "/api/stats/rating?nota=9.5", nil).WithContext(ctx)
		rec := httptest.NewRecorder()
		h.HandleGetRatingAnimes(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("esperava 200, veio %d", rec.Code)
		}
		var lista []map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &lista); err != nil {
			t.Fatalf("json invalido: %v", err)
		}
		if len(lista) != 1 || lista[0]["title"] != "Sousou no Frieren" {
			t.Fatalf("lista inesperada: %#v", lista)
		}
	})
}

func TestHandleGetStatusAnimes(t *testing.T) {
	orig := buscarAnimesPorStatus
	t.Cleanup(func() { buscarAnimesPorStatus = orig })

	h := &StatsHandler{}

	t.Run("rejeita status desconhecido", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), middleware.TokenKey, "jwt")
		ctx = context.WithValue(ctx, middleware.UserIDKey, "u-1")
		req := httptest.NewRequest(http.MethodGet, "/api/stats/status?status=Invalido", nil).WithContext(ctx)
		rec := httptest.NewRecorder()
		h.HandleGetStatusAnimes(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400, veio %d", rec.Code)
		}
	})

	t.Run("propaga erro do banco como 500", func(t *testing.T) {
		buscarAnimesPorStatus = func(token, userID, status string) ([]map[string]interface{}, error) {
			return nil, errors.New("falha db")
		}
		ctx := context.WithValue(context.Background(), middleware.TokenKey, "jwt")
		ctx = context.WithValue(ctx, middleware.UserIDKey, "u-1")
		req := httptest.NewRequest(http.MethodGet, "/api/stats/status?status=Completo", nil).WithContext(ctx)
		rec := httptest.NewRecorder()
		h.HandleGetStatusAnimes(rec, req)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("esperava 500, veio %d", rec.Code)
		}
	})
}
