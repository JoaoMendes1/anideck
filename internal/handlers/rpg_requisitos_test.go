package handlers

import (
	"strings"
	"testing"
)

func TestRequisitosDoItem_PorRaridade(t *testing.T) {
	if req := RequisitosDoItem(ItemRPG{Raridade: "comum", NivelMinimo: 10, Ataque: 5}); temRequisito(req) {
		t.Errorf("Comum não pede atributo: %+v", req)
	}
	// Raro de nível 12: Força do nível (16) + 12% dos 22 pontos (3).
	if req := RequisitosDoItem(ItemRPG{Raridade: "raro", NivelMinimo: 12, Ataque: 17, Velocidade: 2}); req != (PrimariosRPG{Forca: 19}) {
		t.Errorf("Raro deveria pedir só Força 19: %+v", req)
	}
	// Lendário com Ataque e Crítico: Força principal e Destreza secundária.
	req := RequisitosDoItem(ItemRPG{Raridade: "lendario", NivelMinimo: 50, Ataque: 49, CriticoPorMil: 36, DanoCritico: 12})
	if req.Forca != 54+22 || req.Destreza != 29+10 || req.Constituicao != 0 {
		t.Errorf("Lendário deveria pedir Força 76 e Destreza 39: %+v", req)
	}
	// Armadura pede Constituição.
	if req := RequisitosDoItem(ItemRPG{Raridade: "epico", NivelMinimo: 26, Vida: 124, Defesa: 15, Ataque: 2}); req.Constituicao == 0 || req.Forca != 0 {
		t.Errorf("armadura deveria pedir só Constituição: %+v", req)
	}
}

func TestFaltaDeRequisito(t *testing.T) {
	req := PrimariosRPG{Forca: 30, Destreza: 20}
	if f := FaltaDeRequisito(req, PrimariosRPG{Forca: 30, Destreza: 20}); f != "" {
		t.Errorf("quem cumpre não tem falta: %q", f)
	}
	f := FaltaDeRequisito(req, PrimariosRPG{Forca: 25, Destreza: 20})
	if f != "Exige Força 30 (você tem 25)" {
		t.Errorf("texto errado: %q", f)
	}
	if f := FaltaDeRequisito(req, PrimariosRPG{}); !strings.Contains(f, "Força 30") || !strings.Contains(f, "Destreza 20") {
		t.Errorf("deveria citar os dois: %q", f)
	}
}

// O item equipado sem o atributo fica no slot, inativo, e não soma; com o atributo, volta.
func TestMontarEstado_ItemSemRequisitoFicaInativo(t *testing.T) {
	espada := &ItemRPG{ID: "espada_teste", Slot: "arma", Nome: "Espada", Raridade: "raro", NivelMinimo: 12, Ataque: 17}
	inv := []linhaInventarioRPG{{Item: espada, Quantidade: 1}}
	eq := map[string]string{"arma": "espada_teste"}

	sem := MontarEstadoEquipamento(12, "", inv, eq, PrimariosRPG{Constituicao: 22})
	if !sem.Slots[0].Inativo || !strings.HasPrefix(sem.Slots[0].Motivo, "Exige Força 19") {
		t.Fatalf("a arma deveria ficar inativa: %+v", sem.Slots[0])
	}
	if sem.Atributos.Ataque != sem.Base.Ataque {
		t.Errorf("item inativo não soma Ataque: %d vs %d", sem.Atributos.Ataque, sem.Base.Ataque)
	}
	if sem.Inventario[0].FaltaRequisito == "" || FaltaParaEquipar(sem, "espada_teste") == "" {
		t.Error("o inventário deveria dizer o que falta")
	}

	com := MontarEstadoEquipamento(12, "", inv, eq, PrimariosRPG{Forca: 3, Constituicao: 19})
	if com.Slots[0].Inativo || com.Atributos.Ataque != com.Base.Ataque+17 {
		t.Errorf("com Força 19 a arma vale: %+v, ataque %d", com.Slots[0], com.Atributos.Ataque)
	}
	if FaltaParaEquipar(com, "espada_teste") != "" || FaltaParaEquipar(com, "outro") != "" {
		t.Error("sem falta para equipar")
	}
}

// Aprimorar não aumenta o que o item pede.
func TestRequisitos_AprimoramentoNaoMuda(t *testing.T) {
	item := ItemRPG{ID: "x", Slot: "arma", Raridade: "epico", NivelMinimo: 20, Ataque: 30}
	inv := []linhaInventarioRPG{{Item: &item, Quantidade: 1, Aprimoramento: 10}}
	est := MontarEstadoEquipamento(20, "", inv, map[string]string{"arma": "x"}, PrimariosRPG{})
	if est.Slots[0].Item.Requisitos == nil || *est.Slots[0].Item.Requisitos != RequisitosDoItem(item) {
		t.Errorf("requisito deveria ser o do catálogo: %+v", est.Slots[0].Item.Requisitos)
	}
}
