package anilist

type AnimeSearchResponse struct {
	Data []Anime `json:"data"`
}

type AnimeByIdResponse struct {
	Data Anime `json:"data"`
}

type Anime struct {
	MalID    int     `json:"mal_id"`
	Title    string  `json:"title"`
	Status   string  `json:"status"`
	Synopsis string  `json:"synopsis"`
	Episodes int     `json:"episodes"`
	Score    float64 `json:"score"`
	Ranking  int     `json:"ranking,omitempty"` // ✨ MUDOU AQUI: Propriedade para guardar a posição global

	Images struct {
		JPG struct {
			ImageURL string `json:"image_url"`
		} `json:"jpg"`
	} `json:"images"`

	Genres []struct {
		Name string `json:"name"`
	} `json:"genres"`

	Studios []struct {
		Name string `json:"name"`
	} `json:"studios"`

	Relations []struct {
		Relation string `json:"relation"` 
		Entry    []struct {
			MalID int    `json:"mal_id"`
			Type  string `json:"type"`
			Name  string `json:"name"`
		} `json:"entry"`
	} `json:"relations"`

	Theme struct {
		Openings []string `json:"openings"`
		Endings  []string `json:"endings"`
	} `json:"theme"`

	Streaming []struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"streaming"`
}

type AnimeStatisticsResponse struct {
	Data AnimeStatistics `json:"data"`
}

type AnimeStatistics struct {
	Scores []ScoreDistribution `json:"scores"` 
}

type ScoreDistribution struct {
	Score      int     `json:"score"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}