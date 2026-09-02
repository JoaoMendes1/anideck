package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// O chip da busca manda o vocabulario da AniList (ingles); a curadoria usa o
// seu (portugues). Sem traduzir, EqualFold("Action","Ação") da falso e nenhum
// curado passa -- "Romance" funcionava so porque se escreve igual nas duas.
//
// Ha rotulo em ingles na propria curadoria (Adventure, Fantasy, Sci-Fi, Slice
// of Life): curadoria antiga, antes do vocabulario fechado. Por isso alguns
// mapeamentos incluem o proprio termo em ingles.
var equivalentes = map[string][]string{
	"action":        {"ação"},
	"adventure":     {"aventura", "adventure"},
	"comedy":        {"comédia", "comédia romântica"},
	"drama":         {"drama"},
	"fantasy":       {"fantasia", "fantasy", "magia"},
	"horror":        {"terror"},
	"mystery":       {"mistério", "suspense"},
	"psychological": {"psicológico"},
	"romance":       {"romance", "comédia romântica"},
	"sci-fi":        {"ficção científica", "sci-fi"},
	"slice of life": {"cotidiano", "dia a dia", "slice of life"},
	"sports":        {"esporte"},
	"supernatural":  {"sobrenatural", "super poderes"},
	"thriller":      {"suspense"},
	"mecha":         {"mecha"},
	"music":         {"musical"},
	"isekai":        {"isekai", "reencarnação"},
	"school":        {"escolar", "vida escolar"},
	"martial arts":  {"artes marciais"},
	"historical":    {"histórico"},
	"harem":         {"harém"},
	"ecchi":         {"ecchi"},
	"shounen":       {"shounen"},
	"time travel":   {"viagem no tempo"},
	"revenge":       {"vingança"},
	"game":          {"jogo", "jogos"},
}

// Quantas tags contam para o filtro em anime CURADO.
//
// So vale para curadoria: AplicarCuradoria poe as custom_tags em anime.Genres
// na ordem do ReorderableTags, que vai do mais estrutural para o mais
// superficial. A AniList devolve genero em ordem ALFABETICA -- cortar la
// filtraria por letra, nao por relevancia (Romance comeca com R e quase nunca
// e o primeiro). Por isso anime nao curado passa sem corte.
const maxTagsFiltro = 2

// Unico lugar que compara rotulo pedido com rotulo do anime. Tanto o filtro
// quanto a ordenacao passam por aqui -- ter duas comparacoes soltas ja fez a
// ordenacao ignorar os equivalentes e empatar tudo.
func mesmoRotulo(pedida string, tag string) bool {
	if strings.EqualFold(pedida, tag) {
		return true
	}
	for _, pt := range equivalentes[strings.ToLower(pedida)] {
		if strings.EqualFold(pt, tag) {
			return true
		}
	}
	return false
}

func bateComTagPrincipal(doAnime []anilist.Genre, pedidas []string) bool {
	principais := doAnime
	if len(principais) > maxTagsFiltro {
		principais = principais[:maxTagsFiltro]
	}
	for _, pedida := range pedidas {
		for _, tag := range principais {
			if mesmoRotulo(pedida, tag.Name) {
				return true
			}
		}
	}
	return false
}

// Curados que batem a busca: titulo contem o texto (se houver) e a tag pedida
// esta entre as principais. Ordenado pelo OrderIndex da curadoria.
func curadosQueBatem(curados []models.CuratedAnime, query string, genres, tags []string) []anilist.Anime {
	var achados []anilist.Anime

	for _, cur := range curados {
		anime := anilist.Anime{MalID: cur.MalID}
		AplicarCuradoria(&anime, cur)

		if query != "" && !strings.Contains(strings.ToLower(anime.Title), strings.ToLower(query)) {
			continue
		}
		if len(genres) > 0 && !bateComTagPrincipal(anime.Genres, genres) {
			continue
		}
		if len(tags) > 0 && !bateComTagPrincipal(anime.Genres, tags) {
			continue
		}
		achados = append(achados, anime)
	}

			// Ordena por onde a tag pedida aparece: quem tem em primeiro vem antes de
	// quem tem em segundo. O order_index nao serve aqui -- hoje esta zerado em
	// toda a curadoria, entao empataria tudo e a ordem cairia no mal_id.
	pedidas := append(append([]string{}, genres...), tags...)
	posicao := func(a anilist.Anime) int {
		for i, tag := range a.Genres {
			for _, p := range pedidas {
				if mesmoRotulo(p, tag.Name) {
				return i
			}
			}
		}
		return len(a.Genres)
	}
	sort.Slice(achados, func(i, j int) bool {
		pi, pj := posicao(achados[i]), posicao(achados[j])
		if pi != pj {
			return pi < pj
		}
		return achados[i].Title < achados[j].Title
	})

	return achados
}

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
		sortParam = "POPULARITY_DESC"
	}

	page, err := strconv.Atoi(r.URL.Query().Get("page"))
	if err != nil || page < 1 {
		page = 1
	}

	perPage, err := strconv.Atoi(r.URL.Query().Get("perPage"))
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

	// Curadoria carregada uma vez e usada nos tres papeis abaixo: montar a
	// lista propria, saber quem ja entrou, e sobrepor nos resultados da AniList.
	var curados []models.CuratedAnime
	dataCurados, _, _ := database.Client.From("curated_animes").Select("*", "exact", false).Execute()
	if dataCurados != nil {
		_ = json.Unmarshal(dataCurados, &curados)
	}
	curadosMap := make(map[int]models.CuratedAnime, len(curados))
	for _, c := range curados {
		curadosMap[c.MalID] = c
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
	aniListCaiu := err != nil || resultados == nil

	// FALLBACK: sem AniList, o catalogo e a curadoria. O cache NAO entra.
	// O cache e residuo do que os usuarios adicionaram ao deck -- sem capa e
	// sem sinopse. Misturar faz a curadoria parecer pior do que e. No Deck ele
	// continua sendo o fallback certo, que e outra tela.
	if aniListCaiu {
		log.Printf("[ERRO ANILIST] Fallback ativado para busca: %v", err)
		resultados = &anilist.AnimeSearchResponse{Data: curadosQueBatem(curados, query, genres, tags)}

		inicio := (page - 1) * perPage
		if inicio >= len(resultados.Data) {
			resultados.Data = []anilist.Anime{}
		} else {
			fim := inicio + perPage
			if fim > len(resultados.Data) {
				fim = len(resultados.Data)
			}
			resultados.Data = resultados.Data[inicio:fim]
		}
	} else {
		// Aplica a curadoria sobre o que a AniList devolveu.
		for i := range resultados.Data {
			if curado, ok := curadosMap[resultados.Data[i].MalID]; ok {
				AplicarCuradoria(&resultados.Data[i], curado)
			}
		}

		// Curadoria na frente, so na pagina 1. A AniList filtra pelo vocabulario
		// dela e nao conhece suas tags, entao curado que bate precisa entrar por
		// fora -- inclusive quando a busca e so por chip, sem texto digitado.
		if page == 1 {
			meus := curadosQueBatem(curados, query, genres, tags)

			jaEntrou := make(map[int]bool, len(meus))
			for _, a := range meus {
				jaEntrou[a.MalID] = true
			}
			for _, a := range resultados.Data {
				if !jaEntrou[a.MalID] {
					meus = append(meus, a)
					jaEntrou[a.MalID] = true
				}
			}
			resultados.Data = meus
		}
	}

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