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

// RankingHandler lida com requisições de ranking de animes.
type RankingHandler struct {
	AniListClient *anilist.Client
}

// HandleGetTopAnime retorna os animes mais bem avaliados da AniList.
// Todos os filtros são opcionais e passados diretamente para a query GraphQL
// — nenhum pós-processamento client-side necessário.
//
// Query params aceitos:
//   - page     (int, padrão 1)
//   - perPage  (int, padrão 20, máx 50)
//   - genre    (repetível: ?genre=Action&genre=Drama)
//   - tag      (repetível: ?tag=Martial+Arts)
//   - season   (WINTER | SPRING | SUMMER | FALL)
//   - year     (int, ex: 2026 — só usado se season também estiver presente)
//   - status   (FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS)
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
	}

	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar top animes: %v", err)
		http.Error(w, "Ranking indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

var curados []models.CuratedAnime
	errCurado := database.Client.DB.From("curated_animes").Select("*").Execute(&curados)

	if errCurado == nil {
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleGetTopAnime: falha ao serializar resposta: %v", err)
	}
}
