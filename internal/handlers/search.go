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

	// 1. Buscando os animes do banco pessoal
	var curados []models.CuratedAnime
	database.Client.DB.From("curated_animes").Select("*").Execute(&curados)

	// 2. Transformando a lista (array) em um dicionário (map) no Go. (Performance)
	curadosMap := make(map[int]models.CuratedAnime)
	for _, c := range curados {
		curadosMap[c.MalID] = c 
	}

	// 3. Varrendo resultados que vieram da Anilist 
	for i, animeAniList := range resultados.Data {
		// Se existir no banco pessoal, sobrescreve os campos de título, sinopse e status com os valores customizados.
		if curado, ok := curadosMap[animeAniList.MalID]; ok {
			resultados.Data[i].Title = curado.CustomTitle

			if curado.CustomSynopsis != "" {
				resultados.Data[i].Synopsis = curado.CustomSynopsis
			}
			if curado.CustomStatus != "" {
				resultados.Data[i].Status = curado.CustomStatus
			}

			// React espera uma lista de structs {Name: "tag"}, então convertemos as tags para o formato esperado.
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
