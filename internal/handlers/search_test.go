// internal/handlers/search_test.go (novo arquivo)
package handlers

import (
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

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

func TestFilterByStreaming_CaseInsensitive(t *testing.T) {
	input := []anilist.Anime{
		mkAnime("A", "Netflix"),
		mkAnime("B", "Crunchyroll"),
		mkAnime("C", "Prime Video"),
	}

	out := filterByStreaming(input, "netflix")
	if len(out) != 1 || out[0].Title != "A" {
		t.Fatalf("esperado somente anime A, recebido: %+v", out)
	}
}

func TestFilterByStreaming_EmptyFilterReturnsAll(t *testing.T) {
	input := []anilist.Anime{
		mkAnime("A", "Netflix"),
		mkAnime("B", "Crunchyroll"),
	}
	out := filterByStreaming(input, "")
	if len(out) != 2 {
		t.Fatalf("esperado 2 resultados, recebido %d", len(out))
	}
}