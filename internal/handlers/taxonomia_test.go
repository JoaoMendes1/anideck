package handlers

import (
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/models"
)

var taxonomiaDeTeste = []entradaTaxonomia{
	{RawName: "Fantasy", DisplayNamePt: "Fantasia", Tier: "genero"},
	{RawName: "Fantasia", DisplayNamePt: "Fantasia", Tier: "genero"},
	{RawName: "Magic", DisplayNamePt: "Magia", Tier: "tag_tematica"},
	{RawName: "Magia", DisplayNamePt: "Magia", Tier: "tag_tematica"},
	{RawName: "Female Harem", DisplayNamePt: "Harém", Tier: "tag_tematica"},
	{RawName: "Male Harem", DisplayNamePt: "Harém", Tier: "tag_tematica"},
	{RawName: "Isekai", DisplayNamePt: "Isekai", Tier: "demografia"},
	{RawName: "Reencarnação", DisplayNamePt: "Reencarnação", Tier: "tag_tematica"},
	{RawName: "Environmental", DisplayNamePt: "Ambiental", Tier: "ignorado"},
}

var vocabDeTeste = &vocabularioAni{
	Generos: map[string]bool{"Fantasy": true},
	Tags:    map[string]bool{"Magic": true, "Female Harem": true, "Male Harem": true, "Isekai": true},
}

func TestMesmoRotulo_UsaATaxonomia(t *testing.T) {
	idx := montarIndice(taxonomiaDeTeste)
	casos := []struct {
		pedida, tag string
		bate        bool
	}{
		{"Magic", "Magia", true},
		{"Magia", "Magic", true},
		{"fantasia", "Fantasy", true},
		{"Magia", "Fantasia", false},
		{"Rótulo novo", "rótulo novo", true}, // fora da taxonomia: só a igualdade de texto
		{"Rótulo novo", "Magia", false},
	}
	for _, c := range casos {
		if got := mesmoRotulo(idx, c.pedida, c.tag); got != c.bate {
			t.Errorf("mesmoRotulo(%q, %q) = %v, esperado %v", c.pedida, c.tag, got, c.bate)
		}
	}
}

func TestTermosAniList_GeneroAntesDeTag(t *testing.T) {
	genero, tag, ok := termosAniList(taxonomiaDeTeste, "Fantasia", vocabDeTeste)
	if !ok || genero != "Fantasy" || tag != "" {
		t.Fatalf("esperado gênero Fantasy, recebido genero=%q tag=%q ok=%v", genero, tag, ok)
	}
}

func TestTermosAniList_UmTermoSoPorRotulo(t *testing.T) {
	// Mandar os dois termos de harém juntos exigiria animes com os dois.
	genero, tag, ok := termosAniList(taxonomiaDeTeste, "Harém", vocabDeTeste)
	if !ok || genero != "" || tag != "Female Harem" {
		t.Fatalf("esperado só a tag Female Harem, recebido genero=%q tag=%q ok=%v", genero, tag, ok)
	}
}

func TestTermosAniList_RotuloSoDoAniDeck(t *testing.T) {
	if _, _, ok := termosAniList(taxonomiaDeTeste, "Reencarnação", vocabDeTeste); ok {
		t.Fatal("rótulo sem termo na AniList deveria devolver ok=false")
	}
	if _, _, ok := termosAniList(taxonomiaDeTeste, "Inexistente", vocabDeTeste); ok {
		t.Fatal("rótulo fora da taxonomia deveria devolver ok=false")
	}
}

func TestMontarRotulosPublicos_AgrupaContaEIgnora(t *testing.T) {
	curados := map[int]models.CuratedAnime{
		1: {MalID: 1, CustomTags: []string{"Magia", "Fantasy"}},
		2: {MalID: 2, CustomTags: []string{"Magic", "Magia"}}, // o mesmo rótulo duas vezes conta uma
		3: {MalID: 3, CustomTags: []string{"Isekai"}},
		4: {MalID: 4, CustomTags: []string{"Environmental"}},
	}
	rotulos := montarRotulosPublicos(taxonomiaDeTeste, curados)

	porNome := map[string]rotuloPublico{}
	for _, r := range rotulos {
		porNome[r.Nome] = r
	}
	if _, existe := porNome["Ambiental"]; existe {
		t.Error("rótulo da camada ignorado não deveria aparecer")
	}
	if got := porNome["Magia"].Curados; got != 2 {
		t.Errorf("Magia: esperado 2 curados, recebido %d", got)
	}
	if got := porNome["Fantasia"].Curados; got != 1 {
		t.Errorf("Fantasia: esperado 1 curado, recebido %d", got)
	}
	if got := porNome["Harém"].Curados; got != 0 {
		t.Errorf("Harém: esperado 0 curados, recebido %d", got)
	}
	if len(rotulos) != 5 {
		t.Errorf("esperado 5 rótulos, recebido %d", len(rotulos))
	}
	if rotulos[0].Camada != "genero" {
		t.Errorf("os gêneros deveriam vir primeiro, veio %q", rotulos[0].Camada)
	}
}

func TestMontarRotulosPublicos_SemTaxonomia(t *testing.T) {
	if got := montarRotulosPublicos(nil, nil); len(got) != 0 {
		t.Fatalf("esperado lista vazia, recebido %d rótulos", len(got))
	}
}

func TestCuradosQueBatem_PorRotulo(t *testing.T) {
	idx := montarIndice(taxonomiaDeTeste)
	curados := []models.CuratedAnime{
		curado(1, "Curado com Magic", "", "Magic"),
		curado(2, "Curado com Magia", "", "Magia"),
		curado(3, "Curado com Isekai", "", "Isekai"),
	}
	got := idsDe(curadosQueBatem(idx, curados, "", anilist.SearchFilters{}, []string{"Magia"}))
	if want := []int{1, 2}; !mesmosIDs(got, want) {
		t.Fatalf("esperado %v, recebido %v", want, got)
	}
}
