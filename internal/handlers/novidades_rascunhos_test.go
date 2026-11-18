package handlers

import (
	"strings"
	"testing"
)

func TestRascunhosNovidades_ArquivoDoRepositorioEValido(t *testing.T) {
	lista, err := LerRascunhosNovidades(rascunhosNovidadesJSON)
	if err != nil {
		t.Fatalf("novidades_rascunhos.json inválido: %v", err)
	}
	if len(lista) == 0 {
		t.Fatal("arquivo sem rascunhos")
	}
}

func TestRascunhosNovidades_RecusaItemErrado(t *testing.T) {
	casos := map[string]string{
		"sem chave":      `[{"chave":"","titulo":"Abc","categoria":"novidade","resumo":"Texto"}]`,
		"chave repetida": `[{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"Texto"},{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"Texto"}]`,
		"categoria":      `[{"chave":"a","titulo":"Abc","categoria":"evento","resumo":"Texto"}]`,
		"título curto":   `[{"chave":"a","titulo":"A","categoria":"novidade","resumo":"Texto"}]`,
		"link externo":   `[{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"Texto","links":[{"rotulo":"x","caminho":"https://x.com"}]}]`,
		"link duplo":     `[{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"Texto","links":[{"rotulo":"x","caminho":"//x.com"}]}]`,
		"link sem nome":  `[{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"Texto","links":[{"rotulo":"","caminho":"/deck"}]}]`,
		"json quebrado":  `[{`,
		"resumo gigante": `[{"chave":"a","titulo":"Abc","categoria":"novidade","resumo":"` + strings.Repeat("a", 2001) + `"}]`,
	}
	for nome, bruto := range casos {
		if _, err := LerRascunhosNovidades([]byte(bruto)); err == nil {
			t.Errorf("%s: deveria recusar", nome)
		}
	}
	if _, err := LerRascunhosNovidades([]byte(`[{"chave":"a","titulo":"Abc","categoria":"correcao","resumo":"Texto","links":[{"rotulo":"Ver","caminho":"/deck"}]}]`)); err != nil {
		t.Errorf("item válido recusado: %v", err)
	}
}
