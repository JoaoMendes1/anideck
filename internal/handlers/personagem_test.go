package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestCalcularEstagio_Fronteiras(t *testing.T) {
	estagios := EstagiosPadrao()

	casos := []struct {
		nivel       int
		esperado    string
		proximo     string
		semProximo  bool
		descricaoDe string
	}{
		{nivel: 0, esperado: "iniciante", proximo: "aventureiro", descricaoDe: "nível abaixo do mínimo cai no primeiro estágio"},
		{nivel: 1, esperado: "iniciante", proximo: "aventureiro", descricaoDe: "nível inicial"},
		{nivel: 9, esperado: "iniciante", proximo: "aventureiro", descricaoDe: "um nível antes de Aventureiro"},
		{nivel: 10, esperado: "aventureiro", proximo: "veterano", descricaoDe: "exatamente em Aventureiro"},
		{nivel: 27, esperado: "aventureiro", proximo: "veterano", descricaoDe: "um nível antes de Veterano"},
		{nivel: 28, esperado: "veterano", proximo: "lendario", descricaoDe: "exatamente em Veterano"},
		{nivel: 54, esperado: "veterano", proximo: "lendario", descricaoDe: "um nível antes de Lendário"},
		{nivel: 55, esperado: "lendario", semProximo: true, descricaoDe: "exatamente em Lendário"},
		{nivel: 300, esperado: "lendario", semProximo: true, descricaoDe: "muito acima do último"},
	}

	for _, c := range casos {
		atual, proximo := CalcularEstagio(c.nivel, estagios)
		if atual.ID != c.esperado {
			t.Errorf("%s: nível %d deveria ser %q, veio %q", c.descricaoDe, c.nivel, c.esperado, atual.ID)
		}
		if c.semProximo {
			if proximo != nil {
				t.Errorf("%s: não deveria haver próximo estágio, veio %q", c.descricaoDe, proximo.ID)
			}
			continue
		}
		if proximo == nil || proximo.ID != c.proximo {
			t.Errorf("%s: próximo deveria ser %q, veio %+v", c.descricaoDe, c.proximo, proximo)
		}
	}
}

func TestCalcularEstagio_ListaVaziaUsaPadrao(t *testing.T) {
	atual, proximo := CalcularEstagio(12, nil)
	if atual.ID != "aventureiro" || proximo == nil || proximo.ID != "veterano" {
		t.Fatalf("lista vazia deveria usar os estágios padrão: atual=%+v proximo=%+v", atual, proximo)
	}
}

func TestInterpretarEstagios(t *testing.T) {
	padrao := EstagiosPadrao()

	t.Run("configuração válida muda nível e nome", func(t *testing.T) {
		bruto := `[
			{"id":"lendario","nome":"Lenda","nivel_minimo":40},
			{"id":"iniciante","nome":"","nivel_minimo":1},
			{"id":"veterano","nome":"Veterano","nivel_minimo":20},
			{"id":"aventureiro","nome":"Aventureiro","nivel_minimo":5}
		]`
		lidos := InterpretarEstagios(bruto)
		if len(lidos) != 4 {
			t.Fatalf("esperava 4 estágios, vieram %d", len(lidos))
		}
		ordem := []string{"iniciante", "aventureiro", "veterano", "lendario"}
		niveis := []int{1, 5, 20, 40}
		for i, e := range lidos {
			if e.ID != ordem[i] || e.NivelMinimo != niveis[i] {
				t.Errorf("posição %d: esperava %s no nível %d, veio %+v", i, ordem[i], niveis[i], e)
			}
		}
		if lidos[0].Nome != "Iniciante" {
			t.Errorf("nome vazio deveria herdar o padrão, veio %q", lidos[0].Nome)
		}
		if lidos[3].Nome != "Lenda" {
			t.Errorf("nome configurado deveria valer, veio %q", lidos[3].Nome)
		}
	})

	invalidas := map[string]string{
		"vazia":                        "",
		"json quebrado":                `[{"id":"iniciante"`,
		"faltando um estágio":          `[{"id":"iniciante","nivel_minimo":1},{"id":"aventureiro","nivel_minimo":10},{"id":"veterano","nivel_minimo":28}]`,
		"id desconhecido":              `[{"id":"iniciante","nivel_minimo":1},{"id":"aventureiro","nivel_minimo":10},{"id":"veterano","nivel_minimo":28},{"id":"mitico","nivel_minimo":55}]`,
		"id repetido":                  `[{"id":"iniciante","nivel_minimo":1},{"id":"iniciante","nivel_minimo":10},{"id":"veterano","nivel_minimo":28},{"id":"lendario","nivel_minimo":55}]`,
		"primeiro não começa no 1":     `[{"id":"iniciante","nivel_minimo":3},{"id":"aventureiro","nivel_minimo":10},{"id":"veterano","nivel_minimo":28},{"id":"lendario","nivel_minimo":55}]`,
		"níveis fora de ordem":         `[{"id":"iniciante","nivel_minimo":1},{"id":"aventureiro","nivel_minimo":30},{"id":"veterano","nivel_minimo":28},{"id":"lendario","nivel_minimo":55}]`,
		"dois estágios no mesmo nível": `[{"id":"iniciante","nivel_minimo":1},{"id":"aventureiro","nivel_minimo":10},{"id":"veterano","nivel_minimo":10},{"id":"lendario","nivel_minimo":55}]`,
		"nível ausente vira zero":      `[{"id":"iniciante","nivel_minimo":1},{"id":"aventureiro"},{"id":"veterano","nivel_minimo":28},{"id":"lendario","nivel_minimo":55}]`,
		"objeto no lugar da lista":     `{"id":"iniciante","nivel_minimo":1}`,
	}
	for nome, bruto := range invalidas {
		t.Run("cai no padrão: "+nome, func(t *testing.T) {
			lidos := InterpretarEstagios(bruto)
			if len(lidos) != len(padrao) {
				t.Fatalf("esperava o padrão, vieram %d estágios", len(lidos))
			}
			for i := range padrao {
				if lidos[i] != padrao[i] {
					t.Errorf("posição %d: esperava %+v, veio %+v", i, padrao[i], lidos[i])
				}
			}
		})
	}
}

