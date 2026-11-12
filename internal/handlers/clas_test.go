package handlers

import (
	"testing"
	"time"
)

func TestExtrairMensagemErroBanco(t *testing.T) {
	testes := []struct {
		nome     string
		raw      string
		fallback string
		esperado string
	}{
		{
			nome:     "JSON com mensagem Postgres",
			raw:      `{"code":"P0001","message":"P0001: Seu perfil precisa ser público para fundar um clã."}`,
			fallback: "Erro padrão",
			esperado: "Seu perfil precisa ser público para fundar um clã.",
		},
		{
			nome:     "Texto com erro de nível",
			raw:      `ERROR: Nível insuficiente para fundar um clã. Necessário nível 3 (você é nível 1).`,
			fallback: "Erro padrão",
			esperado: "Nível insuficiente para fundar um clã. Necessário nível 3 (você é nível 1).",
		},
		{
			nome:     "Texto com erro de já pertencer a clã",
			raw:      `detail: "Você já pertence a um clã. Saia do clã atual antes de criar um novo."`,
			fallback: "Erro padrão",
			esperado: "Você já pertence a um clã. Saia do clã atual antes de criar um novo.",
		},
		{
			nome:     "Sem correspondência usa fallback",
			raw:      `random internal error 500`,
			fallback: "Falha ao criar clã",
			esperado: "Falha ao criar clã",
		},
	}

	for _, tc := range testes {
		t.Run(tc.nome, func(t *testing.T) {
			obtido := extrairMensagemErroBanco(tc.raw, tc.fallback)
			if obtido != tc.esperado {
				t.Errorf("Esperava %q, obteve %q", tc.esperado, obtido)
			}
		})
	}
}

func TestCalcularMetaDesafioCla(t *testing.T) {
	testes := []struct {
		nome          string
		qtdMembros    int
		metaPorMembro int
		metaMinima    int
		esperado      int
	}{
		{
			nome:          "1 membro usa meta mínima",
			qtdMembros:    1,
			metaPorMembro: 8,
			metaMinima:    20,
			esperado:      20,
		},
		{
			nome:          "2 membros ainda abaixo da meta mínima",
			qtdMembros:    2,
			metaPorMembro: 8,
			metaMinima:    20,
			esperado:      20,
		},
		{
			nome:          "10 membros escala proporcionalmente",
			qtdMembros:    10,
			metaPorMembro: 8,
			metaMinima:    20,
			esperado:      80,
		},
		{
			nome:          "30 membros no clã cheio",
			qtdMembros:    30,
			metaPorMembro: 8,
			metaMinima:    20,
			esperado:      240,
		},
		{
			nome:          "0 membros trata como 1 e usa mínima",
			qtdMembros:    0,
			metaPorMembro: 3,
			metaMinima:    10,
			esperado:      10,
		},
	}

	for _, tc := range testes {
		t.Run(tc.nome, func(t *testing.T) {
			obtido := CalcularMetaDesafioCla(tc.qtdMembros, tc.metaPorMembro, tc.metaMinima)
			if obtido != tc.esperado {
				t.Errorf("Esperava %d, obteve %d", tc.esperado, obtido)
			}
		})
	}
}

