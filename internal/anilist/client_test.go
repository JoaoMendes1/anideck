package anilist

import (
	"reflect"
	"testing"
	"time"
)

// tagFixture descreve uma tag da AniList de forma legível nos testes.
type tagFixture struct {
	nome     string
	rank     int
	spoiler  bool
	spoilerM bool
}

// mediaComTags monta só a parte da resposta da AniList que os testes de tag precisam.
func mediaComTags(tags []tagFixture) *aniListMedia {
	m := &aniListMedia{}
	for _, t := range tags {
		m.Tags = append(m.Tags, anilistTag{
			Name:             t.nome,
			Rank:             t.rank,
			IsGeneralSpoiler: t.spoiler,
			IsMediaSpoiler:   t.spoilerM,
		})
	}
	return m
}

func TestRelevantTags(t *testing.T) {
	tests := []struct {
		name  string
		tags  []tagFixture
		quero []string
	}{
		{
			name:  "anime sem tags",
			tags:  nil,
			quero: nil,
		},
		{
			name: "mantém tag relevante",
			tags: []tagFixture{
				{nome: "Isekai", rank: 92},
			},
			quero: []string{"Isekai"},
		},
		{
			name: "descarta tag abaixo do corte de relevância",
			tags: []tagFixture{
				{nome: "Isekai", rank: 92},
				{nome: "Male Protagonist", rank: 12},
			},
			quero: []string{"Isekai"},
		},
		{
			name: "descarta spoiler mesmo com rank alto",
			tags: []tagFixture{
				{nome: "Magic", rank: 80},
				{nome: "Time Loop", rank: 95, spoiler: true},
				{nome: "Tragedy", rank: 88, spoilerM: true},
			},
			quero: []string{"Magic"},
		},
		{
			name: "rank exatamente no corte entra",
			tags: []tagFixture{
				{nome: "School", rank: tagRankMinimo},
				{nome: "Military", rank: tagRankMinimo - 1},
			},
			quero: []string{"School"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := mediaComTags(tt.tags)
			if got := m.relevantTags(); !reflect.DeepEqual(got, tt.quero) {
				t.Errorf("relevantTags() = %v, queria %v", got, tt.quero)
			}
		})
	}
}

func TestResolveSeasonYear(t *testing.T) {
	tests := []struct {
		name       string
		seasonYear int
		startYear  int
		quero      int
	}{
		{name: "usa seasonYear quando existe", seasonYear: 2019, startYear: 2018, quero: 2019},
		{name: "cai na data de estreia quando seasonYear é nulo", seasonYear: 0, startYear: 1998, quero: 1998},
		{name: "sem nenhuma das duas informações devolve zero", seasonYear: 0, startYear: 0, quero: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &aniListMedia{SeasonYear: tt.seasonYear}
			m.StartDate.Year = tt.startYear

			if got := m.resolveSeasonYear(); got != tt.quero {
				t.Errorf("resolveSeasonYear() = %d, queria %d", got, tt.quero)
			}
		})
	}
}

// Garante que os campos novos realmente chegam no Anime devolvido para o resto do app —
// mapear na struct e esquecer de preencher no toAnime seria um erro silencioso.
func TestToAnimeCarregaTemporadaETags(t *testing.T) {
	m := mediaComTags([]tagFixture{{nome: "Isekai", rank: 90}})
	m.Season = "FALL"
	m.SeasonYear = 2011

	anime := m.toAnime()

	if anime.Season != "FALL" {
		t.Errorf("Season = %q, queria \"FALL\"", anime.Season)
	}
	if anime.SeasonYear != 2011 {
		t.Errorf("SeasonYear = %d, queria 2011", anime.SeasonYear)
	}
	if !reflect.DeepEqual(anime.Tags, []string{"Isekai"}) {
		t.Errorf("Tags = %v, queria [Isekai]", anime.Tags)
	}
}

func TestParseRetryAfter(t *testing.T) {
	const padrao = 60 * time.Second

	tests := []struct {
		name   string
		header string
		quero  time.Duration
	}{
		{name: "cabeçalho ausente cai no padrão", header: "", quero: padrao},
		{name: "segundos válidos", header: "30", quero: 30 * time.Second},
		{name: "com espaços em volta", header: " 15 ", quero: 15 * time.Second},
		{name: "texto ilegível cai no padrão", header: "daqui a pouco", quero: padrao},
		// Zero ou negativo viraria um laço apertado de requisições contra um servidor que
		// acabou de pedir para diminuir o ritmo — tem que cair no padrão.
		{name: "zero cai no padrão", header: "0", quero: padrao},
		{name: "negativo cai no padrão", header: "-5", quero: padrao},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := parseRetryAfter(tt.header, padrao); got != tt.quero {
				t.Errorf("parseRetryAfter(%q) = %v, queria %v", tt.header, got, tt.quero)
			}
		})
	}
}
