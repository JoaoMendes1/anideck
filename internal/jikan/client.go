package jikan

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
		limiter:    rate.NewLimiter(rate.Every(2*time.Second), 1), // 30/min, dentro do limite atual da AniList
		baseURL:    "https://graphql.anilist.co",
	}
}

var stripHTML = bluemonday.StrictPolicy() // reaproveita a mesma lib da Issue #9

// gqlRequest executa uma query GraphQL genérica contra a AniList
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

// mapStatus converte o enum da AniList pro mesmo texto que o Jikan usava —
// evita ter que mexer no frontend, que já espera "Finished Airing" etc.
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

// --- SEARCH ---

const searchQuery = `
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: ANIME) {
      idMal
      title { romaji english }
      status
      episodes
      averageScore
      coverImage { large }
      genres
    }
  }
}`

type aniListMedia struct {
	IDMal         int      `json:"idMal"`
	Title         struct{ Romaji, English string } `json:"title"`
	Status        string   `json:"status"`
	Description   string   `json:"description"`
	Episodes      int      `json:"episodes"`
	AverageScore  int      `json:"averageScore"`
	CoverImage    struct{ Large string } `json:"coverImage"`
	Genres        []string `json:"genres"`
}

func (m aniListMedia) toAnime() Anime {
	titulo := m.Title.English
	if titulo == "" {
		titulo = m.Title.Romaji
	}
	var generos []struct{ Name string `json:"name"` }
	for _, g := range m.Genres {
		generos = append(generos, struct{ Name string `json:"name"` }{Name: g})
	}
	a := Anime{
		MalID:    m.IDMal,
		Title:    titulo,
		Status:   mapStatus(m.Status),
		Synopsis: stripHTML.Sanitize(m.Description),
		Episodes: m.Episodes,
		Score:    float64(m.AverageScore) / 10.0, // AniList usa 0-100, Jikan usava 0-10
		Genres:   generos,
	}
	a.Images.JPG.ImageURL = m.CoverImage.Large
	return a
}

func (c *Client) SearchAnime(ctx context.Context, query string) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}
	if err := c.gqlRequest(ctx, searchQuery, map[string]interface{}{"search": query}, &resultado); err != nil {
		return nil, err
	}

	var animes []Anime
	for _, m := range resultado.Page.Media {
		animes = append(animes, m.toAnime())
	}
	return &AnimeSearchResponse{Data: animes}, nil
}

// --- DETALHE POR mal_id ---

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
  }
}`

func (c *Client) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	var malID int
	fmt.Sscanf(id, "%d", &malID)

	var resultado struct {
		Media aniListMedia `json:"Media"`
	}
	if err := c.gqlRequest(ctx, byIdQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		return nil, err
	}
	return &AnimeByIdResponse{Data: resultado.Media.toAnime()}, nil
}

// --- ESTATÍSTICAS ---

const statsQuery = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    stats { scoreDistribution { score amount } }
  }
}`

func (c *Client) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	var malID int
	fmt.Sscanf(id, "%d", &malID)

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