func TestEventoContaParaDesafio(t *testing.T) {
	inicioSemana := time.Date(2026, 11, 9, 0, 0, 0, 0, time.UTC)  // Segunda
	fimSemana := time.Date(2026, 11, 16, 0, 0, 0, 0, time.UTC)    // Próxima segunda

	membroAntigo := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	membroNovoQuarta := time.Date(2026, 11, 11, 14, 0, 0, 0, time.UTC)

	// Casos para membro antigo
	t.Run("Membro antigo: assistiu na terça dentro da semana conta", func(t *testing.T) {
		terca := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
		if !EventoContaParaDesafio(terca, membroAntigo, inicioSemana, fimSemana) {
			t.Errorf("Deveria contar evento de membro antigo na semana")
		}
	})

	t.Run("Membro antigo: assistiu antes da semana não conta", func(t *testing.T) {
		domingoPassado := time.Date(2026, 11, 8, 23, 59, 0, 0, time.UTC)
		if EventoContaParaDesafio(domingoPassado, membroAntigo, inicioSemana, fimSemana) {
			t.Errorf("Não deveria contar evento de antes da semana")
		}
	})

	t.Run("Membro antigo: assistiu após o fim da semana não conta", func(t *testing.T) {
		segundaQueVem := time.Date(2026, 11, 16, 0, 1, 0, 0, time.UTC)
		if EventoContaParaDesafio(segundaQueVem, membroAntigo, inicioSemana, fimSemana) {
			t.Errorf("Não deveria contar evento após o fim da semana")
		}
	})

	// Casos para membro novo no meio da semana
	t.Run("Membro novo: assistiu na terça antes de entrar no clã não conta", func(t *testing.T) {
		terca := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
		if EventoContaParaDesafio(terca, membroNovoQuarta, inicioSemana, fimSemana) {
			t.Errorf("Não deveria contar evento assistido antes da data em que o membro entrou no clã")
		}
	})

	t.Run("Membro novo: assistiu na quinta após entrar no clã conta", func(t *testing.T) {
		quinta := time.Date(2026, 11, 12, 10, 0, 0, 0, time.UTC)
		if !EventoContaParaDesafio(quinta, membroNovoQuarta, inicioSemana, fimSemana) {
			t.Errorf("Deveria contar evento assistido após o membro entrar no clã")
		}
	})
}

func TestChaveReferenciaDesafioCla(t *testing.T) {
	claID := "d4b2e841-325d-4fcf-bc01-e73797669d01"
	semana := "2026-W46"
	userID := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

	chave1 := ChaveReferenciaDesafioCla(claID, semana, userID)
	chave2 := ChaveReferenciaDesafioCla(claID, semana, userID)

	if chave1 != chave2 {
		t.Errorf("Chaves deveriam ser idênticas para idempotência: %q vs %q", chave1, chave2)
	}

	esperado := "desafio:d4b2e841-325d-4fcf-bc01-e73797669d01:2026-W46:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
	if chave1 != esperado {
		t.Errorf("Esperava %q, obteve %q", esperado, chave1)
	}
}

func TestCalcularPontuacaoLigaCla(t *testing.T) {
	testes := []struct {
		nome             string
		totalMembros     int
		minMembros       int
		somaTop10        int64
		esperadoPontos   int
		esperadoElegivel bool
	}{
		{
			nome:             "Menos de 10 membros é inelegível e pontuação zero",
			totalMembros:     8,
			minMembros:       10,
			somaTop10:        15000,
			esperadoPontos:   0,
			esperadoElegivel: false,
		},
		{
			nome:             "Exatamente 10 membros calcula média aritmética exata",
			totalMembros:     10,
			minMembros:       10,
			somaTop10:        12500,
			esperadoPontos:   1250,
			esperadoElegivel: true,
		},
		{
			nome:             "Mais de 10 membros (ex: 25) pontua apenas pelos 10 melhores com arredondamento",
			totalMembros:     25,
			minMembros:       10,
			somaTop10:        15256,
			esperadoPontos:   1526, // 15256 / 10 = 1525.6 -> 1526
			esperadoElegivel: true,
		},
		{
			nome:             "MinMembros menor que 1 assume 10 como default defensivo",
			totalMembros:     9,
			minMembros:       0,
			somaTop10:        5000,
			esperadoPontos:   0,
			esperadoElegivel: false,
		},
	}

	for _, tc := range testes {
		t.Run(tc.nome, func(t *testing.T) {
			pontos, elegivel, motivo := CalcularPontuacaoLigaCla(tc.totalMembros, tc.minMembros, tc.somaTop10)
			if elegivel != tc.esperadoElegivel {
				t.Errorf("Elegibilidade: esperava %v, obteve %v", tc.esperadoElegivel, elegivel)
			}
			if pontos != tc.esperadoPontos {
				t.Errorf("Pontuação: esperava %d, obteve %d", tc.esperadoPontos, pontos)
			}
			if !tc.esperadoElegivel && motivo == "" {
				t.Errorf("Esperava motivo de inelegibilidade preenchido")
			}
		})
	}
}

