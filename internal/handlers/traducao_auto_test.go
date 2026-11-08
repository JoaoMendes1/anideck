package handlers

import (
	"context"
	"errors"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

func TestTraduzirGenerosComIndice(t *testing.T) {
	idx := montarIndice([]entradaTaxonomia{
		{RawName: "Action", DisplayNamePt: "Ação", Tier: "genero"},
		{RawName: "Fantasy", DisplayNamePt: "Fantasia", Tier: "genero"},
		{RawName: "Fantasia", DisplayNamePt: "Fantasia", Tier: "genero"},
	})

	entrada := []anilist.Genre{
		{Name: "Action"},
		{Name: "Fantasy"},
		{Name: "Fantasia"}, // duplicado após tradução
		{Name: "Sci-Fi"},   // coberto pelo mapa padrão de fallback
	}

	got := TraduzirGenerosComIndice(entrada, idx)
	if len(got) != 3 {
		t.Fatalf("esperava 3 gêneros sem duplicatas, veio %d: %+v", len(got), got)
	}
	esperados := []string{"Ação", "Fantasia", "Ficção Científica"}
	for i, nome := range esperados {
		if got[i].Name != nome {
			t.Errorf("posição %d: esperava %q, veio %q", i, nome, got[i].Name)
		}
	}
}

func TestGarantirSinopseEmPortugues_CaminhoFelizECache(t *testing.T) {
	sinopsesTraduzidasMu.Lock()
	sinopsesTraduzidasMem = make(map[int]string)
	sinopsesTraduzidasMu.Unlock()

	origTradutor := tradutorDeSinopse
	origLeitor := leitorCacheSinopseBanco
	origGravador := gravadorCacheSinopseBanco
	t.Cleanup(func() {
		tradutorDeSinopse = origTradutor
		leitorCacheSinopseBanco = origLeitor
		gravadorCacheSinopseBanco = origGravador
	})

	bancoFalso := make(map[int]string)
	chamadasTradutor := 0

	leitorCacheSinopseBanco = func(malID int) (string, bool) {
		v, ok := bancoFalso[malID]
		return v, ok
	}
	gravadorCacheSinopseBanco = func(malID int, sinopse string) {
		bancoFalso[malID] = sinopse
	}
	tradutorDeSinopse = func(_ context.Context, _ string, sinopse string) (string, error) {
		chamadasTradutor++
		return "Em um mundo devastado, um jovem guerreiro busca redenção.", nil
	}

	anime := anilist.Anime{
		MalID:     99901,
		Title:     "Test Anime",
		IsCurated: false,
		Synopsis:  "In a devastated world, a young warrior seeks redemption.<br><br>(Source: AniList)",
	}

	GarantirSinopseEmPortugues(context.Background(), &anime)

	if anime.IsCurated {
		t.Errorf("tradução automática nunca deve marcar IsCurated como true")
	}
	if anime.Synopsis != "Em um mundo devastado, um jovem guerreiro busca redenção." {
		t.Errorf("sinopse traduzida inesperada: %q", anime.Synopsis)
	}
	if chamadasTradutor != 1 {
		t.Errorf("esperava 1 chamada ao tradutor, teve %d", chamadasTradutor)
	}
	if bancoFalso[99901] != anime.Synopsis {
		t.Errorf("esperava sinopse gravada no cache do banco, veio %q", bancoFalso[99901])
	}

	// Segunda chamada deve ler do cache sem acionar o tradutor novamente.
	anime2 := anilist.Anime{
		MalID:     99901,
		Title:     "Test Anime",
		IsCurated: false,
		Synopsis:  "In a devastated world, a young warrior seeks redemption.",
	}
	GarantirSinopseEmPortugues(context.Background(), &anime2)
	if chamadasTradutor != 1 {
		t.Errorf("segunda consulta não deveria chamar o tradutor, chamadas=%d", chamadasTradutor)
	}
	if anime2.Synopsis != anime.Synopsis {
		t.Errorf("segunda consulta deveria devolver o cache, veio %q", anime2.Synopsis)
	}
}

func TestGarantirSinopseEmPortugues_NaoSobrescreveCuradoria(t *testing.T) {
	origTradutor := tradutorDeSinopse
	t.Cleanup(func() { tradutorDeSinopse = origTradutor })

	chamou := false
	tradutorDeSinopse = func(_ context.Context, _, _ string) (string, error) {
		chamou = true
		return "Não deveria usar isto", nil
	}

	anime := anilist.Anime{
		MalID:          5114,
		Title:          "Fullmetal Alchemist: Brotherhood",
		IsCurated:      true,
		CurationStatus: "completo",
		Synopsis:       "Sinopse autoral da curadoria AniDeck.",
	}

	GarantirSinopseEmPortugues(context.Background(), &anime)

	if chamou {
		t.Errorf("anime curado jamais deve acionar tradutor automático")
	}
	if anime.Synopsis != "Sinopse autoral da curadoria AniDeck." {
		t.Errorf("sinopse curada foi alterada: %q", anime.Synopsis)
	}
}

func TestGarantirSinopseEmPortugues_FalhaDoTradutorPreservaTextoLimpo(t *testing.T) {
	sinopsesTraduzidasMu.Lock()
	sinopsesTraduzidasMem = make(map[int]string)
	sinopsesTraduzidasMu.Unlock()

	origTradutor := tradutorDeSinopse
	origLeitor := leitorCacheSinopseBanco
	t.Cleanup(func() {
		tradutorDeSinopse = origTradutor
		leitorCacheSinopseBanco = origLeitor
	})

	leitorCacheSinopseBanco = func(_ int) (string, bool) { return "", false }
	tradutorDeSinopse = func(_ context.Context, _, _ string) (string, error) {
		return "", errors.New("timeout no tradutor")
	}

	anime := anilist.Anime{
		MalID:     88802,
		IsCurated: false,
		Synopsis:  "<i>Original English text</i><br>(Source: MAL)",
	}

	GarantirSinopseEmPortugues(context.Background(), &anime)

	if anime.Synopsis != "Original English text" {
		t.Errorf("em caso de falha do tradutor, esperava o texto limpo sem HTML, veio %q", anime.Synopsis)
	}
}
