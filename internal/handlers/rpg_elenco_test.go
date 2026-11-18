package handlers

import (
	"bytes"
	"context"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// jogadorDoElenco monta um jogador do personagem pedido: pontos divididos entre Força e
// Constituição, itens da faixa e o livro de habilidades da classe.
func jogadorDoElenco(base string, nivel int, item ItemRPG) CombatenteRPG {
	p := PontosDisponiveis(nivel)
	est := MontarEstadoEquipamento(nivel, "", nil, nil, PrimariosRPG{Forca: p / 2, Constituicao: p - p/2})
	return CombatenteDoEstado(EstadoEquipamento{
		Atributos:   SomarAtributos(est.Base, []ItemRPG{item}),
		Habilidades: LivroDeHabilidades(base, nivel),
	})
}

// Nenhum personagem do elenco pode ficar para trás: no próprio nível, todos vencem a
// maioria das lutas, e o chefe final continua difícil para todos.
func TestElenco_BalanceamentoPorPersonagem(t *testing.T) {
	casos := []struct {
		monstro MonstroRPG
		item    ItemRPG
	}{
		{monstroDoNivel(18, "raro", 900, 70, 50), ItemRPG{Vida: 90, Ataque: 15, Defesa: 11}},
		{monstroDoNivel(26, "raro", 1400, 120, 62), ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}},
		{monstroDoNivel(35, "chefe", 2100, 145, 80), ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}},
		{monstroDoNivel(50, "chefe", 3600, 210, 120), ItemRPG{Vida: 400, Ataque: 60, Defesa: 40}},
	}
	primordial := monstroDoNivel(60, "chefe", 4800, 255, 155)
	for base := range PersonagensBase() {
		for _, c := range casos {
			jogador := jogadorDoElenco(base, c.monstro.Nivel, c.item)
			vitorias := 0
			for semente := int64(0); semente < 200; semente++ {
				if SimularBatalha(jogador, c.monstro, rand.New(rand.NewSource(semente))).Venceu {
					vitorias++
				}
			}
			if vitorias < 160 {
				t.Errorf("%s no nível %d: esperava >= 80%% (160/200), venceu %d", base, c.monstro.Nivel, vitorias)
			}
		}
		jogador := jogadorDoElenco(base, 60, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40})
		vitorias := 0
		for semente := int64(0); semente < 300; semente++ {
			if SimularBatalha(jogador, primordial, rand.New(rand.NewSource(semente))).Venceu {
				vitorias++
			}
		}
		if vitorias < 24 || vitorias > 150 {
			t.Errorf("%s contra o chefe final: esperava entre 8%% e 50%% (24 a 150 em 300), venceu %d", base, vitorias)
		}
	}
}

// Cada personagem tem a sua habilidade única, e ela entra em uso numa luta difícil.
func TestElenco_HabilidadeUnicaEmUso(t *testing.T) {
	nomes := map[string]bool{}
	for base := range PersonagensBase() {
		livro := LivroDeHabilidades(base, 60)
		unica := livro[len(livro)-1].Nome
		if nomes[unica] {
			t.Errorf("%s repete a habilidade única %q", base, unica)
		}
		nomes[unica] = true

		jogador := jogadorDoElenco(base, 45, ItemRPG{Vida: 400, Ataque: 60, Defesa: 40})
		usou := false
		for semente := int64(0); semente < 30 && !usou; semente++ {
			r := SimularBatalha(jogador, monstroDoNivel(45, "chefe", 4000, 190, 100), rand.New(rand.NewSource(semente)))
			for _, turno := range r.Turnos {
				if turno.Habilidade == unica {
					usou = true
				}
			}
		}
		if !usou {
			t.Errorf("%s nunca usou %q", base, unica)
		}
	}
}

func TestValidarPersonagemBase(t *testing.T) {
	if b, err := ValidarPersonagemBase(""); err != nil || b != personagemBasePadrao {
		t.Fatalf("vazio deveria ser o padrão, veio %q (%v)", b, err)
	}
	for base := range PersonagensBase() {
		if b, err := ValidarPersonagemBase(" " + base + " "); err != nil || b != base {
			t.Errorf("%s deveria valer, veio %q (%v)", base, b, err)
		}
	}
	if _, err := ValidarPersonagemBase("dragao_secreto"); err == nil {
		t.Fatal("personagem desconhecido deveria ser recusado")
	}
}

func TestAceitaSkins(t *testing.T) {
	if !aceitaSkins("") || !aceitaSkins(personagemBasePadrao) {
		t.Fatal("o Espadachim usa as skins")
	}
	for base := range PersonagensBase() {
		if base != personagemBasePadrao && aceitaSkins(base) {
			t.Errorf("%s não deveria usar as skins do Espadachim", base)
		}
	}
}

