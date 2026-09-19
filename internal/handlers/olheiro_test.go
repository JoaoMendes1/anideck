package handlers

import "testing"

// pesosDeTeste imita o que carregarTagsDesejadas devolve, sem tocar no banco.
func pesosDeTeste() map[string]TagDesejada {
	return map[string]TagDesejada{
		"Isekai":       {Peso: 3.0, Rotulo: "Isekai"},
		"Level Up":     {Peso: 3.0, Rotulo: "Progressão"},
		"Martial Arts": {Peso: 1.0, Rotulo: "Artes Marciais"},
	}
}

func TestPontuarCandidato_SomaOsRotulosQueBatem(t *testing.T) {
	c := Candidato{Generos: []string{"Isekai", "Level Up", "Romance"}}

	score, motivo := PontuarCandidato(c, PerfilOlheiro{}, pesosDeTeste())

	if score != 6.0 {
		t.Errorf("score: esperado 6.0, recebido %v", score)
	}
	if motivo != "Tem isekai, progressão" {
		t.Errorf("motivo: recebido %q", motivo)
	}
}

func TestPontuarCandidato_MotivoEmMinusculas(t *testing.T) {
	// A taxonomia guarda "Artes Marciais"; o motivo é uma frase e pede caixa baixa.
	c := Candidato{Generos: []string{"Martial Arts"}}

	_, motivo := PontuarCandidato(c, PerfilOlheiro{}, pesosDeTeste())

	if motivo != "Tem artes marciais" {
		t.Errorf("motivo: recebido %q", motivo)
	}
}

func TestPontuarCandidato_NenhumRotuloConhecido(t *testing.T) {
	c := Candidato{Generos: []string{"Romance", "Sports"}}

	score, motivo := PontuarCandidato(c, PerfilOlheiro{}, pesosDeTeste())

	if score != 0 || motivo != "" {
		t.Errorf("esperado 0 e motivo vazio, recebido %v e %q", score, motivo)
	}
}

func TestPontuarCandidato_MapaVazioNaoPontua(t *testing.T) {
	// Espelha olheiro_tags sem nenhum rótulo ativo: o scan roda e não sugere.
	c := Candidato{Generos: []string{"Isekai"}}

	score, motivo := PontuarCandidato(c, PerfilOlheiro{}, map[string]TagDesejada{})

	if score != 0 || motivo != "" {
		t.Errorf("esperado 0 e motivo vazio, recebido %v e %q", score, motivo)
	}
}

func TestPontuarCandidato_RotuloRepetidoNaoDuplica(t *testing.T) {
	// A AniList entrega gênero e tag na mesma lista (ver buscarCandidatos), então
	// o mesmo rótulo pode aparecer duas vezes e contaria peso dobrado.
	c := Candidato{Generos: []string{"Isekai", "Isekai"}}

	score, _ := PontuarCandidato(c, PerfilOlheiro{}, pesosDeTeste())

	if score != 3.0 {
		t.Errorf("score: esperado 3.0, recebido %v", score)
	}
}