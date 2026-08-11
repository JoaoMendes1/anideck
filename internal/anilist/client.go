package anilist

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/time/rate"
)

type Client struct {
	httpClient *http.Client
	limiter    *rate.Limiter
	baseURL    string
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		limiter:    rate.NewLimiter(rate.Limit(1.5), 10), // Limite ajustado para suportar bursts
		baseURL:    "https://graphql.anilist.co",
	}
}

var stripHTML = bluemonday.StrictPolicy()

func (c *Client) gqlRequest(ctx context.Context, query string, variables map[string]interface{}, out interface{}) error {
	if err := c.limiter.Wait(ctx); err != nil {
		return fmt.Errorf("erro no rate limiter: %w", err)
	}

	body, _ := json.Marshal(map[string]interface{}{"query": query, "variables": variables})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro ao executar requisição HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("erro inesperado da AniList: status %d", resp.StatusCode)
	}

	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("erro ao decodificar JSON: %w", err)
	}
	return json.Unmarshal(envelope.Data, out)
}

func mapStatus(s string) string {
	switch s {
	case "FINISHED":
		return "Finished Airing"
	case "RELEASING":
		return "Currently Airing"
	case "NOT_YET_RELEASED":
		return "Not yet aired"
	default:
		return s
	}
}

const searchQuery = `
query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: $sort, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      episodes
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

type aniListMedia struct {
	IDMal         int                              `json:"idMal"`
	Title         struct{ Romaji, English string } `json:"title"`
	Status        string                           `json:"status"`
	Description   string                           `json:"description"`
	Episodes      int                              `json:"episodes"`
	AverageScore  int                              `json:"averageScore"`
	CoverImage    struct{ Large string }           `json:"coverImage"`
	Genres        []string                         `json:"genres"`
	ExternalLinks []struct {
		Site string `json:"site"`
		URL  string `json:"url"`
	} `json:"externalLinks"`
	Rankings []struct {
		Rank    int    `json:"rank"`
		Type    string `json:"type"`
		AllTime bool   `json:"allTime"`
	} `json:"rankings"`

	NextAiringEpisode *NextAiringEpisode `json:"nextAiringEpisode"`

	Studios struct {
		Edges []struct {
			Node struct {
				Name string `json:"name"`
			} `json:"node"`
		} `json:"edges"`
	} `json:"studios"`

	Relations struct {
		Edges []struct {
			RelationType string `json:"relationType"`
			Node         struct {
				IDMal int    `json:"idMal"`
				Type  string `json:"type"`
				Title struct {
					Romaji  string `json:"romaji"`
					English string `json:"english"`
				} `json:"title"`
			} `json:"node"`
		} `json:"edges"`
	} `json:"relations"`
}

func (m *aniListMedia) toAnime() Anime {
	title := m.Title.Romaji
	if title == "" {
		title = m.Title.English
	}

	var genres []struct {
		Name string `json:"name"`
	}
	for _, g := range m.Genres {
		genres = append(genres, struct {
			Name string `json:"name"`
		}{Name: g})
	}

	var streaming []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	for _, link := range m.ExternalLinks {
		streaming = append(streaming, struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: link.Site,
			URL:  link.URL,
		})
	}

	var bestRanking int
	for _, r := range m.Rankings {
		if r.Type == "RATED" && r.AllTime {
			bestRanking = r.Rank
			break
		}
	}

	var studios []struct{ Name string `json:"name"` }
	for _, edge := range m.Studios.Edges {
		studios = append(studios, struct{ Name string `json:"name"` }{Name: edge.Node.Name})
	}

	var relations []struct {
		Relation string `json:"relation"`
		Entry    []struct {
			MalID int    `json:"mal_id"`
			Type  string `json:"type"`
			Name  string `json:"name"`
		} `json:"entry"`
	}
	for _, edge := range m.Relations.Edges {
		relTitle := edge.Node.Title.Romaji
		if relTitle == "" {
			relTitle = edge.Node.Title.English
		}
		relations = append(relations, struct {
			Relation string `json:"relation"`
			Entry    []struct {
				MalID int    `json:"mal_id"`
				Type  string `json:"type"`
				Name  string `json:"name"`
			} `json:"entry"`
		}{
			Relation: edge.RelationType,
			Entry: []struct {
				MalID int    `json:"mal_id"`
				Type  string `json:"type"`
				Name  string `json:"name"`
			}{{
				MalID: edge.Node.IDMal,
				Type:  edge.Node.Type,
				Name:  relTitle,
			}},
		})
	}

	return Anime{
		MalID:    m.IDMal,
		Title:    title,
		Status:   mapStatus(m.Status),
		Synopsis: stripHTML.Sanitize(m.Description),
		Episodes: m.Episodes,
		Score:    float64(m.AverageScore) / 10.0,
		Ranking:  bestRanking,
		NextAiringEpisode: m.NextAiringEpisode,
		Images: struct {
			JPG struct {
				ImageURL string `json:"image_url"`
			} `json:"jpg"`
		}{
			JPG: struct {
				ImageURL string `json:"image_url"`
			}{
				ImageURL: m.CoverImage.Large,
			},
		},
		Genres:    genres,
		Streaming: streaming,
		Studios:   studios,
		Relations: relations,
	}
}

type SearchFilters struct {
	Genres     []string
	Tags       []string
	Season     string
	SeasonYear int
	Status     string
	Sort       string
}

func (c *Client) SearchAnime(ctx context.Context, query string, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{
		"page":    page,
		"perPage": perPage,
	}
	if query != "" {
		variables["search"] = query
	}
	if f.Sort != "" {
		variables["sort"] = []string{f.Sort}
	}
	if len(f.Genres) > 0 {
		variables["genre_in"] = f.Genres
	}
	if len(f.Tags) > 0 {
		variables["tag_in"] = f.Tags
	}
	if f.Season != "" {
		variables["season"] = f.Season
	}
	if f.SeasonYear > 0 && f.Season != "" {
		variables["seasonYear"] = f.SeasonYear
	}
	if f.Status != "" {
		variables["status"] = f.Status
	}

	if err := c.gqlRequest(ctx, searchQuery, variables, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		if m.IDMal == 0 {
			continue
		}
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}

const byIdQuery = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    idMal
    title { romaji english }
    status
    description
    episodes
    averageScore
    coverImage { large }
    genres
    externalLinks { site url }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    studios { edges { node { name } } }
    relations { edges { relationType node { idMal type title { romaji english } } } }
  }
}`

