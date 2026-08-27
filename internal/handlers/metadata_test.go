package handlers

import (
	"reflect"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

func animeDeTeste() anilist.Anime {
	a := anilist.Anime{
		MalID:      101,
		Title:      "Re:Zero",
		Episodes:   25,
		Duration:   24,
		Score:      8.2,
		SeasonYear: 2016,
		Tags:       []string{"Isekai", "Time Loop"},
	}
	a.Genres = []anilist.Genre{{Name: "Drama"}, {Name: "Fantasy"}}
	a.Studios = []struct {
		Name string `json:"name"`
	}{{Name: "White Fox"}}
	return a
}

func TestBuildMetadataPayloadGravaTagsEAno(t *testing.T) {
	payload := buildMetadataPayload(animeDeTeste())

	if got := payload["tags"]; !reflect.DeepEqual(got, []string{"Isekai", "Time Loop"}) {
		t.Errorf("tags = %v, queria [Isekai Time Loop]", got)
	}
	if got := payload["season_year"]; got != 2016 {
		t.Errorf("season_year = %v, queria 2016", got)
	}
	if got := payload["genres"]; !reflect.DeepEqual(got, []string{"Drama", "Fantasy"}) {
		t.Errorf("genres = %v, queria [Drama Fantasy]", got)
	}
	if got := payload["studios"]; !reflect.DeepEqual(got, []string{"White Fox"}) {
		t.Errorf("studios = %v, queria [White Fox]", got)
	}
	if got := payload["mal_id"]; got != 101 {
		t.Errorf("mal_id = %v, queria 101", got)
	}
	if got := payload["duration_minutes"]; got != 24 {
		t.Errorf("duration_minutes = %v, queria 24", got)
	}
}

// Sem ano conhecido a chave nem deve ser enviada: gravar 0 sobrescreveria um ano correto
// que já estivesse no cache por um valor sem sentido.
func TestBuildMetadataPayloadOmiteAnoDesconhecido(t *testing.T) {
	anime := animeDeTeste()
	anime.SeasonYear = 0

	payload := buildMetadataPayload(anime)

	if _, existe := payload["season_year"]; existe {
		t.Errorf("season_year não deveria estar no payload, mas veio como %v", payload["season_year"])
	}
}

func TestBuildMetadataPayloadAnimeSemGeneroNemTag(t *testing.T) {
	payload := buildMetadataPayload(anilist.Anime{MalID: 7, Title: "Obra obscura"})

	// As chaves existem, mas vazias — o cache fica com array vazio em vez de lixo.
	if got := payload["genres"].([]string); len(got) != 0 {
		t.Errorf("genres = %v, queria vazio", got)
	}
	if got := payload["tags"].([]string); len(got) != 0 {
		t.Errorf("tags = %v, queria vazio", got)
	}
	if _, existe := payload["season_year"]; existe {
		t.Error("season_year não deveria estar no payload de um anime sem ano")
	}
}

func TestIdsUnicos(t *testing.T) {
	type linha = struct {
		MalID int `json:"mal_id"`
	}

	tests := []struct {
		name   string
		linhas []linha
		quero  []int
	}{
		{name: "deck vazio", linhas: nil, quero: []int{}},
		{
			name:   "remove repetidos preservando a ordem",
			linhas: []linha{{MalID: 30}, {MalID: 10}, {MalID: 30}, {MalID: 20}},
			quero:  []int{30, 10, 20},
		},
		{
			name:   "ignora id inválido",
			linhas: []linha{{MalID: 0}, {MalID: -5}, {MalID: 42}},
			quero:  []int{42},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := idsUnicos(tt.linhas); !reflect.DeepEqual(got, tt.quero) {
				t.Errorf("idsUnicos() = %v, queria %v", got, tt.quero)
			}
		})
	}
}
