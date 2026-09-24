// Consultar as views de forma segura usando o token do usuário
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type StatsHandler struct{}

// tamanhoMaxGenero limita o parâmetro do drill-down. Nome de gênero não passa de algumas
// dezenas de caracteres; qualquer coisa muito maior é entrada malformada ou tentativa de abuso.
const tamanhoMaxGenero = 80

func (h *StatsHandler) HandleGetUserStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	// Contagem "" e não "exact": ninguém lê o total, e "exact" faz o PostgREST contar
	// as linhas de cada view além de devolvê-las — nas views agregadas daqui, é
	// quase o dobro de trabalho no banco por consulta.
	queryView := func(viewName string) []map[string]interface{} {
		var result []map[string]interface{}
		data, _, err := dbClient.From(viewName).Select("*", "", false).Execute()
		if err == nil {
			_ = json.Unmarshal(data, &result)
		} else {
			log.Printf("[ERRO DB] HandleGetUserStats (%s): %v", viewName, err)
		}
		return result
	}

	// As 12 views não dependem umas das outras, então são consultadas ao mesmo tempo.
	// Em sequência, os tempos somavam: ~300 ms cada, 3,3 a 3,8 s no total pelo log do
	// servidor. Em paralelo, o total passa a ser o tempo da view mais lenta.
	//
	// Dividir o mesmo dbClient entre as goroutines é seguro: conferido no código do
	// postgrest-go v0.0.11, cada From() cria um QueryBuilder próprio e o Execute só
	// LÊ o client (cabeçalhos e URL base), sem alterar nada nele.
	//
	// Cada goroutine escreve numa variável só dela, por isso não há mutex: não existe
	// dado que duas escrevam ao mesmo tempo. O wg.Wait() garante que todas terminaram
	// antes de qualquer leitura abaixo.
	var statsData, genresData, activityData, ratingData, yearData, watchHoursData,
		longestAnimeData, topRatedData, fastestBingeData, forgottenData,
		watchDates, timestampsData []map[string]interface{}

	consultas := []struct {
		view    string
		destino *[]map[string]interface{}
	}{
		{"view_user_stats", &statsData},
		{"view_user_genre_affinity", &genresData},
		{"view_user_activity", &activityData},
		{"view_user_rating_distribution", &ratingData},
		{"view_user_year_distribution", &yearData},
		{"view_user_watch_hours", &watchHoursData},
		{"view_user_longest_anime", &longestAnimeData},
		{"view_user_top_rated", &topRatedData},
		{"view_user_fastest_binge", &fastestBingeData},
		{"view_user_forgotten_anime", &forgottenData},
		{"view_user_watch_dates", &watchDates},
		{"view_user_watch_timestamps", &timestampsData},
	}

	var wg sync.WaitGroup
	for _, c := range consultas {
		wg.Go(func() {
			*c.destino = queryView(c.view)
		})
	}
	wg.Wait()

	// Streak: as datas distintas assistidas viram a sequência, calculada em Go
	dates := make([]string, 0, len(watchDates))
	for _, row := range watchDates {
		if dia, ok := row["dia"].(string); ok {
			dates = append(dates, dia)
		}
	}
	currentStreak, longestStreak := CalculateStreak(dates, time.Now())

	// Sessões: as marcações cruas viram blocos de atividade, e só o instante de início de
	// cada bloco vai para o frontend. A conversão para hora local acontece lá, porque o
	// servidor não sabe o fuso de quem está olhando.
	marcacoes := parseTimestamps(timestampsData)
	sessoes := AgruparSessoes(marcacoes, gapDeSessaoPadrao)
	sessoesISO := make([]string, 0, len(sessoes))
	for _, s := range sessoes {
		sessoesISO = append(sessoesISO, s.Format(time.RFC3339))
	}

	// Comparação temporal: a série semanal já vem em ordem cronológica da view.
	episodiosPorSemana := make([]int, 0, len(activityData))
	for _, row := range activityData {
		episodiosPorSemana = append(episodiosPorSemana, int(numero(row["episodios_assistidos"])))
	}
	variacaoPct, variacaoValida := VariacaoSemanal(episodiosPorSemana)

	// Perfil de gosto: só demografias e gêneros entram. Tag temática descreve cenário e
	// apareceria em quase todo anime, o que achataria a concentração artificialmente.
	totaisCompetitivos := make([]int, 0, len(genresData))
	for _, row := range genresData {
		if tier, _ := row["tier"].(string); tier == "tag_tematica" {
			continue
		}
		totaisCompetitivos = append(totaisCompetitivos, int(numero(row["total_watched"])))
	}
	perfil, concentracao := PerfilDeGosto(totaisCompetitivos)

	// Recordes: cada view devolve 0 ou 1 linha
	var longestAnime, topRated, fastestBinge, forgotten map[string]interface{}
	if len(longestAnimeData) > 0 {
		longestAnime = longestAnimeData[0]
	}
	if len(topRatedData) > 0 {
		topRated = topRatedData[0]
	}
	if len(fastestBingeData) > 0 {
		fastestBinge = fastestBingeData[0]
	}
	if len(forgottenData) > 0 {
		forgotten = forgottenData[0]
	}

	var taxaConclusao float64
	var taxaValida bool
	if len(statsData) > 0 {
		taxaConclusao, taxaValida = TaxaDeConclusao(
			int(numero(statsData[0]["completos"])),
			int(numero(statsData[0]["dropados"])),
		)
	}

	response := map[string]interface{}{
		"overview":    statsData,
		"genres":      genresData,
		"activity":    activityData,
		"ratings":     ratingData,
		"years":       yearData,
		"watch_hours": watchHoursData,
		"sessions":    sessoesISO,
		// Quantos dias distintos tiveram atividade. O Padrão de Horário usa isso para não
		// afirmar nada sobre o hábito de quem acabou de começar a usar o app.
		"dias_com_atividade": len(dates),
		"streak": map[string]int{
			"current": currentStreak,
			"longest": longestStreak,
		},
		"variacao_semanal": map[string]interface{}{
			"pct":    variacaoPct,
			"valida": variacaoValida,
		},
		"perfil": map[string]interface{}{
			"tipo":         perfil,
			"concentracao": concentracao,
		},
		"conclusao": map[string]interface{}{
			"taxa":   taxaConclusao,
			"valida": taxaValida,
		},
		"records": map[string]interface{}{
			"longest_anime": longestAnime,
			"top_rated":     topRated,
			"fastest_binge": fastestBinge,
			"forgotten":     forgotten,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetYearAnimes é o drill-down da Distribuição por Ano: "2010: 1 anime" não diz qual
// anime é, e era essa a informação que a pessoa queria ao olhar a barra.
func (h *StatsHandler) HandleGetYearAnimes(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	// Ano vira inteiro antes de chegar ao banco: além de validar, isso descarta qualquer
	// coisa que não seja um número antes de virar filtro.
	ano, err := strconv.Atoi(r.URL.Query().Get("ano"))
	if err != nil || ano < 1900 || ano > 2200 {
		http.Error(w, "Ano inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("view_user_year_animes").
		Select("*", "exact", false).
		Eq("season_year", strconv.Itoa(ano)).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleGetYearAnimes (user=%s, ano=%d): %v", userID, ano, err)
		http.Error(w, "Erro ao buscar animes do ano", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// HandleGetGenreAnimes alimenta o drill-down: quais animes estão por trás daquela barra.
// O gênero vem por query string e não no caminho da URL porque os nomes têm acento e espaço
// ("Ficção Científica"), e query string é decodificada de forma previsível pela stdlib.
func (h *StatsHandler) HandleGetGenreAnimes(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	genero := r.URL.Query().Get("nome")
	if genero == "" || len(genero) > tamanhoMaxGenero {
		http.Error(w, "Gênero inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	// A view já filtra por auth.uid(); o Eq aqui é só o recorte do gênero.
	data, _, err := dbClient.From("view_user_genre_animes").
		Select("*", "exact", false).
		Eq("genre", genero).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleGetGenreAnimes (user=%s, genero=%s): %v", userID, genero, err)
		http.Error(w, "Erro ao buscar animes do gênero", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// formatosDeTimestamp cobre as duas formas que o PostgREST usa para devolver data e hora.
// Coluna `timestamptz` sai com fuso ("...+00:00") e casa com RFC3339; coluna `timestamp`
// sem fuso sai sem offset nenhum e o RFC3339 rejeita. Como não dá para garantir de fora
// como a tabela foi criada, aceitamos as duas — e no caso sem fuso assumimos UTC, que é o
// que o Supabase usa por padrão.
var formatosDeTimestamp = []string{
	time.RFC3339,
	"2006-01-02T15:04:05.999999999",
	"2006-01-02T15:04:05",
}

// parseTimestamps extrai os watched_at das linhas cruas da view.
// Linha ilegível é ignorada em silêncio: uma marcação com data corrompida não deve derrubar
// a página de estatísticas inteira.
func parseTimestamps(linhas []map[string]interface{}) []time.Time {
	marcacoes := make([]time.Time, 0, len(linhas))
	for _, linha := range linhas {
		texto, ok := linha["watched_at"].(string)
		if !ok {
			continue
		}
		for _, formato := range formatosDeTimestamp {
			if t, err := time.Parse(formato, texto); err == nil {
				marcacoes = append(marcacoes, t.UTC())
				break
			}
		}
	}
	return marcacoes
}

// numero normaliza os valores numéricos que chegam do JSON como float64.
func numero(v interface{}) float64 {
	if f, ok := v.(float64); ok {
		return f
	}
	return 0
}
