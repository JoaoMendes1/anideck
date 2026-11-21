package handlers

import "testing"

func TestCalcularEcoDoAnime_GenerosDoisIdiomasERaridades(t *testing.T) {
	acaoEN := CalcularEcoDoAnime(16498, "Shingeki no Kyojin", "", "rarissima", 10, []string{"Action", "Drama"}, 30)
	acaoPT := CalcularEcoDoAnime(16498, "Shingeki no Kyojin", "", "comum", 10, []string{"Ação"}, 30)

	if acaoEN.GeneroPrincipal != "Ação" || acaoEN.NomeEfeito != "Eco de Impacto" {
		t.Fatalf("esperava Eco de Impacto para Action, veio: %+v", acaoEN)
	}
	if acaoEN.Ataque <= acaoPT.Ataque {
		t.Errorf("raríssima deveria superar comum: %+v vs %+v", acaoEN, acaoPT)
	}

	fantasia := CalcularEcoDoAnime(1, "Frieren", "", "rara", 10, []string{"Fantasy"}, 20)
	if fantasia.NomeEfeito != "Eco Arcano" || fantasia.Magia <= 0 || fantasia.Eter <= 0 {
		t.Errorf("esperava Eco Arcano com Magia e Éter: %+v", fantasia)
	}

	romance := CalcularEcoDoAnime(2, "Kaguya", "", "lendaria", 10, []string{"Romance"}, 20)
	if romance.NomeEfeito != "Eco Vital" || romance.Vida <= 0 || romance.Defesa <= 0 {
		t.Errorf("esperava Eco Vital com Vida e Defesa: %+v", romance)
	}
}

func TestAplicarEcoNoEstado_SomaAtributosERespeitaTetos(t *testing.T) {
	estado := EstadoEquipamento{
		Atributos: AtributosRPG{
			Vida: 500, Ataque: 50, Defesa: 30, CriticoPorMil: 740, EsquivaPorMil: 395,
		},
	}
	eco := CalcularEcoDoAnime(1, "Teste", "", "lendaria", 10, []string{"Mystery"}, 30)
	AplicarEcoNoEstado(&estado, &eco)

	if estado.Eco == nil || estado.Eco.MalID != 1 {
		t.Fatalf("eco deveria ficar anexado no estado: %+v", estado.Eco)
	}
	if estado.Atributos.CriticoPorMil > tetoCriticoPorMil || estado.Atributos.EsquivaPorMil > tetoEsquivaPorMil {
		t.Errorf("eco não pode ultrapassar teto de crítico/esquiva: %+v", estado.Atributos)
	}
	if estado.Atributos.Poder <= 0 {
		t.Error("poder deveria ser recalculado com o eco")
	}
}