func TestValidarNomePersonagem(t *testing.T) {
	validos := map[string]string{
		"Ren":                   "Ren",
		"  Ren   Kaze  ":        "Ren Kaze",
		"João D'Ávila":          "João D'Ávila",
		"Ana-Lúcia 2":           "Ana-Lúcia 2",
		"レン":                    "レン",
		strings.Repeat("a", 24): strings.Repeat("a", 24),
		"Ren\tKaze":             "Ren Kaze",
	}
	for entrada, esperado := range validos {
		limpo, err := ValidarNomePersonagem(entrada)
		if err != nil {
			t.Errorf("%q deveria ser aceito, veio erro: %v", entrada, err)
			continue
		}
		if limpo != esperado {
			t.Errorf("%q deveria virar %q, virou %q", entrada, esperado, limpo)
		}
	}

	invalidos := []string{
		"",
		"   ",
		"A",
		strings.Repeat("a", 25),
		"<script>",
		"Ren@Kaze",
		"Ren_Kaze",
		"Ren 😀",
		"Ren\u0000Kaze",
	}
	for _, entrada := range invalidos {
		if limpo, err := ValidarNomePersonagem(entrada); err == nil {
			t.Errorf("%q deveria ser recusado, virou %q", entrada, limpo)
		}
	}
}

func TestMontarRespostaPersonagem(t *testing.T) {
	linha := linhaPersonagemBanco{Nome: "Ren", PersonagemBase: "espadachim_eter", CriadoEm: "2026-11-14T16:00:00Z"}

	// 1.980 XP é exatamente o custo dos níveis 1 a 9, ou seja, o primeiro XP do nível 10.
	resposta := montarRespostaPersonagem(linha, 1980, RanksPadrao(), EstagiosPadrao())

	if !resposta.Existe || resposta.Personagem == nil || resposta.Progressao == nil || resposta.Estagio == nil {
		t.Fatalf("resposta incompleta: %+v", resposta)
	}
	if resposta.Personagem.Classe != "espadachim" || resposta.Personagem.Elemento != "eter" {
		t.Errorf("classe e elemento deveriam vir do catálogo: %+v", resposta.Personagem)
	}
	if resposta.Progressao.Nivel != 10 || resposta.Progressao.Rank != "D" {
		t.Errorf("1.980 XP deveria ser nível 10, rank D: %+v", resposta.Progressao)
	}
	if resposta.Estagio.ID != "aventureiro" {
		t.Errorf("nível 10 deveria ser Aventureiro, veio %q", resposta.Estagio.ID)
	}
	if resposta.ProximoEstagio == nil || resposta.ProximoEstagio.ID != "veterano" {
		t.Errorf("próximo estágio deveria ser Veterano: %+v", resposta.ProximoEstagio)
	}

	alcancados := 0
	for _, e := range resposta.Estagios {
		if e.Alcancado {
			alcancados++
		}
	}
	if len(resposta.Estagios) != 4 || alcancados != 2 {
		t.Errorf("esperava 4 estágios com 2 alcançados, vieram %d com %d", len(resposta.Estagios), alcancados)
	}

	// Um XP a menos ainda é nível 9, e portanto Iniciante.
	antes := montarRespostaPersonagem(linha, 1979, RanksPadrao(), EstagiosPadrao())
	if antes.Progressao.Nivel != 9 || antes.Estagio.ID != "iniciante" {
		t.Errorf("1.979 XP deveria ser nível 9, Iniciante: nivel=%d estagio=%q", antes.Progressao.Nivel, antes.Estagio.ID)
	}
}

