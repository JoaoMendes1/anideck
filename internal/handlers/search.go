package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

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

	// As chaves abaixo faltavam. O chip manda o `value` do CONTENT_FILTERS, que é o termo
	// da AniList em inglês; sem chave aqui, o mesmoRotulo cai no EqualFold, dá falso e o
	// curado é barrado em silêncio. Era o caso do chip Magia, que mandava "Magic".
	//
	// Só entram rótulos que existem de verdade em curated_animes.custom_tags — exceto
	// samurai, yuri e boys' love, que ainda não têm curadoria mas passam a funcionar
	// no dia em que tiverem.
	"magic":       {"magia"},
	"demons":      {"demônios"},
	"military":    {"militar"},
	"seinen":      {"seinen"},
	"shoujo":      {"shoujo"},
	"super power": {"super poderes"},
	"video games": {"jogo", "jogos"},

	// A AniList separa o harém clássico ("Female Harem") do reverso ("Male Harem"). O
	// AniDeck trata os dois como um rótulo só, "Harém" — decisão de produto, registrada no
	// DECISIONS.md. A genre_taxonomy segue a mesma regra desde o sql/034; se as duas
	// divergirem de novo, a busca e as Estatísticas passam a discordar sobre o mesmo anime.
	"female harem": {"harém"},
	"male harem":   {"harém"},

	"samurai":     {"samurai"},
	"yuri":        {"yuri"},
	"boys' love":  {"boys love"},
}

// Quantas tags contam para o filtro em anime CURADO.
//
// So vale para curadoria: AplicarCuradoria poe as custom_tags em anime.Genres
// na ordem do ReorderableTags, que vai do mais estrutural para o mais
// superficial. A AniList devolve genero em ordem ALFABETICA -- cortar la
// filtraria por letra, nao por relevancia (Romance comeca com R e quase nunca
// e o primeiro). Por isso anime nao curado passa sem corte.
const maxTagsFiltro = 5

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

// fusoDoJapao fixa UTC+9 sem depender do banco de fusos do sistema.
//
// O Japão não tem horário de verão, então um deslocamento fixo é exato. O
// time.LoadLocation("Asia/Tokyo") daria o mesmo resultado, mas depende do tzdata
// instalado na imagem do servidor e falha em tempo de execução se ele faltar.
var fusoDoJapao = time.FixedZone("JST", 9*60*60)

// Grade da TV japonesa: janeiro a março é inverno, abril a junho primavera,
// julho a setembro verão, outubro a dezembro outono. O índice é (mês-1)/3.
var temporadasPorTrimestre = [4]string{"WINTER", "SPRING", "SUMMER", "FALL"}

// temporadaDeEstreia deduz temporada e ano a partir do instante de estreia curado.
//
// Existe porque a curadoria não guarda temporada, só o custom_first_aired_at. A conta
// usa o fuso do Japão, e não o de quem consulta: temporada é um fato da exibição
// japonesa, não uma data de exibição na tela. Em UTC, um anime que estreia à 00h30 de
// 1º de outubro no Japão cairia em 30 de setembro e seria contado como verão.
//
// Devolve ok=false quando não há data ou ela não está em RFC 3339, que é o formato
// que o ConverterEstreia grava em FirstAiredAt.
func temporadaDeEstreia(firstAiredAt string) (temporada string, ano int, ok bool) {
	if firstAiredAt == "" {
		return "", 0, false
	}
	instante, err := time.Parse(time.RFC3339, firstAiredAt)
	if err != nil {
		return "", 0, false
	}
	noJapao := instante.In(fusoDoJapao)
	return temporadasPorTrimestre[(int(noJapao.Month())-1)/3], noJapao.Year(), true
}

