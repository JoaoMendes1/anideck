package handlers

import (
	"math/rand"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSortearBencoesRoguelite_DistintasETres(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	escolhas := SortearBencoesRoguelite(rng)
	if len(escolhas) != 3 {
		t.Fatalf("esperava 3 escolhas de bênção, veio %d", len(escolhas))
	}
	visto := map[string]bool{}
	for _, id := range escolhas {
		if visto[id] {
			t.Fatalf("bênção repetida no sorteio: %s", id)
		}
		visto[id] = true
		if _, ok := bencaoRoguelitePorID(id); !ok {
			t.Fatalf("bênção desconhecida sorteada: %s", id)
		}
	}
}

func TestAplicarBencaosNosHerois_AcumulaModificadores(t *testing.T) {
	base := CombatenteRPG{
		VidaInicial: 300,
		Atributos: AtributosRPG{
			Vida:        300,
			Ataque:      100,
			Defesa:      50,
			Magia:       80,
			Eter:        40,
			DanoCritico: 150,
		},
	}
	ajustados, ouroPct, sortePct := aplicarBencaosNosHerois([]CombatenteRPG{base}, []string{
		"furia_carmesim",
		"olhar_fortunado",
		"altar_sangue",
	})
	if ajustados[0].Atributos.Ataque != 143 {
		t.Fatalf("ataque esperado 143 (+18%% +25%%), veio %d", ajustados[0].Atributos.Ataque)
	}
	if ouroPct != 48 {
		t.Fatalf("ouroPct esperado 48, veio %d", ouroPct)
	}
	if sortePct != 12 {
		t.Fatalf("sortePct esperado 12, veio %d", sortePct)
	}
}

func TestSimularAndarRoguelite_SoloEEmEsquadrao(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	heroi1 := CombatenteRPG{
		Elemento: "fogo",
		Classe:   "guerreiro",
		Atributos: AtributosRPG{
			Vida: 450, Ataque: 90, Defesa: 40, Velocidade: 15, CriticoPorMil: 100, DanoCritico: 150,
		},
	}
	heroi2 := CombatenteRPG{
		Elemento: "agua",
		Classe:   "mago",
		Atributos: AtributosRPG{
			Vida: 380, Ataque: 75, Defesa: 30, Magia: 85, Eter: 50, Velocidade: 14, CriticoPorMil: 80, DanoCritico: 150,
		},
	}
	monstro := MonstroRPG{
		ID: "goblin_batedor", Nome: "Goblin Batedor", Nivel: 4, Vida: 120, Ataque: 18, Defesa: 6,
	}

	andarSolo, grupoSolo, vidasSolo, _, venceuSolo := simularAndarRoguelite([]CombatenteRPG{heroi1}, nil, []FichaDeGrupo{{Nome: "Kael", Personagem: "lanceiro_fogo", Nivel: 10}}, monstro, rng)
	if !venceuSolo || grupoSolo != nil || vidasSolo[0] <= 0 || andarSolo.Monstro.ID != "goblin_batedor" {
		t.Fatalf("andar solo inválido: venceu=%v grupo=%v vida=%v", venceuSolo, grupoSolo, vidasSolo)
	}

	fichas := []FichaDeGrupo{
		{Nome: "Kael", Personagem: "lanceiro_fogo", Nivel: 10},
		{Nome: "Mizuki", Personagem: "maga_agua", Nivel: 10},
	}
	andarGrupo, grupoRes, vidasGrupo, _, venceuGrupo := simularAndarRoguelite([]CombatenteRPG{heroi1, heroi2}, []bool{false, false}, fichas, monstro, rng)
	if !venceuGrupo || grupoRes == nil || len(vidasGrupo) != 2 || len(andarGrupo.Resultado.Turnos) == 0 {
		t.Fatalf("andar em esquadrão inválido: venceu=%v grupo=%v vidas=%v", venceuGrupo, grupoRes, vidasGrupo)
	}
}

func TestHandleRoguelite_RequerAutenticacaoEValidacao(t *testing.T) {
	h := &RPGHandler{}

	reqGet := httptest.NewRequest(http.MethodGet, "/api/rpg/masmorras/roguelite", nil)
	recGet := httptest.NewRecorder()
	h.HandleGetRoguelite(recGet, reqGet)
	if recGet.Code != http.StatusUnauthorized {
		t.Fatalf("GET sem sessão deveria responder 401, veio %d", recGet.Code)
	}

	reqIni := httptest.NewRequest(http.MethodPost, "/api/rpg/masmorras/roguelite/iniciar", strings.NewReader(`{"masmorra_id":"inexistente"}`))
	recIni := httptest.NewRecorder()
	h.HandleIniciarRoguelite(recIni, reqIni)
	if recIni.Code != http.StatusUnauthorized {
		t.Fatalf("POST iniciar sem sessão deveria responder 401, veio %d", recIni.Code)
	}

	reqAgir := httptest.NewRequest(http.MethodPost, "/api/rpg/masmorras/roguelite/agir", strings.NewReader(`{}`))
	recAgir := httptest.NewRecorder()
	h.HandleAgirRoguelite(recAgir, reqAgir)
	if recAgir.Code != http.StatusUnauthorized {
		t.Fatalf("POST agir sem sessão deveria responder 401, veio %d", recAgir.Code)
	}
}
