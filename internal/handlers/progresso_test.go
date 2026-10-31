package handlers

import "testing"

func texto(s string) *string { return &s }

func TestResumirProgresso_OrdenaPeloMaisRecente(t *testing.T) {
	linhas := []linhaProgresso{
		{MalID: 1, EpisodeNumber: 1, WatchedAt: texto("2026-10-01T10:00:00Z")},
		{MalID: 1, EpisodeNumber: 3, WatchedAt: texto("2026-10-03T10:00:00Z")},
		{MalID: 2, EpisodeNumber: 5, WatchedAt: texto("2026-10-20T10:00:00Z")},
		{MalID: 3, EpisodeNumber: 12, WatchedAt: nil}, // marcado em lote, sem data
	}
	r := resumirProgresso(linhas)
	if len(r) != 3 {
		t.Fatalf("esperado 3 animes, recebido %d", len(r))
	}
	if r[0].MalID != 2 || r[1].MalID != 1 || r[2].MalID != 3 {
		t.Fatalf("ordem errada: %+v", r)
	}
	if r[1].UltimoEpisodio != 3 || r[1].Marcados != 2 || r[1].UltimoEm != "2026-10-03T10:00:00Z" {
		t.Errorf("resumo do anime 1 errado: %+v", r[1])
	}
	if r[2].UltimoEm != "" {
		t.Errorf("anime sem data não deveria ganhar data: %+v", r[2])
	}
}

func TestResumirProgresso_DescartaLinhaInvalida(t *testing.T) {
	r := resumirProgresso([]linhaProgresso{{MalID: 0, EpisodeNumber: 1}, {MalID: 5, EpisodeNumber: 0}})
	if len(r) != 0 {
		t.Fatalf("linhas com zero deveriam ser descartadas, recebido %+v", r)
	}
}

func TestResumirProgresso_Vazio(t *testing.T) {
	if r := resumirProgresso(nil); len(r) != 0 {
		t.Fatalf("esperado vazio, recebido %+v", r)
	}
}