func TestMontarRespostaPersonagem_UltimoEstagioSemProximo(t *testing.T) {
	linha := linhaPersonagemBanco{Nome: "Ren", PersonagemBase: "desconhecido"}
	resposta := montarRespostaPersonagem(linha, 100000, RanksPadrao(), EstagiosPadrao())

	if resposta.Estagio.ID != "lendario" || resposta.ProximoEstagio != nil {
		t.Fatalf("XP alto deveria ser Lendário sem próximo: estagio=%q proximo=%+v", resposta.Estagio.ID, resposta.ProximoEstagio)
	}
	if resposta.Personagem.PersonagemBase != "espadachim_eter" {
		t.Errorf("personagem fora do catálogo deveria cair no padrão, veio %q", resposta.Personagem.PersonagemBase)
	}

	corpo, err := json.Marshal(resposta)
	if err != nil {
		t.Fatalf("falha ao serializar: %v", err)
	}
	if strings.Contains(string(corpo), "proximo_estagio") {
		t.Errorf("proximo_estagio ausente não deveria aparecer no JSON: %s", corpo)
	}
}

func TestRespostaPersonagem_SemPersonagemSoTemExiste(t *testing.T) {
	corpo, err := json.Marshal(RespostaPersonagem{Existe: false})
	if err != nil {
		t.Fatalf("falha ao serializar: %v", err)
	}
	if string(corpo) != `{"existe":false}` {
		t.Errorf("quem não despertou deveria receber só existe:false, veio %s", corpo)
	}
}

func TestPersonagemHandlers_SemAutenticacao(t *testing.T) {
	h := &PersonagemHandler{}

	w1 := httptest.NewRecorder()
	h.HandleGetPersonagem(w1, httptest.NewRequest(http.MethodGet, "/api/personagem", nil))
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("GET sem auth: esperava 401, recebeu %d", w1.Code)
	}

	w2 := httptest.NewRecorder()
	corpo := bytes.NewReader([]byte(`{"nome":"Ren"}`))
	h.HandleDespertarPersonagem(w2, httptest.NewRequest(http.MethodPost, "/api/personagem", corpo))
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("POST sem auth: esperava 401, recebeu %d", w2.Code)
	}
}

func TestHandleDespertarPersonagem_RecusaAntesDoBanco(t *testing.T) {
	h := &PersonagemHandler{}

	casos := map[string]string{
		"corpo ilegível":     `{"nome":`,
		"nome curto":         `{"nome":"A"}`,
		"nome longo":         `{"nome":"` + strings.Repeat("a", 25) + `"}`,
		"caractere inválido": `{"nome":"<b>Ren</b>"}`,
		"nome ausente":       `{}`,
	}
	for nome, corpo := range casos {
		t.Run(nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/personagem", bytes.NewReader([]byte(corpo)))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
			ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
			w := httptest.NewRecorder()

			h.HandleDespertarPersonagem(w, req.WithContext(ctx))

			if w.Code != http.StatusBadRequest {
				t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
			}
		})
	}
}

func TestResolverVisual(t *testing.T) {
	estagios := EstagiosPadrao()

	casos := []struct {
		descricao  string
		equipado   string
		nivel      int
		esperado   string
		automatico bool
	}{
		{"sem visual fixado segue o estágio do nível", "", 12, "aventureiro", true},
		{"visual fixado e alcançado vale", "iniciante", 58, "iniciante", false},
		{"fixar o próprio estágio atual também conta como fixado", "lendario", 58, "lendario", false},
		{"visual fixado exatamente no nível mínimo vale", "aventureiro", 10, "aventureiro", false},
		{"visual que deixou de estar alcançado volta ao automático", "lendario", 12, "aventureiro", true},
		{"um nível abaixo do mínimo ainda não vale", "aventureiro", 9, "iniciante", true},
		{"visual desconhecido volta ao automático", "mitico", 30, "veterano", true},
	}
	for _, c := range casos {
		visual := ResolverVisual(c.equipado, c.nivel, estagios)
		if visual.ID != c.esperado || visual.Automatico != c.automatico {
			t.Errorf("%s: esperava %q (automático=%v), veio %+v", c.descricao, c.esperado, c.automatico, visual)
		}
	}
}

