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

func TestCalcularXPEpisodio_BonusVitalidade(t *testing.T) {
	cfg := EconomiaPadrao()
	agora := time.Date(2026, 11, 8, 15, 0, 0, 0, time.UTC)

	// 1. HP abaixo do limiar (70%): sem bônus (25 XP)
	xp70, mot70 := CalcularXPEpisodioComVitalidade(1, 0, false, 70, cfg, agora)
	if xp70 != 25 || strings.Contains(mot70, "bônus Vitalidade") {
		t.Fatalf("HP 70: esperava 25 sem bônus, recebeu %d (%q)", xp70, mot70)
	}

	// 2. HP no limiar (80%): sem bônus (25 XP)
	xp80, mot80 := CalcularXPEpisodioComVitalidade(1, 0, false, 80, cfg, agora)
	if xp80 != 25 || strings.Contains(mot80, "bônus Vitalidade") {
		t.Fatalf("HP 80: esperava 25 sem bônus, recebeu %d (%q)", xp80, mot80)
	}

	// 3. HP cheio (100%): bônus de +10% (25 * 1.10 = 27.5 -> 28 XP)
	xp100, mot100 := CalcularXPEpisodioComVitalidade(1, 0, false, 100, cfg, agora)
	if xp100 != 28 || !strings.Contains(mot100, "bônus Vitalidade +10%") {
		t.Fatalf("HP 100: esperava 28 XP com 'bônus Vitalidade +10%%', recebeu %d (%q)", xp100, mot100)
	}

	// 4. Teto diário continua valendo depois do bônus
	xpTeto, motTeto := CalcularXPEpisodioComVitalidade(1, 175, false, 100, cfg, agora)
	if xpTeto != 5 || motTeto != "teto diário atingido" {
		t.Fatalf("teto após bônus: esperava 5 ('teto diário atingido'), recebeu %d (%q)", xpTeto, motTeto)
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
		Madrugadas:          12,
		CuradosVistos:       10,
		MaiorStreak:         20,
		CedoMarcados:        3,
		GenerosN3Mais:       1,
		NivelAtual:          24,
		MaratonasConcluidas: 2,
	}

	cartas := AvaliarInsignias(metricas, InsigniasPadrao())
	desbloqueadas := make(map[string]bool)
	for _, c := range cartas {
		if c.Desbloqueada {
			desbloqueadas[c.ID] = true
		}
	}

	if !desbloqueadas["coruja"] || !desbloqueadas["chama"] || !desbloqueadas["especialista"] || !desbloqueadas["maratonista_1"] {
		t.Fatalf("esperava coruja, chama, especialista e maratonista_1 desbloqueadas: %+v", desbloqueadas)
	}
	if desbloqueadas["arquivista"] || desbloqueadas["voz_guilda"] || desbloqueadas["maratonista_5"] {
		t.Fatalf("arquivista, voz_guilda e maratonista_5 deveriam continuar bloqueadas: %+v", desbloqueadas)
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

	req3 := httptest.NewRequest(http.MethodGet, "/api/guilda/extrato?pagina=2", nil)
	w3 := httptest.NewRecorder()
	h.HandleExtratoGuilda(w3, req3)
	if w3.Code != http.StatusUnauthorized {
		t.Fatalf("HandleExtratoGuilda sem auth: esperava 401, recebeu %d", w3.Code)
	}
}

func TestPaginacaoExtratoGuilda(t *testing.T) {
	casosPagina := []struct {
		entrada  string
		esperado int
	}{
		{"", 1},
		{"0", 1},
		{"-3", 1},
		{"abc", 1},
		{"1", 1},
		{" 3 ", 3},
	}
	for _, tc := range casosPagina {
		if got := normalizarPaginaExtrato(tc.entrada); got != tc.esperado {
			t.Fatalf("normalizarPaginaExtrato(%q) = %d, esperava %d", tc.entrada, got, tc.esperado)
		}
	}

	casosTotal := []struct {
		total     int
		porPagina int
		esperado  int
	}{
		{0, 20, 1},
		{1, 20, 1},
		{20, 20, 1},
		{21, 20, 2},
		{40, 20, 2},
		{45, 20, 3},
	}
	for _, tc := range casosTotal {
		if got := calcularTotalPaginasExtrato(tc.total, tc.porPagina); got != tc.esperado {
			t.Fatalf("calcularTotalPaginasExtrato(%d, %d) = %d, esperava %d", tc.total, tc.porPagina, got, tc.esperado)
		}
	}
}

func TestValidacoesAdminGuilda(t *testing.T) {
	ec := EconomiaPadrao()
	if _, msg := ValidarEconomiaGuilda(ec); msg != "" {
		t.Fatalf("EconomiaPadrao deveria ser válida, recebeu erro: %s", msg)
	}

	ecInvalida := ec
	ecInvalida.TetoDiario = 10 // menor que XPBaseEpisodio (25)
	if _, msg := ValidarEconomiaGuilda(ecInvalida); msg == "" {
		t.Fatal("esperava erro quando teto diário é menor que XP base")
	}

	ecEventoInvalido := ec
	ecEventoInvalido.EventoInicio = "2026-11-10T00:00:00Z"
	ecEventoInvalido.EventoFim = "2026-11-01T00:00:00Z"
	if _, msg := ValidarEconomiaGuilda(ecEventoInvalido); msg == "" {
		t.Fatal("esperava erro quando fim do evento é anterior ao início")
	}

	if _, msg := ValidarRanksGuilda(RanksPadrao()); msg != "" {
		t.Fatalf("RanksPadrao deveria ser válido, recebeu erro: %s", msg)
	}

	ranksSemNivel1 := []FaixaRank{
		{Rank: "F", Titulo: "Novato", NivelMinimo: 2},
		{Rank: "C", Titulo: "Prata", NivelMinimo: 10},
		{Rank: "S", Titulo: "Mestre", NivelMinimo: 30},
	}
	if _, msg := ValidarRanksGuilda(ranksSemNivel1); msg == "" {
		t.Fatal("esperava erro quando a primeira faixa não começa no nível 1")
	}

	if _, msg := ValidarInsigniasGuilda(InsigniasPadrao()); msg != "" {
		t.Fatalf("InsigniasPadrao deveria ser válido, recebeu erro: %s", msg)
	}

	insRegraDesconhecida := InsigniasPadrao()
	insRegraDesconhecida[0].Regra = "regra_inexistente"
	if _, msg := ValidarInsigniasGuilda(insRegraDesconhecida); msg == "" {
		t.Fatal("esperava erro para regra de insígnia desconhecida")
	}
}

func TestOuroDaLeitura(t *testing.T) {
	casos := []struct {
		nome  string
		dados string
		quer  *int
	}{
		{"com linha", `[{"ouro":1234}]`, intPtr(1234)},
		{"sem linha: ainda não lutou", `[]`, intPtr(0)},
		{"resposta inválida", `{"message":"erro"}`, nil},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			got := ouroDaLeitura([]byte(c.dados))
			if (got == nil) != (c.quer == nil) || (got != nil && *got != *c.quer) {
				t.Fatalf("ouroDaLeitura(%s) = %v, quer %v", c.dados, got, c.quer)
			}
		})
	}
}

