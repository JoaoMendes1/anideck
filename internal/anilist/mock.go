package anilist

import "context"

// MockClient é o cliente falso que finge ser a API da AniList
type MockClient struct{}

func NewMockClient() *MockClient {
	return &MockClient{}
}

func (m *MockClient) SearchAnime(ctx context.Context, query string, f SearchFilters) (*AnimeSearchResponse, error) {
	return &AnimeSearchResponse{
		Data: []Anime{
			{MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Finished Airing"},
			{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
			{MalID: 31964, Title: "Boku no Hero Academia (Mock)", Status: "Finished Airing"},
		},
	}, nil
}

func (m *MockClient) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	return &AnimeByIdResponse{
		Data: Anime{
			MalID:    20,
			Title:    "Naruto (Mock Detail)",
			Status:   "Finished Airing",
			Synopsis: "Sinopse falsa gerada localmente. O Ninja Loiro faz coisas de ninja.",
			Score:    8.5,
			Episodes: 199,
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
	return &AnimeSearchResponse{Data: []Anime{}}, nil
}