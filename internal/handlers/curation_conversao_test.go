package handlers

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

func episodiosDaAniList() []anilist.StreamingEpisode {
	return []anilist.StreamingEpisode{
		{Title: "Episode 1", Thumbnail: "https://anilist.co/1.jpg", URL: "https://cr.com/1", Site: "Crunchyroll"},
		{Title: "Episode 2", Thumbnail: "https://anilist.co/2.jpg", URL: "https://cr.com/2", Site: "Crunchyroll"},
		{Title: "Episode 3", Thumbnail: "https://anilist.co/3.jpg", URL: "https://cr.com/3", Site: "Crunchyroll"},
	}
}

func TestConverterEpisodiosSemCuradoriaMantemAniList(t *testing.T) {
	tests := []struct {
		name  string
		bruto json.RawMessage
	}{
		{name: "coluna nula", bruto: nil},
		{name: "literal null", bruto: json.RawMessage("null")},
		{name: "json quebrado", bruto: json.RawMessage(`[{"number":`)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ConverterEpisodios(tt.bruto, episodiosDaAniList())
			if !reflect.DeepEqual(got, episodiosDaAniList()) {
				t.Errorf("esperava os episódios da AniList intactos, veio %+v", got)
			}
		})
	}
}

// O caso central da issue: curar episódios soltos NÃO pode compactar a lista.
// episode_progress referencia o número do episódio; deslocar a grade faria todo o progresso
// já marcado apontar para o episódio errado, em silêncio.
func TestConverterEpisodiosPreservaAPosicaoPeloNumero(t *testing.T) {
	bruto := json.RawMessage(`[
		{"number": 3, "title": "Terceiro curado", "image": "https://anideck.app/3.jpg"},
		{"number": 7, "title": "Sétimo curado", "image": "https://anideck.app/7.jpg"}
	]`)

	got := ConverterEpisodios(bruto, episodiosDaAniList())

	if len(got) != 7 {
		t.Fatalf("a lista deveria crescer até o episódio 7, veio com %d", len(got))
	}
	if got[2].Title != "Terceiro curado" {
		t.Errorf("índice 2 (episódio 3) = %q, queria o curado", got[2].Title)
	}
	if got[6].Title != "Sétimo curado" {
		t.Errorf("índice 6 (episódio 7) = %q, queria o curado", got[6].Title)
	}
	// Os episódios 1 e 2 não foram curados e têm que continuar exatamente onde estavam.
	if got[0].Title != "Episode 1" || got[1].Title != "Episode 2" {
		t.Errorf("episódios não curados foram deslocados: %q, %q", got[0].Title, got[1].Title)
	}
	// Os episódios 4, 5 e 6 viram buracos — mas buracos na posição certa.
	if got[3].Title != "" || got[4].Title != "" || got[5].Title != "" {
		t.Errorf("posições 4 a 6 deveriam estar vazias, vieram %+v", got[3:6])
	}
}

// Dentro de um episódio a precedência é campo a campo: curar só a imagem não pode apagar
// o título que a AniList já trazia.
func TestConverterEpisodiosPrecedenciaCampoACampo(t *testing.T) {
	bruto := json.RawMessage(`[{"number": 1, "image": "https://anideck.app/nova.jpg"}]`)

	got := ConverterEpisodios(bruto, episodiosDaAniList())

	if got[0].Thumbnail != "https://anideck.app/nova.jpg" {
		t.Errorf("thumbnail = %q, queria a curada", got[0].Thumbnail)
	}
	if got[0].Title != "Episode 1" {
		t.Errorf("title = %q, deveria continuar o da AniList", got[0].Title)
	}
	if got[0].URL != "https://cr.com/1" {
		t.Errorf("url = %q, deveria continuar a da AniList", got[0].URL)
	}
}

func TestConverterEpisodiosIgnoraNumeroInvalido(t *testing.T) {
	bruto := json.RawMessage(`[
		{"number": 0, "title": "Zero"},
		{"number": -3, "title": "Negativo"},
		{"number": 2, "title": "Válido"}
	]`)

	got := ConverterEpisodios(bruto, episodiosDaAniList())

	if len(got) != 3 {
		t.Fatalf("números inválidos não deveriam criar posições novas, veio com %d", len(got))
	}
	if got[1].Title != "Válido" {
		t.Errorf("índice 1 = %q, queria \"Válido\"", got[1].Title)
	}
	if got[0].Title != "Episode 1" {
		t.Errorf("índice 0 = %q, o episódio inválido não podia ter caído aqui", got[0].Title)
	}
}