// bateComTemporada decide se um anime curado entra num filtro de temporada.
//
// Sem data de estreia curada não há como afirmar a temporada, então o anime fica de
// fora. Deixá-lo passar era exatamente o bug: com só "Outono" marcado, toda a
// curadoria subia para o topo da página. Se a AniList devolver o anime para essa
// temporada, ele continua aparecendo pelo resultado dela, que conhece a temporada.
func bateComTemporada(a anilist.Anime, temporada string, ano int) bool {
	if temporada == "" {
		return true
	}
	t, anoDoAnime, ok := temporadaDeEstreia(a.FirstAiredAt)
	if !ok || t != temporada {
		return false
	}
	return ano == 0 || anoDoAnime == ano
}

// Curados que batem a busca: titulo contem o texto (se houver), a tag pedida esta
// entre as principais e, com filtro de temporada, a estreia curada cai nela.
//
// Recebe o SearchFilters inteiro, e nao cada filtro solto, para que o proximo
// filtro nao obrigue a mudar a assinatura e todas as chamadas de novo.
func curadosQueBatem(curados []models.CuratedAnime, query string, f anilist.SearchFilters) []anilist.Anime {
	var achados []anilist.Anime

	for _, cur := range curados {
		anime := anilist.Anime{MalID: cur.MalID}
		AplicarCuradoria(&anime, cur)

		if query != "" && !strings.Contains(strings.ToLower(anime.Title), strings.ToLower(query)) {
			continue
		}
		if len(f.Genres) > 0 && !bateComTagPrincipal(anime.Genres, f.Genres) {
			continue
		}
		if len(f.Tags) > 0 && !bateComTagPrincipal(anime.Genres, f.Tags) {
			continue
		}
		if !bateComTemporada(anime, f.Season, f.SeasonYear) {
			continue
		}
		achados = append(achados, anime)
	}

	// Ordena por onde a tag pedida aparece: quem tem em primeiro vem antes de
	// quem tem em segundo. O order_index nao serve aqui -- hoje esta zerado em
	// toda a curadoria, entao empataria tudo e a ordem cairia no mal_id.
	pedidas := append(append([]string{}, f.Genres...), f.Tags...)
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
		resultados = &anilist.AnimeSearchResponse{Data: curadosQueBatem(curados, query, filters)}

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

		// TRAVA: quem passou pela curadoria responde pela curadoria, nao pela
		// AniList. Re:Zero e Romance para a AniList, mas a curadoria daqui
		// definiu Isekai, Fantasia, Psicologico, Drama e Suspense -- entao ele
		// nao pode aparecer no filtro Romance. Anime nao curado passa direto,
		// que e o comportamento de sempre.
		//
		// Usa bateComTagPrincipal de proposito: e a mesma regra do
		// curadosQueBatem. Duas regras diferentes fariam um anime entrar por um
		// caminho e ser barrado pelo outro.
		if len(genres) > 0 || len(tags) > 0 {
			mantidos := make([]anilist.Anime, 0, len(resultados.Data))
			for _, a := range resultados.Data {
				cur, ehCurado := curadosMap[a.MalID]

				// Nao curado, ou curado sem tag nenhuma definida: passa.
				// Tag vazia significa "ainda nao classifiquei", nao "nao e disso".
				if !ehCurado || len(cur.CustomTags) == 0 {
					mantidos = append(mantidos, a)
					continue
				}

				if len(genres) > 0 && !bateComTagPrincipal(a.Genres, genres) {
					log.Printf("[TRAVA CURADORIA] mal_id=%d barrado no filtro de genero", a.MalID)
					continue
				}
				if len(tags) > 0 && !bateComTagPrincipal(a.Genres, tags) {
					log.Printf("[TRAVA CURADORIA] mal_id=%d barrado no filtro de tag", a.MalID)
					continue
				}

				mantidos = append(mantidos, a)
			}
			resultados.Data = mantidos
		}

		// Curadoria na frente, so na pagina 1. A AniList filtra pelo vocabulario
		// dela e nao conhece suas tags, entao curado que bate precisa entrar por
		// fora -- inclusive quando a busca e so por chip, sem texto digitado.
		if page == 1 {
			meus := curadosQueBatem(curados, query, filters)

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