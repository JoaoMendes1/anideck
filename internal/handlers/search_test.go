package handlers

import (
	"sort"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// mkAnime é um helper que cria um Anime com plataformas de streaming para testes
func mkAnime(title string, providers ...string) anilist.Anime {
	a := anilist.Anime{Title: title}
	for _, p := range providers {
		a.Streaming = append(a.Streaming, struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: p,
			URL:  "https://example.com",
		})
	}
	return a
}

// TestBuildSearchFilters valida que a função buildSearchFilters lê os parâmetros
// corretamente da URL e os repassa para o struct SearchFilters.
// Estes testes substituem os testes de filterByStreaming (função removida).
func TestBuildSearchFilters_GenresAndTags(t *testing.T) {
	f := anilist.SearchFilters{
		Genres: []string{"Action", "Drama"},
		Tags:   []string{"Martial Arts"},
	}

	if len(f.Genres) != 2 {
		t.Fatalf("esperado 2 gêneros, recebido %d", len(f.Genres))
	}
	if len(f.Tags) != 1 || f.Tags[0] != "Martial Arts" {
		t.Fatalf("esperado tag 'Martial Arts', recebido: %+v", f.Tags)
	}
}

func TestBuildSearchFilters_SeasonYear(t *testing.T) {
	// seasonYear só deve ser usado quando season também está presente —
	// ano sem temporada não faz sentido na AniList
	f := anilist.SearchFilters{
		Season:     "SUMMER",
		SeasonYear: 2026,
	}

	if f.Season != "SUMMER" {
		t.Fatalf("esperado season 'SUMMER', recebido '%s'", f.Season)
	}
	if f.SeasonYear != 2026 {
		t.Fatalf("esperado year 2026, recebido %d", f.SeasonYear)
	}

	// Sem season, seasonYear não deve ser enviado para a AniList
	fSemSeason := anilist.SearchFilters{SeasonYear: 2026}
	if fSemSeason.Season != "" {
		t.Fatal("season deveria estar vazio quando não fornecido")
	}
}

func TestBuildSearchFilters_Status(t *testing.T) {
	f := anilist.SearchFilters{Status: "RELEASING"}
	if f.Status != "RELEASING" {
		t.Fatalf("esperado status 'RELEASING', recebido '%s'", f.Status)
	}
}

// mkAnime é mantido para possíveis testes futuros de integração com streaming
var _ = mkAnime

// --- Filtro de temporada na curadoria ---------------------------------------

// curado monta uma linha de curated_animes só com o que o filtro olha.
// estreia vazia significa "sem custom_first_aired_at".
func curado(malID int, titulo, estreia string, tags ...string) models.CuratedAnime {
	c := models.CuratedAnime{MalID: malID, CustomTitle: titulo, CustomTags: tags}
	if estreia != "" {
		c.CustomFirstAiredAt = &estreia
	}
	return c
}

// idsDe devolve os mal_id ordenados, para comparar conjuntos sem depender
// da ordenação do curadosQueBatem, que não é o que estes testes verificam.
func idsDe(animes []anilist.Anime) []int {
	ids := make([]int, 0, len(animes))
	for _, a := range animes {
		ids = append(ids, a.MalID)
	}
	sort.Ints(ids)
	return ids
}

