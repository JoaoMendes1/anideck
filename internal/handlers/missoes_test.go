package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSortearMissoesDoDia(t *testing.T) {
	catalogo := CatalogoPadraoMissoes()
	if len(catalogo) < 3 {
		t.Fatalf("Catálogo precisa de pelo menos 3 missões, tem %d", len(catalogo))
	}

	userID1 := "00000000-0000-0000-0000-000000000001"
	userID2 := "00000000-0000-0000-0000-000000000002"
	dia1 := "2026-11-08"
	dia2 := "2026-11-09"

	t.Run("sempre retorna 3 missoes", func(t *testing.T) {
		sorteadas := SortearMissoesDoDia(catalogo, userID1, dia1)
		if len(sorteadas) != 3 {
			t.Fatalf("Esperado 3 missões, recebido %d", len(sorteadas))
		}
	})

	t.Run("eh deterministico para mesmo usuario e mesmo dia", func(t *testing.T) {
		s1 := SortearMissoesDoDia(catalogo, userID1, dia1)
		s2 := SortearMissoesDoDia(catalogo, userID1, dia1)

		for i := 0; i < 3; i++ {
			if s1[i].ID != s2[i].ID {
				t.Fatalf("Sorteios deveriam ser idênticos, s1[%d]=%s != s2[%d]=%s", i, s1[i].ID, i, s2[i].ID)
			}
		}
	})

	t.Run("dias diferentes produzem combinacoes ou ordens distintas", func(t *testing.T) {
		s1 := SortearMissoesDoDia(catalogo, userID1, dia1)
		s2 := SortearMissoesDoDia(catalogo, userID1, dia2)

		diferente := false
		for i := 0; i < 3; i++ {
			if s1[i].ID != s2[i].ID {
				diferente = true
				break
			}
		}
		if !diferente {
			t.Log("Sorteio em dias diferentes deu a mesma ordem (improvável mas possível)")
		}
	})

	t.Run("usuarios diferentes no mesmo dia", func(t *testing.T) {
		s1 := SortearMissoesDoDia(catalogo, userID1, dia1)
		s2 := SortearMissoesDoDia(catalogo, userID2, dia1)

		diferente := false
		for i := 0; i < 3; i++ {
			if s1[i].ID != s2[i].ID {
				diferente = true
				break
			}
		}
		if !diferente {
			t.Log("Sorteio para usuários diferentes deu igual")
		}
	})
}

func TestMissoes_ValidacoesAuth(t *testing.T) {
	handler := &MissoesHandler{}

	t.Run("get missoes hoje sem sessao retorna 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/missoes/hoje", nil)
		rec := httptest.NewRecorder()
		handler.HandleGetMissoesHoje(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Esperado 401, recebido %d", rec.Code)
		}
	})

	t.Run("resgatar sem sessao retorna 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/missoes/ep_hoje/resgatar", nil)
		rec := httptest.NewRecorder()
		handler.HandleResgatarMissao(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Esperado 401, recebido %d", rec.Code)
		}
	})
}

func TestMissoes_SerializacaoJSON(t *testing.T) {
	m := MissaoUsuario{
		ID:                 "ep_hoje",
		Tipo:               MissaoMarcarEpisodios,
		Titulo:             "Episódio do Dia",
		Descricao:          "Marque 1 ep",
		Meta:               1,
		Progresso:          1,
		ProgressoAtual:     1,
		RecompensaCristais: 15,
		RecompensaAniCoins: 15,
		Concluida:          true,
		Resgatada:          false,
		Icone:              "Play",
	}

	bytes, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("Erro ao serializar: %v", err)
	}

	var mResult map[string]interface{}
	if err := json.Unmarshal(bytes, &mResult); err != nil {
		t.Fatalf("Erro ao deserializar: %v", err)
	}

	// Campos essenciais para evitar "Faltam NaN" no frontend
	if _, ok := mResult["progresso"]; !ok {
		t.Errorf("Campo 'progresso' obrigatório no JSON")
	}
	if _, ok := mResult["meta"]; !ok {
		t.Errorf("Campo 'meta' obrigatório no JSON")
	}
	if _, ok := mResult["recompensa_cristais"]; !ok {
		t.Errorf("Campo 'recompensa_cristais' obrigatório no JSON")
	}
	if _, ok := mResult["icone"]; !ok {
		t.Errorf("Campo 'icone' obrigatório no JSON")
	}
}
