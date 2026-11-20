package handlers

import (
	"encoding/json"
	"testing"
)

func TestItemServe(t *testing.T) {
	espada := ItemRPG{ID: "lamina_glacial", Classes: []string{"espadachim", "paladina"}}
	casos := []struct {
		nome  string
		item  ItemRPG
		base  string
		serve bool
	}{
		{"sem classes serve a todos", ItemRPG{ID: "espada_de_ferro"}, "maga_agua", true},
		{"classe certa", espada, "paladina_luz", true},
		{"classe errada", espada, "maga_agua", false},
		{"personagem vazio é o padrão (Espadachim)", espada, "", true},
		{"personagem desconhecido é o padrão", espada, "nao_existe", true},
		{"lista vazia não serve a ninguém", ItemRPG{ID: "arco", Classes: []string{}}, "espadachim_eter", false},
		{"exclusivo vale no lugar das classes", ItemRPG{ID: "x", Classes: []string{"maga"}, PersonagemExclusivo: "assassina_raio"}, "assassina_raio", true},
		{"exclusivo de outro personagem", ItemRPG{ID: "x", PersonagemExclusivo: "assassina_raio"}, "maga_agua", false},
	}
	for _, c := range casos {
		if got := ItemServe(c.item, c.base); got != c.serve {
			t.Errorf("%s: esperava %v, veio %v", c.nome, c.serve, got)
		}
	}
}

// O banco manda `classes` como null (serve a todos) ou como lista; o Go precisa distinguir.
func TestClassesDoJSON(t *testing.T) {
	var nulo, vazio ItemRPG
	if err := json.Unmarshal([]byte(`{"id":"a","classes":null}`), &nulo); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(`{"id":"b","classes":[]}`), &vazio); err != nil {
		t.Fatal(err)
	}
	if !ItemServe(nulo, "maga_agua") || ItemServe(vazio, "maga_agua") {
		t.Errorf("null deveria servir a todos e [] a ninguém: %+v %+v", nulo, vazio)
	}
}

func TestMontarEstadoEquipamento_ClasseErradaNaoSoma(t *testing.T) {
	lamina := &ItemRPG{ID: "lamina_glacial", Slot: "arma", Raridade: "lendario", Ataque: 49, NivelMinimo: 1, Classes: []string{"espadachim"}}
	inventario := []linhaInventarioRPG{{Quantidade: 1, Item: lamina}}
	equipados := map[string]string{"arma": "lamina_glacial"}

	maga := MontarEstadoEquipamento(10, "maga_agua", inventario, equipados, PrimariosRPG{})
	if maga.Atributos.Ataque != maga.Base.Ataque {
		t.Errorf("a Maga não deveria somar a espada: %+v", maga.Atributos)
	}
	if !maga.Inventario[0].NaoServe {
		t.Error("a espada deveria vir marcada como não serve para a Maga")
	}

	espadachim := MontarEstadoEquipamento(10, "espadachim_eter", inventario, equipados, PrimariosRPG{})
	if espadachim.Atributos.Ataque != espadachim.Base.Ataque+49 || espadachim.Inventario[0].NaoServe {
		t.Errorf("o Espadachim deveria somar a espada: %+v", espadachim.Atributos)
	}
}

func TestSomarAtributos_AtributosNovos(t *testing.T) {
	base := AtributosBase(30)
	luvas := ItemRPG{Slot: "luvas", CriticoPorMil: 50, DanoCritico: 18, Magia: 3, Velocidade: 2, EsquivaPorMil: 10}
	total := SomarAtributos(base, []ItemRPG{luvas})
	if total.CriticoPorMil != base.CriticoPorMil+50 || total.DanoCritico != base.DanoCritico+18 ||
		total.Magia != base.Magia+3 || total.Velocidade != base.Velocidade+2 || total.EsquivaPorMil != base.EsquivaPorMil+10 {
		t.Errorf("atributos novos não somaram: base %+v, total %+v", base, total)
	}
	if total.Poder != CalcularPoder(total) {
		t.Error("o Poder deveria ser recalculado")
	}
}

func TestSomarAtributos_Tetos(t *testing.T) {
	exagero := ItemRPG{CriticoPorMil: 5000, EsquivaPorMil: 5000}
	total := SomarAtributos(AtributosBase(1), []ItemRPG{exagero})
	if total.CriticoPorMil != tetoCriticoPorMil || total.EsquivaPorMil != tetoEsquivaPorMil {
		t.Errorf("tetos não aplicados: %+v", total)
	}
}

