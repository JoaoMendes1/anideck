package handlers

import (
	"testing"
	"time"
)

func TestInicioTemporadaBrasilia(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}

	testes := []struct {
		nome           string
		instante       time.Time
		esperadoAno    int
		esperadoMes    time.Month
		esperadoDia    int
	}{
		{
			nome:        "Último minuto de março (Q1)",
			instante:    time.Date(2026, 3, 31, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.January, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de abril (Q2 - virada de temporada)",
			instante:    time.Date(2026, 4, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.April, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de junho (Q2)",
			instante:    time.Date(2026, 6, 30, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.April, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de julho (Q3 - virada de temporada)",
			instante:    time.Date(2026, 7, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.July, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de setembro (Q3)",
			instante:    time.Date(2026, 9, 30, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.July, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de outubro (Q4 - virada de temporada)",
			instante:    time.Date(2026, 10, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.October, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de dezembro (Q4)",
			instante:    time.Date(2026, 12, 31, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.October, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de janeiro (Q1 - virada de ano)",
			instante:    time.Date(2027, 1, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2027, esperadoMes: time.January, esperadoDia: 1,
		},
	}

	for _, tc := range testes {
		t.Run(tc.nome, func(t *testing.T) {
			obtido := InicioTemporadaBrasilia(tc.instante)
			if obtido.Year() != tc.esperadoAno || obtido.Month() != tc.esperadoMes || obtido.Day() != tc.esperadoDia {
				t.Errorf("Para %v esperado %d-%02d-%02d, mas obteve %v",
					tc.instante, tc.esperadoAno, tc.esperadoMes, tc.esperadoDia, obtido)
			}
			if obtido.Hour() != 0 || obtido.Minute() != 0 || obtido.Second() != 0 {
				t.Errorf("Horário retornado não foi meia-noite exata: %v", obtido)
			}
		})
	}
}

func TestCodigoSemanaAtualBrasilia(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}

	instante := time.Date(2026, 11, 9, 10, 0, 0, 0, loc)
	cod := CodigoSemanaAtualBrasilia(instante)
	if cod != "2026-W46" {
		t.Errorf("Esperado 2026-W46, obteve %s", cod)
	}

	// Virada de domingo para segunda
	domingoNoite := time.Date(2026, 11, 8, 23, 59, 50, 0, loc)
	segundaManha := time.Date(2026, 11, 9, 0, 0, 10, 0, loc)

	codDom := CodigoSemanaAtualBrasilia(domingoNoite)
	codSeg := CodigoSemanaAtualBrasilia(segundaManha)

	if codDom != "2026-W45" {
		t.Errorf("Esperado 2026-W45 no domingo, obteve %s", codDom)
	}
	if codSeg != "2026-W46" {
		t.Errorf("Esperado 2026-W46 na segunda, obteve %s", codSeg)
	}
}
