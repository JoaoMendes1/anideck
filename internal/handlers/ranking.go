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
	"sync/atomic"
	"time"

	"github.com/supabase-community/postgrest-go"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
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

// intervaloEntreFotos é a cadência do indicador ▲/▼ mantido em 30 dias.
const intervaloEntreFotos = 30 * 24 * time.Hour

// limiteFotoTopGlobal define a quantidade de registros lidos do Top Global.
const limiteFotoTopGlobal = 500

// pesoVotoComunitario pondera o voto local contra o volume externo da AniList.
// Com 350.0, um conjunto de 10 a 15 votos da comunidade local tem força para
// subir posições no Top 500 de maneira orgânica e segura.
const pesoVotoComunitario = 350.0

// linhaSnapshot espelha uma linha de ranking_snapshots (delta mensal de posições).
type linhaSnapshot struct {
	CapturedAt string `json:"captured_at"`
	MalID      int    `json:"mal_id"`
	Position   int    `json:"position"`
}

// communityScoreRow espelha o resultado da view anime_community_scores.
type communityScoreRow struct {
	MalID      int     `json:"mal_id"`
	LocalVotes int     `json:"local_votes"`
	LocalScore float64 `json:"local_score"`
}

// currentCacheRow espelha os registros salvos em ranking_current_cache para boot instantâneo.
type currentCacheRow struct {
	Position      int      `json:"position"`
	MalID         int      `json:"mal_id"`
	Title         string   `json:"title"`
	ImageURL      string   `json:"image_url"`
	BayesianScore float64  `json:"bayesian_score"`
	Score         float64  `json:"score"`
	LocalVotes    int      `json:"local_votes"`
	LocalScore    *float64 `json:"local_score,omitempty"`
	UpdatedAt     string   `json:"updated_at,omitempty"`
}

// calcularVariacao preenche PreviousRank a partir da foto anterior.
func calcularVariacao(animes []anilist.Anime, foto map[int]int) {
	for i := range animes {
		animes[i].PreviousRank = foto[animes[i].MalID]
	}
}

// carregarUltimaFoto busca a foto histórica de 30 dias em ranking_snapshots.
func carregarUltimaFoto() (map[int]int, time.Time, error) {
	client, err := database.ServiceRoleClient()
	if err != nil {
		return nil, time.Time{}, err
	}

	data, _, err := client.From("ranking_snapshots").
		Select("captured_at,mal_id,position", "exact", false).
		Order("captured_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(limiteFotoTopGlobal, "").
		Execute()
	if err != nil {
		return nil, time.Time{}, err
	}

	var linhas []linhaSnapshot
	if err := json.Unmarshal(data, &linhas); err != nil {
		return nil, time.Time{}, err
	}
	if len(linhas) == 0 {
		return nil, time.Time{}, nil
	}

	maisRecente := linhas[0].CapturedAt
	foto := make(map[int]int, len(linhas))
	for _, l := range linhas {
		if l.CapturedAt != maisRecente {
			break
		}
		foto[l.MalID] = l.Position
	}

	var quando time.Time
	for _, formato := range formatosDeEstreia {
		if t, errParse := time.Parse(formato, maisRecente); errParse == nil {
			quando = t.UTC()
			break
		}
	}

	return foto, quando, nil
}

// gravarFoto persiste as posições atuais na tabela histórica ranking_snapshots.
func gravarFoto(animes []anilist.Anime, quando time.Time) error {
	client, err := database.ServiceRoleClient()
	if err != nil {
		return err
	}

	carimbo := quando.UTC().Format(time.RFC3339)
	linhas := make([]linhaSnapshot, 0, len(animes))
	for _, a := range animes {
		if a.MalID <= 0 || a.CurrentRank <= 0 {
			continue
		}
		linhas = append(linhas, linhaSnapshot{
			CapturedAt: carimbo,
			MalID:      a.MalID,
			Position:   a.CurrentRank,
		})
	}
	if len(linhas) == 0 {
		return nil
	}

	_, _, err = client.From("ranking_snapshots").
		Insert(linhas, true, "captured_at,mal_id", "minimal", "exact").
		Execute()
	return err
}

// carregarVotosComunitarios busca as notas consolidadas da view anime_community_scores.
func carregarVotosComunitarios() map[int]communityScoreRow {
	votosMap := make(map[int]communityScoreRow)
	client, err := database.ServiceRoleClient()
	if err != nil {
		log.Printf("[RANKING ENGINE] Falha ao obter client para ler notas comunitárias: %v", err)
		return votosMap
	}

	data, _, err := client.From("anime_community_scores").Select("*", "exact", false).Execute()
	if err != nil {
		log.Printf("[RANKING ENGINE] Aviso: falha ao consultar anime_community_scores: %v", err)
		return votosMap
	}

	var linhas []communityScoreRow
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[RANKING ENGINE] Aviso: falha ao deserializar anime_community_scores: %v", err)
		return votosMap
	}

	for _, l := range linhas {
		votosMap[l.MalID] = l
	}
	return votosMap
}