const byIdsQuery = `
query ($idMal_in: [Int]) {
  Page(page: 1, perPage: 50) {
    media(idMal_in: $idMal_in, type: ANIME) {
      idMal
      title { romaji english }
      status
      description
      episodes
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      rankings { rank type allTime }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

func (c *Client) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	var malID int
	if _, err := fmt.Sscanf(id, "%d", &malID); err != nil {
		return nil, fmt.Errorf("ID inválido")
	}

	var resultado struct {
		Media aniListMedia `json:"Media"`
	}
	if err := c.gqlRequest(ctx, byIdQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		return nil, err
	}
	return &AnimeByIdResponse{Data: resultado.Media.toAnime()}, nil
}

const statsQuery = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    stats { scoreDistribution { score amount } }
  }
}`

func (c *Client) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	var malID int
	if _, err := fmt.Sscanf(id, "%d", &malID); err != nil {
		return nil, fmt.Errorf("ID inválido")
	}

	var resultado struct {
		Media struct {
			Stats struct {
				ScoreDistribution []struct{ Score, Amount int }
			}
		}
	}
	if err := c.gqlRequest(ctx, statsQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		return nil, err
	}

	total := 0
	for _, s := range resultado.Media.Stats.ScoreDistribution {
		total += s.Amount
	}

	var scores []ScoreDistribution
	for _, s := range resultado.Media.Stats.ScoreDistribution {
		pct := 0.0
		if total > 0 {
			pct = float64(s.Amount) / float64(total) * 100
		}
		scores = append(scores, ScoreDistribution{Score: s.Score / 10, Votes: s.Amount, Percentage: pct})
	}
	return &AnimeStatisticsResponse{Data: AnimeStatistics{Scores: scores}}, nil
}

const topAnimeQuery = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: $sort, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      description
      episodes
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  }
}`

func (c *Client) GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{
		"page":    page,
		"perPage": perPage,
	}

	if f.Sort != "" {
		variables["sort"] = []string{f.Sort}
	} else {
		variables["sort"] = []string{"POPULARITY_DESC"}
	}

	if len(f.Genres) > 0 {
		variables["genre_in"] = f.Genres
	}
	if len(f.Tags) > 0 {
		variables["tag_in"] = f.Tags
	}
	if f.Season != "" {
		variables["season"] = f.Season
	}
	if f.SeasonYear > 0 && f.Season != "" {
		variables["seasonYear"] = f.SeasonYear
	}
	if f.Status != "" {
		variables["status"] = f.Status
	}

	if err := c.gqlRequest(ctx, topAnimeQuery, variables, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		if m.IDMal == 0 {
			continue
		}
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}

func (c *Client) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	if len(malIDs) == 0 {
		return &AnimeSearchResponse{Data: []Anime{}}, nil
	}

	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	if err := c.gqlRequest(ctx, byIdsQuery, map[string]interface{}{"idMal_in": malIDs}, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		if m.IDMal == 0 {
			continue
		}
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}