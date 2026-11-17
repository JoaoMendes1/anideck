package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestQuantidadeDeInvocacaoValida(t *testing.T) {
	for _, v := range []int{1, 10} {
		if !QuantidadeDeInvocacaoValida(v) {
			t.Errorf("%d deveria ser aceito", v)
		}
	}
	for _, v := range []int{0, -1, 2, 9, 11, 100} {
		if QuantidadeDeInvocacaoValida(v) {
			t.Errorf("%d deveria ser recusado", v)
		}
	}
}

func TestLerRetornoInvocacao(t *testing.T) {
	ok := `{"ok":true,"bilhetes":4,"ouro":75,"sem_raro":3,"sem_lendario":71,"chance_lendario_agora":105,
		"chances":{"ouro":780,"raro":170,"epico":45,"lendario":5,"garantia":10,"lendario_sobe_em":70,"lendario_passo":50,"lendario_garantido":90,"ouro_por_tentativa":25},
		"itens":[{"tipo":"item","id":"lamina_de_eter","slot":"arma","nome":"Lâmina de Éter","raridade":"raro","ataque":10,"nivel_minimo":10,"garantida":false},
		         {"tipo":"item","id":"selo_do_guardiao","slot":"joia","nome":"Selo","raridade":"epico","vida":40,"ataque":9,"nivel_minimo":24,"garantida":true},
		         {"tipo":"ouro","ouro":25,"garantida":false}]}`
	estado, erro, _, falhou := lerRetornoInvocacao(ok)
	if falhou || erro != "" {
		t.Fatalf("resposta válida deveria passar: erro=%q falhou=%v", erro, falhou)
	}
	if estado.Bilhetes != 4 || estado.Ouro != 75 || estado.SemRaro != 3 || estado.SemLendario != 71 ||
		estado.ChanceLendarioAgora != 105 || estado.Chances.Garantia != 10 || len(estado.Itens) != 3 {
		t.Fatalf("estado incompleto: %+v", estado)
	}
	if !estado.Itens[1].Garantida || estado.Itens[1].Vida != 40 || estado.Itens[1].Tipo != "item" {
		t.Errorf("item garantido e atributos deveriam vir junto: %+v", estado.Itens[1])
	}
	if estado.Itens[2].Tipo != "ouro" || estado.Itens[2].Ouro != 25 || estado.Itens[2].ID != "" {
		t.Errorf("resultado de Ouro deveria vir sem item: %+v", estado.Itens[2])
	}
	c := estado.Chances
	if soma := c.Ouro + c.Raro + c.Epico + c.Lendario; soma != 1000 {
		t.Errorf("as chances do sql/082 somam 1000 por mil, somaram %d", soma)
	}
	if c.LendarioSobeEm >= c.LendarioGarantido || c.OuroPorTentativa != 25 {
		t.Errorf("garantia de Lendário incoerente: %+v", c)
	}

	_, erro, semBilhetes, falhou := lerRetornoInvocacao(`{"erro":"Bilhetes insuficientes.","sem_bilhetes":true}`)
	if falhou || erro == "" || !semBilhetes {
		t.Errorf("falta de bilhetes é erro de regra: erro=%q sem=%v falhou=%v", erro, semBilhetes, falhou)
	}

	for _, bruto := range []string{``, `nada`, `{"code":"P0001","message":"Catálogo de itens vazio"}`} {
		if _, _, _, falhou := lerRetornoInvocacao(bruto); !falhou {
			t.Errorf("%q deveria contar como falha do banco", bruto)
		}
	}
}

func TestHandleInvocar_SemAutenticacao(t *testing.T) {
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleInvocar(w, httptest.NewRequest(http.MethodPost, "/api/rpg/invocacao", bytes.NewReader([]byte(`{"vezes":1}`))))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401, recebeu %d", w.Code)
	}
	w2 := httptest.NewRecorder()
	(&RPGHandler{}).HandleGetInvocacao(w2, httptest.NewRequest(http.MethodGet, "/api/rpg/invocacao", nil))
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("GET sem auth: esperava 401, recebeu %d", w2.Code)
	}
}

func TestHandleInvocar_SemPersonagemAntesDeSortear(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/rpg/invocacao", bytes.NewReader([]byte(`{"vezes":10}`)))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
	w := httptest.NewRecorder()
	(&RPGHandler{}).HandleInvocar(w, req.WithContext(ctx))
	if w.Code != http.StatusNotFound && w.Code != http.StatusServiceUnavailable {
		t.Fatalf("sem personagem: esperava 404 (ou 503 sem banco), recebeu %d", w.Code)
	}
}
