package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database" 
	"github.com/JoaoMendes1/anideck/internal/models"   
)

type RankingHandler struct {
	AniListClient anilist.Service
}

func (h *RankingHandler) HandleGetTopAnime(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	perPageStr := r.URL.Query().Get("perPage")
	perPage, err := strconv.Atoi(perPageStr)
	if err != nil || perPage < 1 || perPage > 50 {
		perPage = 20
	}

	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))
	sortParam := r.URL.Query().Get("sort")

	seasonYear := 0
	if season != "" {
		if y, err := strconv.Atoi(r.URL.Query().Get("year")); err == nil && y > 0 {
			seasonYear = y
		}
	}

	filters := anilist.SearchFilters{
		Genres:     r.URL.Query()["genre"],
		Tags:       r.URL.Query()["tag"],
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
		Sort:       sortParam,
	}

	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar top animes: %v", err)
		http.Error(w, "Ranking indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Execute()

	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
		curadosMap := make(map[int]models.CuratedAnime)
		for _, c := range curados {
			curadosMap[c.MalID] = c
		}

		for i, animeAniList := range resultados.Data {
			if curado, ok := curadosMap[animeAniList.MalID]; ok {
				resultados.Data[i].Title = curado.CustomTitle
				if curado.CustomSynopsis != "" {
					resultados.Data[i].Synopsis = curado.CustomSynopsis
				}
				if curado.CustomStatus != "" {
					resultados.Data[i].Status = curado.CustomStatus
				}
				if len(curado.CustomTags) > 0 {
					var novasTags []struct{ Name string `json:"name"` }
					for _, tag := range curado.CustomTags {
						novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
					}
					resultados.Data[i].Genres = novasTags
				}
			}
		}
	}

	if status != "" {
		expectedStatusMapped := ""
		switch status {
		case "FINISHED":
			expectedStatusMapped = "Finished Airing"
		case "RELEASING":
			expectedStatusMapped = "Currently Airing"
		case "NOT_YET_RELEASED":
			expectedStatusMapped = "Not yet aired"
		}

		var filtered []anilist.Anime
		for _, a := range resultados.Data {
			// Aceita "Currently Airing" (AniList) OU "RELEASING" (Admin Panel)
			if strings.EqualFold(a.Status, expectedStatusMapped) || strings.EqualFold(a.Status, status) {
				filtered = append(filtered, a)
			}
		}
		resultados.Data = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetTopAnime: falha ao serializar resposta: %v", err)
	}
}