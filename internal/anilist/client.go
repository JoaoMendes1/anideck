package anilist

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
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
		limiter:    rate.NewLimiter(rate.Limit(1.5), 10), 
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
	  duration
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
	Duration      int                              `json:"duration"`
	AverageScore  int                              `json:"averageScore"`
	BannerImage   string                           `json:"bannerImage"`
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

	Characters struct {
		Edges []struct {
			Role string `json:"role"`
			Node struct {
				ID   int `json:"id"`
				Name struct {
					Full string `json:"full"`
				} `json:"name"`
				Image struct {
					Large string `json:"large"`
				} `json:"image"`
			} `json:"node"`
		} `json:"edges"`
	} `json:"characters"`

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

	var chars []Character
	for _, edge := range m.Characters.Edges {
		chars = append(chars, Character{
			ID:    edge.Node.ID,
			Name:  edge.Node.Name.Full,
			Image: edge.Node.Image.Large,
			Role:  edge.Role,
		})
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
		Duration: m.Duration,
		Score:    float64(m.AverageScore) / 10.0,
		Ranking:  bestRanking,
		BannerImage: m.BannerImage,
		Characters:  chars,
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
	duration
    averageScore
    coverImage { large }
    bannerImage
    genres
    externalLinks { site url }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    characters(sort: ROLE, perPage: 15) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
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
	  duration
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
	  duration
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

// fetchByAliases realiza uma busca em lote via GraphQL Aliases para IDs que falharam no idMal_in.
func (c *Client) fetchByAliases(ctx context.Context, missingIDs []int) ([]Anime, error) {
	if len(missingIDs) == 0 {
		return nil, nil
	}

	var sb strings.Builder
	sb.WriteString("query {\n")
	for _, id := range missingIDs {
		fmt.Fprintf(&sb, "  a%d: Media(idMal: %d, type: ANIME) {\n", id, id)
		sb.WriteString(`    idMal
    title { romaji english }
    status
    description
    episodes
	duration
    averageScore
    coverImage { large }
    genres
    externalLinks { site url }
    rankings { rank type allTime }
    nextAiringEpisode { airingAt timeUntilAiring episode }
  }
`)
	}
	sb.WriteString("}\n")

	var rawMap map[string]*aniListMedia
	if err := c.gqlRequest(ctx, sb.String(), nil, &rawMap); err != nil {
		return nil, fmt.Errorf("erro no fallback de aliases: %w", err)
	}

	var fetched []Anime
	for _, id := range missingIDs {
		key := fmt.Sprintf("a%d", id)
		if media, ok := rawMap[key]; ok && media != nil {
			if media.IDMal == 0 {
				media.IDMal = id
			}
			fetched = append(fetched, media.toAnime())
		}
	}

	return fetched, nil
}

// GetAnimesByMalIDs busca uma lista de animes por IDs com fallback em lote por Aliases.
func (c *Client) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	if len(malIDs) == 0 {
		return &AnimeSearchResponse{Data: []Anime{}}, nil
	}

	// 1. Sanitização e deduplicação de IDs
	seen := make(map[int]bool)
	var uniqueIDs []int
	for _, id := range malIDs {
		if id > 0 && !seen[id] {
			seen[id] = true
			uniqueIDs = append(uniqueIDs, id)
		}
	}

	var allAnimes []Anime
	chunkSize := 50

	// 2. Processar em chunks de 50 (limite de paginação da AniList)
	for i := 0; i < len(uniqueIDs); i += chunkSize {
		end := i + chunkSize
		if end > len(uniqueIDs) {
			end = len(uniqueIDs)
		}
		chunk := uniqueIDs[i:end]

		var resultado struct {
			Page struct{ Media []aniListMedia } `json:"Page"`
		}

		foundMap := make(map[int]bool)

		// Busca primária por idMal_in
		if err := c.gqlRequest(ctx, byIdsQuery, map[string]interface{}{"idMal_in": chunk}, &resultado); err == nil {
			for _, m := range resultado.Page.Media {
				if m.IDMal > 0 {
					foundMap[m.IDMal] = true
					allAnimes = append(allAnimes, m.toAnime())
				}
			}
		} else {
			log.Printf("[WARN ANILIST] Falha na consulta idMal_in para o chunk %v: %v", chunk, err)
		}

		// 3. Identificar IDs ausentes no retorno primário
		var missing []int
		for _, id := range chunk {
			if !foundMap[id] {
				missing = append(missing, id)
			}
		}

		// 4. Fallback em lote único por Aliases para recuperar os ausentes
		if len(missing) > 0 {
			log.Printf("[INFO ANILIST] %d animes não retornados via idMal_in. Executando fallback por Aliases: %v", len(missing), missing)
			fallbackAnimes, err := c.fetchByAliases(ctx, missing)
			if err != nil {
				log.Printf("[ERRO ANILIST] Falha no fallback por Aliases para os IDs %v: %v", missing, err)
			} else {
				allAnimes = append(allAnimes, fallbackAnimes...)
			}
		}
	}

	return &AnimeSearchResponse{Data: allAnimes}, nil
}