package models

import "encoding/json"

type CuratedAnime struct {
	ID             string   `json:"id,omitempty"`
	MalID          int      `json:"mal_id"`
	CustomTitle    string   `json:"custom_title"`
	CustomSynopsis string   `json:"custom_synopsis,omitempty"`
	CustomFormat   string   `json:"custom_format,omitempty"`
	CustomStatus   string   `json:"custom_status,omitempty"`
	CustomTags     []string `json:"custom_tags,omitempty"`

	CustomCoverImage  string          `json:"custom_cover_image"`
	CustomBannerImage string          `json:"custom_banner_image"`
	CustomCharacters  json.RawMessage `json:"custom_characters"`
	
	OrderIndex        int             `json:"order_index"`
	CreatedAt         string          `json:"created_at,omitempty"`
}