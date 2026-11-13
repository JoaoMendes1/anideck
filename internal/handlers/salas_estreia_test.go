package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func TestSalasEstreia_StatusAoVivo(t *testing.T) {
	agora := time.Now().UTC()

	t.Run("sala ativa dentro da janela de 3 horas", func(t *testing.T) {
		abreEm := agora.Add(-30 * time.Minute)
		fechaEm := abreEm.Add(3 * time.Hour)
		sala := SalaEstreia{
			ID:          "sala-1",
			AbreEm:      abreEm,
			FechaEm:     fechaEm,
			Encerrada:   false,
			TituloAnime: "Frieren",
			Episodio:    5,
		}

		aoVivo := !sala.Encerrada && agora.After(sala.AbreEm) && agora.Before(sala.FechaEm)
		if !aoVivo {
			t.Errorf("esperava sala ao vivo, obteve falso")
		}
		segundos := int(sala.FechaEm.Sub(agora).Seconds())
		if segundos <= 0 {
			t.Errorf("esperava segundos restantes positivos, obteve %d", segundos)
		}
	})

	t.Run("sala futura ainda não iniciada", func(t *testing.T) {
		abreEm := agora.Add(2 * time.Hour)
		fechaEm := abreEm.Add(3 * time.Hour)
		sala := SalaEstreia{
			ID:          "sala-2",
			AbreEm:      abreEm,
			FechaEm:     fechaEm,
			Encerrada:   false,
			TituloAnime: "Solo Leveling",
			Episodio:    8,
		}

		aoVivo := !sala.Encerrada && agora.After(sala.AbreEm) && agora.Before(sala.FechaEm)
		if aoVivo {
			t.Errorf("sala futura não deveria estar ao vivo")
		}
	})

	t.Run("sala passada com mais de 3 horas encerrada", func(t *testing.T) {
		abreEm := agora.Add(-4 * time.Hour)
		fechaEm := abreEm.Add(3 * time.Hour)
		sala := SalaEstreia{
			ID:          "sala-3",
			AbreEm:      abreEm,
			FechaEm:     fechaEm,
			Encerrada:   true,
			TituloAnime: "Demon Slayer",
			Episodio:    1,
		}

		aoVivo := !sala.Encerrada && agora.After(sala.AbreEm) && agora.Before(sala.FechaEm)
		if aoVivo {
			t.Errorf("sala encerrada não deveria estar ao vivo")
		}
	})
}

func TestSalasEstreia_EnviarMensagem_Validacao(t *testing.T) {
	h := &SalasEstreiaHandler{}

	t.Run("rejeita sem autenticação", func(t *testing.T) {
		corpo, _ := json.Marshal(CriarMensagemRequest{Conteudo: "Anime incrível!"})
		req := httptest.NewRequest(http.MethodPost, "/api/salas-estreia/sala-123/mensagens", bytes.NewReader(corpo))
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "sala-123")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		w := httptest.NewRecorder()
		h.HandleEnviarMensagem(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("esperava 401 Unauthorized, obteve %d", w.Code)
		}
	})

	t.Run("rejeita mensagem vazia", func(t *testing.T) {
		corpo, _ := json.Marshal(CriarMensagemRequest{Conteudo: "   "})
		req := httptest.NewRequest(http.MethodPost, "/api/salas-estreia/sala-123/mensagens", bytes.NewReader(corpo))
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "sala-123")
		ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
		ctx = context.WithValue(ctx, middleware.UserIDKey, "user-teste-123")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.HandleEnviarMensagem(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400 Bad Request para mensagem vazia, obteve %d", w.Code)
		}
	})

	t.Run("rejeita mensagem com mais de 280 caracteres", func(t *testing.T) {
		textoLongo := string(bytes.Repeat([]byte("a"), 281))
		corpo, _ := json.Marshal(CriarMensagemRequest{Conteudo: textoLongo})
		req := httptest.NewRequest(http.MethodPost, "/api/salas-estreia/sala-123/mensagens", bytes.NewReader(corpo))
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "sala-123")
		ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
		ctx = context.WithValue(ctx, middleware.UserIDKey, "user-teste-123")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.HandleEnviarMensagem(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400 Bad Request para mensagem maior que 280 caracteres, obteve %d", w.Code)
		}
	})
}

func TestSalasEstreia_AdminCriarSala_Validacao(t *testing.T) {
	h := &SalasEstreiaHandler{}

	t.Run("rejeita dados incompletos", func(t *testing.T) {
		corpo, _ := json.Marshal(CriarSalaManualRequest{
			MalID:       0,
			Episodio:    1,
			TituloAnime: "",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/admin/salas-estreia", bytes.NewReader(corpo))
		w := httptest.NewRecorder()
		h.HandleAdminCriarSalaManual(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperava 400 Bad Request para dados inválidos, obteve %d", w.Code)
		}
	})
}
