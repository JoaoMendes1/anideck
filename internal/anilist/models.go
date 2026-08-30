package anilist

type AnimeSearchResponse struct {
	Data []Anime `json:"data"`
	LastUpdated string `json:"last_updated,omitempty"`
}

type AnimeByIdResponse struct {
	Data Anime `json:"data"`
}

type NextAiringEpisode struct {
	AiringAt        int `json:"airingAt"`
	TimeUntilAiring int `json:"timeUntilAiring"`
	Episode         int `json:"episode"`  
}

// Genre é uma categoria do anime. Tipo nomeado (e não struct anônima) porque o valor é
// construído em vários pontos do app — com struct anônima, cada um precisa repetir a
// declaração inteira só para criar um item da lista.
type Genre struct {
	Name string `json:"name"`
}

type Character struct {
	// Ponteiro porque o elenco curado no Painel é gravado como {name, image, role}, sem id:
	// como `int`, o campo ausente virava 0 para TODO personagem curado, e o React recebia uma
	// lista inteira com a mesma key. Ponteiro distingue "não tem id" de "o id é zero".
	ID    *int   `json:"id,omitempty"`
	Name  string `json:"name"`
	Image string `json:"image"`
	Role  string `json:"role"`
}

type Anime struct {
	MalID       int         `json:"mal_id"`
	Title       string      `json:"title"`
	Status      string      `json:"status"`
	Synopsis    string      `json:"synopsis"`
	Episodes    int         `json:"episodes"`
	Duration    int         `json:"duration"` // Duração do episódio em minutos (Estatísticas)
	Score       float64     `json:"score"`
	Ranking     int         `json:"ranking,omitempty"`
	Popularity    int     `json:"popularity,omitempty"`
	BayesianScore float64 `json:"bayesian_score,omitempty"`
	CurrentRank   int     `json:"current_rank,omitempty"`
	PreviousRank  int     `json:"previous_rank,omitempty"`
	BannerImage string      `json:"bannerImage,omitempty"`
	Characters  []Character `json:"characters,omitempty"`
	StartDate   *FuzzyDate  `json:"startDate,omitempty"`

	// FirstAiredAt é o instante exato em que o episódio 1 foi ao ar, vindo da curadoria.
	// Guardado como texto ISO 8601 para o navegador converter ao fuso de quem está olhando.
	// É o que permite calcular a contagem regressiva sem consultar a AniList.
	FirstAiredAt string `json:"first_aired_at,omitempty"`

	// Temporada de estreia. season_year alimenta o gráfico de Distribuição por Ano
	// nas Estatísticas; Season fica disponível para agrupamentos futuros por temporada.
	Season     string `json:"season,omitempty"`
	SeasonYear int    `json:"season_year,omitempty"`

	// Tags da AniList (Isekai, Escolar, Magia...). Diferente de Genres: a AniList trata
	// Isekai como tag secundária, mas na taxonomia do AniDeck ele é categoria principal —
	// por isso as tags precisam chegar até o cache, e não só os genres.
	Tags []string `json:"tags,omitempty"`

	NextAiringEpisode *NextAiringEpisode `json:"nextAiringEpisode,omitempty"`

	Images struct {
		JPG struct {
			ImageURL string `json:"image_url"`
		} `json:"jpg"`
	} `json:"images"`

	Genres []Genre `json:"genres"`

	Studios []struct {
		Name string `json:"name"`
	} `json:"studios"`

	Relations []Relation `json:"relations"`

	Theme struct {
		Openings []string `json:"openings"`
		Endings  []string `json:"endings"`
	} `json:"theme"`

	Streaming []StreamingLink `json:"streaming"`

	StreamingEpisodes []StreamingEpisode `json:"streamingEpisodes,omitempty"`
}

type AnimeStatisticsResponse struct {
	Data AnimeStatistics `json:"data"`
}

type AnimeStatistics struct {
	Scores   []ScoreDistribution  `json:"scores"` 
	Statuses []StatusDistribution `json:"statuses"`
}

type StatusDistribution struct {
	Status string `json:"status"`
	Amount int    `json:"amount"`
}

type ScoreDistribution struct {
	Score      int     `json:"score"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}

// RelationEntry é a obra apontada por uma relação (prequela, sequência, spin-off...).
//
// MalID é ponteiro de propósito: a AniList devolve `idMal` nulo em parte do catálogo, e
// como `int` isso virava 0 — um número válido, que a tela transformava num link para
// /anime/0. Ponteiro permite distinguir "não tem id" de "o id é zero".
type RelationEntry struct {
	MalID *int   `json:"mal_id,omitempty"`
	Type  string `json:"type"`
	Name  string `json:"name"`
	Image string `json:"image"` // Imagem da Capa do anime relacionado
}

// Relation agrupa o tipo de vínculo com a obra relacionada.
// Tipo nomeado pelo mesmo motivo do Genre: a struct anônima estava repetida em 4 pontos.
type Relation struct {
	Relation string          `json:"relation"`
	Entry    []RelationEntry `json:"entry"`
}

// StreamingLink é uma plataforma onde a obra pode ser assistida.
// Tipo nomeado pelo mesmo motivo do Genre: o valor é construído em mais de um ponto.
type StreamingLink struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type StreamingEpisode struct {
	Title     string `json:"title"`
	Thumbnail string `json:"thumbnail"`
	URL       string `json:"url"`
	Site      string `json:"site"`

	// AiredAt é a data de exibição do episódio, no formato AAAA-MM-DD. Só vem da curadoria:
	// a AniList não informa data por episódio, e sem ela a grade precisa derivar tudo da
	// estreia do anime, o que erra em obras com hiato ou episódio especial no meio.
	AiredAt string `json:"aired_at,omitempty"`
}
type FuzzyDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}