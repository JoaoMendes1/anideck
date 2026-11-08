package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCalcularXPEpisodio_CaminhosPrincipais(t *testing.T) {
	cfg := EconomiaPadrao()
	agora := time.Date(2026, 11, 8, 15, 0, 0, 0, time.UTC)

	xp1, mot1 := CalcularXPEpisodio(1, 0, false, cfg, agora)
	if xp1 != 25 || mot1 != "episódio base · 100%" {
		t.Fatalf("1º episódio: esperava 25 ('episódio base · 100%%'), recebeu %d (%q)", xp1, mot1)
	}

	xp3, mot3 := CalcularXPEpisodio(3, 50, false, cfg, agora)
	if xp3 != 18 || mot3 != "retorno decrescente · 75%" {
		t.Fatalf("3º episódio: esperava 18 ('retorno decrescente · 75%%'), recebeu %d (%q)", xp3, mot3)
	}

	xp6, mot6 := CalcularXPEpisodio(6, 104, false, cfg, agora)
	if xp6 != 12 || mot6 != "retorno decrescente · 50%" {
		t.Fatalf("6º episódio: esperava 12 ('retorno decrescente · 50%%'), recebeu %d (%q)", xp6, mot6)
	}

	xpCedo, motCedo := CalcularXPEpisodio(1, 0, true, cfg, agora)
	if xpCedo != 35 || motCedo != "antes do próximo sair · +10" {
		t.Fatalf("episódio cedo: esperava 35 ('antes do próximo sair · +10'), recebeu %d (%q)", xpCedo, motCedo)
	}
}

func TestCalcularXPEpisodio_TetoDiarioEEvento(t *testing.T) {
	cfg := EconomiaPadrao()
	cfg.EventoInicio = "2026-11-01T00:00:00Z"
	cfg.EventoFim = "2026-11-10T00:00:00Z"
	cfg.EventoMultiplicador = 2.0
	agora := time.Date(2026, 11, 8, 15, 0, 0, 0, time.UTC)

	// Episódio recente durante janela ativa dobra (25 + 10) * 2 = 70 XP.
	xpDobrado, motDobrado := CalcularXPEpisodio(1, 0, true, cfg, agora)
	if xpDobrado != 70 || !strings.Contains(motDobrado, "evento XP") {
		t.Fatalf("evento ativo: esperava 70 com sufixo de evento, recebeu %d (%q)", xpDobrado, motDobrado)
	}

	// Quase no teto (176/180): corta em 4 XP.
	xpCorte, motCorte := CalcularXPEpisodio(12, 176, false, cfg, agora)
	if xpCorte != 4 || motCorte != "teto diário atingido" {
		t.Fatalf("corte no teto: esperava 4 ('teto diário atingido'), recebeu %d (%q)", xpCorte, motCorte)
	}

	// Teto já batido (180/180): devolve 0 XP.
	xpZero, motZero := CalcularXPEpisodio(13, 180, true, cfg, agora)
	if xpZero != 0 || motZero != "teto diário atingido" {
		t.Fatalf("após teto: esperava 0 ('teto diário atingido'), recebeu %d (%q)", xpZero, motZero)
	}

	// Kill switch desligado.
	cfg.Ativo = false
	xpOff, motOff := CalcularXPEpisodio(1, 0, false, cfg, agora)
	if xpOff != 0 || motOff != "gamificação pausada" {
		t.Fatalf("kill switch: esperava 0 ('gamificação pausada'), recebeu %d (%q)", xpOff, motOff)
	}
}

func TestCalcularNivelERank(t *testing.T) {
	ranks := RanksPadrao()

	nv1 := CalcularNivelERank(0, ranks)
	if nv1.Nivel != 1 || nv1.Rank != "F" || nv1.XPParaProximo != 100 || nv1.ProximoRank != "E" {
		t.Fatalf("nível inicial inesperado: %+v", nv1)
	}

	// Nível 5 começa em 100 + 130 + 160 + 190 = 580 XP (Rank E).
	nv5 := CalcularNivelERank(600, ranks)
	if nv5.Nivel != 5 || nv5.Rank != "E" || nv5.XPNoNivel != 20 {
		t.Fatalf("esperava Nv 5 / Rank E com 20 XP no nível, recebeu %+v", nv5)
	}

	// XP alto deve alcançar SS sem próximo rank.
	nvSS := CalcularNivelERank(120000, ranks)
	if nvSS.Rank != "SS" || nvSS.ProximoRank != "" {
		t.Fatalf("esperava Rank SS no topo, recebeu %+v", nvSS)
	}
}

func TestCalcularEspecialistasGenero(t *testing.T) {
	entrada := []AfinidadeGeneroInput{
		{Genre: "Fantasia", TotalWatched: 16, Tier: "genero"},
		{Genre: "Isekai", TotalWatched: 9, Tier: "demografia"},
		{Genre: "Magia", TotalWatched: 30, Tier: "tag_tematica"}, // deve ser ignorada
		{Genre: "Orfao", TotalWatched: 10, Tier: "ignorado"},     // deve ser ignorada
	}

	esp := CalcularEspecialistasGenero(entrada)
	if len(esp) != 2 {
		t.Fatalf("esperava 2 gêneros competitivos, recebeu %d", len(esp))
	}
	if esp[0].Genero != "Fantasia" || esp[0].Nivel != 3 || esp[0].PesoVoto != 1.6 {
		t.Fatalf("Fantasia deveria ser N3 (1.6x), recebeu %+v", esp[0])
	}
	if esp[1].Genero != "Isekai" || esp[1].Nivel != 2 || esp[1].PesoVoto != 1.3 {
		t.Fatalf("Isekai deveria ser N2 (1.3x), recebeu %+v", esp[1])
	}
}

func TestAvaliarInsignias(t *testing.T) {
	metricas := MetricasUsuarioGuilda{
		Madrugadas:    12,
		CuradosVistos: 10,
		MaiorStreak:   20,
		CedoMarcados:  3,
		GenerosN3Mais: 1,
		NivelAtual:    24,
	}

	cartas := AvaliarInsignias(metricas, InsigniasPadrao())
	desbloqueadas := make(map[string]bool)
	for _, c := range cartas {
		if c.Desbloqueada {
			desbloqueadas[c.ID] = true
		}
	}

	if !desbloqueadas["coruja"] || !desbloqueadas["chama"] || !desbloqueadas["especialista"] {
		t.Fatalf("esperava coruja, chama e especialista desbloqueadas: %+v", desbloqueadas)
	}
	if desbloqueadas["arquivista"] || desbloqueadas["voz_guilda"] {
		t.Fatalf("arquivista e voz_guilda deveriam continuar bloqueadas: %+v", desbloqueadas)
	}
}

func TestGuildaHandlers_SemAutenticacao(t *testing.T) {
	h := &GuildaHandler{}

	req1 := httptest.NewRequest(http.MethodGet, "/api/guilda/resumo", nil)
	w1 := httptest.NewRecorder()
	h.HandleResumoGuilda(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("HandleResumoGuilda sem auth: esperava 401, recebeu %d", w1.Code)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/guilda", nil)
	w2 := httptest.NewRecorder()
	h.HandleGetGuilda(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("HandleGetGuilda sem auth: esperava 401, recebeu %d", w2.Code)
	}
}
