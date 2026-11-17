package handlers

import "testing"

func TestMarcosDoBestiario(t *testing.T) {
	casos := []struct{ vitorias, marco, faltam, bonus int }{
		{0, 0, 10, 0}, {-3, 0, 10, 0}, {9, 0, 1, 0}, {10, 1, 40, 10}, {49, 1, 1, 10}, {50, 2, 100, 20}, {150, 3, 0, 30}, {999, 3, 0, 30},
	}
	for _, c := range casos {
		b := MontarBestiario(c.vitorias)
		if b.Marco != c.marco || b.FaltamMarco != c.faltam || b.BonusOuro != c.bonus {
			t.Errorf("MontarBestiario(%d) = %+v; queria marco %d, faltam %d, bônus %d", c.vitorias, b, c.marco, c.faltam, c.bonus)
		}
	}
}

func TestInterpretarHojeRPG_Vitorias(t *testing.T) {
	hoje, err := interpretarHojeRPG(`{"ok":true,"feitas":2,"limite":5,"bilhetes":3,"ouro":40,"vida_perdida":120,"vitorias":{"lobo_sombrio":12}}`)
	if err != nil || hoje.Vitorias["lobo_sombrio"] != 12 || hoje.Ouro != 40 || hoje.VidaPerdida != 120 {
		t.Fatalf("leitura: %+v %v", hoje, err)
	}
	if hoje, err = interpretarHojeRPG(`{"ok":true,"feitas":0,"limite":5}`); err != nil || hoje.Vitorias["x"] != 0 {
		t.Fatalf("sem vitórias (antes do sql/085) vale como zero: %+v %v", hoje, err)
	}
	if _, err = interpretarHojeRPG(`{"erro":"Não autenticado"}`); err == nil {
		t.Fatal("resposta sem ok deveria falhar")
	}
}
