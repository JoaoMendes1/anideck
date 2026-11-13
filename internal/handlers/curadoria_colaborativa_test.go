package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestCuradoriaCollab_ValidacaoCampos(t *testing.T) {
	h := NewCuradoriaCollabHandler()

	r := chi.NewRouter()
	r.Post("/api/curation/sugerir", h.HandleSubmeterSugestao)

	// Sem autenticação (sem token no contexto)
	body, _ := json.Marshal(map[string]interface{}{
		"mal_id": 1,
		"campo":  "titulo_episodio",
		"valor":  "Episódio 1",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/curation/sugerir", bytes.NewReader(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Esperava status 401 sem autenticação, recebeu %d", w.Code)
	}
}

func TestCuradoriaCollab_RevisarSemID(t *testing.T) {
	h := NewCuradoriaCollabHandler()

	r := chi.NewRouter()
	r.Post("/api/admin/curation/sugestoes-collab/{id}/revisar", h.HandleAdminRevisarSugestao)

	req := httptest.NewRequest(http.MethodPost, "/api/admin/curation/sugestoes-collab//revisar", bytes.NewReader([]byte("{}")))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Sem ID ou rota inexistente
	if w.Code != http.StatusNotFound && w.Code != http.StatusBadRequest {
		t.Fatalf("Esperava erro para rota sem ID, recebeu %d", w.Code)
	}
}
