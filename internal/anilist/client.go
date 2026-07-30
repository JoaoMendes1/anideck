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

// searchQuery busca animes por texto e/ou filtros.
// genre_in / tag_in: a AniList separa as duas — sem tag_in, categorias como "Artes Marciais" nunca retornam resultado.
// season + seasonYear: season sem ano busca em todos os anos; passamos seasonYear só quando fornecido.
// status: enum MediaStatus da AniList (FINISHED, RELEASING, NOT_YET_RELEASED, etc.).
const searchQuery = `
query ($search: String, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: 1, perPage: 20) {
    media(search: $search, type: ANIME, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      episodes
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
    }
  }
}`

// 2) struct
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
}

// toAnime converte o tipo de mídia da AniList para o tipo Anime do nosso domínio.
func (m *aniListMedia) toAnime() Anime {
	// Define o título principal, com fallback para o título em inglês.
	title := m.Title.Romaji
	if title == "" {
		title = m.Title.English
	}

	// Converte a lista de strings de gêneros para a estrutura esperada.
	var genres []struct {
		Name string `json:"name"`
	}
	for _, g := range m.Genres {
		genres = append(genres, struct {
			Name string `json:"name"`
		}{Name: g})
	}

	// Mapeia os links externos para a estrutura de streaming.
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

	return Anime{
		MalID:    m.IDMal,
		Title:    title,
		Status:   mapStatus(m.Status),
		Synopsis: stripHTML.Sanitize(m.Description), // Remove tags HTML da sinopse
		Episodes: m.Episodes,
		Score:    float64(m.AverageScore) / 10.0, // Converte score de 0-100 para 0-10
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
	}
}

// 4) assinatura + variáveis dinâmicas
// SearchFilters agrupa todos os filtros opcionais da busca num único struct,
// evitando que a assinatura da função cresça a cada novo filtro adicionado.
type SearchFilters struct {
	Genres     []string
	Tags       []string
	Season     string // WINTER | SPRING | SUMMER | FALL (enum MediaSeason da AniList)
	SeasonYear int    // ex: 2026; só enviado se > 0
	Status     string // FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
}

// SearchAnime busca animes por texto livre e/ou filtros estruturados.
func (c *Client) SearchAnime(ctx context.Context, query string, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{}
	if query != "" {
		variables["search"] = query
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
	// seasonYear sem season não faz sentido na AniList — só enviamos se ambos estiverem presentes
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

// topAnimeQuery busca os animes mais bem avaliados da AniList.
// Todos os filtros são opcionais — omitidos quando não fornecidos.
const topAnimeQuery = `
query ($page: Int, $perPage: Int, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: SCORE_DESC, genre_in: $genre_in, tag_in: $tag_in, season: $season, seasonYear: $seasonYear, status: $status) {
      idMal
      title { romaji english }
      status
      description
      episodes
      averageScore
      coverImage { large }
      genres
      externalLinks { site url }
    }
  }
}`

// GetTopAnime retorna os animes mais bem avaliados com filtros opcionais.
// Usa o mesmo struct SearchFilters da busca para manter consistência.
func (c *Client) GetTopAnime(ctx context.Context, page int, perPage int, f SearchFilters) (*AnimeSearchResponse, error) {
	var resultado struct {
		Page struct{ Media []aniListMedia } `json:"Page"`
	}

	variables := map[string]interface{}{
		"page":    page,
		"perPage": perPage,
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
