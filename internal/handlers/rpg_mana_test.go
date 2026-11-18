package handlers

import "testing"

func TestInterpretarCobrancaMana(t *testing.T) {
	casos := []struct {
		nome, bruto, erro string
		cobrou            bool
	}{
		{"cobrou", `{"ok":true,"mana":12}`, "", true},
		{"sem mana", `{"erro":"Mana insuficiente: esta luta custa 3 e você tem 1.","mana_insuficiente":true}`, "Mana insuficiente: esta luta custa 3 e você tem 1.", false},
		{"função ausente", `{"code":"PGRST202","message":"not found"}`, "", false},
		{"vazio", ``, "", false},
		{"lixo", `<html>`, "", false},
	}
	for _, c := range casos {
		cobrou, erro := interpretarCobrancaMana(c.bruto)
		if cobrou != c.cobrou || erro != c.erro {
			t.Errorf("%s: (%v, %q), esperado (%v, %q)", c.nome, cobrou, erro, c.cobrou, c.erro)
		}
	}
}

func TestCustoDeMana_PorcentagemDaManaMaxima(t *testing.T) {
	r := RegrasComunidadePadrao()
	// Nível 15: 120 + 12*14 = 288 de Mana máxima.
	c := CustosDeMana(15, r)
	if c.Expedicao != 15 || c.Duelo != 15 || c.ChefeDoCla != 24 || c.Masmorra != 35 {
		t.Errorf("custos no nível 15: %+v", c)
	}
	if CustoDeMana(LutaExpedicao, 1, r) != 6 {
		t.Errorf("expedição no nível 1: %d", CustoDeMana(LutaExpedicao, 1, r))
	}
	r.MPCustoMasmorraPct = 0
	if CustoDeMana(LutaMasmorra, 15, r) != 0 {
		t.Error("porcentagem zero desliga o custo")
	}
	if CustoDeMana("outra", 15, r) != 0 {
		t.Error("tipo desconhecido não custa")
	}
}

func TestOuroComRegra(t *testing.T) {
	r := RegrasComunidadePadrao()
	if OuroComRegra(15, r) != 30 {
		t.Errorf("200%% de 15: %d", OuroComRegra(15, r))
	}
	r.OuroRecompensaPct = 150
	if OuroComRegra(25, r) != 38 {
		t.Errorf("150%% de 25: %d", OuroComRegra(25, r))
	}
}

func TestValidarRegras_CustosNovos(t *testing.T) {
	r := RegrasComunidadePadrao()
	r.MPCustoMasmorraPct = 60
	if validarRegrasComunidade(r) == "" {
		t.Error("custo acima de 50% deveria ser recusado")
	}
	r = RegrasComunidadePadrao()
	r.OuroRecompensaPct = 20
	if validarRegrasComunidade(r) == "" {
		t.Error("Ouro abaixo de 50% deveria ser recusado")
	}
}
