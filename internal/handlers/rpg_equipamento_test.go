package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func itemTeste(id, slot string, vida, ataque, defesa, nivel int) *ItemRPG {
	return &ItemRPG{ID: id, Slot: slot, Nome: id, Raridade: "comum", Vida: vida, Ataque: ataque, Defesa: defesa, NivelMinimo: nivel}
}

func TestAtributosBase(t *testing.T) {
	um := AtributosBase(1)
	if um.Vida != 100 || um.Ataque != 10 || um.Defesa != 5 {
		t.Errorf("nível 1 deveria ser 100/10/5, veio %+v", um)
	}
	if um.Poder != CalcularPoder(um) {
		t.Errorf("poder deveria ser calculado: %+v", um)
	}
	dez := AtributosBase(10)
	if dez.Vida != 280 || dez.Ataque != 37 || dez.Defesa != 23 {
		t.Errorf("nível 10 deveria ser 280/37/23, veio %+v", dez)
	}
	if zero := AtributosBase(0); zero != um {
		t.Errorf("nível abaixo de 1 deveria valer como 1: %+v", zero)
	}
}

func TestSlotRPGValido(t *testing.T) {
	for _, s := range []string{"arma", "armadura", "capa", "botas", "joia"} {
		if !SlotRPGValido(s) {
			t.Errorf("slot %q deveria ser aceito", s)
		}
	}
	for _, s := range []string{"", "Arma", "acessorio", "moldura", "cenario"} {
		if SlotRPGValido(s) {
			t.Errorf("slot %q deveria ser recusado", s)
		}
	}
}

func TestMontarEstadoEquipamento(t *testing.T) {
	inventario := []linhaInventarioRPG{
		{Quantidade: 1, Item: itemTeste("espada_de_ferro", "arma", 0, 4, 0, 1)},
		{Quantidade: 2, Item: itemTeste("lamina_primordial", "arma", 0, 45, 0, 55)},
		{Quantidade: 1, Item: itemTeste("gibao", "armadura", 20, 0, 2, 1)},
		{Quantidade: 1, Item: itemTeste("botas_raras", "botas", 0, 1, 3, 6)},
	}

	t.Run("soma só os itens equipados e alcançados", func(t *testing.T) {
		estado := MontarEstadoEquipamento(10, "", inventario, map[string]string{"arma": "espada_de_ferro", "armadura": "gibao"}, PrimariosRPG{})
		base := AtributosBase(10)
		if estado.Atributos.Vida != base.Vida+20 || estado.Atributos.Ataque != base.Ataque+4 || estado.Atributos.Defesa != base.Defesa+2 {
			t.Errorf("atributos errados: base %+v, total %+v", base, estado.Atributos)
		}
		if len(estado.Slots) != 7 || estado.Slots[0].Slot != "arma" || estado.Slots[0].Item == nil || estado.Slots[4].Item != nil {
			t.Errorf("slots errados: %+v", estado.Slots)
		}
	})

	t.Run("item acima do nível fica no slot mas não soma", func(t *testing.T) {
		estado := MontarEstadoEquipamento(10, "", inventario, map[string]string{"arma": "lamina_primordial"}, PrimariosRPG{})
		if estado.Slots[0].Item == nil || estado.Slots[0].Item.ID != "lamina_primordial" {
			t.Fatalf("o item deveria continuar no slot: %+v", estado.Slots[0])
		}
		if estado.Atributos.Ataque != AtributosBase(10).Ataque {
			t.Errorf("item bloqueado não deveria somar ataque: %+v", estado.Atributos)
		}
	})

	t.Run("item equipado que o jogador não possui ou de outro slot é ignorado", func(t *testing.T) {
		estado := MontarEstadoEquipamento(60, "", inventario, map[string]string{"arma": "item_fantasma", "botas": "gibao"}, PrimariosRPG{})
		if estado.Slots[0].Item != nil || estado.Slots[5].Item != nil {
			t.Errorf("slots deveriam ficar vazios: %+v", estado.Slots)
		}
		if estado.Atributos != SomarAtributos(AtributosBase(60), nil) {
			t.Errorf("nada deveria somar: %+v", estado.Atributos)
		}
	})

	t.Run("inventário marca equipado e bloqueado e vem em ordem de slot", func(t *testing.T) {
		estado := MontarEstadoEquipamento(10, "", inventario, map[string]string{"arma": "espada_de_ferro"}, PrimariosRPG{})
		ordem := []string{"espada_de_ferro", "lamina_primordial", "gibao", "botas_raras"}
		for i, item := range estado.Inventario {
			if item.ID != ordem[i] {
				t.Fatalf("posição %d: esperava %s, veio %s", i, ordem[i], item.ID)
			}
		}
		if !estado.Inventario[0].Equipado || estado.Inventario[1].Equipado {
			t.Errorf("marca de equipado errada: %+v", estado.Inventario[:2])
		}
		if estado.Inventario[0].Bloqueado || !estado.Inventario[1].Bloqueado {
			t.Errorf("marca de bloqueado errada: %+v", estado.Inventario[:2])
		}
		if estado.Inventario[1].Quantidade != 2 {
			t.Errorf("quantidade deveria vir junto: %+v", estado.Inventario[1])
		}
	})
}

