package handlers

import (
	mathrand "math/rand"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEscalarAtributo_RetornoDecrescente(t *testing.T) {
	if got := EscalarAtributo(40, 60); got != 40 {
		t.Errorf("abaixo do limiar não deveria reduzir: veio %d", got)
	}
	if got := EscalarAtributo(60, 60); got != 60 {
		t.Errorf("no limiar exato não deveria reduzir: veio %d", got)
	}
	if got := EscalarAtributo(100, 60); got >= 100 || got <= 60 {
		t.Errorf("acima do limiar deveria aplicar retorno decrescente entre 61 e 99: veio %d", got)
	}
	semExcesso := DerivarAtributos(60, PrimariosBase(60).Somar(PrimariosRPG{Forca: 60, Constituicao: 58}))
	comExcesso := DerivarAtributos(60, PrimariosBase(60).Somar(PrimariosRPG{Forca: 118}))
	if comExcesso.Ataque >= semExcesso.Ataque+116 {
		t.Errorf("concentrar 118 pontos num único atributo deveria sofrer retorno decrescente: %d vs %d", comExcesso.Ataque, semExcesso.Ataque)
	}
}

func TestProbabilidadesDinamicas(t *testing.T) {
	cAlto := ChanceCriticoDinamica(150, 220, 60, 40, 15)
	cBaixo := ChanceCriticoDinamica(150, 50, 220, 10, 40)
	if cAlto <= 150 || cBaixo >= 150 {
		t.Errorf("crítico dinâmico deveria responder à vantagem e desvantagem: alto=%d baixo=%d", cAlto, cBaixo)
	}
	if minC := ChanceCriticoDinamica(0, 1, 999, 1, 999); minC != 20 {
		t.Errorf("piso de crítico esperado 20, veio %d", minC)
	}
	if maxC := ChanceCriticoDinamica(900, 999, 1, 999, 1); maxC != 850 {
		t.Errorf("teto de crítico esperado 850, veio %d", maxC)
	}

	if g := ChanceEsquivaDinamica(1000, 5, 99); g != 1000 {
		t.Errorf("esquiva garantida (1000) deve ser preservada: veio %d", g)
	}
	eRapido := ChanceEsquivaDinamica(100, 40, 15)
	eLento := ChanceEsquivaDinamica(100, 10, 40)
	if eRapido <= 100 || eLento >= 100 {
		t.Errorf("esquiva dinâmica deveria acompanhar diferença de velocidade: rápido=%d lento=%d", eRapido, eLento)
	}
	if z := ChanceEsquivaDinamica(0, 10, 10); z != 0 {
		t.Errorf("sem esquiva base e velocidades iguais deve ser 0, veio %d", z)
	}

	if b := ChanceBloqueioDinamica(80, 100); b <= 0 {
		t.Errorf("defesa alta contra ataque deveria gerar chance de bloqueio: veio %d", b)
	}
	if bZero := ChanceBloqueioDinamica(20, 200); bZero != 0 {
		t.Errorf("defesa muito baixa não deveria bloquear: veio %d", bZero)
	}
}

func TestResistenciaFuriaContraAtaqueESobrecarga(t *testing.T) {
	if r := ResistenciaElementalPorMil(100, 80); r <= 0 || r > 160 {
		t.Errorf("resistência fora da faixa esperada: %d", r)
	}
	if BonusFuria(100, 100) != 1.0 || BonusFuria(40, 100) <= 1.0 || BonusFuria(20, 100) <= BonusFuria(40, 100) {
		t.Error("bônus de fúria deveria escalar conforme Vida cai")
	}
	if d := DanoContraAtaque(100, 50); d <= 0 {
		t.Errorf("contra-ataque deveria causar dano positivo: %d", d)
	}

	gastoAlto, multAlto := CustoEterComSobrecarga(50, 16, 60)
	if gastoAlto <= 16 || multAlto <= 1.0 {
		t.Errorf("com Éter e Magia altos deveria ativar sobrecarga: gasto=%d mult=%v", gastoAlto, multAlto)
	}
	gastoBaixo, multBaixo := CustoEterComSobrecarga(16, 16, 60)
	if gastoBaixo != 16 || multBaixo != 1.0 {
		t.Errorf("com Éter justo não deveria ativar sobrecarga: gasto=%d mult=%v", gastoBaixo, multBaixo)
	}
}

func TestCalcularIniciativaATB(t *testing.T) {
	atb := CalcularIniciativaATB(45, 15)
	if atb.Primeiro != "jogador" || len(atb.ProximaOrdem) != 6 {
		t.Fatalf("ATB inválido: %+v", atb)
	}
	jog := 0
	for _, quem := range atb.ProximaOrdem {
		if quem == "jogador" {
			jog++
		}
	}
	if jog <= 3 {
		t.Errorf("jogador com 3x mais velocidade deveria agir mais vezes nos 6 próximos turnos: %+v", atb.ProximaOrdem)
	}
}

func TestResolverRodadaInterativa_ContraAtaqueERegenEter(t *testing.T) {
	rng := mathrand.New(mathrand.NewSource(7))
	s := &sessaoCombateInterativo{
		ID:           "contra-1",
		UserID:       "user-1",
		Modo:         "expedicao",
		AlvoID:       "goblin_batedor",
		AlvoNome:     "Goblin",
		AlvoElemento: "terra",
		AlvoNivel:    5,
		AlvoAtaque:   20,
		AlvoDefesa:   10,
		Herois: []CombatenteRPG{
			{
				Elemento: "fogo",
				Atributos: AtributosRPG{
					Vida: 300, Ataque: 80, Defesa: 30, Magia: 20, Eter: 40, Velocidade: 25, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 100,
				},
			},
		},
		HeroisInfo: []HeroiCombateInterativo{
			{Base: "lanceiro_fogo", Nome: "Haruto", Elemento: "fogo", VidaAtual: 300, VidaMaxima: 300, EterAtual: 10, EterMaximo: 40},
		},
		InimigoVida:    400,
		InimigoVidaMax: 400,
		Intencao:       IntencaoInimigo{Tipo: "golpe_pesado", Titulo: "Golpe Pesado", DanoEstimado: 15},
	}

	turnos, _ := ResolverRodadaInterativa(s, acaoInterativaDefender, rng)
	achouContra := false
	for _, tr := range turnos {
		if tr.ContraAtaque > 0 {
			achouContra = true
		}
	}
	if !achouContra {
		t.Fatalf("defender deveria gerar contra-ataque ao enfrentar golpe inimigo: %+v", turnos)
	}
	if s.HeroisInfo[0].EterAtual <= 18 {
		t.Errorf("esperava +8 de defesa e +3 de regeneração por rodada no Éter, ficou %d", s.HeroisInfo[0].EterAtual)
	}
}

func TestHandleGetATB_SemAutenticacao(t *testing.T) {
	rec := httptest.NewRecorder()
	(&RPGHandler{}).HandleGetATB(rec, httptest.NewRequest(http.MethodGet, "/api/rpg/atb", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperava 401 sem sessão, veio %d", rec.Code)
	}
}