func TestConverterEpisodiosAniListVaziaCriaAGradeInteira(t *testing.T) {
	bruto := json.RawMessage(`[
		{"number": 1, "title": "Primeiro", "aired_at": "2023-09-29"},
		{"number": 2, "title": "Segundo"}
	]`)

	got := ConverterEpisodios(bruto, nil)

	if len(got) != 2 {
		t.Fatalf("esperava 2 episódios, veio %d", len(got))
	}
	if got[0].Title != "Primeiro" || got[0].AiredAt != "2023-09-29" {
		t.Errorf("primeiro episódio = %+v", got[0])
	}
	if got[1].Title != "Segundo" {
		t.Errorf("segundo episódio = %+v", got[1])
	}
}

func TestConverterLinks(t *testing.T) {
	daAniList := []anilist.StreamingLink{{Name: "Crunchyroll", URL: "https://quebrado.com"}}

	tests := []struct {
		name  string
		bruto json.RawMessage
		quero []anilist.StreamingLink
	}{
		{
			name:  "sem curadoria mantém os da AniList",
			bruto: nil,
			quero: daAniList,
		},
		{
			name:  "json quebrado mantém os da AniList",
			bruto: json.RawMessage(`[{"platform":`),
			quero: daAniList,
		},
		{
			// O motivo de curar um link é o da AniList estar quebrado. Manter os dois
			// devolveria o problema para o usuário, então aqui é substituição.
			name:  "curadoria substitui, não soma",
			bruto: json.RawMessage(`[{"platform": "Crunchyroll", "url": "https://certo.com"}]`),
			quero: []anilist.StreamingLink{{Name: "Crunchyroll", URL: "https://certo.com"}},
		},
		{
			// "Curei e está vazio de propósito": a obra não tem onde assistir.
			name:  "array vazio zera a lista",
			bruto: json.RawMessage(`[]`),
			quero: []anilist.StreamingLink{},
		},
		{
			name:  "link sem url é descartado para não virar botão morto",
			bruto: json.RawMessage(`[{"platform": "Netflix", "url": ""}, {"platform": "Crunchyroll", "url": "https://ok.com"}]`),
			quero: []anilist.StreamingLink{{Name: "Crunchyroll", URL: "https://ok.com"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ConverterLinks(tt.bruto, daAniList)
			if !reflect.DeepEqual(got, tt.quero) {
				t.Errorf("ConverterLinks() = %+v, queria %+v", got, tt.quero)
			}
		})
	}
}

func TestConverterEstreia(t *testing.T) {
	daAniList := &anilist.FuzzyDate{Year: 2013, Month: 4, Day: 7}
	texto := func(s string) *string { return &s }

	tests := []struct {
		name     string
		bruto    *string
		queroFuz *anilist.FuzzyDate
		queroISO string
	}{
		{
			name:     "sem curadoria mantém a data da AniList",
			bruto:    nil,
			queroFuz: daAniList,
		},
		{
			name:     "texto vazio mantém a data da AniList",
			bruto:    texto(""),
			queroFuz: daAniList,
		},
		{
			name:     "texto ilegível mantém a data da AniList",
			bruto:    texto("sexta que vem"),
			queroFuz: daAniList,
		},
		{
			name:     "timestamptz com fuso",
			bruto:    texto("2023-09-29T14:00:00Z"),
			queroFuz: &anilist.FuzzyDate{Year: 2023, Month: 9, Day: 29},
			queroISO: "2023-09-29T14:00:00Z",
		},
		{
			name:     "data simples sem hora",
			bruto:    texto("2023-09-29"),
			queroFuz: &anilist.FuzzyDate{Year: 2023, Month: 9, Day: 29},
			queroISO: "2023-09-29T00:00:00Z",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, iso := ConverterEstreia(tt.bruto, daAniList)
			if !reflect.DeepEqual(data, tt.queroFuz) {
				t.Errorf("data = %+v, queria %+v", data, tt.queroFuz)
			}
			if iso != tt.queroISO {
				t.Errorf("iso = %q, queria %q", iso, tt.queroISO)
			}
		})
	}
}
