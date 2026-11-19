package handlers

import (
	"testing"
	"time"
)

func TestContratosSemanais_CalculoERegras(t *testing.T) {
	// Quarta-feira 18/11/2026 em Brasília -> semana começa em 2026-11-16 e termina em 2026-11-22.
	agora := time.Date(2026, 11, 18, 15, 0, 0, 0, fusoGuilda)
	vazio := montarContratosSemanais(1, agora, nil, nil, map[string]bool{})
	if vazio.Semana != "2026-11-16" || vazio.ExpiraEm != "2026-11-22" {
		t.Fatalf("período da semana inesperado: inicio=%s fim=%s", vazio.Semana, vazio.ExpiraEm)
	}
	if len(vazio.Contratos) != 3 {
		t.Fatalf("esperava 3 contratos semanais, veio %d", len(vazio.Contratos))
	}
	if vazio.Contratos[0].Regiao != "clareira_inicial" {
		t.Errorf("nível 1 deveria receber apenas clareira_inicial, veio %q", vazio.Contratos[0].Regiao)
	}

	// Em nível alto, simula vitórias na região sorteada e masmorras completas.
	baseAlto := montarContratosSemanais(40, agora, nil, nil, map[string]bool{})
	regiao := baseAlto.Contratos[0].Regiao
	monstroDaRegiao := ""
	for _, r := range CatalogoRegioes() {
		if r.ID == regiao && len(r.MonstroIDs) > 0 {
			monstroDaRegiao = r.MonstroIDs[0]
			break
		}
	}
	if monstroDaRegiao == "" {
		t.Fatalf("região sorteada %q sem monstros", regiao)
	}

	batalhas := make([]batalhaContratoRow, 0, 10)
	for range 5 {
		batalhas = append(batalhas, batalhaContratoRow{MonstroID: monstroDaRegiao})
	}
	for range 5 {
		batalhas = append(batalhas, batalhaContratoRow{MonstroID: "slime_de_eter"})
	}
	masmorras := []masmorraContratoRow{{Completou: true}, {Completou: false}, {Completou: true}}
	resgatados := map[string]bool{baseAlto.Contratos[0].ID: true}

	estado := montarContratosSemanais(40, agora, batalhas, masmorras, resgatados)
	if !estado.Contratos[0].Concluido || !estado.Contratos[0].Resgatado || estado.Contratos[0].Progresso != 5 {
		t.Errorf("contrato regional inesperado: %+v", estado.Contratos[0])
	}
	if !estado.Contratos[1].Concluido || estado.Contratos[1].Resgatado || estado.Contratos[1].Progresso != 2 {
		t.Errorf("contrato de masmorras inesperado: %+v", estado.Contratos[1])
	}
	if !estado.Contratos[2].Concluido || estado.Contratos[2].Progresso != 10 {
		t.Errorf("contrato de vitórias inesperado: %+v", estado.Contratos[2])
	}
	for _, c := range estado.Contratos {
		if len(c.Materiais) == 0 {
			t.Errorf("contrato %s deveria conceder ao menos 1 material da Forja", c.ID)
		}
		for mat := range c.Materiais {
			if mat == "" {
				t.Errorf("material vazio no contrato %s", c.ID)
			}
		}
	}
}
