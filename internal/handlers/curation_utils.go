package handlers

import (
	"encoding/json"
	"log"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// ApplyCurationToAnimeList varre uma lista de animes e substitui as capas/títulos pelos do Painel Admin
func ApplyCurationToAnimeList(animes []anilist.Anime) []anilist.Anime {
	dbClient := database.Client
	if dbClient == nil {
		log.Printf("[CURATION_UTILS] Erro DB: Cliente não inicializado")
		return animes
	}

	data, _, err := dbClient.From("curated_animes").Select("*", "exact", false).Execute()
	if err != nil {
		return animes
	}

	var curados []models.CuratedAnime
	if err := json.Unmarshal(data, &curados); err != nil {
		return animes
	}

	// Cria um mapa rápido por mal_id
	cmap := make(map[int]models.CuratedAnime)
	for _, c := range curados {
		cmap[c.MalID] = c
	}

	// Varre a lista original da AniList e injeta a curadoria se existir
	for i, a := range animes {
		if c, ok := cmap[a.MalID]; ok {
			if c.CustomTitle != "" {
				animes[i].Title = c.CustomTitle
			}
			if c.CustomCoverImage != "" {
				animes[i].Images.JPG.ImageURL = c.CustomCoverImage
			}
			if c.CustomBannerImage != "" {
				animes[i].BannerImage = c.CustomBannerImage
			}
		}
	}
	return animes
}