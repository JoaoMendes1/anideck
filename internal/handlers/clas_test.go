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