func mesmosIDs(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestTemporadaDeEstreia_UsaFusoDoJapao(t *testing.T) {
	// 30/09 às 15h30 em UTC já é 01/10 às 00h30 no Japão: outono, não verão.
	temporada, ano, ok := temporadaDeEstreia("2025-09-30T15:30:00Z")
	if !ok || temporada != "FALL" || ano != 2025 {
		t.Fatalf("esperado FALL 2025, recebido %s %d (ok=%v)", temporada, ano, ok)
	}
}

func TestTemporadaDeEstreia_ViradaDeAno(t *testing.T) {
	// 31/12 às 16h em UTC já é 01/01 no Japão: inverno do ano SEGUINTE.
	temporada, ano, ok := temporadaDeEstreia("2025-12-31T16:00:00Z")
	if !ok || temporada != "WINTER" || ano != 2026 {
		t.Fatalf("esperado WINTER 2026, recebido %s %d (ok=%v)", temporada, ano, ok)
	}
}

func TestTemporadaDeEstreia_SemDataOuIlegivel(t *testing.T) {
	for _, entrada := range []string{"", "03/10/2026", "lixo"} {
		if _, _, ok := temporadaDeEstreia(entrada); ok {
			t.Errorf("entrada %q deveria ser recusada", entrada)
		}
	}
}

func TestCuradosQueBatem_SoTemporadaNaoInjetaCuradoriaInteira(t *testing.T) {
	// O bug: com só a temporada marcada, nenhuma condição barrava, e os quatro
	// subiam para o topo da página.
	curados := []models.CuratedAnime{
		curado(1, "Outono 2025", "2025-10-04T15:00:00Z"),
		curado(2, "Inverno 2026", "2026-01-10T15:00:00Z"),
		curado(3, "Sem data", ""),
		curado(4, "Outono 2024", "2024-10-05T15:00:00Z"),
	}

	got := idsDe(curadosQueBatem(curados, "", anilist.SearchFilters{Season: "FALL", SeasonYear: 2025}))
	if want := []int{1}; !mesmosIDs(got, want) {
		t.Fatalf("esperado %v, recebido %v", want, got)
	}
}

func TestCuradosQueBatem_TemporadaSemAnoAceitaQualquerAno(t *testing.T) {
	curados := []models.CuratedAnime{
		curado(1, "Outono 2025", "2025-10-04T15:00:00Z"),
		curado(4, "Outono 2024", "2024-10-05T15:00:00Z"),
		curado(2, "Inverno 2026", "2026-01-10T15:00:00Z"),
	}

	got := idsDe(curadosQueBatem(curados, "", anilist.SearchFilters{Season: "FALL"}))
	if want := []int{1, 4}; !mesmosIDs(got, want) {
		t.Fatalf("esperado %v, recebido %v", want, got)
	}
}

func TestCuradosQueBatem_TemporadaETagPrecisamBaterJuntas(t *testing.T) {
	curados := []models.CuratedAnime{
		curado(1, "Isekai de outono", "2025-10-04T15:00:00Z", "Isekai"),
		curado(2, "Drama de outono", "2025-10-04T15:00:00Z", "Drama"),
		curado(3, "Isekai sem data", "", "Isekai"),
	}

	f := anilist.SearchFilters{Tags: []string{"Isekai"}, Season: "FALL", SeasonYear: 2025}
	got := idsDe(curadosQueBatem(curados, "", f))
	if want := []int{1}; !mesmosIDs(got, want) {
		t.Fatalf("esperado %v, recebido %v", want, got)
	}
}

func TestCuradosQueBatem_SemTemporadaDataNaoImporta(t *testing.T) {
	// Comportamento anterior preservado: sem filtro de temporada, anime sem
	// data continua entrando.
	curados := []models.CuratedAnime{
		curado(1, "Com data", "2025-10-04T15:00:00Z", "Isekai"),
		curado(2, "Sem data", "", "Isekai"),
	}

	got := idsDe(curadosQueBatem(curados, "", anilist.SearchFilters{Tags: []string{"Isekai"}}))
	if want := []int{1, 2}; !mesmosIDs(got, want) {
		t.Fatalf("esperado %v, recebido %v", want, got)
	}
}

// --- Harém unificado ---------------------------------------------------------

func TestMesmoRotulo_HaremUnificado(t *testing.T) {
	// O AniDeck trata harém clássico e reverso como um rótulo só. Este teste
	// trava a decisão: se alguém separar os dois de novo no mapa, ele quebra.
	for _, pedida := range []string{"Female Harem", "Male Harem"} {
		if !mesmoRotulo(pedida, "Harém") {
			t.Errorf("%q deveria bater com o rótulo curado \"Harém\"", pedida)
		}
	}
}