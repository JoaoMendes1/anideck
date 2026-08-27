package handlers

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// animeDaAniList monta um anime como ele chega da API, antes de qualquer curadoria.
func animeDaAniList() anilist.Anime {
	a := anilist.Anime{
		MalID:       1,
		Title:       "Shingeki no Kyojin",
		Synopsis:    "Sinopse original da AniList.",
		Status:      "Finished Airing",
		BannerImage: "https://anilist.co/banner.jpg",
		Genres:      []anilist.Genre{{Name: "Action"}, {Name: "Drama"}},
	}
	a.Images.JPG.ImageURL = "https://anilist.co/capa.jpg"
	return a
}

func TestAplicarCuradoriaSobrescreveTodosOsCampos(t *testing.T) {
	anime := animeDaAniList()

	AplicarCuradoria(&anime, models.CuratedAnime{
		MalID:             1,
		CustomTitle:       "Ataque dos Titãs",
		CustomSynopsis:    "Sinopse escrita à mão.",
		CustomStatus:      "Finalizado",
		CustomCoverImage:  "https://anideck.app/capa.jpg",
		CustomBannerImage: "https://anideck.app/banner.jpg",
		CustomTags:        []string{"Ação", "Drama", "Militar"},
	})

	if anime.Title != "Ataque dos Titãs" {
		t.Errorf("Title = %q, queria a versão curada", anime.Title)
	}
	if anime.Synopsis != "Sinopse escrita à mão." {
		t.Errorf("Synopsis = %q, queria a versão curada", anime.Synopsis)
	}
	if anime.Status != "Finalizado" {
		t.Errorf("Status = %q, queria a versão curada", anime.Status)
	}
	if anime.Images.JPG.ImageURL != "https://anideck.app/capa.jpg" {
		t.Errorf("capa = %q, queria a versão curada", anime.Images.JPG.ImageURL)
	}
	if anime.BannerImage != "https://anideck.app/banner.jpg" {
		t.Errorf("banner = %q, queria a versão curada", anime.BannerImage)
	}

	querido := []anilist.Genre{{Name: "Ação"}, {Name: "Drama"}, {Name: "Militar"}}
	if !reflect.DeepEqual(anime.Genres, querido) {
		t.Errorf("Genres = %v, queria %v", anime.Genres, querido)
	}
}

// Regressão do commit c4acfee: um custom_title vazio apagava o título real da obra.
// A correção existia só na cópia do ranking; busca e detalhe seguiam com o bug.
func TestAplicarCuradoriaNaoApagaCamposComValorVazio(t *testing.T) {
	anime := animeDaAniList()
	original := animeDaAniList()

	// Curadoria criada no painel mas ainda sem nada preenchido.
	AplicarCuradoria(&anime, models.CuratedAnime{MalID: 1})

	if anime.Title != original.Title {
		t.Errorf("Title = %q, deveria continuar %q", anime.Title, original.Title)
	}
	if anime.Synopsis != original.Synopsis {
		t.Errorf("Synopsis = %q, deveria continuar a original", anime.Synopsis)
	}
	if anime.Status != original.Status {
		t.Errorf("Status = %q, deveria continuar %q", anime.Status, original.Status)
	}
	if anime.Images.JPG.ImageURL != original.Images.JPG.ImageURL {
		t.Errorf("capa = %q, deveria continuar a da AniList", anime.Images.JPG.ImageURL)
	}
	if anime.BannerImage != original.BannerImage {
		t.Errorf("banner = %q, deveria continuar o da AniList", anime.BannerImage)
	}
	if !reflect.DeepEqual(anime.Genres, original.Genres) {
		t.Errorf("Genres = %v, deveriam continuar %v", anime.Genres, original.Genres)
	}
}

// A guarda das tags é `len() > 0` e não `!= nil`: um array vazio vindo do banco não é nulo,
// passaria num teste de nulidade e deixaria o anime sem gênero nenhum.
func TestAplicarCuradoriaComTagsVaziasNaoZeraGeneros(t *testing.T) {
	tests := []struct {
		name string
		tags []string
	}{
		{name: "array vazio não-nulo", tags: []string{}},
		{name: "nulo", tags: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			anime := animeDaAniList()
			AplicarCuradoria(&anime, models.CuratedAnime{MalID: 1, CustomTags: tt.tags})

			querido := []anilist.Genre{{Name: "Action"}, {Name: "Drama"}}
			if !reflect.DeepEqual(anime.Genres, querido) {
				t.Errorf("Genres = %v, queria %v", anime.Genres, querido)
			}
		})
	}
}

