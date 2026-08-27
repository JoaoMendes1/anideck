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

// intervaloEntreFotos é a cadência do indicador ▲/▼. Trinta dias foi escolhido
// pelo rótulo: "desde o mês passado" é legível, "nos últimos 20 dias" não é.
const intervaloEntreFotos = 30 * 24 * time.Hour

// limiteFotoTopGlobal é quantas linhas ler da tabela de fotos. O Top Global tem
// 500 animes (10 páginas × 50), então uma foto inteira cabe aqui. Se uma foto
// antiga tiver menos linhas, o laço de agrupamento para na virada de
// captured_at e ignora o excedente — por isso ler "a mais" é seguro.
const limiteFotoTopGlobal = 500

// linhaSnapshot espelha uma linha de ranking_snapshots.
type linhaSnapshot struct {
	CapturedAt string `json:"captured_at"`
	MalID      int    `json:"mal_id"`
	Position   int    `json:"position"`
}

// calcularVariacao preenche PreviousRank a partir da foto anterior.
//
// Função pura de propósito: entra a lista já ordenada e o mapa da foto, sai a
// lista com o campo preenchido. Sem banco, sem rede, sem relógio — dá para
// testar isoladamente, mesmo padrão do PontuarCandidato do Olheiro.
//
// Anime ausente da foto (entrou na lista depois, ou é a primeira medição)
// recebe 0. O `omitempty` da struct faz esse zero sumir do JSON, e o frontend
// recebe undefined — que é o sinal de "não exibir indicador".
func calcularVariacao(animes []anilist.Anime, foto map[int]int) {
	for i := range animes {
		// Busca em mapa nil devolve o zero do tipo. Foto ausente não quebra.
		animes[i].PreviousRank = foto[animes[i].MalID]
	}
}

// carregarUltimaFoto devolve o mapa mal_id → posição da medição mais recente,
// e quando ela foi tirada. Tabela vazia devolve mapa nil e tempo zero, sem erro.
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

	// Todas as linhas de uma mesma medição compartilham o captured_at. Como a
	// consulta veio ordenada do mais recente para o mais antigo, a virada desse
	// valor marca o fim da foto atual.
	maisRecente := linhas[0].CapturedAt
	foto := make(map[int]int, len(linhas))
	for _, l := range linhas {
		if l.CapturedAt != maisRecente {
			break
		}
		foto[l.MalID] = l.Position
	}

	var quando time.Time
	for _, formato := range formatosDeTimestamp {
		if t, errParse := time.Parse(formato, maisRecente); errParse == nil {
			quando = t.UTC()
			break
		}
	}

	return foto, quando, nil
}

// gravarFoto persiste as posições atuais como uma nova medição.
//
// O carimbo de tempo é definido aqui em Go, e não pelo DEFAULT now() da coluna,
// para garantir que todas as linhas do lote compartilhem exatamente o mesmo
// captured_at — é ele que agrupa a foto na leitura.
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

	// Upsert no UNIQUE(captured_at, mal_id): se o motor reiniciar no meio da
	// gravação, repetir o lote não duplica nem estoura erro.
	_, _, err = client.From("ranking_snapshots").
		Insert(linhas, true, "captured_at,mal_id", "minimal", "exact").
		Execute()
	return err
}

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

	// 4. Posições atuais e comparação com a foto anterior
	for i := range allAnimes {
		allAnimes[i].CurrentRank = i + 1
	}

	// A leitura vem ANTES da gravação, e a ordem
	foto, capturadaEm, errFoto := carregarUltimaFoto()
	if errFoto != nil {
		log.Printf("[RANKING ENGINE] Falha ao ler a última foto: %v", errFoto)
	}
	calcularVariacao(allAnimes, foto)

	// Só grava se a leitura deu certo. Sem saber a idade da foto atual, gravar
	// poderia criar uma medição fora de cadência e zerar o indicador.
	agora := time.Now().UTC()
	if errFoto == nil && (capturadaEm.IsZero() || agora.Sub(capturadaEm) >= intervaloEntreFotos) {
		if err := gravarFoto(allAnimes, agora); err != nil {
			log.Printf("[RANKING ENGINE] Falha ao gravar foto: %v", err)
		} else {
			log.Printf("[RANKING ENGINE] Foto gravada: %d posições.", len(allAnimes))
		}
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

// applyCuradoria aplica as edições do Painel Admin ao resultado do ranking.
// A regra de sobreposição vive em AplicarCuradoria (curation_utils.go), compartilhada com a
// busca, o detalhe e o deck — antes cada tela tinha a sua cópia e elas divergiram.
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

// recarregandoRanking impede que várias edições seguidas no Admin disparem
// recargas simultâneas. Cada updateGlobalCache faz 10 chamadas à AniList, que
// hoje aceita 30 por minuto (ver PITFALLS.md) — cinco recargas concorrentes
// estouram o limite e ainda podem terminar fora de ordem, deixando o cache com
// o resultado da execução mais antiga.
var recarregandoRanking atomic.Bool

// InvalidateRankingCache força a limpeza da memória.
// Usado pelo curation.go quando o Admin edita um anime manualmente.
func InvalidateRankingCache() {
	globalRanking.Lock()
	globalRanking.Animes = nil
	globalRanking.Unlock()

	// CompareAndSwap devolve false se já existe uma recarga em andamento.
	// Nesse caso não agenda outra: a que está rodando já vai buscar os dados
	// atualizados, incluindo esta edição.
	if !recarregandoRanking.CompareAndSwap(false, true) {
		log.Println("[RANKING ENGINE] Recarga já em andamento, edição será coberta por ela.")
		return
	}

	go func() {
		defer recarregandoRanking.Store(false)
		updateGlobalCache(anilist.NewClient())
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
