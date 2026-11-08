package handlers

import (
	"encoding/json"
	"errors"
	"testing"
)

// paginaFalsa devolve `n` linhas a partir de `de`, no formato do PostgREST.
func paginaFalsa(de, n int) []byte {
	linhas := make([]episodioMarcado, n)
	for i := range linhas {
		linhas[i] = episodioMarcado{MalID: 1, EpisodeNumber: de + i + 1}
	}
	dados, _ := json.Marshal(linhas)
	return dados
}

func TestPaginarJuntaAsPaginas(t *testing.T) {
	total := 2300
	var pedidos [][2]int
	linhas, err := paginar[episodioMarcado](func(de, ate int) ([]byte, error) {
		pedidos = append(pedidos, [2]int{de, ate})
		n := ate - de + 1
		if de+n > total {
			n = total - de
		}
		return paginaFalsa(de, n), nil
	}, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if len(linhas) != total {
		t.Fatalf("esperava %d linhas, vieram %d: a leitura parou no teto de uma página", total, len(linhas))
	}
	if len(pedidos) != 3 || pedidos[0] != [2]int{0, 999} || pedidos[2] != [2]int{2000, 2999} {
		t.Errorf("faixas pedidas erradas: %v", pedidos)
	}
}

func TestPaginarPaginaExataPedeMaisUma(t *testing.T) {
	chamadas := 0
	linhas, err := paginar[episodioMarcado](func(de, ate int) ([]byte, error) {
		chamadas++
		if de == 0 {
			return paginaFalsa(0, 1000), nil
		}
		return []byte("[]"), nil
	}, 1000)
	if err != nil || len(linhas) != 1000 || chamadas != 2 {
		t.Errorf("com exatamente 1.000 linhas, confere a página seguinte: %d linhas, %d chamadas, erro %v", len(linhas), chamadas, err)
	}
}

func TestPaginarErroNoMeio(t *testing.T) {
	_, err := paginar[episodioMarcado](func(de, ate int) ([]byte, error) {
		if de > 0 {
			return nil, errors.New("(500) falhou")
		}
		return paginaFalsa(0, 1000), nil
	}, 1000)
	if err == nil {
		t.Error("erro numa página não pode virar lista incompleta em silêncio")
	}
}

func TestIdsDeAnimeDasNotificacoes(t *testing.T) {
	notificacoes := []map[string]interface{}{
		{"mal_id": float64(10)}, {"mal_id": float64(10)}, {"mal_id": float64(0)}, {"mal_id": float64(7)}, {},
	}
	ids := idsDeAnimeDasNotificacoes(notificacoes)
	if len(ids) != 2 || ids[0] != "10" || ids[1] != "7" {
		t.Errorf("esperava [10 7], veio %v", ids)
	}
}

func TestOrdenarLedgerRecentePrimeiro(t *testing.T) {
	linhas := []linhaLedgerBanco{
		{EpisodeNumber: 1, EarnedAt: "2026-11-08T10:00:00+00:00"},
		{EpisodeNumber: 2, EarnedAt: "2026-11-08T10:00:00.5+00:00"},
		{EpisodeNumber: 3, EarnedAt: "2026-11-08T09:59:59.123456+00:00"},
		{EpisodeNumber: 4, EarnedAt: "2026-11-08T07:30:00-03:00"},
	}
	ordenarLedgerRecentePrimeiro(linhas)
	ordem := []int{}
	for _, l := range linhas {
		ordem = append(ordem, l.EpisodeNumber)
	}
	// 07:30 em Brasília é 10:30 UTC: o fuso conta, o texto não.
	esperado := []int{4, 2, 1, 3}
	for i := range esperado {
		if ordem[i] != esperado[i] {
			t.Fatalf("ordem %v, esperado %v", ordem, esperado)
		}
	}
}
