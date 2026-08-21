package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// GlobalRankingState guarda o Top Global calculado na memória RAM.
type GlobalRankingState struct {
	sync.RWMutex
	Animes      []anilist.Anime
	LastUpdated time.Time
	GlobalC     float64
	GlobalM     float64
}

var globalRanking GlobalRankingState

// StartRankingEngine inicia o Worker de Background que calcula o Ranking a cada 12 horas.
// DEVE SER CHAMADO NO main.go: `go handlers.StartRankingEngine(aniListClient)`
func StartRankingEngine(client anilist.Service) {
	log.Println("[RANKING ENGINE] Worker iniciado. Primeira carga Bayesiana em andamento...")
	updateGlobalCache(client) // Executa na hora que o servidor sobe

	ticker := time.NewTicker(12 * time.Hour)
	for range ticker.C {
		updateGlobalCache(client)
	}
}

func updateGlobalCache(client anilist.Service) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	var allAnimes []anilist.Anime
	filters := anilist.SearchFilters{Sort: "POPULARITY_DESC"}

	// Buscamos o Top 500 mais popular (10 páginas de 50) para aplicar o cálculo
	for page := 1; page <= 10; page++ {
		res, err := client.GetTopAnime(ctx, page, 50, filters)
		if err != nil {
			log.Printf("[RANKING ENGINE] Falha ao buscar página %d: %v", page, err)
			continue
		}
		allAnimes = append(allAnimes, res.Data...)
		time.Sleep(1 * time.Second) // Evitar rate limit da AniList
	}

	// 1. Extrair 'C' (Média Geral) e 'm' (Volume Mínimo)
	var totalScore, totalPop float64
	var validCount float64

	for _, a := range allAnimes {
		if a.Score > 0 {
			totalScore += a.Score
			totalPop += float64(a.Popularity)
			validCount++
		}
	}

	if validCount == 0 {
		return
	}

	C := totalScore / validCount
	m := totalPop / validCount // Usando a popularidade média como threshold

	// 2. Aplicar Fórmula Bayesiana: (v / (v+m) * R) + (m / (v+m) * C)
	for i := range allAnimes {
		if allAnimes[i].Score == 0 {
			allAnimes[i].BayesianScore = 0
			continue
		}
		v := float64(allAnimes[i].Popularity)
		R := allAnimes[i].Score
		allAnimes[i].BayesianScore = (v/(v+m))*R + (m/(v+m))*C
	}

	// 3. Ordenar matematicamente pelo Score Bayesiano
	sort.Slice(allAnimes, func(i, j int) bool {
		return allAnimes[i].BayesianScore > allAnimes[j].BayesianScore
	})

	// 4. Assinalar posições (Preparando terreno para o ▲/▼)
	for i := range allAnimes {
		// O PreviousRank nascerá copiando o CurrentRank anterior (isso será evoluído depois)
		allAnimes[i].CurrentRank = i + 1
		allAnimes[i].PreviousRank = i + 1
	}

	// 5. Salvar na Memória (Lock seguro)
	globalRanking.Lock()
	globalRanking.Animes = allAnimes
	globalRanking.LastUpdated = time.Now()
	globalRanking.GlobalC = C
	globalRanking.GlobalM = m
	globalRanking.Unlock()

	log.Printf("[RANKING ENGINE] Atualização concluída com sucesso. %d animes reordenados na memória.", len(allAnimes))
}

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

	filters := anilist.SearchFilters{
		Genres: r.URL.Query()["genre"],
		Tags:   r.URL.Query()["tag"],
		Season: season,
		Status: status,
		Sort:   sortParam,
	}

	// Se for o ranking principal limpo, servimos a nossa Paginação Virtual Bayesiana em memória!
	isDefaultRanking := page >= 1 && season == "" && status == "" && sortParam == "POPULARITY_DESC" && len(filters.Genres) == 0 && len(filters.Tags) == 0

	w.Header().Set("Content-Type", "application/json")

	if isDefaultRanking {
		globalRanking.RLock()
		defer globalRanking.RUnlock()

		if len(globalRanking.Animes) > 0 {
			start := (page - 1) * perPage
			end := start + perPage

			if start > len(globalRanking.Animes) {
				start = len(globalRanking.Animes)
			}
			if end > len(globalRanking.Animes) {
				end = len(globalRanking.Animes)
			}

			response := anilist.AnimeSearchResponse{
				Data:        globalRanking.Animes[start:end],
				LastUpdated: globalRanking.LastUpdated.Format(time.RFC3339),
			}

			applyCuradoria(&response) // Reaplica edições manuais (nomes pt-br, etc)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	// Fallback inteligente: se usou filtros (ex: Lançamentos de Verão), passamos direto pra AniList
	resultados, err := h.AniListClient.GetTopAnime(r.Context(), page, perPage, filters)
	if err != nil {
		log.Printf("[ERRO ANILIST] Falha ao buscar top animes filtrados: %v", err)
		http.Error(w, "Ranking indisponível no momento.", http.StatusServiceUnavailable)
		return
	}

	if status != "" {
		expectedStatusMapped := mapStatusForFilter(status)
		var filtered []anilist.Anime
		for _, a := range resultados.Data {
			if strings.EqualFold(a.Status, expectedStatusMapped) || strings.EqualFold(a.Status, status) {
				filtered = append(filtered, a)
			}
		}
		resultados.Data = filtered
	}

	globalRanking.RLock()
	C := globalRanking.GlobalC
	m := globalRanking.GlobalM
	globalRanking.RUnlock()

	// Se o motor já rodou pelo menos uma vez, temos C e m válidos
	if C > 0 && m > 0 {
		for i := range resultados.Data {
			if resultados.Data[i].Score > 0 {
				v := float64(resultados.Data[i].Popularity)
				R := resultados.Data[i].Score
				resultados.Data[i].BayesianScore = (v/(v+m))*R + (m/(v+m))*C
			}
		}

		// Reordena a página atual localmente para garantir que
		// a nota AniDeck dite a ordem visual do que acabou de chegar
		sort.Slice(resultados.Data, func(i, j int) bool {
			return resultados.Data[i].BayesianScore > resultados.Data[j].BayesianScore
		})
	}

	applyCuradoria(resultados)
	json.NewEncoder(w).Encode(resultados)
}

// applyCuradoria isolada para não duplicar código (Data Enrichment)
func applyCuradoria(res *anilist.AnimeSearchResponse) {
	var curados []models.CuratedAnime
	data, _, errCurado := database.Client.From("curated_animes").Select("*", "exact", false).Execute()

	if errCurado == nil {
		_ = json.Unmarshal(data, &curados)
		curadosMap := make(map[int]models.CuratedAnime)
		for _, c := range curados {
			curadosMap[c.MalID] = c
		}

		for i, anime := range res.Data {
			if curado, ok := curadosMap[anime.MalID]; ok {
				res.Data[i].Title = curado.CustomTitle
				if curado.CustomSynopsis != "" {
					res.Data[i].Synopsis = curado.CustomSynopsis
				}
				if curado.CustomStatus != "" {
					res.Data[i].Status = curado.CustomStatus
				}
			}
		}
	}
}

func mapStatusForFilter(status string) string {
	switch status {
	case "FINISHED":
		return "Finished Airing"
	case "RELEASING":
		return "Currently Airing"
	case "NOT_YET_RELEASED":
		return "Not yet aired"
	default:
		return status
	}
}

// InvalidateRankingCache força a limpeza da memória.
// Usado pelo curation.go quando o Admin edita um anime manualmente.
func InvalidateRankingCache() {
	globalRanking.Lock()
	defer globalRanking.Unlock()
	globalRanking.Animes = nil // Limpa a lista

	go func() {
		client := anilist.NewClient()
		updateGlobalCache(client)
	}()
}

// GetAniDeckStats busca a posição oficial e a nota do nosso motor Bayesiano em memória
func GetAniDeckStats(malID int) (rank int, bayesianScore float64, found bool) {
	globalRanking.RLock()
	defer globalRanking.RUnlock()

	for i, a := range globalRanking.Animes {
		if a.MalID == malID {
			return i + 1, a.BayesianScore, true
		}
	}
	return 0, 0, false
}