func TestInterpretarInventarioRPG(t *testing.T) {
	bruto := `[
		{"quantidade":1,"rpg_itens":{"id":"espada_de_ferro","slot":"arma","nome":"Espada","ataque":4,"nivel_minimo":1}},
		{"quantidade":0,"rpg_itens":{"id":"gibao","slot":"armadura","nome":"Gibão","vida":20,"nivel_minimo":1}},
		{"quantidade":1,"rpg_itens":null},
		{"quantidade":1,"rpg_itens":{"id":"estranho","slot":"chapeu","nome":"?"}}
	]`
	linhas, err := interpretarInventarioRPG([]byte(bruto))
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(linhas) != 2 {
		t.Fatalf("esperava 2 linhas válidas, vieram %d", len(linhas))
	}
	if linhas[1].Quantidade != 1 {
		t.Errorf("quantidade abaixo de 1 deveria virar 1: %+v", linhas[1])
	}
	if _, err := interpretarInventarioRPG([]byte(`{"message":"erro"}`)); err == nil {
		t.Error("resposta de erro do PostgREST deveria falhar")
	}
}

func TestLerRetornoRPG(t *testing.T) {
	casos := []struct {
		bruto  string
		erro   string
		falhou bool
	}{
		{`{"ok":true,"slot":"arma"}`, "", false},
		{`{"erro":"Você não possui este item."}`, "Você não possui este item.", false},
		{``, "", true},
		{`{"code":"42883","message":"function does not exist"}`, "", true},
		{`não é json`, "", true},
	}
	for _, c := range casos {
		erro, falhou := lerRetornoRPG(c.bruto)
		if erro != c.erro || falhou != c.falhou {
			t.Errorf("%q: esperava (%q, %v), veio (%q, %v)", c.bruto, c.erro, c.falhou, erro, falhou)
		}
	}
}

func TestHandleEquiparItemRPG_RecusaAntesDoBanco(t *testing.T) {
	h := &RPGHandler{}

	semAuth := httptest.NewRecorder()
	h.HandleEquiparItemRPG(semAuth, httptest.NewRequest(http.MethodPut, "/api/personagem/equipamentos", bytes.NewReader([]byte(`{"slot":"arma"}`))))
	if semAuth.Code != http.StatusUnauthorized {
		t.Fatalf("sem auth: esperava 401, recebeu %d", semAuth.Code)
	}

	casos := map[string]string{
		"corpo ilegível": `{"slot":`,
		"slot inválido":  `{"slot":"chapeu","item_id":"x"}`,
		"slot vazio":     `{"item_id":"espada_de_ferro"}`,
		"item longo":     `{"slot":"arma","item_id":"` + strings.Repeat("a", 41) + `"}`,
	}
	for nome, corpo := range casos {
		t.Run(nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/api/personagem/equipamentos", bytes.NewReader([]byte(corpo)))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
			ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
			w := httptest.NewRecorder()
			h.HandleEquiparItemRPG(w, req.WithContext(ctx))
			if w.Code != http.StatusBadRequest {
				t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
			}
		})
	}
}

func TestHandleGetEquipamentos_SemAutenticacao(t *testing.T) {
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleGetEquipamentos(w, httptest.NewRequest(http.MethodGet, "/api/personagem/equipamentos", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401, recebeu %d", w.Code)
	}
}
