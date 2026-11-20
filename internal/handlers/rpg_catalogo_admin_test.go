package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMontarCatalogoRPGAdmin_AgregaContagens(t *testing.T) {
	preco35 := 35
	preco240 := 240
	itens := []itemCatalogoBanco{
		{
			ID: "lanca_de_madeira", Slot: "arma", Nome: "Lança de Treino", Raridade: "comum",
			Ataque: 4, NivelMinimo: 1, Classes: []string{"lanceiro"}, PrecoOuro: &preco35, Ativo: true, Ordem: 15,
		},
		{
			ID: "lanca_da_tempestade", Slot: "arma", Nome: "Lança da Tempestade", Raridade: "epico",
			Ataque: 32, NivelMinimo: 26, Classes: []string{"lanceiro"}, Ativo: true, Ordem: 105,
		},
		{
			ID: "armadura_carmesim", Slot: "armadura", Nome: "Armadura Carmesim", Raridade: "epico",
			Vida: 100, Defesa: 12, NivelMinimo: 26, Classes: nil, Conjunto: "carmesim", PrecoOuro: &preco240, Ativo: true, Ordem: 116,
		},
		{
			ID: "arco_silvestre", Slot: "arma", Nome: "Arco Silvestre", Raridade: "epico",
			NivelMinimo: 26, Classes: []string{}, Conjunto: "silvestre", Ativo: false, Ordem: 109,
		},
	}

	resp := MontarCatalogoRPGAdmin(itens, map[string]int{"armadura_carmesim": 180}, map[string]int{"lanca_de_madeira": 2})

	if resp.Resumo.Total != 4 || resp.Resumo.Ativos != 3 || resp.Resumo.Inativos != 1 {
		t.Fatalf("totais inesperados: %+v", resp.Resumo)
	}
	if resp.Resumo.NoMercado != 2 || resp.Resumo.NaForja != 1 || resp.Resumo.Possuidos != 1 {
		t.Fatalf("contagens de fonte/posse inesperadas: %+v", resp.Resumo)
	}
	if resp.Resumo.PorClasse["lanceiro"] != 2 || resp.Resumo.PorClasse["generico"] != 1 {
		t.Errorf("contagem por classe inesperada: %+v", resp.Resumo.PorClasse)
	}
	if resp.Resumo.PorElemento["raio"] != 1 || resp.Resumo.PorElemento["fogo"] != 1 || resp.Resumo.PorElemento["neutro"] != 1 {
		t.Errorf("contagem por elemento inesperada: %+v", resp.Resumo.PorElemento)
	}
	if resp.Resumo.PorSlot["arma"] != 2 || resp.Resumo.PorSlot["armadura"] != 1 {
		t.Errorf("contagem por slot inesperada: %+v", resp.Resumo.PorSlot)
	}
	if !resp.Itens[0].Possui || resp.Itens[0].Quantidade != 2 {
		t.Errorf("esperava posse do admin marcada no primeiro item: %+v", resp.Itens[0])
	}
}

func TestHandleGetAdminCatalogoRPG_SemAuthRetorna401(t *testing.T) {
	h := &RPGHandler{}
	rec := httptest.NewRecorder()
	h.HandleGetAdminCatalogoRPG(rec, httptest.NewRequest(http.MethodGet, "/api/admin/rpg/catalogo", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem autenticação, veio %d", rec.Code)
	}
}
