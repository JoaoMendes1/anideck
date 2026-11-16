package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCartasSemAutenticacao(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/cartas", nil)
	rec := httptest.NewRecorder()
	h.HandleMinhasCartas(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 para requisição sem token, obteve %d", rec.Code)
	}

	reqFav := httptest.NewRequest(http.MethodGet, "/api/personagens-favoritos", nil)
	recFav := httptest.NewRecorder()
	h.HandleGetPersonagensFavoritos(recFav, reqFav)

	if recFav.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 para requisição sem token em personagens favoritos, obteve %d", recFav.Code)
	}
}

func TestDueloParametrosInvalidos(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodGet, "/api/membros/alice/duelo/alice", nil)
	rec := httptest.NewRecorder()
	h.HandleDueloDeGosto(rec, req)

	// Mesmo handle deve retornar 400
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400 ao duelar consigo mesmo, obteve %d", rec.Code)
	}
}

func TestFavoritarPersonagemInvalido(t *testing.T) {
	h := &CartasHandler{}

	req := httptest.NewRequest(http.MethodPost, "/api/personagens-favoritos", strings.NewReader(`{"character_id": 0}`))
	rec := httptest.NewRecorder()
	h.HandleFavoritarPersonagem(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem autenticação, obteve %d", rec.Code)
	}
}

func TestMesclarMetadadosCartas(t *testing.T) {
	brutas := []linhaCartaBanco{
		{ID: "c1", MalID: 154587, Raridade: "rarissima", IsFoil: true, Estreia: true, Nota: 10},
		{ID: "c2", MalID: 16498, Raridade: "rara", IsFoil: false, Estreia: false, Nota: 9},
		{ID: "c3", MalID: 54852, Raridade: "comum", IsFoil: false, Estreia: false, Nota: 7},
	}

	metas := map[int]metaCacheCarta{
		154587: {MalID: 154587, Title: "Sousou no Frieren"},
		16498:  {MalID: 16498, Title: "Shingeki no Kyojin"},
	}

	curadas := map[int]metaCuradaCarta{
		154587: {
			MalID:            154587,
			CustomTitle:      "Frieren e a Jornada para o Além",
			CustomCoverImage: "https://cdn.exemplo.com/frieren.jpg",
		},
	}

	cartas := mesclarMetadadosCartas(brutas, metas, curadas)
	if len(cartas) != 3 {
		t.Fatalf("esperava 3 cartas, obteve %d", len(cartas))
	}

	// 1. Curadoria vence o cache para título e preenche capa
	if cartas[0].Titulo != "Frieren e a Jornada para o Além" {
		t.Errorf("esperava título curado, obteve %q", cartas[0].Titulo)
	}
	if cartas[0].ImagemURL != "https://cdn.exemplo.com/frieren.jpg" {
		t.Errorf("esperava capa curada, obteve %q", cartas[0].ImagemURL)
	}

	// 2. Só cache: usa título do cache e deixa capa vazia para o lote do front
	if cartas[1].Titulo != "Shingeki no Kyojin" {
		t.Errorf("esperava título do cache, obteve %q", cartas[1].Titulo)
	}
	if cartas[1].ImagemURL != "" {
		t.Errorf("esperava capa vazia quando só há cache, obteve %q", cartas[1].ImagemURL)
	}

	// 3. Sem cache e sem curadoria: cai em "Anime #id"
	if cartas[2].Titulo != "Anime #54852" {
		t.Errorf("esperava fallback 'Anime #54852', obteve %q", cartas[2].Titulo)
	}
	if cartas[2].ImagemURL != "" {
		t.Errorf("esperava capa vazia no fallback, obteve %q", cartas[2].ImagemURL)
	}
}
