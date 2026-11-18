package handlers

import (
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

func TestStatusMaisAvancado(t *testing.T) {
	casos := []struct{ anilist, curado, esperado string }{
		{"Finished Airing", "Currently Airing", "Finished Airing"},
		{"Currently Airing", "Not yet aired", "Currently Airing"},
		{"Currently Airing", "Finished Airing", "Finished Airing"},
		{"", "Currently Airing", "Currently Airing"},
		{"Finished Airing", "", "Finished Airing"},
		{"Currently Airing", "texto livre", "Currently Airing"},
		{"Finished Airing", "Finalizado", "Finalizado"},
	}
	for _, c := range casos {
		if got := StatusMaisAvancado(c.anilist, c.curado); got != c.esperado {
			t.Errorf("(%q, %q) = %q, esperado %q", c.anilist, c.curado, got, c.esperado)
		}
	}
}

func TestStatusPelosEpisodios(t *testing.T) {
	proximo := &anilist.NextAiringEpisode{Episode: 13}
	if StatusPelosEpisodios("Currently Airing", nil, 12, 12) != "Finished Airing" {
		t.Error("todos os episódios listados e nenhum próximo: finalizado")
	}
	if StatusPelosEpisodios("Currently Airing", proximo, 12, 24) != "Currently Airing" {
		t.Error("com próximo episódio continua em lançamento")
	}
	if StatusPelosEpisodios("Currently Airing", nil, 12, 0) != "Currently Airing" {
		t.Error("sem total conhecido não fecha")
	}
	if StatusPelosEpisodios("Currently Airing", nil, 8, 12) != "Currently Airing" {
		t.Error("faltando episódios não fecha")
	}
}