func intPtr(v int) *int { return &v }

func TestCalcularXPEpisodioComFaixa_TresFaixas(t *testing.T) {
	cfg := EconomiaPadrao()
	agora := time.Date(2026, 11, 17, 15, 0, 0, 0, time.UTC)

	// 1. Maratona (>6 eps em 30 min) de obra antiga aplica ~30% (floor(25 * 0.30) = 7 XP).
	xpMaratona, motMaratona := CalcularXPEpisodioComFaixa(7, 80, false, true, false, 95, cfg, agora)
	if xpMaratona != 7 || motMaratona != "maratona · 30%" {
		t.Fatalf("maratona esperada 7 XP ('maratona · 30%%'), recebeu %d (%q)", xpMaratona, motMaratona)
	}

	// 2. Episódio que saiu há <=24h vence a penalidade de maratona e cai na faixa "Ao vivo".
	xpAoVivo24h, motAoVivo24h := CalcularXPEpisodioComFaixa(1, 0, true, true, true, 0, cfg, agora)
	if xpAoVivo24h != 35 || !strings.Contains(motAoVivo24h, "antes do próximo sair") {
		t.Fatalf("ao vivo <=24h deveria vencer maratona (35 XP), recebeu %d (%q)", xpAoVivo24h, motAoVivo24h)
	}

	// 3. Maratona perto do teto diário respeita o saldo restante (176/180 -> 4 XP).
	xpTeto, motTeto := CalcularXPEpisodioComFaixa(8, 176, false, true, false, 0, cfg, agora)
	if xpTeto != 4 || motTeto != "teto diário atingido" {
		t.Fatalf("corte de teto na maratona: esperava 4 XP ('teto diário atingido'), recebeu %d (%q)", xpTeto, motTeto)
	}
}

func TestValidarEconomiaGuilda_FaixasEPendente(t *testing.T) {
	base := EconomiaPadrao()

	invalido := base
	invalido.FatorMaratona = 1.5
	if _, msg := ValidarEconomiaGuilda(invalido); msg == "" {
		t.Fatal("esperava erro quando fator_maratona > 1")
	}

	invalido = base
	invalido.MaratonaLimiteEps = 0
	if _, msg := ValidarEconomiaGuilda(invalido); msg == "" {
		t.Fatal("esperava erro quando maratona_limite_eps <= 0")
	}

	invalido = base
	invalido.TetoPendenteDiario = base.TetoDiario + 1
	if _, msg := ValidarEconomiaGuilda(invalido); msg == "" {
		t.Fatal("esperava erro quando teto_pendente_diario supera o teto_diario")
	}
}