func TestValidarEscolhaDeVisual(t *testing.T) {
	estagios := EstagiosPadrao()

	aceitos := []struct {
		visual string
		nivel  int
	}{
		{"", 1},
		{"iniciante", 1},
		{"iniciante", 60},
		{"aventureiro", 10},
		{"lendario", 55},
	}
	for _, c := range aceitos {
		if err := ValidarEscolhaDeVisual(c.visual, c.nivel, estagios); err != nil {
			t.Errorf("visual %q no nível %d deveria ser aceito: %v", c.visual, c.nivel, err)
		}
	}

	recusados := []struct {
		visual string
		nivel  int
	}{
		{"aventureiro", 9},
		{"lendario", 54},
		{"veterano", 1},
		{"mitico", 99},
		{"Iniciante", 99},
		{"iniciante ", 99},
	}
	for _, c := range recusados {
		if err := ValidarEscolhaDeVisual(c.visual, c.nivel, estagios); err == nil {
			t.Errorf("visual %q no nível %d deveria ser recusado", c.visual, c.nivel)
		}
	}
}

func TestMontarRespostaPersonagem_Visual(t *testing.T) {
	fixado := "iniciante"
	linha := linhaPersonagemBanco{Nome: "Ren", PersonagemBase: "espadachim_eter", VisualEquipado: &fixado}

	// 100.000 XP é Lendário: o Iniciante está alcançado e pode ficar fixado.
	resposta := montarRespostaPersonagem(linha, 100000, RanksPadrao(), EstagiosPadrao())
	if resposta.Visual == nil || resposta.Visual.ID != "iniciante" || resposta.Visual.Automatico {
		t.Fatalf("visual fixado deveria valer: %+v", resposta.Visual)
	}
	if resposta.Estagio.ID != "lendario" {
		t.Errorf("fixar um visual não muda o estágio do nível, veio %q", resposta.Estagio.ID)
	}

	semFixar := montarRespostaPersonagem(linhaPersonagemBanco{Nome: "Ren"}, 1980, RanksPadrao(), EstagiosPadrao())
	if semFixar.Visual == nil || semFixar.Visual.ID != "aventureiro" || !semFixar.Visual.Automatico {
		t.Errorf("sem visual fixado deveria seguir o estágio: %+v", semFixar.Visual)
	}

	// O XP caiu para o nível 9: o Lendário fixado deixa de valer, sem erro.
	lendario := "lendario"
	caiu := montarRespostaPersonagem(linhaPersonagemBanco{Nome: "Ren", VisualEquipado: &lendario}, 1979, RanksPadrao(), EstagiosPadrao())
	if caiu.Visual.ID != "iniciante" || !caiu.Visual.Automatico {
		t.Errorf("visual não alcançado deveria voltar ao automático: %+v", caiu.Visual)
	}
}

func TestHandleEquiparVisual_RecusaAntesDoBanco(t *testing.T) {
	h := &PersonagemHandler{}

	semAuth := httptest.NewRecorder()
	h.HandleEquiparVisual(semAuth, httptest.NewRequest(http.MethodPut, "/api/personagem/visual", bytes.NewReader([]byte(`{"visual":"iniciante"}`))))
	if semAuth.Code != http.StatusUnauthorized {
		t.Fatalf("PUT sem auth: esperava 401, recebeu %d", semAuth.Code)
	}

	casos := map[string]string{
		"corpo ilegível": `{"visual":`,
		"visual longo":   `{"visual":"` + strings.Repeat("a", 41) + `"}`,
	}
	for nome, corpo := range casos {
		t.Run(nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/api/personagem/visual", bytes.NewReader([]byte(corpo)))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
			ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
			w := httptest.NewRecorder()

			h.HandleEquiparVisual(w, req.WithContext(ctx))

			if w.Code != http.StatusBadRequest {
				t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
			}
		})
	}
}

func TestContextoPersonagem_RespostaLevaOCenario(t *testing.T) {
	linha := linhaPersonagemBanco{Nome: "Ren", PersonagemBase: "espadachim_eter"}
	ctx := contextoPersonagem{linha: &linha, xpTotal: 1980, ranks: RanksPadrao(), estagios: EstagiosPadrao(), cenario: "cenario-aurora"}

	resposta := ctx.resposta()
	if resposta.Cenario != "cenario-aurora" || resposta.Estagio.ID != "aventureiro" {
		t.Fatalf("resposta deveria levar o cenário e o estágio: %+v", resposta)
	}

	ctx.cenario = ""
	corpo, err := json.Marshal(ctx.resposta())
	if err != nil {
		t.Fatalf("falha ao serializar: %v", err)
	}
	if strings.Contains(string(corpo), `"cenario"`) {
		t.Errorf("sem cenário equipado, o campo não deveria aparecer no JSON: %s", corpo)
	}
}