// A curadoria substitui os gêneros, não soma: quem edita as categorias no painel está
// dizendo quais são as certas, não acrescentando às da AniList.
func TestAplicarCuradoriaSubstituiGenerosEmVezDeSomar(t *testing.T) {
	anime := animeDaAniList()

	AplicarCuradoria(&anime, models.CuratedAnime{MalID: 1, CustomTags: []string{"Isekai"}})

	querido := []anilist.Genre{{Name: "Isekai"}}
	if !reflect.DeepEqual(anime.Genres, querido) {
		t.Errorf("Genres = %v, queria %v", anime.Genres, querido)
	}
}

func TestAplicarCuradoriaEmLista(t *testing.T) {
	animes := []anilist.Anime{
		{MalID: 1, Title: "Original 1"},
		{MalID: 2, Title: "Original 2"},
	}
	curados := map[int]models.CuratedAnime{
		2: {MalID: 2, CustomTitle: "Curado 2"},
	}

	AplicarCuradoriaEmLista(animes, curados)

	// Sem curadoria, o anime tem que sair intacto.
	if animes[0].Title != "Original 1" {
		t.Errorf("anime sem curadoria virou %q", animes[0].Title)
	}
	// Com curadoria, a alteração precisa chegar ao elemento da lista, não a uma cópia.
	if animes[1].Title != "Curado 2" {
		t.Errorf("anime curado ficou %q, queria \"Curado 2\"", animes[1].Title)
	}
}

// Os campos do Bloco 2 chegam por AplicarCuradoria. A regra de cada um é testada em
// curation_conversao_test.go; aqui o que importa é que estão ligados de verdade — declarar
// o campo na struct e esquecer de aplicá-lo seria um erro silencioso.
func TestAplicarCuradoriaLigaOsCamposDoBloco2(t *testing.T) {
	anime := animeDaAniList()
	anime.Duration = 24
	anime.StartDate = &anilist.FuzzyDate{Year: 2013, Month: 4, Day: 7}
	anime.Streaming = []anilist.StreamingLink{{Name: "Crunchyroll", URL: "https://quebrado.com"}}

	duracao := 47
	estreia := "2023-09-29T14:00:00Z"

	AplicarCuradoria(&anime, models.CuratedAnime{
		MalID:                 1,
		CustomEpisodes:        json.RawMessage(`[{"number": 1, "title": "Episódio curado"}]`),
		CustomExternalLinks:   json.RawMessage(`[{"platform": "Netflix", "url": "https://netflix.com/x"}]`),
		CustomFirstAiredAt:    &estreia,
		CustomDurationMinutes: &duracao,
	})

	if len(anime.StreamingEpisodes) != 1 || anime.StreamingEpisodes[0].Title != "Episódio curado" {
		t.Errorf("episódios = %+v, queria o curado", anime.StreamingEpisodes)
	}
	querido := []anilist.StreamingLink{{Name: "Netflix", URL: "https://netflix.com/x"}}
	if !reflect.DeepEqual(anime.Streaming, querido) {
		t.Errorf("streaming = %+v, queria %+v", anime.Streaming, querido)
	}
	if anime.StartDate.Year != 2023 || anime.StartDate.Month != 9 || anime.StartDate.Day != 29 {
		t.Errorf("startDate = %+v, queria 2023-09-29", anime.StartDate)
	}
	if anime.FirstAiredAt != "2023-09-29T14:00:00Z" {
		t.Errorf("firstAiredAt = %q, queria o instante completo", anime.FirstAiredAt)
	}
	if anime.Duration != 47 {
		t.Errorf("duration = %d, queria 47", anime.Duration)
	}
}

// Duração zero ou negativa é dado errado, não "curei e quero zero": aceitar zeraria o tempo
// assistido nas Estatísticas, pior do que a estimativa que já existe.
func TestAplicarCuradoriaIgnoraDuracaoInvalida(t *testing.T) {
	for _, invalida := range []int{0, -10} {
		anime := animeDaAniList()
		anime.Duration = 24

		AplicarCuradoria(&anime, models.CuratedAnime{MalID: 1, CustomDurationMinutes: &invalida})

		if anime.Duration != 24 {
			t.Errorf("com duração curada %d, o anime ficou com %d — queria manter 24", invalida, anime.Duration)
		}
	}
}
