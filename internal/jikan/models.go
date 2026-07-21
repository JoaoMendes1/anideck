package jikan

type AnimeSearchResponse struct {
	Data []Anime `json:"data"`
}

type Anime struct {
	MalID  int    `json:"mal_id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

