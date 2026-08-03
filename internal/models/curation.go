package models 

// CuratedAnime representa um anime que foi salvo/editado no Painel Admin.
// As tags (json:"...") dizem como o Go deve converter isso para texto ao conversar com o Frontend.
type CuratedAnime struct {
	ID             string   `json:"id,omitempty"`
	MalID          int      `json:"mal_id"`
	CustomTitle    string   `json:"custom_title"`
	CustomSynopsis string   `json:"custom_synopsis,omitempty"`
	CustomFormat   string   `json:"custom_format,omitempty"`
	CustomStatus   string   `json:"custom_status,omitempty"`
	CustomTags     []string `json:"custom_tags,omitempty"`
	OrderIndex     int      `json:"order_index"`
	CreatedAt      string   `json:"created_at,omitempty"`
}