func TestHandleTrocarPersonagem_RecusaAntesDoBanco(t *testing.T) {
	h := &PersonagemHandler{}

	w := httptest.NewRecorder()
	h.HandleTrocarPersonagem(w, httptest.NewRequest(http.MethodPut, "/api/personagem/base", bytes.NewReader([]byte(`{"personagem_base":"maga_agua"}`))))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sem auth: esperava 401, recebeu %d", w.Code)
	}

	casos := map[string]string{
		"corpo ilegível": `{"personagem_base":`,
		"vazio":          `{}`,
		"desconhecido":   `{"personagem_base":"dragao_secreto"}`,
	}
	for nome, corpo := range casos {
		t.Run(nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/api/personagem/base", bytes.NewReader([]byte(corpo)))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
			ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
			w := httptest.NewRecorder()
			h.HandleTrocarPersonagem(w, req.WithContext(ctx))
			if w.Code != http.StatusBadRequest {
				t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
			}
		})
	}
}

func TestHandleDesbloquearPersonagem_RecusaAntesDoBanco(t *testing.T) {
	h := &PersonagemHandler{}

	w := httptest.NewRecorder()
	h.HandleDesbloquearPersonagem(w, httptest.NewRequest(http.MethodPost, "/api/personagem/desbloquear", bytes.NewReader([]byte(`{"personagem_base":"maga_agua"}`))))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sem auth: esperava 401, recebeu %d", w.Code)
	}

	casos := map[string]string{
		"corpo ilegível": `{"personagem_base":`,
		"vazio":          `{}`,
		"desconhecido":   `{"personagem_base":"dragao_secreto"}`,
	}
	for nome, corpo := range casos {
		t.Run(nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/personagem/desbloquear", bytes.NewReader([]byte(corpo)))
			ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
			ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
			w := httptest.NewRecorder()
			h.HandleDesbloquearPersonagem(w, req.WithContext(ctx))
			if w.Code != http.StatusBadRequest {
				t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
			}
		})
	}
}

func TestCalcularElencoInfo(t *testing.T) {
	agora := time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)

	// Sem coluna desbloqueados (banco antigo): garante ao menos o personagem atual e sem espera.
	basico := calcularElencoInfo(linhaPersonagemBanco{PersonagemBase: "maga_agua"}, "maga_agua", agora)
	if len(basico.Desbloqueados) != 1 || basico.Desbloqueados[0] != "maga_agua" {
		t.Fatalf("fallback de desbloqueados falhou: %+v", basico.Desbloqueados)
	}
	if basico.ProximaTrocaEm != "" {
		t.Errorf("sem ultima_troca_em não deveria haver espera: %q", basico.ProximaTrocaEm)
	}

	// Filtra repetidos e desconhecidos, mantendo o atual presente.
	recente := agora.Add(-2 * time.Hour).Format(time.RFC3339)
	dentroDaEspera := calcularElencoInfo(linhaPersonagemBanco{
		PersonagemBase: "paladina_luz",
		Desbloqueados:  []string{"maga_agua", "maga_agua", "invalido"},
		UltimaTrocaEm:  &recente,
	}, "paladina_luz", agora)
	if len(dentroDaEspera.Desbloqueados) != 2 || dentroDaEspera.Desbloqueados[0] != "maga_agua" || dentroDaEspera.Desbloqueados[1] != "paladina_luz" {
		t.Fatalf("normalização inesperada: %+v", dentroDaEspera.Desbloqueados)
	}
	if dentroDaEspera.ProximaTrocaEm != "2026-11-19T10:00:00Z" {
		t.Errorf("esperava proxima_troca_em em 2026-11-19T10:00:00Z, veio %q", dentroDaEspera.ProximaTrocaEm)
	}

	// Passadas 24h, proxima_troca_em fica vazia.
	antiga := agora.Add(-25 * time.Hour).Format(time.RFC3339)
	liberado := calcularElencoInfo(linhaPersonagemBanco{
		PersonagemBase: "paladina_luz",
		Desbloqueados:  []string{"paladina_luz", "maga_agua"},
		UltimaTrocaEm:  &antiga,
	}, "paladina_luz", agora)
	if liberado.ProximaTrocaEm != "" {
		t.Errorf("após 24h proxima_troca_em deve sair vazia, veio %q", liberado.ProximaTrocaEm)
	}
}

func TestHandleDespertarPersonagem_RecusaPersonagemDesconhecido(t *testing.T) {
	h := &PersonagemHandler{}
	req := httptest.NewRequest(http.MethodPost, "/api/personagem", bytes.NewReader([]byte(`{"nome":"Ren","personagem_base":"dragao_secreto"}`)))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "00000000-0000-0000-0000-0000000000aa")
	ctx = context.WithValue(ctx, middleware.TokenKey, "token-de-teste")
	w := httptest.NewRecorder()
	h.HandleDespertarPersonagem(w, req.WithContext(ctx))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("esperava 400, recebeu %d (%s)", w.Code, w.Body.String())
	}
}
