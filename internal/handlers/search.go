// internal/handlers/search.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

type SearchHandler struct {
	AniListClient *anilist.Client
}

// HandleSearch processa buscas de anime por texto, gênero, tag, temporada, ano e/ou status.
// Requer ao menos um de: q (texto), genre ou tag — filtros de contexto não são uma fonte de dados.
func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	genres := r.URL.Query()["genre"]
	tags := r.URL.Query()["tag"]
	season := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("season")))
	status := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status")))

	// seasonYear só é relevante quando season também está presente (regra da AniList)
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

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Variável MOCK_ANILIST ativada. Retornando dados falsos para busca...")
		resultados := &anilist.AnimeSearchResponse{
			Data: []anilist.Anime{
				{MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Finished Airing"},
				{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
				{MalID: 31964, Title: "Boku no Hero Academia (Mock)", Status: "Finished Airing"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resultados); err != nil {
			log.Printf("[ERRO] HandleSearch mock: falha ao serializar: %v", err)
		}
		return
	}

	filters := anilist.SearchFilters{
		Genres:     genres,
		Tags:       tags,
		Season:     season,
		SeasonYear: seasonYear,
		Status:     status,
	}

	resultados, err := h.AniListClient.SearchAnime(r.Context(), query, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar '%s': %v", query, err)
		http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
		return
	}

	// ==========================================
	// 1. BUSCA HÍBRIDA CORRIGIDA (Com respeito a filtros)
	// ==========================================
	if query != "" {
		var localHits []models.CuratedAnime
		errLocal := database.Client.DB.From("curated_animes").Select("*").Filter("custom_title", "ilike", "*"+query+"*").Execute(&localHits)

		if errLocal == nil && len(localHits) > 0 {
			var localMalIDs []int
			for _, hit := range localHits {
				localMalIDs = append(localMalIDs, hit.MalID)
			}

			localAnimes, errAniListIds := h.AniListClient.GetAnimesByMalIDs(r.Context(), localMalIDs)

			if errAniListIds == nil && localAnimes != nil {
				// Mapa para aplicar a curadoria local antes de testar os filtros
				curadosMap := make(map[int]models.CuratedAnime)
				for _, hit := range localHits {
					curadosMap[hit.MalID] = hit
				}

				existingIDs := make(map[int]bool)
				var combined []anilist.Anime
				
				// 1º Testa os animes do NOSSO banco contra os filtros ativos na tela
				for _, a := range localAnimes.Data {
					
					// Aplica as tags e status curados localmente para a verificação ser justa
					if curado, ok := curadosMap[a.MalID]; ok {
						if curado.CustomStatus != "" { a.Status = curado.CustomStatus }
						if len(curado.CustomTags) > 0 {
							var novasTags []struct{ Name string `json:"name"` }
							for _, tag := range curado.CustomTags {
								novasTags = append(novasTags, struct{ Name string `json:"name"` }{Name: tag})
							}
							a.Genres = novasTags
						}
					}

					match := true

					// Verifica Gêneros (Lógica OR: tem que ter pelo menos um dos selecionados)
					if len(genres) > 0 {
						hasGenre := false
						for _, reqG := range genres {
							for _, animeG := range a.Genres {
								if strings.EqualFold(animeG.Name, reqG) { hasGenre = true; break }
							}
							if hasGenre { break }
						}
						if !hasGenre { match = false }
					}

					// Verifica Tags
					if match && len(tags) > 0 {
						hasTag := false
						for _, reqT := range tags {
							for _, animeG := range a.Genres {
								if strings.EqualFold(animeG.Name, reqT) { hasTag = true; break }
							}
							if hasTag { break }
						}
						if !hasTag { match = false }
					}

					// Verifica Status
					if match && status != "" {
						expectedStatus := status
						switch status {
						case "FINISHED": expectedStatus = "Finished Airing"
						case "RELEASING": expectedStatus = "Currently Airing"
						case "NOT_YET_RELEASED": expectedStatus = "Not yet aired"
						}
						if !strings.EqualFold(a.Status, expectedStatus) {
							match = false
						}
					}

					// Se passou por todos os filtros, entra na lista final
					if match {
						combined = append(combined, a)
						existingIDs[a.MalID] = true
					}
				}
				
				// 2º Adiciona os resultados originais da AniList APENAS se ainda não estiverem na lista
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
	database.Client.DB.From("curated_animes").Select("*").Execute(&curados)

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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resultados); err != nil {
		log.Printf("[ERRO] HandleSearch: falha ao serializar resposta: %v", err)
	}
}
