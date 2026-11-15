package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleGetAnimesByIDsRecusaLoteAcimaDoTeto(t *testing.T) {
	corpo, err := json.Marshal(map[string][]int{"ids": make([]int, maxIDsPorLote+1)})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/anime/bulk", bytes.NewReader(corpo))
	rec := httptest.NewRecorder()

	// O teto é conferido antes de qualquer consulta: o handler não chega a usar o cliente.
	(&AnimeHandler{}).HandleGetAnimesByIDs(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d, queria 400", rec.Code)
	}
}

func TestHandleGetAnimesByIDsRecusaCorpoInvalido(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/anime/bulk", bytes.NewReader([]byte("{")))
	rec := httptest.NewRecorder()

	(&AnimeHandler{}).HandleGetAnimesByIDs(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d, queria 400", rec.Code)
	}
}
