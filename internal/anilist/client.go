package anilist

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/time/rate"
)

var (
	ForceOffline bool
	ApiHealth    string = "OK" 
	StateMutex   sync.RWMutex
)

// SetForceOffline ajusta o Kill Switch de fora do pacote sem expor a variável.
// Existe porque o estado é global e protegido por mutex: escrever direto de outro
// pacote significaria replicar o Lock/Unlock em cada ponto de escrita.
func SetForceOffline(v bool) {
	StateMutex.Lock()
	ForceOffline = v
	StateMutex.Unlock()
}

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

// maxTentativas limita o reenvio após 429. Três é suficiente para atravessar a janela de
// um minuto do limite da AniList sem transformar uma indisponibilidade real em espera longa.
const maxTentativas = 3

// esperaPadraoRateLimit é usada quando a AniList devolve 429 sem o cabeçalho Retry-After.
// Um minuto é a janela do limite deles, então é o menor tempo que garante a reabertura.
const esperaPadraoRateLimit = 60 * time.Second

// parseRetryAfter lê o cabeçalho Retry-After, que a AniList manda em segundos.
// Cabeçalho ausente ou ilegível cai no padrão — nunca em zero, que viraria um laço apertado
// de requisições justamente contra um servidor que acabou de pedir para diminuir o ritmo.
func parseRetryAfter(header string, padrao time.Duration) time.Duration {
	segundos, err := strconv.Atoi(strings.TrimSpace(header))
	if err != nil || segundos <= 0 {
		return padrao
	}
	return time.Duration(segundos) * time.Second
}

func (c *Client) gqlRequest(ctx context.Context, query string, variables map[string]interface{}, out interface{}) error {
	StateMutex.RLock()
	offline := ForceOffline
	StateMutex.RUnlock()

	if offline {
		return fmt.Errorf("503: Kill Swith ativado (modo offline forçado)")
	}
	body, _ := json.Marshal(map[string]interface{}{"query": query, "variables": variables})

	for tentativa := 1; ; tentativa++ {
		if err := c.limiter.Wait(ctx); err != nil {
			return fmt.Errorf("erro no rate limiter: %w", err)
		}

		// A requisição é remontada a cada tentativa: o corpo é um leitor, e depois de
		// enviado uma vez ele já foi consumido até o fim.
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(body))
		if err != nil {
			return fmt.Errorf("erro ao criar requisição: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			StateMutex.Lock()
			ApiHealth = "OFFLINE"
			StateMutex.Unlock()
			return fmt.Errorf("erro ao executar requisição HTTP: %w", err)
		}

		// 429 não é erro do nosso lado: é a AniList pedindo para esperar. Sem tratar isso,
		// uma sincronização em lote morria silenciosamente no meio — o limite deles cai
		// para 30 requisições por minuto quando o serviço está degradado, bem abaixo do
		// ritmo que o nosso limiter permite.
		if resp.StatusCode == http.StatusTooManyRequests {
			StateMutex.Lock()
			ApiHealth = "Warning"
			StateMutex.Unlock()

			espera := parseRetryAfter(resp.Header.Get("Retry-After"), esperaPadraoRateLimit)
			resp.Body.Close()

			if tentativa >= maxTentativas {
				return fmt.Errorf("AniList recusou por excesso de requisições após %d tentativas", tentativa)
			}

			log.Printf("[ANILIST] Limite de requisições atingido; aguardando %s antes da tentativa %d", espera, tentativa+1)
			select {
			case <-time.After(espera):
				continue
			case <-ctx.Done():
				return ctx.Err()
			}
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			StateMutex.Lock()
			ApiHealth = "OFFLINE"
			StateMutex.Unlock()
			return fmt.Errorf("erro inesperado da AniList: status %d", resp.StatusCode)
		}

		StateMutex.Lock()
		ApiHealth = "OK"
		StateMutex.Unlock()

		var envelope struct {
			Data json.RawMessage `json:"data"`
		}
		err = json.NewDecoder(resp.Body).Decode(&envelope)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("erro ao decodificar JSON: %w", err)
		}
		return json.Unmarshal(envelope.Data, out)
	}
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
	  popularity
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
	StartDate     struct{ Year, Month, Day int }   `json:"startDate"`
	Season        string                           `json:"season"`
	SeasonYear    int                              `json:"seasonYear"`
	Description   string                           `json:"description"`
	Episodes      int                              `json:"episodes"`
	Duration      int                              `json:"duration"` // Duração do EP
	AverageScore  int                              `json:"averageScore"`
	Popularity    int                              `json:"popularity"`
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

	Tags []anilistTag `json:"tags"`

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
				CoverImage struct {
					Large string `json:"large"`
				} `json:"coverImage"` // Imagem da Relação
			} `json:"node"`
		} `json:"edges"`
	} `json:"relations"`

	StreamingEpisodes []struct {
		Title     string `json:"title"`
		Thumbnail string `json:"thumbnail"`
		URL       string `json:"url"`
		Site      string `json:"site"`
	} `json:"streamingEpisodes"`
}