func TestCompararClasLiga(t *testing.T) {
	dataBase := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	claElegivel1 := RankingClaTemporadaItem{
		ClaID:        "c1",
		Nome:         "Clã Alfa",
		ElegivelLiga: true,
		Pontuacao:    2000,
		XPTotal:      30000,
		CriadoEm:     dataBase,
	}

	claElegivel2 := RankingClaTemporadaItem{
		ClaID:        "c2",
		Nome:         "Clã Beta",
		ElegivelLiga: true,
		Pontuacao:    1500,
		XPTotal:      25000,
		CriadoEm:     dataBase.AddDate(0, 1, 0),
	}

	claEmpateXP := RankingClaTemporadaItem{
		ClaID:        "c3",
		Nome:         "Clã Gama",
		ElegivelLiga: true,
		Pontuacao:    2000,
		XPTotal:      35000, // Maior XP total que Alfa
		CriadoEm:     dataBase.AddDate(0, 1, 0),
	}

	claEmpateAntigo := RankingClaTemporadaItem{
		ClaID:        "c4",
		Nome:         "Clã Delta",
		ElegivelLiga: true,
		Pontuacao:    2000,
		XPTotal:      30000,
		CriadoEm:     dataBase.AddDate(0, -1, 0), // Mais antigo que Alfa
	}

	claInelegivel := RankingClaTemporadaItem{
		ClaID:        "c5",
		Nome:         "Clã Ômega",
		ElegivelLiga: false,
		Pontuacao:    0,
		XPTotal:      5000,
		CriadoEm:     dataBase,
	}

	t.Run("Elegível vence inelegível", func(t *testing.T) {
		res := CompararClasLiga(claElegivel2, claInelegivel)
		if res >= 0 {
			t.Errorf("Clã elegível deveria vir antes do inelegível: obteve %d", res)
		}
	})

	t.Run("Maior pontuação vence", func(t *testing.T) {
		res := CompararClasLiga(claElegivel1, claElegivel2)
		if res >= 0 {
			t.Errorf("Clã Alfa (2000 pts) deveria vir antes de Clã Beta (1500 pts): obteve %d", res)
		}
	})

	t.Run("Empate na pontuação desempata por maior XP total", func(t *testing.T) {
		res := CompararClasLiga(claEmpateXP, claElegivel1)
		if res >= 0 {
			t.Errorf("Clã Gama (35k XP) deveria vir antes de Alfa (30k XP): obteve %d", res)
		}
	})

	t.Run("Empate na pontuação e no XP total desempata por antiguidade", func(t *testing.T) {
		res := CompararClasLiga(claEmpateAntigo, claElegivel1)
		if res >= 0 {
			t.Errorf("Clã Delta (mais antigo) deveria vir antes de Alfa: obteve %d", res)
		}
	})
}

func TestChaveReferenciaLigaCla(t *testing.T) {
	t.Run("Idempotência e formato da chave", func(t *testing.T) {
		chave1 := ChaveReferenciaLigaCla("2026-FALL", "cla-123", "user-456")
		chave2 := ChaveReferenciaLigaCla("2026-FALL", "cla-123", "user-456")
		if chave1 != chave2 {
			t.Errorf("Chaves devem ser iguais: %q != %q", chave1, chave2)
		}
		esperado := "liga_cla:2026-FALL:cla-123:user-456"
		if chave1 != esperado {
			t.Errorf("Esperava %q, obteve %q", esperado, chave1)
		}
	})
}

func TestCodigoTemporadaBrasilia(t *testing.T) {
	testes := []struct {
		data     time.Time
		esperado string
	}{
		{time.Date(2026, 2, 15, 12, 0, 0, 0, time.UTC), "2026-WINTER"},
		{time.Date(2026, 5, 20, 12, 0, 0, 0, time.UTC), "2026-SPRING"},
		{time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC), "2026-SUMMER"},
		{time.Date(2026, 11, 12, 12, 0, 0, 0, time.UTC), "2026-FALL"},
	}

	for _, tc := range testes {
		obtido := CodigoTemporadaBrasilia(tc.data)
		if obtido != tc.esperado {
			t.Errorf("Para %v: esperava %q, obteve %q", tc.data, tc.esperado, obtido)
		}
	}
}
