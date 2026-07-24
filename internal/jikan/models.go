package jikan

type AnimeSearchResponse struct {
	Data []Anime `json:"data"`
}

// É a resposta para pedir os detalhes de 1 anime específico
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

	// Estrutura aninhada para pegar a URL da imagem de capa (poster)
	Images struct {
		JPG struct {
			ImageURL string `json:"image_url"`
		} `json:"jpg"`
	} `json:"images"`

	// Lista de gêneros (ex: Ação, Aventura)
	Genres []struct {
		Name string `json:"name"`
	} `json:"genres"`

	Studios []struct {
		Name string `json:"name"`
	} `json:"studios"`

	Relations []struct {
		Relation string `json:"relation"` // ex: "Adaptation", "Sequel"
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


// --- ESTATÍSTICAS --- 

// Representa o retorno da rota 
type AnimeStatisticsResponse struct {
	Data AnimeStatistics `json:"data"`
}

type AnimeStatistics struct {
	Scores []ScoreDistribution `json:"scores"` // Lista de notas de 1 a 10 
}

// Diz quantas pessoas deram uma nota específica 
type ScoreDistribution struct {
	Score      int     `json:"score"`
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}
