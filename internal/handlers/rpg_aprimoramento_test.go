package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTetoECustoDeAprimoramento(t *testing.T) {
	tetos := map[string]int{"comum": 4, "raro": 6, "epico": 8, "lendario": 10, "": 4, "outra": 4}
	for raridade, teto := range tetos {
		if got := TetoDeAprimoramento(raridade); got != teto {
			t.Errorf("teto de %q = %d; queria %d", raridade, got, teto)
		}
	}
	custos := []struct {
		raridade string
		para     int
		custo    int
	}{
		{"comum", 1, 20}, {"comum", 4, 80}, {"raro", 1, 40}, {"raro", 6, 240},
		{"epico", 8, 640}, {"lendario", 10, 1500}, {"lendario", 0, 150},
	}
	for _, c := range custos {
		if got := CustoDeAprimoramento(c.raridade, c.para); got != c.custo {
			t.Errorf("custo de %s para +%d = %d; queria %d", c.raridade, c.para, got, c.custo)
		}
	}
}

func TestAplicarAprimoramento(t *testing.T) {
	espada := ItemRPG{ID: "lamina_primordial", Raridade: "lendario", Vida: 0, Ataque: 60, Defesa: 7}
	if got := AplicarAprimoramento(espada, 0); got.Ataque != 60 || got.Defesa != 7 || got.Aprimoramento != 0 {
		t.Errorf("+0 não muda nada: %+v", got)
	}
	if got := AplicarAprimoramento(espada, 10); got.Ataque != 70 || got.Defesa != 17 || got.Vida != 0 || got.Aprimoramento != 10 {
		t.Errorf("+10 soma 1%% por nível, no mínimo 1 por nível, e zero continua zero: %+v", got)
	}
	armadura := ItemRPG{Raridade: "lendario", Vida: 400}
	if got := AplicarAprimoramento(armadura, 10); got.Vida != 440 {
		t.Errorf("+10 em 400 de Vida soma 10%%: %+v", got)
	}
	comum := ItemRPG{Raridade: "comum", Ataque: 10}
	if got := AplicarAprimoramento(comum, 10); got.Aprimoramento != 4 || got.Ataque != 14 {
		t.Errorf("acima do teto vale o teto: %+v", got)
	}
	if got := AplicarAprimoramento(comum, -3); got.Aprimoramento != 0 || got.Ataque != 10 {
		t.Errorf("negativo vale zero: %+v", got)
	}
}

func TestMontarEstadoEquipamento_ComAprimoramento(t *testing.T) {
	espada := ItemRPG{ID: "espada_da_aurora", Slot: "arma", Raridade: "epico", Ataque: 20, NivelMinimo: 1}
	botas := ItemRPG{ID: "botas_do_batedor", Slot: "botas", Raridade: "raro", Defesa: 10, NivelMinimo: 1}
	inventario := []linhaInventarioRPG{
		{Quantidade: 1, Aprimoramento: 4, Item: &espada},
		{Quantidade: 2, Aprimoramento: 6, Item: &botas},
	}
	semNada := MontarEstadoEquipamento(10, "", []linhaInventarioRPG{{Quantidade: 1, Item: &espada}, {Quantidade: 2, Item: &botas}},
		map[string]string{"arma": espada.ID, "botas": botas.ID}, PrimariosRPG{})
	estado := MontarEstadoEquipamento(10, "", inventario, map[string]string{"arma": espada.ID, "botas": botas.ID}, PrimariosRPG{})

	if estado.Atributos.Ataque-semNada.Atributos.Ataque != 4 || estado.Atributos.Defesa-semNada.Atributos.Defesa != 6 {
		t.Errorf("o aprimoramento deveria somar 4 de Ataque (+4) e 6 de Defesa (+6): %+v vs %+v", estado.Atributos, semNada.Atributos)
	}
	for _, item := range estado.Inventario {
		switch item.ID {
		case espada.ID:
			if item.Ataque != 24 || item.Aprimoramento != 4 || item.AprimoramentoMaximo != 8 || item.CustoAprimorar != 400 {
				t.Errorf("espada +4: %+v", item)
			}
		case botas.ID:
			if item.Aprimoramento != 6 || item.CustoAprimorar != 0 {
				t.Errorf("botas no teto não têm preço: %+v", item)
			}
		}
	}
	if s := estado.Slots[0]; s.Item == nil || s.Item.Ataque != 24 {
		t.Errorf("o slot mostra o item aprimorado: %+v", s.Item)
	}
}

func TestInterpretarInventario_AprimoramentoForaDaFaixa(t *testing.T) {
	linhas, err := interpretarInventarioRPG([]byte(`[
		{"quantidade":1,"aprimoramento":99,"rpg_itens":{"id":"a","slot":"arma","raridade":"lendario","ataque":10}},
		{"quantidade":1,"aprimoramento":-2,"rpg_itens":{"id":"b","slot":"botas","raridade":"raro","defesa":4}},
		{"quantidade":1,"rpg_itens":{"id":"c","slot":"joia","raridade":"raro","vida":4}}]`))
	if err != nil || len(linhas) != 3 {
		t.Fatalf("leitura: %v %d", err, len(linhas))
	}
	if linhas[0].Aprimoramento != 10 || linhas[1].Aprimoramento != 0 || linhas[2].Aprimoramento != 0 {
		t.Errorf("aprimoramento cortado em 0..10 e ausente vira 0: %d %d %d", linhas[0].Aprimoramento, linhas[1].Aprimoramento, linhas[2].Aprimoramento)
	}
}

func TestHandleAprimorar(t *testing.T) {
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleAprimorar(w, requisicaoRPG(http.MethodPost, "/api/rpg/aprimorar", `{"item_id":"espada_de_ferro"}`, false))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sem autenticação: esperava 401, recebeu %d", w.Code)
	}
	longo := `{"item_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}`
	for _, corpo := range []string{`{}`, `{"item_id":"   "}`, `nada`, longo} {
		w = httptest.NewRecorder()
		(&RPGHandler{}).HandleAprimorar(w, requisicaoRPG(http.MethodPost, "/api/rpg/aprimorar", corpo, true))
		if w.Code != http.StatusBadRequest {
			t.Errorf("corpo %q: esperava 400, recebeu %d", corpo, w.Code)
		}
	}
	w = httptest.NewRecorder()
	(&RPGHandler{}).HandleAprimorar(w, requisicaoRPG(http.MethodPost, "/api/rpg/aprimorar", `{"item_id":"espada_de_ferro"}`, true))
	if w.Code != http.StatusNotFound && w.Code != http.StatusServiceUnavailable {
		t.Fatalf("item válido sem banco: esperava 404 ou 503, recebeu %d", w.Code)
	}
}
