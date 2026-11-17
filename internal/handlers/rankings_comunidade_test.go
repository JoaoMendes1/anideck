package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
)

func TestInicioTemporadaBrasilia(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}

	testes := []struct {
		nome        string
		instante    time.Time
		esperadoAno int
		esperadoMes time.Month
		esperadoDia int
	}{
		{
			nome:        "Último minuto de março (Q1)",
			instante:    time.Date(2026, 3, 31, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.January, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de abril (Q2 - virada de temporada)",
			instante:    time.Date(2026, 4, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.April, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de junho (Q2)",
			instante:    time.Date(2026, 6, 30, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.April, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de julho (Q3 - virada de temporada)",
			instante:    time.Date(2026, 7, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.July, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de setembro (Q3)",
			instante:    time.Date(2026, 9, 30, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.July, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de outubro (Q4 - virada de temporada)",
			instante:    time.Date(2026, 10, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2026, esperadoMes: time.October, esperadoDia: 1,
		},
		{
			nome:        "Último minuto de dezembro (Q4)",
			instante:    time.Date(2026, 12, 31, 23, 59, 59, 0, loc),
			esperadoAno: 2026, esperadoMes: time.October, esperadoDia: 1,
		},
		{
			nome:        "Primeiro segundo de janeiro (Q1 - virada de ano)",
			instante:    time.Date(2027, 1, 1, 0, 0, 0, 0, loc),
			esperadoAno: 2027, esperadoMes: time.January, esperadoDia: 1,
		},
	}

	for _, tc := range testes {
		t.Run(tc.nome, func(t *testing.T) {
			obtido := InicioTemporadaBrasilia(tc.instante)
			if obtido.Year() != tc.esperadoAno || obtido.Month() != tc.esperadoMes || obtido.Day() != tc.esperadoDia {
				t.Errorf("Para %v esperado %d-%02d-%02d, mas obteve %v",
					tc.instante, tc.esperadoAno, tc.esperadoMes, tc.esperadoDia, obtido)
			}
			if obtido.Hour() != 0 || obtido.Minute() != 0 || obtido.Second() != 0 {
				t.Errorf("Horário retornado não foi meia-noite exata: %v", obtido)
			}
		})
	}
}

func TestCodigoSemanaAtualBrasilia(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		loc = time.FixedZone("BRT", -3*3600)
	}

	instante := time.Date(2026, 11, 9, 10, 0, 0, 0, loc)
	cod := CodigoSemanaAtualBrasilia(instante)
	if cod != "2026-W46" {
		t.Errorf("Esperado 2026-W46, obteve %s", cod)
	}

	// Virada de domingo para segunda
	domingoNoite := time.Date(2026, 11, 8, 23, 59, 50, 0, loc)
	segundaManha := time.Date(2026, 11, 9, 0, 0, 10, 0, loc)

	codDom := CodigoSemanaAtualBrasilia(domingoNoite)
	codSeg := CodigoSemanaAtualBrasilia(segundaManha)

	if codDom != "2026-W45" {
		t.Errorf("Esperado 2026-W45 no domingo, obteve %s", codDom)
	}
	if codSeg != "2026-W46" {
		t.Errorf("Esperado 2026-W46 na segunda, obteve %s", codSeg)
	}
}

func TestDecodificarNumerosComunidade(t *testing.T) {
	// Caso com apenas 1 categoria < 3 e total >= 3: mascara dropado (-1) e arredonda total para múltiplo de 3
	num, err := decodificarNumerosComunidade(52991, `[{"mal_id":52991,"assistindo":4,"completo":10,"dropado":2,"quero_assistir":7,"total":23}]`)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if num.Assistindo != 4 || num.Completo != 10 || num.Dropado != -1 || num.QueroAssistir != 7 || num.Total != 21 || !num.TotalAproximado {
		t.Fatalf("mascaramento de privacidade incorreto: %+v", num)
	}

	// Caso com todas as categorias >= 3: devolve números exatos sem aproximação
	exato, err := decodificarNumerosComunidade(100, `[{"mal_id":100,"assistindo":4,"completo":10,"dropado":3,"quero_assistir":7,"total":24}]`)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if exato.Dropado != 3 || exato.Total != 24 || exato.TotalAproximado {
		t.Fatalf("esperava contagens exatas: %+v", exato)
	}

	brutoJSON, err := json.Marshal(num)
	if err != nil {
		t.Fatalf("erro ao serializar JSON: %v", err)
	}
	var campos map[string]interface{}
	if err := json.Unmarshal(brutoJSON, &campos); err != nil {
		t.Fatalf("erro ao ler JSON: %v", err)
	}
	for _, proibido := range []string{"user_id", "handle", "usuarios"} {
		if _, existe := campos[proibido]; existe {
			t.Fatalf("campo %q não pode ser exposto na resposta agregada", proibido)
		}
	}

	vazio, err := decodificarNumerosComunidade(1234, `[]`)
	if err != nil {
		t.Fatalf("erro inesperado em array vazio: %v", err)
	}
	if vazio.MalID != 1234 || vazio.Total != 0 {
		t.Fatalf("esperava zeros para array vazio, obteve %+v", vazio)
	}

	if _, err := decodificarNumerosComunidade(1234, `nao-e-json`); err == nil {
		t.Fatalf("esperava erro para JSON inválido")
	}
}

func TestLimitarJanelaEmAlta(t *testing.T) {
	casos := []struct {
		diasIn, limIn     string
		diasOut, limOut   int
	}{
		{"", "", 14, 12},
		{"abc", "-5", 14, 12},
		{"7", "5", 7, 5},
		{"365", "200", 90, 30},
	}
	for _, c := range casos {
		d, l := limitarJanelaEmAlta(c.diasIn, c.limIn)
		if d != c.diasOut || l != c.limOut {
			t.Errorf("para (%q, %q) esperava (%d, %d), obteve (%d, %d)", c.diasIn, c.limIn, c.diasOut, c.limOut, d, l)
		}
	}
}

func TestMontarItensEmAlta(t *testing.T) {
	linhas := []emAltaLinha{
		{MalID: 10, Pontuacao: 31, UsuariosAtivos: 3, EpisodiosRecentes: 5, ComentariosRecentes: 2, ReacoesRecentes: 2, DropsRecentes: 0},
		{MalID: 20, Pontuacao: 12, UsuariosAtivos: 2, EpisodiosRecentes: 2, ComentariosRecentes: 1, ReacoesRecentes: 0, DropsRecentes: 1},
		{MalID: 0, Pontuacao: 99},
	}
	metas := map[int]metadadoLocalAnime{
		10: {Title: "Sousou no Frieren", Image: "https://cdn.local/frieren.webp"},
	}

	itens := montarItensEmAlta(linhas, metas)
	if len(itens) != 2 {
		t.Fatalf("esperava 2 itens válidos, obteve %d", len(itens))
	}
	if itens[0].Titulo != "Sousou no Frieren" || itens[0].ImagemURL == "" || itens[0].UsuariosAtivos != 3 {
		t.Fatalf("metadados curados não aplicados: %+v", itens[0])
	}
	if itens[1].Titulo != "Anime #20" || itens[1].UsuariosAtivos != -1 || itens[1].DropsRecentes != -1 {
		t.Fatalf("mascaramento de privacidade (< 3 -> -1) incorreto: %+v", itens[1])
	}
}

func TestHandleNumerosComunidadeAnimeValidacao(t *testing.T) {
	h := &RankingsComunidadeHandler{}

	for _, idInvalido := range []string{"abc", "0", "-3"} {
		req := httptest.NewRequest(http.MethodGet, "/api/anime/"+idInvalido+"/comunidade", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", idInvalido)
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rec := httptest.NewRecorder()
		h.HandleNumerosComunidadeAnime(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("para id=%q esperava 400, obteve %d", idInvalido, rec.Code)
		}
	}
}
