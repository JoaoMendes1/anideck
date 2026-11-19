package handlers

import "testing"

func TestCalcularEspecialidade(t *testing.T) {
	if CalcularEspecialidade(nil) != nil {
		t.Error("Sem gêneros não há especialidade")
	}
	iniciante := CalcularEspecialistasGenero([]AfinidadeGeneroInput{{Genre: "Ação", TotalWatched: 2, Tier: "genero"}})
	if CalcularEspecialidade(iniciante) != nil {
		t.Error("N0 não dá especialidade: ela se conquista com 3 animes")
	}

	esp := CalcularEspecialidade(CalcularEspecialistasGenero([]AfinidadeGeneroInput{
		{Genre: "Ação", TotalWatched: 9, Tier: "genero"},
		{Genre: "Fantasia", TotalWatched: 16, Tier: "genero"},
		{Genre: "Vampiros", TotalWatched: 30, Tier: "tag_tematica"}, // tag não conta
	}))
	if esp == nil {
		t.Fatal("Esperava especialidade")
	}
	if esp.Genero != "Fantasia" || esp.Epiteto != "Arcanista" || esp.Nivel != 3 || esp.Secundario != "Ação" {
		t.Errorf("Especialidade errada: %+v", esp)
	}

	nova := CalcularEspecialidade(CalcularEspecialistasGenero([]AfinidadeGeneroInput{{Genre: "Gênero Novo", TotalWatched: 5, Tier: "genero"}}))
	if nova == nil || nova.Epiteto != temaPadrao.Epiteto || nova.Secundario != "" {
		t.Errorf("Gênero sem tema deveria usar o padrão: %+v", nova)
	}
}

func TestTemasDeEspecialidade_CobremOsGenerosDasMissoes(t *testing.T) {
	for _, g := range generosDasMissoes {
		if _, ok := temasDeEspecialidade[g]; !ok {
			t.Errorf("Gênero %q sem título de especialidade", g)
		}
	}
}

func TestPassivaDaEspecialidade(t *testing.T) {
	if PassivaDaEspecialidade(nil) != nil {
		t.Fatal("sem especialidade não há passiva")
	}
	if PassivaDaEspecialidade(&Especialidade{Genero: "Ação", Nivel: 0}) != nil {
		t.Fatal("N0 não gera passiva")
	}
	pAcao := PassivaDaEspecialidade(&Especialidade{Genero: "Ação", Nivel: 3})
	if pAcao == nil || pAcao.Tipo != "ataque" || pAcao.ValorPct != 4 {
		t.Fatalf("passiva de Ação N3 incorreta: %+v", pAcao)
	}
	pTerror := PassivaDaEspecialidade(&Especialidade{Genero: "Terror", Nivel: 5})
	if pTerror == nil || pTerror.Tipo != "esquiva" || pTerror.ValorPct != 3 {
		t.Fatalf("passiva de Terror N5 incorreta: %+v", pTerror)
	}
	pNovo := PassivaDaEspecialidade(&Especialidade{Genero: "Outro", Nivel: 1})
	if pNovo == nil || pNovo.Tipo != "ataque" || pNovo.ValorPct != 2 {
		t.Fatalf("fallback para gênero novo falhou: %+v", pNovo)
	}
}
