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

type SearchHandler struct {
	AniListClient anilist.Service
}

func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	genres := r.URL.Query()["genre"]
	tags := r.URL.Query()["tag"]
	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))
	sortParam := r.URL.Query().Get("sort")

	if sortParam == "" {
		sortParam = "POPULARITY_DESC" // Padrão: Mais populares primeiro
	}

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

	seasonYear := 0
	if season != "" {
		if y, err := strconv.Atoi(r.URL.Query().Get("year")); err == nil && y > 0 {
			seasonYear = y
		}
	}

	if query == "" && len(genres) == 0 && len(tags) == 0 && season == "" && status == "" {
		http.Error(w, "É necessário informar ao menos um critério de busca", http.StatusBadRequest)
		return
	}

	genreMap := make(map[string]bool)
	for _, g := range genres {
		genreMap[strings.ToLower(g)] = true
	}

	tagMap := make(map[string]bool)
	for _, t := range tags {
		tagMap[strings.ToLower(t)] = true
	}

	filters := anilist.SearchFilters{
		Genres:     genres,
		Tags:       tags,
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
		Sort:       sortParam,
	}

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	// Injeta a curadoria local APENAS na primeira página para não repetir
	if query != "" && page == 1 {
		var localHits []models.CuratedAnime
		data, _, errLocal := database.Client.From("curated_animes").Select("*", "exact", false).Filter("custom_title", "ilike", "%"+query+"%").Execute()

		if errLocal == nil {
			_ = json.Unmarshal(data, &localHits)
		}

		if errLocal == nil && len(localHits) > 0 {
			var localMalIDs []int
			for _, hit := range localHits {
				localMalIDs = append(localMalIDs, hit.MalID)
			}

			localAnimes, errAniListIds := h.AniListClient.GetAnimesByMalIDs(r.Context(), localMalIDs)

			if errAniListIds == nil && localAnimes != nil {
				curadosMap := make(map[int]models.CuratedAnime)
				for _, hit := range localHits {
					curadosMap[hit.MalID] = hit
				}

				existingIDs := make(map[int]bool)
				var combined []anilist.Anime

				for _, a := range localAnimes.Data {
					if curado, ok := curadosMap[a.MalID]; ok {
						a.Title = curado.CustomTitle
						if curado.CustomSynopsis != "" {
							a.Synopsis = curado.CustomSynopsis
						}

						if curado.CustomStatus != "" {
							a.Status = curado.CustomStatus
						}
						if len(curado.CustomTags) > 0 {
							var novasTags []struct {
								Name string `json:"name"`
							}
							for _, tag := range curado.CustomTags {
								novasTags = append(novasTags, struct {
									Name string `json:"name"`
								}{Name: tag})
							}
							a.Genres = novasTags
						}
					}

					match := true
					if len(genres) > 0 {
						hasGenre := false
						for _, animeG := range a.Genres {
							if genreMap[strings.ToLower(animeG.Name)] {
								hasGenre = true
								break
							}
						}
						if !hasGenre {
							match = false
						}
					}
					if match && len(tags) > 0 {
						hasTag := false
						for _, animeG := range a.Genres {
							if tagMap[strings.ToLower(animeG.Name)] {
								hasTag = true
								break
							}
						}
						if !hasTag {
							match = false
						}
					}

					if match {
						combined = append(combined, a)
						existingIDs[a.MalID] = true
					}
				}

				for _, a := range resultados.Data {
					if !existingIDs[a.MalID] {
						combined = append(combined, a)
						existingIDs[a.MalID] = true
					}
				}
				resultados.Data = combined
			}
		}
	}

	var curados []models.CuratedAnime
	dataCurados, _, _ := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
	if dataCurados != nil {
		_ = json.Unmarshal(dataCurados, &curados)
	}

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
				var novasTags []struct {
					Name string `json:"name"`
				}
				for _, tag := range curado.CustomTags {
					novasTags = append(novasTags, struct {
						Name string `json:"name"`
					}{Name: tag})
				}
				resultados.Data[i].Genres = novasTags
			}
		}
	}

	// Filtra a lista final para garantir precisão
	if status != "" {
		expectedStatus := status
		switch status {
		case "FINISHED":
			expectedStatus = "Finished Airing"
		case "RELEASING":
			expectedStatus = "Currently Airing"
		case "NOT_YET_RELEASED":
			expectedStatus = "Not yet aired"
		}

		var filtered []anilist.Anime
		for _, a := range resultados.Data {
			if strings.EqualFold(a.Status, expectedStatus) {
				filtered = append(filtered, a)
			}
		}
		resultados.Data = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleSearch: falha ao serializar resposta: %v", err)
	}
}