// gravarCachePersistido salva o estado consolidado atual em ranking_current_cache.
func gravarCachePersistido(animes []anilist.Anime, votosMap map[int]communityScoreRow) error {
	client, err := database.ServiceRoleClient()
	if err != nil {
		return err
	}

	linhas := make([]currentCacheRow, 0, len(animes))
	agoraStr := time.Now().UTC().Format(time.RFC3339)

	// O contador é próprio em vez do índice do range: anime pulado abriria buraco
	// na numeração, e position é a chave primária da tabela.
	posicao := 0
	for _, a := range animes {
		if a.MalID <= 0 {
			continue
		}
		posicao++
		var lVotes int
		var lScore *float64
		if v, ok := votosMap[a.MalID]; ok {
			lVotes = v.LocalVotes
			valScore := v.LocalScore
			lScore = &valScore
		}

		linhas = append(linhas, currentCacheRow{
			Position:      posicao,
			MalID:         a.MalID,
			Title:         a.Title,
			ImageURL:      a.Images.JPG.ImageURL,
			BayesianScore: a.BayesianScore,
			Score:         a.Score,
			LocalVotes:    lVotes,
			LocalScore:    lScore,
			UpdatedAt:     agoraStr,
		})
	}

	if len(linhas) == 0 {
		return nil
	}

	if _, _, err = client.From("ranking_current_cache").
		Insert(linhas, true, "position", "minimal", "exact").
		Execute(); err != nil {
		return err
	}

	// O upsert é por position: um Top menor que o anterior não toca as posições
	// excedentes, e elas ficam com dados da execução passada. O boot leria as duas
	// execuções misturadas sem nada acusar.
	_, _, err = client.From("ranking_current_cache").
		Delete("", "exact").
		Gt("position", strconv.Itoa(len(linhas))).
		Execute()
	return err
}

// carregarCachePersistido preenche a memória RAM instantaneamente no boot lendo ranking_current_cache.
func carregarCachePersistido() bool {
	client, err := database.ServiceRoleClient()
	if err != nil {
		log.Printf("[RANKING ENGINE] Erro de conexão no boot: %v", err)
		return false
	}

	data, _, err := client.From("ranking_current_cache").
		Select("*", "exact", false).
		Order("position", &postgrest.OrderOpts{Ascending: true}).
		Limit(limiteFotoTopGlobal, "").
		Execute()
	if err != nil {
		log.Printf("[RANKING ENGINE] ranking_current_cache inacessível no boot: %v", err)
		return false
	}

	var linhas []currentCacheRow
	if err := json.Unmarshal(data, &linhas); err != nil || len(linhas) == 0 {
		return false
	}

	animes := make([]anilist.Anime, 0, len(linhas))
	var somaScores float64
	for _, l := range linhas {
		a := anilist.Anime{
			MalID:         l.MalID,
			Title:         l.Title,
			Score:         l.Score,
			BayesianScore: l.BayesianScore,
			CurrentRank:   l.Position,
		}
		a.Images.JPG.ImageURL = l.ImageURL
		animes = append(animes, a)
		somaScores += l.Score
	}

	foto, _, _ := carregarUltimaFoto()
	calcularVariacao(animes, foto)

	globalRanking.Lock()
	globalRanking.Animes = animes
	globalRanking.LastUpdated = time.Now()
	if len(animes) > 0 {
		globalRanking.GlobalC = somaScores / float64(len(animes))
		globalRanking.GlobalM = 15000.0
	}
	globalRanking.Unlock()

	log.Printf("[RANKING ENGINE] Boot imediato concluído: %d animes carregados de ranking_current_cache.", len(animes))
	return true
}

