package handlers

import (
	"math"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

const tolerancia = 1e-9

func TestCalcularRankingBayesiano_SemPopularity(t *testing.T) {
	// Caminho de emergência: anime_metadata_cache não guarda popularity, então
	// todo anime chega com Popularity 0 e m sai zerado.
	animes := []anilist.Anime{
		{MalID: 1, Title: "A", Score: 8.0},
		{MalID: 2, Title: "B", Score: 9.0},
	}

	C, m, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{})
	if !ok {
		t.Fatal("esperava ok=true com dois animes com nota")
	}
	if m != 0 {
		t.Fatalf("esperava m=0 sem popularity, veio %v", m)
	}
	if math.Abs(C-8.5) > tolerancia {
		t.Errorf("C: esperava 8.5, veio %v", C)
	}

	for _, a := range animes {
		if math.IsNaN(a.BayesianScore) {
			t.Fatalf("%s saiu com BayesianScore NaN", a.Title)
		}
	}

	// Sem suavização, a ordem tem que ser a das notas cruas.
	if animes[0].Title != "B" || animes[1].Title != "A" {
		t.Errorf("ordem errada: %s, %s", animes[0].Title, animes[1].Title)
	}
	if math.Abs(animes[0].BayesianScore-9.0) > tolerancia {
		t.Errorf("B: esperava 9.0, veio %v", animes[0].BayesianScore)
	}
}

func TestCalcularRankingBayesiano_SemPopularityComVotoLocal(t *testing.T) {
	// m=0 mas vLocal > 0: o divisor não zera, e o peso comunitário domina sozinho.
	animes := []anilist.Anime{{MalID: 1, Title: "A", Score: 8.0}}
	votos := map[int]communityScoreRow{
		1: {MalID: 1, LocalVotes: 2, LocalScore: 9.0},
	}

	_, m, ok := calcularRankingBayesiano(animes, votos)
	if !ok {
		t.Fatal("esperava ok=true")
	}
	if m != 0 {
		t.Fatalf("esperava m=0, veio %v", m)
	}
	if math.IsNaN(animes[0].BayesianScore) {
		t.Fatal("BayesianScore saiu NaN")
	}
	if math.Abs(animes[0].BayesianScore-9.0) > tolerancia {
		t.Errorf("esperava 9.0 (só o voto local pesa), veio %v", animes[0].BayesianScore)
	}
}

func TestCalcularRankingBayesiano_CaminhoNormal(t *testing.T) {
	// Regressão: com popularity presente, a guarda não pode ter mudado nada.
	// C = (9+7)/2 = 8 ; m = (1000+100)/2 = 550
	animes := []anilist.Anime{
		{MalID: 1, Title: "A", Score: 9.0, Popularity: 1000},
		{MalID: 2, Title: "B", Score: 7.0, Popularity: 100},
	}

	C, m, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{})
	if !ok {
		t.Fatal("esperava ok=true")
	}
	if math.Abs(C-8.0) > tolerancia || math.Abs(m-550.0) > tolerancia {
		t.Fatalf("C/m errados: C=%v m=%v", C, m)
	}

	esperado := map[string]float64{
		"A": (1000.0/1550.0)*9.0 + (550.0/1550.0)*8.0,
		"B": (100.0/650.0)*7.0 + (550.0/650.0)*8.0,
	}
	for _, a := range animes {
		if math.Abs(a.BayesianScore-esperado[a.Title]) > tolerancia {
			t.Errorf("%s: esperava %v, veio %v", a.Title, esperado[a.Title], a.BayesianScore)
		}
	}

	if animes[0].Title != "A" || animes[0].CurrentRank != 1 {
		t.Errorf("A deveria ser rank 1, veio %s rank %d", animes[0].Title, animes[0].CurrentRank)
	}
}

func TestCalcularRankingBayesiano_SemNotaNenhuma(t *testing.T) {
	animes := []anilist.Anime{{MalID: 1, Title: "A", Score: 0}}
	if _, _, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{}); ok {
		t.Error("esperava ok=false quando nenhum anime tem nota")
	}
}