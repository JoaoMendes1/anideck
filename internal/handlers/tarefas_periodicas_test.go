package handlers

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestPeriodoDevido_Diaria(t *testing.T) {
	freq := FrequenciaDiaria(4, 0) // 04:00 BRT

	// 08/11/2026 às 03:59 BRT: o horário de hoje ainda não chegou, então o período aberto é 2026-11-07.
	antesDasQuatro := time.Date(2026, 11, 8, 3, 59, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(antesDasQuatro, freq, "2026-11-07"); ok || p != "" {
		t.Fatalf("às 03:59 com ontem concluído não deveria estar devido, veio (%q, %v)", p, ok)
	}
	if p, ok := periodoDevido(antesDasQuatro, freq, "2026-11-06"); !ok || p != "2026-11-07" {
		t.Fatalf("às 03:59 sem ontem concluído deveria cobrar 2026-11-07, veio (%q, %v)", p, ok)
	}

	// 08/11/2026 às 04:00 BRT: abre o período 2026-11-08.
	asQuatro := time.Date(2026, 11, 8, 4, 0, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(asQuatro, freq, "2026-11-07"); !ok || p != "2026-11-08" {
		t.Fatalf("às 04:00 deveria abrir 2026-11-08, veio (%q, %v)", p, ok)
	}
	if p, ok := periodoDevido(asQuatro, freq, "2026-11-08"); ok || p != "" {
		t.Fatalf("com 2026-11-08 já concluído não pode rodar de novo, veio (%q, %v)", p, ok)
	}
}

func TestPeriodoDevido_FusoBrasiliaNuncaUsaUTC(t *testing.T) {
	// Armadilha 3: 2026-11-09T01:30:00Z já é segunda-feira em UTC (W46),
	// mas em Brasília (UTC-3) ainda é domingo 2026-11-08 às 22:30 (W45).
	instanteUTC := time.Date(2026, 11, 9, 1, 30, 0, 0, time.UTC)
	freqSemanal := FrequenciaSemanal(0, 5) // segunda às 00:05 BRT

	if p, ok := periodoDevido(instanteUTC, freqSemanal, "2026-W45"); ok || p != "" {
		t.Fatalf("domingo 22:30 BRT (segunda 01:30 UTC) ainda é W45; não deveria abrir W46: (%q, %v)", p, ok)
	}
}

func TestPeriodoDevido_ViradaDeSemana(t *testing.T) {
	freq := FrequenciaSemanal(4, 0) // segunda-feira às 04:00 BRT

	// Segunda 09/11/2026 (ISO 2026-W46) às 03:30 BRT: ainda vale a semana anterior (2026-W45).
	segundaAntes := time.Date(2026, 11, 9, 3, 30, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(segundaAntes, freq, "2026-W45"); ok || p != "" {
		t.Fatalf("segunda às 03:30 BRT ainda não abriu W46, veio (%q, %v)", p, ok)
	}

	// Segunda 09/11/2026 às 04:00 BRT: abre 2026-W46.
	segundaNaHora := time.Date(2026, 11, 9, 4, 0, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(segundaNaHora, freq, "2026-W45"); !ok || p != "2026-W46" {
		t.Fatalf("segunda às 04:00 BRT deveria abrir 2026-W46, veio (%q, %v)", p, ok)
	}

	// Quarta-feira da mesma semana com W46 já concluída: idempotente.
	quarta := time.Date(2026, 11, 11, 15, 0, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(quarta, freq, "2026-W46"); ok || p != "" {
		t.Fatalf("quarta com 2026-W46 concluída deveria devolver falso, veio (%q, %v)", p, ok)
	}
}

func TestPeriodoDevido_ViradaDeTemporadaEDeAno(t *testing.T) {
	freq := FrequenciaTemporada(4, 0) // dia 1º da temporada às 04:00 BRT

	// 1º de janeiro de 2027 às 03:59 BRT: ainda está em 2026-FALL.
	antesViradaAno := time.Date(2027, 1, 1, 3, 59, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(antesViradaAno, freq, "2026-FALL"); ok || p != "" {
		t.Fatalf("01/01/2027 às 03:59 BRT ainda é 2026-FALL, veio (%q, %v)", p, ok)
	}
	if p, ok := periodoDevido(antesViradaAno, freq, "2026-SUMMER"); !ok || p != "2026-FALL" {
		t.Fatalf("sem 2026-FALL concluída deveria cobrar 2026-FALL, veio (%q, %v)", p, ok)
	}

	// 1º de janeiro de 2027 às 04:00 BRT: abre 2027-WINTER.
	aposViradaAno := time.Date(2027, 1, 1, 4, 0, 0, 0, fusoGuilda)
	if p, ok := periodoDevido(aposViradaAno, freq, "2026-FALL"); !ok || p != "2027-WINTER" {
		t.Fatalf("01/01/2027 às 04:00 BRT deveria abrir 2027-WINTER, veio (%q, %v)", p, ok)
	}

	// Viradas de abril (SPRING), julho (SUMMER) e outubro (FALL).
	casos := []struct {
		instante time.Time
		ultimo   string
		esperado string
	}{
		{time.Date(2027, 4, 1, 4, 0, 0, 0, fusoGuilda), "2027-WINTER", "2027-SPRING"},
		{time.Date(2027, 7, 1, 4, 0, 0, 0, fusoGuilda), "2027-SPRING", "2027-SUMMER"},
		{time.Date(2027, 10, 1, 4, 0, 0, 0, fusoGuilda), "2027-SUMMER", "2027-FALL"},
	}
	for _, c := range casos {
		if p, ok := periodoDevido(c.instante, freq, c.ultimo); !ok || p != c.esperado {
			t.Errorf("em %v esperava (%q, true), veio (%q, %v)", c.instante, c.esperado, p, ok)
		}
	}
}

func TestInvocarComRecuperacao_CapturaPanicoSemDerrubarWorker(t *testing.T) {
	tarefa := TarefaPeriodica{
		Nome: "tarefa_panico",
		Executar: func(ctx context.Context) (string, error) {
			panic("falha simulada")
		},
	}
	resumo, err := invocarComRecuperacao(context.Background(), tarefa)
	if err == nil || !strings.Contains(err.Error(), "pânico recuperado") {
		t.Fatalf("esperava erro de pânico recuperado, veio resumo=%q err=%v", resumo, err)
	}
}
