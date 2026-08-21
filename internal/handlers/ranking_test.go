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
