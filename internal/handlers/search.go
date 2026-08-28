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
	
// FALLBACK (BLOCO 3): Se a AniList cair, montamos a busca inteira unindo Curadoria e Cache
	if err != nil || resultados == nil {
		log.Printf("[ERRO ANILIST] Fallback ativado para busca: %v", err)
		resultados = &anilist.AnimeSearchResponse{Data: []anilist.Anime{}}
		
		dataCurados, _, _ := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
		var curados []models.CuratedAnime
		json.Unmarshal(dataCurados, &curados)

		dataCache, _, _ := database.Client.From("anime_metadata_cache").Select("*", "exact", false).Execute()
		var cached []map[string]interface{}
		json.Unmarshal(dataCache, &cached)

		unified := make(map[int]anilist.Anime)

		// 1. Popula com cache (preserva Gêneros e Tags originais em Inglês)
		for _, c := range cached {
			idFloat, ok := c["mal_id"].(float64)
			if !ok { continue }
			id := int(idFloat)
			
			anime := anilist.Anime{MalID: id}
			if t, ok := c["title"].(string); ok { anime.Title = t }
			if st, ok := c["status"].(string); ok { anime.Status = st }
			
			if gList, ok := c["genres"].([]interface{}); ok {
				for _, g := range gList {
					if gStr, isStr := g.(string); isStr { anime.Genres = append(anime.Genres, anilist.Genre{Name: gStr}) }
				}
			}
			if tList, ok := c["tags"].([]interface{}); ok {
				for _, t := range tList {
					if tStr, isStr := t.(string); isStr { anime.Tags = append(anime.Tags, tStr) }
				}
			}
			unified[id] = anime
		}

		// 2. Mescla e Filtra tudo
		for _, cur := range curados {
			anime, exists := unified[cur.MalID]
			if !exists { anime = anilist.Anime{MalID: cur.MalID, Title: cur.CustomTitle} }
			
			originalGenres := make([]string, len(anime.Genres))
			for i, g := range anime.Genres { originalGenres[i] = g.Name }
			originalTags := append([]string{}, anime.Tags...)

			AplicarCuradoria(&anime, cur)

			if query != "" && !strings.Contains(strings.ToLower(anime.Title), strings.ToLower(query)) { continue }

			match := true
			if len(genres) > 0 {
				has := false
				for _, gReq := range genres {
					// Compara com os originais (em Inglês)
					for _, og := range originalGenres { if strings.EqualFold(gReq, og) { has = true; break } }
					// Compara com os curados (em Português)
					for _, ag := range anime.Genres { if strings.EqualFold(gReq, ag.Name) { has = true; break } }
				}
				if !has { match = false }
			}

			if match && len(tags) > 0 {
				has := false
				for _, tReq := range tags {
					for _, ot := range originalTags { if strings.EqualFold(tReq, ot) { has = true; break } }
					for _, ag := range anime.Genres { if strings.EqualFold(tReq, ag.Name) { has = true; break } }
				}
				if !has { match = false }
			}

			if match { resultados.Data = append(resultados.Data, anime) }
			delete(unified, cur.MalID) // Remove para não duplicar no loop abaixo
		}

		// 3. Processa o que sobrou apenas no cache
		for _, anime := range unified {
			if query != "" && !strings.Contains(strings.ToLower(anime.Title), strings.ToLower(query)) { continue }

			match := true
			if len(genres) > 0 {
				has := false
				for _, gReq := range genres {
					for _, ag := range anime.Genres { if strings.EqualFold(gReq, ag.Name) { has = true; break } }
				}
				if !has { match = false }
			}
			if match && len(tags) > 0 {
				has := false
				for _, tReq := range tags {
					for _, at := range anime.Tags { if strings.EqualFold(tReq, at) { has = true; break } }
				}
				if !has { match = false }
			}

			if match { resultados.Data = append(resultados.Data, anime) }
		}
	}

	// Injeta a curadoria local APENAS na primeira página para não repetir
	if err == nil && query != "" && page == 1 {
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

			// FALLBACK (BLOCO 3): Se a AniList cair, montamos os animes usando a curadoria local
			if errAniListIds != nil || localAnimes == nil {
				localAnimes = &anilist.AnimeSearchResponse{Data: []anilist.Anime{}}
				for _, hit := range localHits {
					localAnimes.Data = append(localAnimes.Data, anilist.Anime{
						MalID: hit.MalID,
						Title: hit.CustomTitle,
					})
				}
			}

			if localAnimes != nil {
				curadosMap := make(map[int]models.CuratedAnime)
				for _, hit := range localHits {
					curadosMap[hit.MalID] = hit
				}

				existingIDs := make(map[int]bool)
				var combined []anilist.Anime

				for _, a := range localAnimes.Data {
					if curado, ok := curadosMap[a.MalID]; ok {
						AplicarCuradoria(&a, curado)
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
			AplicarCuradoria(&resultados.Data[i], curado)
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
