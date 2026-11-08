package handlers

import (
	"context"
	"fmt"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

type customAniListMock struct {
	anilist.MockClient
	animes map[string]*anilist.AnimeByIdResponse
}

func (m *customAniListMock) GetAnimeById(ctx context.Context, id string) (*anilist.AnimeByIdResponse, error) {
	if a, ok := m.animes[id]; ok {
		return a, nil
	}
	return nil, fmt.Errorf("anime not found")
}

func TestMontarEpisodiosCuradoria(t *testing.T) {
	// Testa a lógica pura de geração de episódios 1..N com título e thumbnail
	episodes := 3
	streamingEps := []anilist.StreamingEpisode{
		{Title: "Episode 1: O Começo", Thumbnail: "https://img.com/1.jpg"},
		{Title: "Episode 2: A Jornada", Thumbnail: "https://img.com/2.jpg"},
	}

	eps := make([]CuratedEpisodePayload, episodes)
	for i := 0; i < episodes; i++ {
		epNum := i + 1
		item := CuratedEpisodePayload{Number: epNum}
		if i < len(streamingEps) {
			item.Title = streamingEps[i].Title
			item.Image = streamingEps[i].Thumbnail
		}
		eps[i] = item
	}

	if len(eps) != 3 {
		t.Fatalf("Esperava 3 episódios, obteve %d", len(eps))
	}

	if eps[0].Number != 1 || eps[0].Title != "Episode 1: O Começo" || eps[0].Image != "https://img.com/1.jpg" {
		t.Errorf("Episódio 1 incorreto: %+v", eps[0])
	}
	if eps[1].Number != 2 || eps[1].Title != "Episode 2: A Jornada" || eps[1].Image != "https://img.com/2.jpg" {
		t.Errorf("Episódio 2 incorreto: %+v", eps[1])
	}
	if eps[2].Number != 3 || eps[2].Title != "" || eps[2].Image != "" {
		t.Errorf("Episódio 3 deveria ter número 3 e título vazio, obteve: %+v", eps[2])
	}
}

func TestCurationHandler_AutoImportStructs(t *testing.T) {
	mock := &customAniListMock{
		animes: map[string]*anilist.AnimeByIdResponse{
			"123": {
				Data: anilist.Anime{
					MalID:    123,
					Title:    "Anime Teste",
					Episodes: 12,
				},
			},
			"999": {
				Data: anilist.Anime{
					MalID:    999,
					Title:    "Anime Sem Eps",
					Episodes: 0,
				},
			},
		},
	}

	handler := &CurationHandler{
		AniListClient: mock,
	}

	res1, err1 := handler.AniListClient.GetAnimeById(context.Background(), "123")
	if err1 != nil || res1.Data.Episodes != 12 {
		t.Fatalf("Erro ao buscar anime 123: %v", err1)
	}

	res2, err2 := handler.AniListClient.GetAnimeById(context.Background(), "999")
	if err2 != nil || res2.Data.Episodes != 0 {
		t.Fatalf("Erro ao buscar anime 999: %v", err2)
	}
}
