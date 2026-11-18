package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestPontosDisponiveis(t *testing.T) {
	casos := map[int]int{0: 0, 1: 0, 2: 1, 3: 1, 10: 5, 55: 27}
	for nivel, esperado := range casos {
		if p := PontosDisponiveis(nivel); p != esperado {
			t.Errorf("nível %d: esperava %d pontos, veio %d", nivel, esperado, p)
		}
	}
}

func TestDerivarAtributos_BaseIgualAAntes(t *testing.T) {
	for _, nivel := range []int{1, 10, 28, 55, 80} {
		k := nivel - 1
		a := AtributosBase(nivel)
		if a.Vida != 100+20*k || a.Ataque != 10+3*k || a.Defesa != 5+2*k {
			t.Errorf("nível %d mudou Vida/Ataque/Defesa: %+v", nivel, a)
		}
	}
}

func TestDerivarAtributos_PontosETetos(t *testing.T) {
	base := PrimariosBase(10)
	semPontos := DerivarAtributos(10, base)
	comForca := DerivarAtributos(10, base.Somar(PrimariosRPG{Forca: 5}))
	if comForca.Ataque-semPontos.Ataque != 10 {
		t.Errorf("cada ponto de Força vale 2 de Ataque: %d -> %d", semPontos.Ataque, comForca.Ataque)
	}
	comInt := DerivarAtributos(10, base.Somar(PrimariosRPG{Inteligencia: 2}))
	if comInt.Eter-semPontos.Eter != 2 || comInt.Magia-semPontos.Magia != 4 {
		t.Errorf("Inteligência dá Éter e Magia: %+v", comInt)
	}
	extremo := DerivarAtributos(10, PrimariosRPG{Destreza: 1000, Agilidade: 1000, Sorte: 1000})
	if extremo.CriticoPorMil != 400 || extremo.DanoCritico != 220 || extremo.EsquivaPorMil != 250 || extremo.SorteItem != 10 {
		t.Errorf("tetos não respeitados: %+v", extremo)
	}
}

func TestLimitarPontos(t *testing.T) {
	p := PrimariosRPG{Forca: 3, Constituicao: 2, Sorte: 2, Destreza: 1}
	if got := LimitarPontos(p, 10); got != p {
		t.Errorf("dentro do limite não muda: %+v", got)
	}
	// Excesso de 4: sai a Sorte (2), a Destreza (1) e 1 da Constituição.
	got := LimitarPontos(p, 4)
	if got != (PrimariosRPG{Forca: 3, Constituicao: 1}) {
		t.Errorf("corte na ordem errada: %+v", got)
	}
	if got := LimitarPontos(PrimariosRPG{Forca: -3, Sorte: 2}, 5); got != (PrimariosRPG{Sorte: 2}) {
		t.Errorf("negativo vira zero: %+v", got)
	}
}

func TestValidarDistribuicao(t *testing.T) {
	if msg := ValidarDistribuicao(PrimariosRPG{Forca: 3, Agilidade: 2}, 10); msg != "" {
		t.Errorf("5 pontos no nível 10 é válido: %s", msg)
	}
	if msg := ValidarDistribuicao(PrimariosRPG{Forca: 6}, 10); msg == "" {
		t.Error("6 pontos no nível 10 passa do limite")
	}
	if msg := ValidarDistribuicao(PrimariosRPG{Forca: 2, Sorte: -1}, 10); msg == "" {
		t.Error("ponto negativo deveria ser recusado")
	}
}

func TestMontarEstadoEquipamento_ComPontos(t *testing.T) {
	estado := MontarEstadoEquipamento(10, "", nil, nil, PrimariosRPG{Forca: 4, Sorte: 9})
	// 5 disponíveis: a Sorte é cortada até caber.
	if estado.PontosDisponiveis != 5 || estado.Pontos != (PrimariosRPG{Forca: 4, Sorte: 1}) {
		t.Fatalf("pontos não foram limitados: %+v", estado.Pontos)
	}
	if estado.Atributos.Ataque != AtributosBase(10).Ataque+8 {
		t.Errorf("4 de Força deveriam dar +8 de Ataque: %d", estado.Atributos.Ataque)
	}
}

func TestLivroDeHabilidades(t *testing.T) {
	livro := LivroDeHabilidades(personagemBasePadrao, 15)
	if len(livro) != 6 || livro[0].Tipo != "unica" {
		t.Fatalf("o livro tem a única primeiro e cinco comuns: %+v", livro)
	}
	liberadas := 0
	for _, h := range livro {
		if h.Desbloqueada {
			liberadas++
		}
		if h.Desbloqueada != (15 >= h.NivelMinimo) {
			t.Errorf("%s liberada errado no nível 15", h.ID)
		}
	}
	if liberadas != 4 {
		t.Errorf("no nível 15 são 4 liberadas (única, golpe, corte, guarda): %d", liberadas)
	}
	if desconhecido := LivroDeHabilidades("nao_existe", 1); len(desconhecido) == 0 {
		t.Error("personagem desconhecido cai no padrão")
	}
}

func TestHandleDistribuirPontos_RecusaAntesDoBanco(t *testing.T) {
	h := &RPGHandler{}
	casos := map[string]string{
		"corpo quebrado": `{`,
		"campo estranho": `{"forca":1,"poder":99}`,
		"ponto negativo": `{"forca":-1}`,
		"tipo errado":    `{"forca":"muito"}`,
	}
	for nome, corpo := range casos {
		req := httptest.NewRequest(http.MethodPut, "/api/personagem/atributos", bytes.NewBufferString(corpo))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "u1")
		ctx = context.WithValue(ctx, middleware.TokenKey, "tok")
		rec := httptest.NewRecorder()
		h.HandleDistribuirPontos(rec, req.WithContext(ctx))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: esperava 400, veio %d", nome, rec.Code)
		}
	}

	req := httptest.NewRequest(http.MethodPut, "/api/personagem/atributos", bytes.NewBufferString(`{}`))
	rec := httptest.NewRecorder()
	h.HandleDistribuirPontos(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("sem token: esperava 401, veio %d", rec.Code)
	}
}
