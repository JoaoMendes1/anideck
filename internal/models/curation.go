package models

import "encoding/json"

type CuratedAnime struct {
	ID             string   `json:"id,omitempty"`
	MalID          int      `json:"mal_id"`
	CustomTitle    string   `json:"custom_title"`
	CustomSynopsis string   `json:"custom_synopsis,omitempty"`
	CustomFormat   string   `json:"custom_format,omitempty"`
	CustomStatus   string   `json:"custom_status,omitempty"`
	CustomTags     []string `json:"custom_tags"`

	CustomCoverImage  string          `json:"custom_cover_image"`
	CustomBannerImage string          `json:"custom_banner_image"`
	CustomCharacters  json.RawMessage `json:"custom_characters"`



	CustomEpisodes      json.RawMessage `json:"custom_episodes"`
	CustomExternalLinks json.RawMessage `json:"custom_external_links"`

	CustomFirstAiredAt    *string `json:"custom_first_aired_at"`
	CustomDurationMinutes *int    `json:"custom_duration_minutes"`
	
	IsDestaque     *bool  `json:"is_destaque,omitempty"`
	CurationStatus string `json:"curation_status,omitempty"`

	OrderIndex int    `json:"order_index"`
	CreatedAt  string `json:"created_at,omitempty"`
}