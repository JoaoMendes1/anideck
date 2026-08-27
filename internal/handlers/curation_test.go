package handlers

import (
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