func TestConjuntos(t *testing.T) {
	peca := func(slot string) ItemRPG { return ItemRPG{Slot: slot, Conjunto: "carmesim"} }
	base := AtributosBase(30)

	t.Run("uma peça mostra o conjunto sem bônus", func(t *testing.T) {
		c := ConjuntosEmUso([]ItemRPG{peca("arma")})
		if len(c) != 1 || c[0].Pecas != 1 || c[0].Ativo2 || c[0].Bonus2 != "+8 Ataque" {
			t.Fatalf("conjunto errado: %+v", c)
		}
		if SomarAtributos(base, []ItemRPG{peca("arma")}).Ataque != base.Ataque {
			t.Error("uma peça não deveria dar bônus")
		}
	})

	t.Run("duas peças dão o bônus de 2", func(t *testing.T) {
		total := SomarAtributos(base, []ItemRPG{peca("arma"), peca("elmo")})
		if total.Ataque != base.Ataque+8 || total.DanoCritico != base.DanoCritico {
			t.Errorf("bônus de 2 errado: %+v", total)
		}
	})

	t.Run("quatro peças somam as duas faixas", func(t *testing.T) {
		total := SomarAtributos(base, []ItemRPG{peca("arma"), peca("elmo"), peca("armadura"), peca("capa")})
		if total.Ataque != base.Ataque+8 || total.DanoCritico != base.DanoCritico+25 {
			t.Errorf("bônus de 4 errado: %+v", total)
		}
		c := ConjuntosEmUso([]ItemRPG{peca("arma"), peca("elmo"), peca("armadura"), peca("capa")})
		if !c[0].Ativo2 || !c[0].Ativo4 || c[0].Bonus4 != "+25% Dano Crítico" {
			t.Errorf("faixas erradas: %+v", c)
		}
	})

	t.Run("conjunto desconhecido e item sem conjunto são ignorados", func(t *testing.T) {
		c := ConjuntosEmUso([]ItemRPG{{Conjunto: "inventado"}, {Conjunto: "inventado"}, {}})
		if len(c) != 0 {
			t.Errorf("não deveria haver conjunto: %+v", c)
		}
	})

	t.Run("seis peças somam as três faixas", func(t *testing.T) {
		pecas := []ItemRPG{peca("arma"), peca("elmo"), peca("armadura"), peca("luvas"), peca("capa"), peca("botas")}
		total := SomarAtributos(base, pecas)
		if total.Ataque != base.Ataque+8+15 || total.DanoCritico != base.DanoCritico+25 || total.CriticoPorMil != base.CriticoPorMil+40 {
			t.Errorf("bônus de 6 errado: %+v", total)
		}
		c := ConjuntosEmUso(pecas)
		if !c[0].Ativo6 || c[0].Bonus6 != "+15 Ataque · +4% Crítico" {
			t.Errorf("faixa de 6 errada: %+v", c)
		}
	})

	t.Run("cinco peças ainda não ativam a faixa de 6", func(t *testing.T) {
		c := ConjuntosEmUso([]ItemRPG{peca("arma"), peca("elmo"), peca("armadura"), peca("luvas"), peca("capa")})
		if c[0].Ativo6 || !c[0].Ativo4 {
			t.Errorf("faixas erradas com 5 peças: %+v", c)
		}
	})
}

func TestDescreverBonus(t *testing.T) {
	if got := DescreverBonus(ItemRPG{Vida: 60, EsquivaPorMil: 15}); got != "+60 Vida · +1,5% Esquiva" {
		t.Errorf("texto errado: %q", got)
	}
	if DescreverBonus(ItemRPG{}) != "" {
		t.Error("bônus vazio deveria dar texto vazio")
	}
}

// Todo conjunto que o catálogo usa (sql/121, sql/129 e sql/130) precisa existir no Go, senão a peça não
// dá bônus nenhum. Todo conjunto tem as três faixas.
func TestConjuntosDoCatalogo(t *testing.T) {
	for _, id := range []string{"glacial", "carmesim", "aurora", "sombrio", "arcano", "silvestre", "terra",
		"brasa", "mare", "trovao", "rocha", "alvorada", "nevoa", "primordial"} {
		c, ok := conjuntosRPG[id]
		if !ok {
			t.Errorf("conjunto %s sem bônus no Go", id)
			continue
		}
		if DescreverBonus(c.duasPecas) == "" || DescreverBonus(c.quatroPeca) == "" || DescreverBonus(c.seisPecas) == "" {
			t.Errorf("conjunto %s sem alguma das faixas", id)
		}
	}
}

func TestSlotsRPG_SeteSlots(t *testing.T) {
	esperado := []string{"arma", "elmo", "armadura", "luvas", "capa", "botas", "joia"}
	slots := SlotsRPG()
	if len(slots) != len(esperado) {
		t.Fatalf("slots: %v", slots)
	}
	for i := range esperado {
		if slots[i] != esperado[i] {
			t.Errorf("slot %d: esperava %s, veio %s", i, esperado[i], slots[i])
		}
	}
}
