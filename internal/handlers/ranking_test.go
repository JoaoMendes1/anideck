package handlers

import (
	"testing"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

func TestGetAniDeckStats(t *testing.T) {
	// 1. Prepara o estado global simulando que o Motor Bayesiano já rodou
	globalRanking.Lock()
	globalRanking.Animes = []anilist.Anime{
		{MalID: 10, Title: "Anime Top", BayesianScore: 9.5, CurrentRank: 1},
		{MalID: 20, Title: "Anime Medio", BayesianScore: 7.5, CurrentRank: 2},
	}
	globalRanking.LastUpdated = time.Now()
	globalRanking.Unlock()

	// 2. Testa o Caminho Feliz (Anime existe no Top)
	rank, score, found := GetAniDeckStats(10)
	if !found {
		t.Errorf("Esperava encontrar o Anime 10, mas não encontrou")
	}
	if rank != 1 {
		t.Errorf("Esperava rank 1, recebeu %d", rank)
	}
	if score != 9.5 {
		t.Errorf("Esperava score 9.5, recebeu %f", score)
	}

	// 3. Testa Cenário de Erro/Fallback (Anime obscuro, fora do Top 1000)
	_, _, found = GetAniDeckStats(999)
	if found {
		t.Errorf("Não esperava encontrar o Anime 999 no cache")
	}

	// Limpa o estado
	InvalidateRankingCache()
}

func TestCalcularVariacao(t *testing.T) {
	animes := []anilist.Anime{
		{MalID: 1, CurrentRank: 1}, // subiu (era 3)
		{MalID: 2, CurrentRank: 2}, // manteve
		{MalID: 3, CurrentRank: 3}, // desceu (era 1)
		{MalID: 4, CurrentRank: 4}, // não existe na foto
	}

	foto := map[int]int{1: 3, 2: 2, 3: 1}

	calcularVariacao(animes, foto)

	esperado := map[int]int{1: 3, 2: 2, 3: 1, 4: 0}
	for _, a := range animes {
		if a.PreviousRank != esperado[a.MalID] {
			t.Errorf("mal_id %d: PreviousRank = %d, esperado %d",
				a.MalID, a.PreviousRank, esperado[a.MalID])
		}
	}
}

func TestCalcularVariacaoSemFoto(t *testing.T) {
	// Primeira execução do sistema: nenhuma foto existe ainda.
	animes := []anilist.Anime{{MalID: 1, CurrentRank: 1}}

	calcularVariacao(animes, nil)

	if animes[0].PreviousRank != 0 {
		t.Errorf("sem foto, PreviousRank deveria ser 0, veio %d", animes[0].PreviousRank)
	}
}
