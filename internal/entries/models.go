package entries

type MediaEntry struct {
	ID         string   `json:"id,omitempty"`
	UserID     string   `json:"user_id,omitempty"`
	MalID      int      `json:"mal_id"`
	Tipo       string   `json:"tipo"`
	Status     string   `json:"status"`
	Nota       *float64 `json:"nota,omitempty"`
	Anotacao   string   `json:"anotacao,omitempty"`
	IsFavorite bool     `json:"is_favorite"`
}

type EpisodeProgress struct {
	ID            string `json:"id,omitempty"`
	UserID        string `json:"user_id,omitempty"`
	MalID         int    `json:"mal_id"`
	EpisodeNumber int    `json:"episode_number"`
	WatchedAt     string `json:"watched_at,omitempty"`
}