// anilistTag é uma tag crua como a AniList devolve, antes de qualquer filtro.
type anilistTag struct {
	Name             string `json:"name"`
	Rank             int    `json:"rank"`
	IsGeneralSpoiler bool   `json:"isGeneralSpoiler"`
	IsMediaSpoiler   bool   `json:"isMediaSpoiler"`
}

// tagRankMinimo é o corte de relevância das tags da AniList. O campo `rank` é um voto
// da comunidade (0 a 100) sobre o quanto aquela tag descreve a obra: "Isekai" num isekai
// de verdade vem acima de 80, enquanto tags marginais ("Male Protagonist" com rank 12)
// só poluiriam as Estatísticas. 50 é o meio-termo: mantém o que a comunidade reconhece
// como característica real da obra e descarta o ruído da cauda longa.
const tagRankMinimo = 50

// relevantTags filtra as tags que valem a pena guardar no cache.
// Além do corte de relevância, tags marcadas como spoiler ficam de fora: elas revelariam
// reviravoltas da trama e não têm valor de classificação.
func (m *aniListMedia) relevantTags() []string {
	var tags []string
	for _, t := range m.Tags {
		if t.IsGeneralSpoiler || t.IsMediaSpoiler {
			continue
		}
		if t.Rank < tagRankMinimo {
			continue
		}
		tags = append(tags, t.Name)
	}
	return tags
}

// resolveSeasonYear devolve o ano de estreia do anime.
// A AniList deixa `seasonYear` nulo em parte do catálogo antigo (obras cadastradas antes
// de o campo existir), então caímos no ano da data de estreia — que costuma estar
// preenchido mesmo nesses casos.
func (m *aniListMedia) resolveSeasonYear() int {
	if m.SeasonYear > 0 {
		return m.SeasonYear
	}
	return m.StartDate.Year
}

