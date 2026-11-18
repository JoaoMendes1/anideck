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

func TestCustosDeMana_LutasMaioresCustamMais(t *testing.T) {
	c := CustosDeMana()
	if c.Expedicao <= 0 || c.Duelo <= 0 || c.ChefeDoCla < c.Expedicao || c.Masmorra <= c.ChefeDoCla {
		t.Errorf("custos fora de ordem: %+v", c)
	}
}
