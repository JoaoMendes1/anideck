package ia

import (
	"strings"
	"testing"

	"google.golang.org/genai"
)

func TestLerCuradoria_AceitaCercaELimpaTags(t *testing.T) {
	c, err := LerCuradoria("```json\n{\"sinopse\": \" Texto \", \"tags\": [\"Ação\", \" \", \"Drama \"]}\n```")
	if err != nil {
		t.Fatalf("não esperava erro: %v", err)
	}
	if c.Sinopse != "Texto" {
		t.Errorf("sinopse sem espaços esperada, recebido %q", c.Sinopse)
	}
	if len(c.Tags) != 2 || c.Tags[0] != "Ação" || c.Tags[1] != "Drama" {
		t.Errorf("tags limpas esperadas, recebido %v", c.Tags)
	}
}

func TestLerCuradoria_Recusas(t *testing.T) {
	for _, texto := range []string{"", "não é json", `{"sinopse": "  ", "tags": []}`} {
		if _, err := LerCuradoria(texto); err == nil {
			t.Errorf("%q deveria ser recusado", texto)
		}
	}
}

func TestLerEpisodios(t *testing.T) {
	e, err := LerEpisodios(`{"estreia":"2026-10-04T23:00:00+09:00","episodios":[{"numero":1,"titulo":"O começo","data":"","fonte":"https://exemplo.com"}],"links":[],"ressalvas":["Episódio 2 sem título publicado"]}`)
	if err != nil {
		t.Fatalf("não esperava erro: %v", err)
	}
	if len(e.Episodios) != 1 || e.Episodios[0].Numero != 1 || len(e.Ressalvas) != 1 {
		t.Fatalf("resultado inesperado: %+v", e)
	}
	if _, err := LerEpisodios("lixo"); err == nil {
		t.Error("texto que não é JSON deveria ser recusado")
	}
}

func TestMontarPerguntaEpisodios(t *testing.T) {
	got := MontarPerguntaEpisodios("{titulo} #{mal_id} de {de} a {ate}, 100% {titulo}", "Frieren", 52991, 3, 14)
	if got != "Frieren #52991 de 3 a 14, 100% Frieren" {
		t.Fatalf("marcadores trocados errado: %q", got)
	}
	if !strings.Contains(MontarPerguntaEpisodios(PromptPesquisaEpisodiosPadrao, "X", 1, 1, 12), "episódios 1 a 12") {
		t.Error("o prompt padrão deveria pedir a faixa de episódios")
	}
}

func TestFontesDaResposta_SemRepetirESemVazio(t *testing.T) {
	resp := &genai.GenerateContentResponse{Candidates: []*genai.Candidate{{
		GroundingMetadata: &genai.GroundingMetadata{GroundingChunks: []*genai.GroundingChunk{
			{Web: &genai.GroundingChunkWeb{URI: "https://a.com", Title: "A"}},
			{Web: &genai.GroundingChunkWeb{URI: "https://a.com", Title: "A de novo"}},
			{Web: &genai.GroundingChunkWeb{URI: ""}},
			nil,
			{Web: &genai.GroundingChunkWeb{URI: "https://b.com", Title: "B"}},
		}},
	}}}
	fontes := FontesDaResposta(resp)
	if len(fontes) != 2 || fontes[0].URL != "https://a.com" || fontes[1].URL != "https://b.com" {
		t.Fatalf("esperado a.com e b.com, recebido %+v", fontes)
	}
	if got := FontesDaResposta(nil); len(got) != 0 {
		t.Errorf("resposta nula deveria dar lista vazia, recebido %+v", got)
	}
}
