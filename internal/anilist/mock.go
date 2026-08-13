package anilist

import (
	"context"
	"fmt"
)

type MockClient struct{}

func NewMockClient() *MockClient {
	return &MockClient{}
}

func (m *MockClient) SearchAnime(ctx context.Context, query string, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{
		Data: []Anime{
			{
				MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Currently Airing",
				NextAiringEpisode: &NextAiringEpisode{AiringAt: 0, TimeUntilAiring: 14400, Episode: 15},
			},
			{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
		},
	}, nil
}

func (m *MockClient) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	return &AnimeByIdResponse{
		Data: Anime{
			MalID:    20,
			Title:    "Naruto (Mock Detail)",
			Status:   "Currently Airing",
			Synopsis: "Sinopse falsa gerada localmente. O Ninja Loiro faz coisas de ninja.",
			Score:    8.5,
			Episodes: 199,
			NextAiringEpisode: &NextAiringEpisode{AiringAt: 0, TimeUntilAiring: 86400, Episode: 16},
		},
	}, nil
}

func (m *MockClient) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	return &AnimeStatisticsResponse{
		Data: AnimeStatistics{
			Scores: []ScoreDistribution{
				{Score: 10, Votes: 5000, Percentage: 50.0},
				{Score: 9, Votes: 3000, Percentage: 30.0},
				{Score: 8, Votes: 1000, Percentage: 10.0},
			},
		},
	}, nil
}

func (m *MockClient) GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{Data: []Anime{}}, nil
}

func (m *MockClient) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	var animes []Anime
	for _, id := range malIDs {
		animes = append(animes, Anime{
			MalID:  id,
			Title:  fmt.Sprintf("Anime Mock ID %d", id),
			Status: "Currently Airing",
			Images: struct {
				JPG struct {
					ImageURL string `json:"image_url"`
				} `json:"jpg"`
			}{
				JPG: struct {
					ImageURL string `json:"image_url"`
				}{
					ImageURL: "https://via.placeholder.com/150",
				},
			},
		})
	}
	return &AnimeSearchResponse{Data: animes}, nil
}