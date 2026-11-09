package handlers

import (
	"testing"
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