// StartRankingEngine inicia o motor e o agendador de atualização a cada 12 horas.
func StartRankingEngine(client anilist.Service) {
	log.Println("[RANKING ENGINE] Inicializando motor de ranking...")

	// 1. Boot imediato resiliente do banco para a RAM
	carregarCachePersistido()

	// 2. Executa a primeira carga completa em background para não bloquear o servidor
	go updateGlobalCache(client)

	ticker := time.NewTicker(12 * time.Hour)
	for range ticker.C {
		updateGlobalCache(client)
	}
}

// calcularRankingBayesiano ordena os animes pelo score bayesiano híbrido e devolve os
// dois parâmetros do cálculo: C (média geral das notas) e m (volume mínimo de votos).
//
// Fica fora do updateGlobalCache de propósito. Lá a lógica está espremida entre chamada
// à AniList e escrita no Supabase, e não há como testá-la sem as duas. Mesmo motivo que
// separou o buildMetadataPayload no entries.go.
//
// Ordena o slice recebido no lugar. O terceiro retorno é false quando nenhum anime tem
// nota — não há ranking a calcular e o ciclo deve parar.
func calcularRankingBayesiano(animes []anilist.Anime, votos map[int]communityScoreRow) (float64, float64, bool) {
	var totalScore, totalPop, validCount float64

	for _, a := range animes {
		if a.Score > 0 {
			totalScore += a.Score
			totalPop += float64(a.Popularity)
			validCount++
		}
	}

	if validCount == 0 {
		return 0, 0, false
	}

	C := totalScore / validCount
	m := totalPop / validCount

	// m = 0 significa que nenhum anime trouxe popularity. Acontece no caminho de
	// emergência, em que o ranking vem do anime_metadata_cache, que não guarda esse
	// campo. Sem log, o Top sai degradado sem ninguém perceber.
	if m == 0 {
		log.Println("[RANKING] m = 0: sem popularity na fonte, ranking sem suavização bayesiana")
	}

	for i := range animes {
		vExt := float64(animes[i].Popularity)
		rExt := animes[i].Score

		if rExt == 0 {
			animes[i].BayesianScore = 0
			continue
		}

		vTotal := vExt
		rComb := rExt

		// Incorpora as avaliações dos usuários do AniDeck com o peso comunitário
		if loc, temVoto := votos[animes[i].MalID]; temVoto && loc.LocalVotes > 0 {
			vLocal := float64(loc.LocalVotes) * pesoVotoComunitario
			vTotal = vExt + vLocal
			rComb = ((vExt * rExt) + (vLocal * loc.LocalScore)) / vTotal
			animes[i].Score = loc.LocalScore
		}

		// Sem popularity e sem voto local, vTotal + m = 0 e a divisão daria NaN.
		// NaN não é maior nem menor que nada, então o comparador do sort.Slice abaixo
		// violaria a ordem total que o sort exige e a lista sairia embaralhada.
		// Sem nada para suavizar, a nota crua é a melhor resposta.
		if vTotal+m == 0 {
			animes[i].BayesianScore = rComb
			continue
		}

		animes[i].BayesianScore = (vTotal/(vTotal+m))*rComb + (m/(vTotal+m))*C
	}

	sort.Slice(animes, func(i, j int) bool {
		return animes[i].BayesianScore > animes[j].BayesianScore
	})

	for i := range animes {
		animes[i].CurrentRank = i + 1
	}

	return C, m, true
}

