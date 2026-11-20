package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestMaratona_Intervalo(t *testing.T) {
	if IntervaloDaMaratona(24) != 24*60*9/10 {
		t.Errorf("24 min: %d", IntervaloDaMaratona(24))
	}
	if IntervaloDaMaratona(0) != IntervaloDaMaratona(24) {
		t.Error("sem duração, 24 min")
	}
	if IntervaloDaMaratona(3) != 5*60 || IntervaloDaMaratona(200) != 90*60*9/10 {
		t.Error("piso de 5 min e teto de 90 min")
	}
}

func TestMaratona_Faixas(t *testing.T) {
	// 12 episódios de 24 min = 4h48: Relâmpago até 7h12, Maratona até 12h, Fôlego até 24h.
	f := FaixasDaMaratona(12, 24)
	if len(f) != 3 || f[0].AteSeg != 7*3600+12*60 || f[1].AteSeg != 12*3600 || f[2].AteSeg != maratonaJanelaSeg {
		t.Fatalf("faixas de 12 × 24 min: %+v", f)
	}
	if f[0].Ouro != 360 || f[1].Ouro != 240 || f[2].Ouro != 144 || f[0].Bilhetes != 3 {
		t.Errorf("prêmios: %+v", f)
	}
	// O pacote cai junto em todas as moedas: mais rápido paga mais de tudo.
	if f[0].XP != 180 || f[1].XP != 120 || f[2].XP != 72 {
		t.Errorf("XP por faixa = %d/%d/%d, quer 180/120/72", f[0].XP, f[1].XP, f[2].XP)
	}
	if f[0].AniCoins != 120 || f[1].AniCoins != 84 || f[2].AniCoins != 48 {
		t.Errorf("AniCoins por faixa = %d/%d/%d, quer 120/84/48", f[0].AniCoins, f[1].AniCoins, f[2].AniCoins)
	}
	for k := 1; k < len(f); k++ {
		if f[k].Ouro >= f[k-1].Ouro || f[k].XP >= f[k-1].XP || f[k].AniCoins >= f[k-1].AniCoins || f[k].Bilhetes >= f[k-1].Bilhetes {
			t.Errorf("faixa %s não paga menos que %s em tudo", f[k].ID, f[k-1].ID)
		}
	}
	// 30 de 24 min = 12h: Maratona passaria de 24h e some.
	if g := FaixasDaMaratona(30, 24); len(g) != 2 || g[0].ID != "relampago" || g[1].ID != "folego" {
		t.Errorf("faixas de 30 episódios: %+v", g)
	}
}

func TestMaratona_QuemPode(t *testing.T) {
	casos := []struct {
		obra            string
		total, marcados int
		entrada, contem string
	}{
		{"Finished Airing", 12, 0, "Quero Assistir", ""},
		{"FINISHED", 12, 0, "Assistindo", ""},
		{"Releasing", 12, 0, "Assistindo", "terminaram"},
		{"Finished Airing", 5, 0, "Assistindo", "pelo menos 6"},
		{"Finished Airing", 31, 0, "Assistindo", "até 30"},
		{"Finished Airing", 12, 1, "Assistindo", "primeiro episódio"},
		{"Finished Airing", 12, 0, "", "Deck"},
		{"Finished Airing", 12, 0, "Completo", "completou"},
	}
	for _, c := range casos {
		m := MotivoSemMaratona(c.obra, c.total, c.marcados, c.entrada)
		if (c.contem == "" && m != "") || (c.contem != "" && !contem(m, c.contem)) {
			t.Errorf("%+v: motivo %q", c, m)
		}
	}
}

func contem(s, parte string) bool { return strings.Contains(s, parte) }

func TestMaratona_Prazos(t *testing.T) {
	inicio := time.Date(2026, 11, 21, 10, 0, 0, 0, time.UTC)
	m := MaratonaRPG{IniciadaEm: inicio, IntervaloSeg: 1296, Status: "ativa"}
	m.completarPrazos(inicio.Add(time.Hour))
	if !m.ProximoEm.Equal(inicio.Add(1296*time.Second)) || !m.PrazoEm.Equal(inicio.Add(24*time.Hour)) || m.Status != "ativa" {
		t.Errorf("prazos: %+v", m)
	}
	ultimo := inicio.Add(2 * time.Hour)
	m.UltimoEm = &ultimo
	m.completarPrazos(inicio.Add(25 * time.Hour))
	if !m.ProximoEm.Equal(ultimo.Add(1296*time.Second)) || m.Status != "falhou" || m.Motivo == nil || *m.Motivo != "tempo" {
		t.Errorf("depois de 24h falha por tempo: %+v", m)
	}
}

func TestMaratonasNaSemana(t *testing.T) {
	// Sexta, 20/11/2026, 20h de Brasília; a semana começou segunda, 16/11, 00:00.
	agora := time.Date(2026, 11, 20, 23, 0, 0, 0, time.UTC)
	em := func(s string) *time.Time { v, _ := time.Parse(time.RFC3339, s); return &v }
	ms := []MaratonaRPG{
		{Status: "concluida", TerminadaEm: em("2026-11-16T03:00:00Z")}, // segunda 00:00 de Brasília: conta
		{Status: "concluida", TerminadaEm: em("2026-11-16T02:59:00Z")}, // domingo 23:59: semana passada
		{Status: "falhou", TerminadaEm: em("2026-11-18T12:00:00Z")},    // perdida não conta
		{Status: "ativa"},
		{Status: "concluida", TerminadaEm: em("2026-11-20T10:00:00Z")},
	}
	if n := MaratonasNaSemana(ms, agora); n != 2 {
		t.Errorf("concluídas na semana = %d, quer 2", n)
	}
}

func TestMotivoDoLimiteSemanal(t *testing.T) {
	casos := []struct {
		feitas, limite int
		trecho         string
	}{
		{0, 0, "pausada"},
		{1, 2, ""},
		{2, 2, "as 2 maratonas"},
		{1, 1, "a maratona desta semana"},
	}
	for _, c := range casos {
		m := MotivoDoLimiteSemanal(c.feitas, c.limite)
		if (c.trecho == "") != (m == "") || !strings.Contains(m, c.trecho) {
			t.Errorf("MotivoDoLimiteSemanal(%d, %d) = %q, quer %q", c.feitas, c.limite, m, c.trecho)
		}
	}
}
