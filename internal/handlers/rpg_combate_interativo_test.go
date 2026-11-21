package handlers

import (
	mathrand "math/rand"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSortearIntencaoInimigo_Valida(t *testing.T) {
	rng := mathrand.New(mathrand.NewSource(9))
	intencao := SortearIntencaoInimigo(1, 50, 30, 20, rng)
	if intencao.Tipo == "" || intencao.Titulo == "" || intencao.DanoEstimado <= 0 {
		t.Fatalf("intenção inválida: %+v", intencao)
	}
}

func TestResolverRodadaInterativa_QuebraGuardaReacaoEVitoria(t *testing.T) {
	rng := mathrand.New(mathrand.NewSource(15))
	s := &sessaoCombateInterativo{
		ID:           "teste",
		UserID:       "user-1",
		Modo:         "expedicao",
		AlvoID:       "goblin_batedor",
		AlvoNome:     "Goblin Batedor",
		AlvoElemento: "vento",
		AlvoNivel:    5,
		AlvoAtaque:   18,
		AlvoDefesa:   8,
		Herois: []CombatenteRPG{
			{
				Elemento: "fogo",
				Atributos: AtributosRPG{
					Vida: 300, Ataque: 70, Defesa: 25, Magia: 40, Eter: 50, CriticoPorMil: 100, DanoCritico: 150,
				},
			},
			{
				Elemento: "agua",
				Atributos: AtributosRPG{
					Vida: 260, Ataque: 60, Defesa: 20, Magia: 45, Eter: 50, CriticoPorMil: 100, DanoCritico: 150,
				},
			},
		},
		HeroisInfo: []HeroiCombateInterativo{
			{Base: "lanceiro_fogo", Nome: "Haruto", Elemento: "fogo", VidaAtual: 300, VidaMaxima: 300, EterAtual: 50, EterMaximo: 50},
			{Base: "maga_agua", Nome: "Mizuki", Elemento: "agua", VidaAtual: 260, VidaMaxima: 260, EterAtual: 50, EterMaximo: 50},
		},
		InimigoVida:    300,
		InimigoVidaMax: 300,
		Intencao: IntencaoInimigo{
			Tipo: "postura_defensiva", Titulo: "Postura Defensiva", DanoEstimado: 8,
		},
	}

	turnos, _ := ResolverRodadaInterativa(s, acaoInterativaGolpe, rng)
	if len(turnos) == 0 {
		t.Fatalf("esperava turnos gerados na rodada")
	}
	achouReacao := false
	for _, tr := range turnos {
		if tr.Reacao != "" {
			achouReacao = true
		}
	}
	if !achouReacao {
		t.Fatalf("esquadrão Fogo + Água deveria disparar reação elemental quando o monstro sobrevive ao 1º golpe ou no mesmo turno")
	}
	if s.Rodada != 1 {
		t.Fatalf("esperava rodada 1, veio %d", s.Rodada)
	}
}

func TestResolverRodadaInterativa_MasmorraAvancaAndar(t *testing.T) {
	rng := mathrand.New(mathrand.NewSource(22))
	s := &sessaoCombateInterativo{
		ID:           "masmorra-1",
		UserID:       "user-1",
		Modo:         "masmorra",
		AlvoID:       "bosque_sombrio",
		AlvoNome:     "Goblin",
		AlvoElemento: "neutro",
		AlvoNivel:    3,
		AlvoAtaque:   12,
		AlvoDefesa:   4,
		Herois: []CombatenteRPG{
			{Atributos: AtributosRPG{Vida: 300, Ataque: 120, Defesa: 20, Eter: 40, DanoCritico: 150}},
		},
		HeroisInfo: []HeroiCombateInterativo{
			{Base: "espadachim_eter", Nome: "Kael", VidaAtual: 200, VidaMaxima: 300, EterAtual: 40, EterMaximo: 40},
		},
		MonstroAtual:   MonstroRPG{ID: "goblin", Nome: "Goblin", Vida: 40},
		Andares:        []MonstroRPG{{ID: "goblin", Nome: "Goblin", Vida: 40}, {ID: "lobo", Nome: "Lobo", Vida: 150, Ataque: 20, Defesa: 8}},
		AndarIdx:       0,
		InimigoVida:    40,
		InimigoVidaMax: 40,
		Intencao:       IntencaoInimigo{Tipo: "investida", Titulo: "Investida"},
	}

	_, msg := ResolverRodadaInterativa(s, acaoInterativaRuptura, rng)
	if s.Encerrado {
		t.Fatalf("não deveria encerrar ao passar apenas do 1º andar")
	}
	if s.AndarIdx != 1 || s.InimigoVida != 150 {
		t.Fatalf("esperava avançar ao 2º andar com vida 150, veio idx=%d vida=%d", s.AndarIdx, s.InimigoVida)
	}
	if !strings.Contains(msg, "25% de Vida") {
		t.Fatalf("esperava aviso de cura entre andares, veio %q", msg)
	}
}

func TestHandleCombateInterativo_RequerAuth(t *testing.T) {
	h := &RPGHandler{}
	req := httptest.NewRequest(http.MethodPost, "/api/rpg/combate-interativo/iniciar", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	h.HandleIniciarCombateInterativo(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem sessão, veio %d", rec.Code)
	}

	reqAgir := httptest.NewRequest(http.MethodPost, "/api/rpg/combate-interativo/agir", strings.NewReader(`{}`))
	recAgir := httptest.NewRecorder()
	h.HandleAgirCombateInterativo(recAgir, reqAgir)
	if recAgir.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 no agir sem sessão, veio %d", recAgir.Code)
	}
}
