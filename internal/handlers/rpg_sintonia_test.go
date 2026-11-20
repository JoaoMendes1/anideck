package handlers

import "testing"

func TestElementoDoPersonagem(t *testing.T) {
	if ElementoDoPersonagem("maga_agua") != "agua" || ElementoDoPersonagem("lanceiro_fogo") != "fogo" {
		t.Error("elemento errado para o elenco")
	}
	if ElementoDoPersonagem("") != "eter" || ElementoDoPersonagem("nao_existe") != "eter" {
		t.Error("personagem vazio ou desconhecido deveria ser o padrão (Éter)")
	}
}

func TestAplicarSintonia(t *testing.T) {
	cajado := ItemRPG{ID: "cajado_de_safira", Elemento: "agua", Magia: 17, Ataque: 2, CriticoPorMil: 40}
	em := AplicarSintonia(cajado, "agua")
	// 17 × 1,15 = 19,55 → 20; 2 × 1,15 = 2,3 → 2; 40 × 1,15 = 46.
	if em.Magia != 20 || em.Ataque != 2 || em.CriticoPorMil != 46 {
		t.Errorf("sintonia errada: %+v", em)
	}
	if fora := AplicarSintonia(cajado, "fogo"); fora.Magia != 17 {
		t.Errorf("fora do elemento não muda: %+v", fora)
	}
	for _, neutro := range []string{"", "neutro"} {
		if EmSintonia(ItemRPG{Elemento: neutro}, neutro) {
			t.Errorf("item %q nunca está em sintonia", neutro)
		}
	}
}

func TestAplicarRessonancia(t *testing.T) {
	total := AtributosRPG{Vida: 200, Ataque: 40, Magia: 20, Defesa: 10}
	if got := AplicarRessonancia(total, pecasDaRessonancia-1); got.Vida != 200 {
		t.Errorf("com menos peças não há Ressonância: %+v", got)
	}
	got := AplicarRessonancia(total, pecasDaRessonancia)
	if got.Vida != 210 || got.Ataque != 42 || got.Magia != 21 || got.Defesa != 10 {
		t.Errorf("Ressonância errada: %+v", got)
	}
	if got.Poder != CalcularPoder(got) {
		t.Error("o Poder deveria ser recalculado")
	}
}

func TestMontarEstadoEquipamento_Sintonia(t *testing.T) {
	item := func(id, slot, elemento string) *ItemRPG {
		return &ItemRPG{ID: id, Slot: slot, Raridade: "raro", Vida: 100, Ataque: 20, NivelMinimo: 1, Elemento: elemento}
	}
	inventario := []linhaInventarioRPG{
		{Quantidade: 1, Item: item("a", "elmo", "agua")},
		{Quantidade: 1, Item: item("b", "armadura", "agua")},
		{Quantidade: 1, Item: item("c", "capa", "agua")},
		{Quantidade: 1, Item: item("d", "botas", "fogo")},
	}
	equipados := map[string]string{"elmo": "a", "armadura": "b", "capa": "c", "botas": "d"}

	maga := MontarEstadoEquipamento(20, "maga_agua", inventario, equipados, PrimariosRPG{})
	if maga.Elemento != "agua" || maga.PecasEmSintonia != 3 || maga.Ressonancia {
		t.Fatalf("sintonia errada: elemento %s, peças %d, ressonância %v", maga.Elemento, maga.PecasEmSintonia, maga.Ressonancia)
	}
	// Três peças de Água a 115 de Vida e uma de Fogo a 100.
	if maga.Atributos.Vida != maga.Base.Vida+3*115+100 {
		t.Errorf("Vida com sintonia errada: base %d, total %d", maga.Base.Vida, maga.Atributos.Vida)
	}
	if !maga.Inventario[0].EmSintonia {
		t.Error("o elmo de Água deveria vir marcado em sintonia")
	}

	// A quarta peça de Água ativa a Ressonância.
	inventario[3] = linhaInventarioRPG{Quantidade: 1, Item: item("d", "botas", "agua")}
	maga = MontarEstadoEquipamento(20, "maga_agua", inventario, equipados, PrimariosRPG{})
	if !maga.Ressonancia || maga.PecasEmSintonia != 4 {
		t.Errorf("deveria ter Ressonância com 4 peças: %+v", maga.PecasEmSintonia)
	}
	semRessonancia := SomarAtributos(maga.Base, []ItemRPG{
		AplicarSintonia(*item("a", "elmo", "agua"), "agua"), AplicarSintonia(*item("b", "armadura", "agua"), "agua"),
		AplicarSintonia(*item("c", "capa", "agua"), "agua"), AplicarSintonia(*item("d", "botas", "agua"), "agua"),
	})
	if maga.Atributos.Vida <= semRessonancia.Vida {
		t.Errorf("a Ressonância deveria somar Vida: %d contra %d", maga.Atributos.Vida, semRessonancia.Vida)
	}
}
