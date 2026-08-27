package handlers

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/models"
)

func TestSanitizarCuradoriaEpisodiosValidos(t *testing.T) {
	entrada := models.CuratedAnime{
		CustomEpisodes: json.RawMessage(`[
			{"number": 1, "title": "  Primeiro  ", "image": "https://ok.com/1.jpg", "aired_at": "2023-09-29"},
			{"number": 7, "title": "Sétimo"}
		]`),
	}

	if err := SanitizarCuradoria(&entrada); err != nil {
		t.Fatalf("não esperava erro, veio: %v", err)
	}

	var episodios []episodioCurado
	if err := json.Unmarshal(entrada.CustomEpisodes, &episodios); err != nil {
		t.Fatalf("saída não é JSON válido: %v", err)
	}
	if len(episodios) != 2 {
		t.Fatalf("esperava 2 episódios, veio %d", len(episodios))
	}
	if episodios[0].Title != "Primeiro" {
		t.Errorf("título = %q, queria sem os espaços das pontas", episodios[0].Title)
	}
}

func TestSanitizarCuradoriaRecusaEpisodiosInvalidos(t *testing.T) {
	tests := []struct {
		name     string
		bruto    string
		queroMsg string
	}{
		{
			name:     "número zero",
			bruto:    `[{"number": 0, "title": "Zero"}]`,
			queroMsg: "número inválido",
		},
		{
			name:     "número negativo",
			bruto:    `[{"number": -2, "title": "Negativo"}]`,
			queroMsg: "número inválido",
		},
		{
			// Dois episódios com o mesmo número disputam a mesma posição na grade, e o
			// último aplicado vence — em silêncio.
			name:     "número repetido",
			bruto:    `[{"number": 3, "title": "A"}, {"number": 3, "title": "B"}]`,
			queroMsg: "aparece mais de uma vez",
		},
		{
			name:     "imagem com esquema perigoso",
			bruto:    `[{"number": 1, "image": "javascript:alert(1)"}]`,
			queroMsg: "http:// ou https://",
		},
		{
			name:     "json malformado",
			bruto:    `[{"number":`,
			queroMsg: "formato inválido",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entrada := models.CuratedAnime{CustomEpisodes: json.RawMessage(tt.bruto)}
			err := SanitizarCuradoria(&entrada)
			if err == nil {
				t.Fatal("esperava erro, veio nil")
			}
			if !strings.Contains(err.Error(), tt.queroMsg) {
				t.Errorf("mensagem = %q, queria conter %q", err.Error(), tt.queroMsg)
			}
		})
	}
}

// O caso que motivou a validação de URL no servidor: o formulário do Painel barra, mas uma
// requisição direta à API não passa por ele.
func TestSanitizarCuradoriaRecusaLinkPerigoso(t *testing.T) {
	perigosos := []string{
		`[{"platform": "X", "url": "javascript:alert(1)"}]`,
		`[{"platform": "X", "url": "JavaScript:alert(1)"}]`,
		`[{"platform": "X", "url": "data:text/html,<script>alert(1)</script>"}]`,
		`[{"platform": "X", "url": ""}]`,
		`[{"platform": "X", "url": "   "}]`,
	}

	for _, bruto := range perigosos {
		entrada := models.CuratedAnime{CustomExternalLinks: json.RawMessage(bruto)}
		if err := SanitizarCuradoria(&entrada); err == nil {
			t.Errorf("aceitou link que deveria recusar: %s", bruto)
		}
	}
}

func TestSanitizarCuradoriaExigeNomeDaPlataforma(t *testing.T) {
	entrada := models.CuratedAnime{
		CustomExternalLinks: json.RawMessage(`[{"platform": "  ", "url": "https://ok.com"}]`),
	}

	err := SanitizarCuradoria(&entrada)
	if err == nil {
		t.Fatal("esperava erro por plataforma vazia")
	}
	if !strings.Contains(err.Error(), "nome da plataforma") {
		t.Errorf("mensagem = %q", err.Error())
	}
}

func TestSanitizarCuradoriaLimpaHTMLDosCamposDeTexto(t *testing.T) {
	entrada := models.CuratedAnime{
		CustomEpisodes:      json.RawMessage(`[{"number": 1, "title": "<script>alert('x')</script>Título"}]`),
		CustomExternalLinks: json.RawMessage(`[{"platform": "<b>Netflix</b>", "url": "https://netflix.com"}]`),
	}

	if err := SanitizarCuradoria(&entrada); err != nil {
		t.Fatalf("não esperava erro, veio: %v", err)
	}

	if strings.Contains(string(entrada.CustomEpisodes), "<script>") {
		t.Errorf("o script sobreviveu no título do episódio: %s", entrada.CustomEpisodes)
	}
	if strings.Contains(string(entrada.CustomExternalLinks), "<b>") {
		t.Errorf("a tag sobreviveu no nome da plataforma: %s", entrada.CustomExternalLinks)
	}
}

// Campo ausente tem que atravessar intacto: nulo significa "não curei", e transformá-lo em
// array vazio faria o anime perder os dados da AniList.
func TestSanitizarCuradoriaNaoInventaValorParaCampoAusente(t *testing.T) {
	entrada := models.CuratedAnime{}

	if err := SanitizarCuradoria(&entrada); err != nil {
		t.Fatalf("não esperava erro, veio: %v", err)
	}
	if entrada.CustomEpisodes != nil {
		t.Errorf("custom_episodes virou %s, deveria continuar nulo", entrada.CustomEpisodes)
	}
	if entrada.CustomExternalLinks != nil {
		t.Errorf("custom_external_links virou %s, deveria continuar nulo", entrada.CustomExternalLinks)
	}
}
