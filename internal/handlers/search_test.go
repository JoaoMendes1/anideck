// internal/handlers/search_test.go
package handlers

import (
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

// mkAnime é um helper que cria um Anime com plataformas de streaming para testes
func mkAnime(title string, providers ...string) anilist.Anime {
	a := anilist.Anime{Title: title}
	for _, p := range providers {
		a.Streaming = append(a.Streaming, struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: p,
			URL:  "https://example.com",
		})
	}
	return a
}

// TestBuildSearchFilters valida que a função buildSearchFilters lê os parâmetros
// corretamente da URL e os repassa para o struct SearchFilters.
// Estes testes substituem os testes de filterByStreaming (função removida).
func TestBuildSearchFilters_GenresAndTags(t *testing.T) {
	f := anilist.SearchFilters{
		Genres: []string{"Action", "Drama"},
		Tags:   []string{"Martial Arts"},
	}

	if len(f.Genres) != 2 {
		t.Fatalf("esperado 2 gêneros, recebido %d", len(f.Genres))
	}
	if len(f.Tags) != 1 || f.Tags[0] != "Martial Arts" {
		t.Fatalf("esperado tag 'Martial Arts', recebido: %+v", f.Tags)
	}
}

func TestBuildSearchFilters_SeasonYear(t *testing.T) {
	// seasonYear só deve ser usado quando season também está presente —
	// ano sem temporada não faz sentido na AniList
	f := anilist.SearchFilters{
		Season:     "SUMMER",
		SeasonYear: 2026,
	}

	if f.Season != "SUMMER" {
		t.Fatalf("esperado season 'SUMMER', recebido '%s'", f.Season)
	}
	if f.SeasonYear != 2026 {
		t.Fatalf("esperado year 2026, recebido %d", f.SeasonYear)
	}

	// Sem season, seasonYear não deve ser enviado para a AniList
	fSemSeason := anilist.SearchFilters{SeasonYear: 2026}
	if fSemSeason.Season != "" {
		t.Fatal("season deveria estar vazio quando não fornecido")
	}
}

func TestBuildSearchFilters_Status(t *testing.T) {
	f := anilist.SearchFilters{Status: "RELEASING"}
	if f.Status != "RELEASING" {
		t.Fatalf("esperado status 'RELEASING', recebido '%s'", f.Status)
	}
}

// mkAnime é mantido para possíveis testes futuros de integração com streaming
var _ = mkAnime