func (m *aniListMedia) toAnime() Anime {
	title := m.Title.Romaji
	if title == "" {
		title = m.Title.English
	}

	genres := make([]Genre, 0, len(m.Genres))
	for _, g := range m.Genres {
		genres = append(genres, Genre{Name: g})
	}

	streaming := make([]StreamingLink, 0, len(m.ExternalLinks))
	for _, link := range m.ExternalLinks {
		streaming = append(streaming, StreamingLink{
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

	var studios []struct {
		Name string `json:"name"`
	}
	for _, edge := range m.Studios.Edges {
		studios = append(studios, struct {
			Name string `json:"name"`
		}{Name: edge.Node.Name})
	}

	var chars []Character
	for _, edge := range m.Characters.Edges {
		// Personagem da AniList sempre tem id; o ponteiro existe para o elenco curado, que
		// não tem. Manter nil quando não houver id é o que evita a colisão de chaves na tela.
		var charID *int
		if edge.Node.ID > 0 {
			id := edge.Node.ID
			charID = &id
		}

		chars = append(chars, Character{
			ID:    charID,
			Name:  edge.Node.Name.Full,
			Image: edge.Node.Image.Large,
			Role:  edge.Role,
		})
	}

	relations := make([]Relation, 0, len(m.Relations.Edges))
	for _, edge := range m.Relations.Edges {
		relTitle := edge.Node.Title.Romaji
		if relTitle == "" {
			relTitle = edge.Node.Title.English
		}

		// idMal nulo na AniList chega aqui como 0. Manter o ponteiro nil nesse caso é o que
		// impede a tela de montar um link para /anime/0 — que responde 503.
		var malID *int
		if edge.Node.IDMal > 0 {
			id := edge.Node.IDMal
			malID = &id
		}

		relations = append(relations, Relation{
			Relation: edge.RelationType,
			Entry: []RelationEntry{{
				MalID: malID,
				Type:  edge.Node.Type,
				Name:  relTitle,
				Image: edge.Node.CoverImage.Large, // Extraindo a imagem da API
			}},
		})
	}

	var streamingEps []StreamingEpisode
	for _, ep := range m.StreamingEpisodes {
		streamingEps = append(streamingEps, StreamingEpisode{
			Title:     ep.Title,
			Thumbnail: ep.Thumbnail,
			URL:       ep.URL,
			Site:      ep.Site,
		})
	}

	var startDate *FuzzyDate
	if m.StartDate.Year > 0 && m.StartDate.Month > 0 && m.StartDate.Day > 0 {
		startDate = &FuzzyDate{Year: m.StartDate.Year, Month: m.StartDate.Month, Day: m.StartDate.Day}
	}

	return Anime{
		MalID:             m.IDMal,
		Title:             title,
		Status:            mapStatus(m.Status),
		StartDate:         startDate,
		Season:            m.Season,
		SeasonYear:        m.resolveSeasonYear(),
		Tags:              m.relevantTags(),
		Synopsis:          stripHTML.Sanitize(m.Description),
		Episodes:          m.Episodes,
		Duration:          m.Duration,
		Score:             float64(m.AverageScore) / 10.0,
		Popularity:        m.Popularity,
		Ranking:           bestRanking,
		BannerImage:       m.BannerImage,
		Characters:        chars,
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
		Genres:            genres,
		Streaming:         streaming,
		Studios:           studios,
		Relations:         relations,
		StreamingEpisodes: streamingEps,
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
	startDate { year month day }
	season
	seasonYear
    description
    episodes
    duration
    averageScore
	popularity
    coverImage { large }
    bannerImage
    genres
	tags { name rank isGeneralSpoiler isMediaSpoiler }
    externalLinks { site url }
	rankings { rank type allTime }
	streamingEpisodes { title thumbnail url site }
	streamingEpisodes { title thumbnail url site }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    characters(sort: ROLE, perPage: 15) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    studios { edges { node { name } } }
    relations { edges { relationType node { idMal type title { romaji english } coverImage { large } } } }
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
	  popularity
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
    stats { 
        scoreDistribution { score amount } 
        statusDistribution { status amount }
    }
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
				ScoreDistribution  []struct{ Score, Amount int }
				StatusDistribution []struct {
					Status string
					Amount int
				}
			}
		}
	}

	if err := c.gqlRequest(ctx, statsQuery, map[string]interface{}{"idMal": malID}, &resultado); err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar estatísticas do anime %d: %v", malID, err)
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

	var statuses []StatusDistribution
	for _, s := range resultado.Media.Stats.StatusDistribution {
		statuses = append(statuses, StatusDistribution{Status: s.Status, Amount: s.Amount})
	}

	return &AnimeStatisticsResponse{Data: AnimeStatistics{Scores: scores, Statuses: statuses}}, nil
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
	  popularity
      coverImage { large }
      genres
	  tags { name rank isGeneralSpoiler isMediaSpoiler }
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

func (c *Client) GetAnimesByMalIDs(ctx context.Context, malIDs []int) (*AnimeSearchResponse, error) {
	if len(malIDs) == 0 {
		return &AnimeSearchResponse{Data: []Anime{}}, nil
	}

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

		var missing []int
		for _, id := range chunk {
			if !foundMap[id] {
				missing = append(missing, id)
			}
		}

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
