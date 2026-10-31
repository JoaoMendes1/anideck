package handlers

import (
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/models"
)

func TestValidarTrilhas_LimpaEDeduplica(t *testing.T) {
	limpas, problema := validarTrilhas([]Trilha{
		{ID: " t1 ", Nome: "  Fantasia que dói ", MalIDs: []int{10, 20, 10}},
	})
	if problema != "" {
		t.Fatalf("não esperava erro, recebido %q", problema)
	}
	if limpas[0].ID != "t1" || limpas[0].Nome != "Fantasia que dói" {
		t.Errorf("espaços deveriam sair: %+v", limpas[0])
	}
	if got := limpas[0].MalIDs; len(got) != 2 || got[0] != 10 || got[1] != 20 {
		t.Errorf("esperado [10 20] na ordem, recebido %v", got)
	}
}

func TestValidarTrilhas_Recusas(t *testing.T) {
	casos := map[string][]Trilha{
		"sem nome":          {{ID: "a", Nome: " "}},
		"sem identificador": {{ID: "", Nome: "X"}},
		"id repetido":       {{ID: "a", Nome: "X"}, {ID: "a", Nome: "Y"}},
		"mal_id zero":       {{ID: "a", Nome: "X", MalIDs: []int{0}}},
		"nome longo demais": {{ID: "a", Nome: strings.Repeat("á", maxNomeTrilha+1)}},
		"nota longa demais": {{ID: "a", Nome: "X", Nota: strings.Repeat("a", maxNotaTrilha+1)}},
		"animes demais":     {{ID: "a", Nome: "X", MalIDs: make([]int, 0)}},
	}
	muitos := make([]int, maxAnimesPorTrilha+1)
	for i := range muitos {
		muitos[i] = i + 1
	}
	casos["animes demais"][0].MalIDs = muitos

	for nome, trilhas := range casos {
		if _, problema := validarTrilhas(trilhas); problema == "" {
			t.Errorf("%s: deveria ser recusado", nome)
		}
	}
}

func TestValidarTrilhas_LimiteDeTrilhas(t *testing.T) {
	trilhas := make([]Trilha, maxTrilhas+1)
	for i := range trilhas {
		trilhas[i] = Trilha{ID: string(rune('a' + i)), Nome: "X"}
	}
	if _, problema := validarTrilhas(trilhas); problema == "" {
		t.Fatal("trilhas acima do limite deveriam ser recusadas")
	}
}

func TestResolverTrilhas_AnimeForaDoCatalogoNaoQuebra(t *testing.T) {
	curados := map[int]models.CuratedAnime{
		1: {MalID: 1, CustomTitle: "Um", CustomCoverImage: "u.webp"},
		3: {MalID: 3, CustomTitle: "Três"},
	}
	publicas := resolverTrilhas([]Trilha{
		{ID: "a", Nome: "Com buraco", MalIDs: []int{3, 2, 1}},
		{ID: "b", Nome: "Só de removidos", MalIDs: []int{99}},
	}, curados)

	if len(publicas) != 1 {
		t.Fatalf("trilha sem anime no catálogo não deveria aparecer; recebido %d trilhas", len(publicas))
	}
	animes := publicas[0].Animes
	if len(animes) != 2 || animes[0].MalID != 3 || animes[1].MalID != 1 {
		t.Fatalf("esperado [3 1] na ordem do Painel, recebido %+v", animes)
	}
	if animes[1].ImageURL != "u.webp" {
		t.Errorf("a capa deveria vir da curadoria, recebido %q", animes[1].ImageURL)
	}
}
