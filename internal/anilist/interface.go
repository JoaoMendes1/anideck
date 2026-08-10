package anilist

import "context"

// Service define o contrato para buscar animes.
// Qualquer struct que tiver estes 5 métodos pode ser usada pelos Handlers.
type Service interface {
	SearchAnime(ctx context.Context, query string, f SearchFilters) (*AnimeSearchResponse, error)
	GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error)
	GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error)
	GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error)
	GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error)
}