func updateGlobalCache(client anilist.Service) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	var allAnimes []anilist.Anime
	filters := anilist.SearchFilters{Sort: "POPULARITY_DESC"}

	for page := 1; page <= 10; page++ {
		res, err := client.GetTopAnime(ctx, page, 50, filters)
		if err != nil {
			log.Printf("[RANKING ENGINE] Falha na página %d da AniList: %v", page, err)
			continue
		}
		allAnimes = append(allAnimes, res.Data...)
		time.Sleep(1 * time.Second)
	}

	// Se a AniList falhou completamente (ex: Erro 403/Cloudflare)
	if len(allAnimes) == 0 {
		globalRanking.RLock()
		temMemoria := len(globalRanking.Animes) > 0
		globalRanking.RUnlock()

		if temMemoria {
			log.Println("[RANKING ENGINE] AniList indisponível (403/500). Preservando ranking existente em memória.")
			return
		}

		// Fallback soberano: se a memória está vazia, monta o ranking a partir do cache local
		log.Println("[RANKING ENGINE] AniList indisponível e cache vazio. Gerando ranking de emergência via anime_metadata_cache...")
		clientDb, errDb := database.ServiceRoleClient()
		if errDb == nil {
			dataCache, _, _ := clientDb.From("anime_metadata_cache").Select("*", "exact", false).Execute()
			var cached []map[string]interface{}
			json.Unmarshal(dataCache, &cached)

			for _, c := range cached {
				mID, _ := c["mal_id"].(float64)
				if mID <= 0 {
					continue
				}
				a := anilist.Anime{MalID: int(mID)}
				if t, ok := c["title"].(string); ok {
					a.Title = t
				}
				if s, ok := c["average_score"].(float64); ok {
					a.Score = s
				}
				allAnimes = append(allAnimes, a)
			}
		}

		if len(allAnimes) == 0 {
			log.Println("[RANKING ENGINE] Nenhum dado local encontrado para fallback.")
			return
		}
	}

	// 1. Carrega as notas da comunidade da view SQL
	votosComunidade := carregarVotosComunitarios()

	// 2. Ordena pelo score bayesiano híbrido
	C, m, ok := calcularRankingBayesiano(allAnimes, votosComunidade)
	if !ok {
		log.Println("[RANKING ENGINE] Nenhum anime com nota válida. Ciclo abortado.")
		return
	}

	// 5. Comparação com a foto mensal de ranking_snapshots
	foto, capturadaEm, errFoto := carregarUltimaFoto()
	if errFoto != nil {
		log.Printf("[RANKING ENGINE] Falha ao ler última foto: %v", errFoto)
	}
	calcularVariacao(allAnimes, foto)

	agora := time.Now().UTC()
	if errFoto == nil && (capturadaEm.IsZero() || agora.Sub(capturadaEm) >= intervaloEntreFotos) {
		if err := gravarFoto(allAnimes, agora); err != nil {
			log.Printf("[RANKING ENGINE] Falha ao gravar foto de 30 dias: %v", err)
		} else {
			log.Printf("[RANKING ENGINE] Nova foto histórica persistida: %d posições.", len(allAnimes))
		}
	}

	// 6. Grava o estado consolidado em ranking_current_cache para os próximos boots
	if err := gravarCachePersistido(allAnimes, votosComunidade); err != nil {
		log.Printf("[RANKING ENGINE] Falha ao gravar cache consolidado: %v", err)
	}

	// 7. Atualização atômica da memória RAM
	globalRanking.Lock()
	globalRanking.Animes = allAnimes
	globalRanking.LastUpdated = time.Now()
	globalRanking.GlobalC = C
	globalRanking.GlobalM = m
	globalRanking.Unlock()

	log.Printf("[RANKING ENGINE] Ciclo concluído. %d animes ordenados com notas comunitárias.", len(allAnimes))
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

	isDefaultRanking := page >= 1 && season == "" && status == "" && (sortParam == "" || sortParam == "POPULARITY_DESC") && len(filters.Genres) == 0 && len(filters.Tags) == 0

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

			applyCuradoria(&response)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

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

	if C > 0 && m > 0 {
		for i := range resultados.Data {
			if resultados.Data[i].Score > 0 {
				v := float64(resultados.Data[i].Popularity)
				R := resultados.Data[i].Score
				resultados.Data[i].BayesianScore = (v/(v+m))*R + (m/(v+m))*C
			}
		}

		sort.Slice(resultados.Data, func(i, j int) bool {
			return resultados.Data[i].BayesianScore > resultados.Data[j].BayesianScore
		})
	}

	applyCuradoria(resultados)
	json.NewEncoder(w).Encode(resultados)
}

func applyCuradoria(res *anilist.AnimeSearchResponse) {
	AplicarCuradoriaEmLista(res.Data, CarregarCuradoria(database.Client))
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

var recarregandoRanking atomic.Bool

func InvalidateRankingCache() {
	if !recarregandoRanking.CompareAndSwap(false, true) {
		log.Println("[RANKING ENGINE] Recarga já em andamento, edição será coberta por ela.")
		return
	}

	go func() {
		defer recarregandoRanking.Store(false)
		updateGlobalCache(anilist.NewClient())
	}()
}

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