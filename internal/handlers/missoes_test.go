package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCatalogosDeMissoes_IdsUnicosERecompensas(t *testing.T) {
	ids := map[string]bool{}
	for _, cat := range [][]ItemCatalogoMissao{CatalogoMissoesDiarias(), CatalogoMissoesSemanais()} {
		for _, m := range cat {
			if ids[m.ID] {
				t.Errorf("ID repetido entre os catálogos: %s", m.ID)
			}
			ids[m.ID] = true
			if m.Meta <= 0 || m.Recompensa <= 0 {
				t.Errorf("%s com meta ou recompensa inválida", m.ID)
			}
			socialSemXP := m.Tipo == MissaoReagirEpisodio || m.Tipo == MissaoComentarEpisodio
			if socialSemXP && m.XP != 0 {
				t.Errorf("%s é social simples e não pode dar XP", m.ID)
			}
			if !socialSemXP && m.XP <= 0 {
				t.Errorf("%s deveria dar XP", m.ID)
			}
			if m.Tipo == MissaoAvaliarAnime && m.XP != 25 {
				t.Errorf("%s deveria dar 25 XP, tem %d", m.ID, m.XP)
			}
			if m.Tipo == MissaoAvaliarEpisodio && m.XP != 15 {
				t.Errorf("%s deveria dar 15 XP, tem %d", m.ID, m.XP)
			}
		}
	}
	if len(CatalogoMissoesDiarias())%3 != 0 || len(CatalogoMissoesSemanais())%3 != 0 {
		t.Error("Os catálogos devem ter múltiplo de 3 missões para o rodízio fechar o ciclo")
	}
}

func idsDasMissoes(ms []ItemCatalogoMissao) map[string]bool {
	r := map[string]bool{}
	for _, m := range ms {
		r[m.ID] = true
	}
	return r
}

func TestSortearMissoesDoDia_NuncaRepeteOntemESempreTemDuasDeAssistir(t *testing.T) {
	cat := CatalogoMissoesDiarias()
	base := time.Date(2026, 1, 1, 15, 0, 0, 0, fusoGuilda)
	for u := 0; u < 1000; u++ {
		user := fmt.Sprintf("user-%d", u)
		var ontem map[string]bool
		for d := 0; d < 60; d++ {
			hoje := SortearMissoesDoDia(cat, user, base.AddDate(0, 0, d))
			if len(hoje) != 3 {
				t.Fatalf("%s dia %d: %d missões", user, d, len(hoje))
			}
			principais := 0
			for _, m := range hoje {
				if m.Principal {
					principais++
				}
				if ontem[m.ID] {
					t.Fatalf("%s dia %d repetiu %s de ontem", user, d, m.ID)
				}
			}
			if principais < 2 {
				t.Fatalf("%s dia %d: só %d missões de assistir", user, d, principais)
			}
			if len(idsDasMissoes(hoje)) != 3 {
				t.Fatalf("%s dia %d: missão repetida no mesmo dia", user, d)
			}
			ontem = idsDasMissoes(hoje)
		}
	}
}

func TestSortearMissoesDaSemana_NuncaRepeteESempreTemUmaDeTerminar(t *testing.T) {
	cat := CatalogoMissoesSemanais()
	base := time.Date(2026, 1, 5, 12, 0, 0, 0, fusoGuilda)
	for u := 0; u < 1000; u++ {
		user := fmt.Sprintf("user-%d", u)
		var anterior map[string]bool
		for s := 0; s < 40; s++ {
			semana := SortearMissoesDaSemana(cat, user, base.AddDate(0, 0, 7*s))
			terminar := 0
			for _, m := range semana {
				if m.Principal {
					terminar++
				}
				if anterior[m.ID] {
					t.Fatalf("%s semana %d repetiu %s", user, s, m.ID)
				}
			}
			if terminar < 1 {
				t.Fatalf("%s semana %d sem missão de terminar anime", user, s)
			}
			anterior = idsDasMissoes(semana)
		}
	}
}

func TestSortearMissoes_DeterministicoNoMesmoDiaEDiferePorUsuario(t *testing.T) {
	cat := CatalogoMissoesDiarias()
	manha := time.Date(2026, 11, 17, 8, 0, 0, 0, fusoGuilda)
	noite := time.Date(2026, 11, 17, 23, 30, 0, 0, fusoGuilda)
	a, b := SortearMissoesDoDia(cat, "u1", manha), SortearMissoesDoDia(cat, "u1", noite)
	for i := range a {
		if a[i].ID != b[i].ID {
			t.Fatal("O mesmo dia deve dar as mesmas missões")
		}
	}
	diferentes := 0
	for u := 0; u < 20; u++ {
		s := SortearMissoesDoDia(cat, fmt.Sprintf("x%d", u), manha)
		if s[0].ID != a[0].ID || s[1].ID != a[1].ID || s[2].ID != a[2].ID {
			diferentes++
		}
	}
	if diferentes == 0 {
		t.Error("Usuários diferentes deveriam receber sorteios diferentes")
	}
}

func TestGeneroDoPeriodo_TrocaACadaPeriodo(t *testing.T) {
	vistos := map[string]bool{}
	for d := 0; d < len(generosDasMissoes); d++ {
		g, prox := GeneroDoPeriodo("u", "dia", d), GeneroDoPeriodo("u", "dia", d+1)
		if g == prox {
			t.Fatalf("Gênero repetiu em dias seguidos: %s", g)
		}
		vistos[g] = true
	}
	if len(vistos) != len(generosDasMissoes) {
		t.Errorf("Em %d dias deveriam passar todos os gêneros, passaram %d", len(generosDasMissoes), len(vistos))
	}
	m := comGenero(CatalogoMissoesDiarias()[3], "Fantasia")
	if m.Titulo != "Dia de Fantasia" || m.Descricao != "Assista a 2 episódios de animes de Fantasia" {
		t.Errorf("Marcador não trocado: %q / %q", m.Titulo, m.Descricao)
	}
}

func TestPeriodos_SemanaComecaNaSegundaDeBrasilia(t *testing.T) {
	// Segunda 00:30 em Brasília já é a semana nova, mesmo perto da virada.
	seg := time.Date(2026, 11, 16, 0, 30, 0, 0, fusoGuilda)
	dom := time.Date(2026, 11, 15, 23, 30, 0, 0, fusoGuilda)
	if indiceDaSemana(seg) != indiceDaSemana(dom)+1 {
		t.Error("Domingo à noite e segunda de madrugada devem cair em semanas seguidas")
	}
	inicio := inicioDaSemanaBrasilia(time.Date(2026, 11, 19, 10, 0, 0, 0, fusoGuilda)).In(fusoGuilda)
	if inicio.Weekday() != time.Monday || inicio.Day() != 16 || inicio.Hour() != 0 {
		t.Errorf("Início da semana errado: %v", inicio)
	}
	if indiceDoDia(seg) != indiceDoDia(dom)+1 {
		t.Error("O dia vira à meia-noite de Brasília")
	}
}

func atividadeDeTeste() (AtividadeMissoes, time.Time, time.Time) {
	agora := time.Date(2026, 11, 18, 21, 0, 0, 0, fusoGuilda) // quarta
	dia := inicioDoDiaBrasilia(agora)
	semana := inicioDaSemanaBrasilia(agora)
	ontem := agora.AddDate(0, 0, -1)
	a := AtividadeMissoes{
		AnoAtual: 2026,
		Episodios: []EpisodioDaMissao{
			{MalID: 10, Numero: 1, Em: agora.Add(-3 * time.Hour)},
			{MalID: 10, Numero: 2, Em: agora.Add(-2 * time.Hour)},
			{MalID: 10, Numero: 3, Em: agora.Add(-1 * time.Hour)},
			{MalID: 20, Numero: 7, Em: agora.Add(-1 * time.Hour), Lancamento: true},
			{MalID: 30, Numero: 12, Em: ontem},
		},
		Concluidas: []ObraConcluida{
			{MalID: 30, Em: ontem},
			{MalID: 99, Em: agora}, // terminado sem episódio visto na semana: não conta
		},
		ReacoesHoje: 1, ComentariosHoje: 3,
		Animes: map[int]InfoAnimeMissao{
			10: {Generos: []string{"Fantasia", "Ação"}, Ano: 2026},
			20: {Generos: []string{"Comédia"}, Ano: 2026, DaTemporada: true},
			30: {Generos: []string{"Fantasia"}, Ano: 2026, DaTemporada: true},
			99: {Generos: []string{"Fantasia"}, Ano: 2026, DaTemporada: true},
		},
	}
	return a, dia, semana
}

func TestAvaliarMissao_CadaTipo(t *testing.T) {
	a, dia, semana := atividadeDeTeste()
	casos := []struct {
		tipo   TipoMissao
		meta   int
		genero string
		inicio time.Time
		quer   int
	}{
		{MissaoEpisodios, 10, "", dia, 4},
		{MissaoEpisodios, 3, "", dia, 3}, // limitado à meta
		{MissaoEpisodios, 30, "", semana, 5},
		{MissaoEpisodiosGenero, 10, "Fantasia", dia, 3},
		{MissaoEpisodiosGenero, 10, "fantasia", semana, 4},
		{MissaoAnimesDistintos, 10, "", dia, 2},
		{MissaoComecarAnime, 10, "", dia, 1},
		{MissaoLancamento, 10, "", dia, 1},
		{MissaoFoco, 10, "", dia, 3},
		{MissaoDiasAtivos, 10, "", semana, 2},
		{MissaoCompletarObra, 10, "", dia, 0},
		{MissaoCompletarObra, 10, "", semana, 1},
		{MissaoCompletarDoAno, 10, "", semana, 1},
		{MissaoCompletarTemporada, 10, "", semana, 1},
		{MissaoCompletarGenero, 10, "Fantasia", semana, 1},
		{MissaoCompletarGenero, 10, "Romance", semana, 0},
		{MissaoReagirEpisodio, 2, "", dia, 1},
		{MissaoComentarEpisodio, 1, "", dia, 1},
	}
	for _, c := range casos {
		m := ItemCatalogoMissao{ID: string(c.tipo), Tipo: c.tipo, Meta: c.meta}
		if got := AvaliarMissao(m, c.genero, c.inicio, a); got != c.quer {
			t.Errorf("%s (meta %d, gênero %q): quer %d, veio %d", c.tipo, c.meta, c.genero, c.quer, got)
		}
	}
}

func TestAvaliarMissao_AnoDeOutroAnoNaoConta(t *testing.T) {
	a, _, semana := atividadeDeTeste()
	a.Animes[30] = InfoAnimeMissao{Ano: 2019}
	m := ItemCatalogoMissao{Tipo: MissaoCompletarDoAno, Meta: 1}
	if AvaliarMissao(m, "", semana, a) != 0 {
		t.Error("Anime de 2019 não conclui a missão do ano")
	}
	a.AnoAtual = 0
	a.Animes[30] = InfoAnimeMissao{Ano: 0}
	if AvaliarMissao(m, "", semana, a) != 0 {
		t.Error("Ano ausente (0) não pode casar com ano atual ausente")
	}
}

func TestMissoes_ValidacoesAuth(t *testing.T) {
	handler := &MissoesHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/missoes/hoje", nil)
	rec := httptest.NewRecorder()
	handler.HandleGetMissoesHoje(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Esperado 401, recebido %d", rec.Code)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/missoes/ep_hoje/resgatar", nil)
	rec = httptest.NewRecorder()
	handler.HandleResgatarMissao(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Esperado 401, recebido %d", rec.Code)
	}
}

func TestMissoes_SerializacaoJSON(t *testing.T) {
	bytes, err := json.Marshal(MissaoUsuario{ID: "ep_hoje", Tipo: MissaoEpisodios, Periodo: "dia", Meta: 1, RecompensaXP: 5, Icone: "Play"})
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]interface{}
	_ = json.Unmarshal(bytes, &m)
	for _, campo := range []string{"progresso", "meta", "recompensa_cristais", "recompensa_xp", "periodo", "icone"} {
		if _, ok := m[campo]; !ok {
			t.Errorf("Campo %q obrigatório no JSON", campo)
		}
	}
}

func TestExtratoGuilda_XPSemEpisodioTemTitulo(t *testing.T) {
	itens := montarItensLedgerGuilda([]linhaLedgerBanco{{MalID: 0, EpisodeNumber: 42, XPEarned: 10, Reason: "Missão do dia: Foco Total", EarnedAt: "2026-11-17T10:00:00Z"}}, map[int]string{}, time.Now())
	if itens[0].TituloAnime != tituloXPSemEpisodio {
		t.Errorf("Título esperado %q, veio %q", tituloXPSemEpisodio, itens[0].TituloAnime)
	}
}

func TestEvidenciasDaMissao_CapturaAcoesExatas(t *testing.T) {
	a, dia, semana := atividadeDeTeste()
	a.ReacoesHojeLista = []ReacaoDaMissao{{MalID: 10, Numero: 1, Reacao: "amei", Em: dia.Add(time.Hour)}}
	a.ComentariosHojeLista = []ComentarioDaMissao{{ID: "c1", MalID: 10, Numero: 2, Em: dia.Add(2 * time.Hour)}}

	mFoco := missaoSorteada{
		ItemCatalogoMissao: ItemCatalogoMissao{ID: "foco", Tipo: MissaoFoco, Meta: 3},
		periodo:            "dia",
		inicio:             dia,
	}
	det := evidenciasDaMissao(mFoco, a)
	evs := det["evidencias"].([]map[string]interface{})
	if len(evs) != 3 {
		t.Fatalf("Foco esperava 3 evidências do anime 10, veio %d", len(evs))
	}
	for _, ev := range evs {
		if ev["tipo_acao"] != "episodio" || ev["mal_id"] != 10 {
			t.Errorf("Evidência inesperada para foco: %+v", ev)
		}
	}

	mCom := missaoSorteada{
		ItemCatalogoMissao: ItemCatalogoMissao{ID: "comentario", Tipo: MissaoComentarEpisodio, Meta: 1},
		periodo:            "dia",
		inicio:             dia,
	}
	evsCom := evidenciasDaMissao(mCom, a)["evidencias"].([]map[string]interface{})
	if len(evsCom) != 1 || evsCom[0]["comment_id"] != "c1" {
		t.Errorf("Evidência de comentário incorreta: %+v", evsCom)
	}

	mCarta := missaoSorteada{
		ItemCatalogoMissao: ItemCatalogoMissao{ID: "genero_semana", Tipo: MissaoCompletarGenero, Meta: 1},
		periodo:            "semana",
		genero:             "Fantasia",
		inicio:             semana,
	}
	evsCarta := evidenciasDaMissao(mCarta, a)["evidencias"].([]map[string]interface{})
	if len(evsCarta) != 1 || evsCarta[0]["tipo_acao"] != "carta" || evsCarta[0]["mal_id"] != 30 {
		t.Errorf("Evidência de carta incorreta: %+v", evsCarta)
	}

	a.ReviewsAnimeHojeLista = []ReviewDaMissao{{ID: "rev-1", MalID: 30, Em: dia.Add(2 * time.Hour)}}
	mRev := missaoSorteada{
		ItemCatalogoMissao: ItemCatalogoMissao{ID: "avaliar_obra", Tipo: MissaoAvaliarAnime, Meta: 1},
		periodo:            "dia",
		inicio:             dia,
	}
	evsRev := evidenciasDaMissao(mRev, a)["evidencias"].([]map[string]interface{})
	if len(evsRev) != 1 || evsRev[0]["tipo_acao"] != "review_anime" || evsRev[0]["review_id"] != "rev-1" {
		t.Errorf("Evidência de avaliação da obra incorreta: %+v", evsRev)
	}

	a.AvaliacoesEpHojeLista = []ComentarioDaMissao{{ID: "c-long", MalID: 10, Numero: 3, Em: dia.Add(3 * time.Hour)}}
	mAvEp := missaoSorteada{
		ItemCatalogoMissao: ItemCatalogoMissao{ID: "avaliar_episodio", Tipo: MissaoAvaliarEpisodio, Meta: 1},
		periodo:            "dia",
		inicio:             dia,
	}
	evsAvEp := evidenciasDaMissao(mAvEp, a)["evidencias"].([]map[string]interface{})
	if len(evsAvEp) != 1 || evsAvEp[0]["tipo_acao"] != "comentario" || evsAvEp[0]["comment_id"] != "c-long" {
		t.Errorf("Evidência de avaliação de episódio incorreta: %+v", evsAvEp)
	}
}

func TestAjustesMissoes_ValidacaoNormalizacaoEAplicacao(t *testing.T) {
	if msg := ValidarAjustesMissoes(map[string]AjusteMissao{"nao_existe": {Recompensa: 10, XP: 5}}); msg == "" {
		t.Error("ID desconhecido deveria ser recusado")
	}
	if msg := ValidarAjustesMissoes(map[string]AjusteMissao{"ep_hoje": {Recompensa: -1, XP: 5}}); msg == "" {
		t.Error("AniCoins negativos deveriam ser recusados")
	}
	if msg := ValidarAjustesMissoes(map[string]AjusteMissao{"ep_hoje": {Recompensa: 10, XP: 6000}}); msg == "" {
		t.Error("XP acima de 5000 deveria ser recusado")
	}

	bruto := map[string]AjusteMissao{
		"ep_hoje":  {Recompensa: 25, XP: 12}, // alterado
		"maratona": {Recompensa: 20, XP: 10}, // idêntico ao padrão: sai na normalização
	}
	if msg := ValidarAjustesMissoes(bruto); msg != "" {
		t.Fatalf("payload válido recusado: %s", msg)
	}
	norm := NormalizarAjustesMissoes(bruto)
	if len(norm) != 1 || norm["ep_hoje"].Recompensa != 25 || norm["ep_hoje"].XP != 12 {
		t.Fatalf("normalização inesperada: %+v", norm)
	}

	aplicadas := AplicarAjustesMissoes(CatalogoMissoesDiarias(), norm)
	if aplicadas[0].ID != "ep_hoje" || aplicadas[0].Recompensa != 25 || aplicadas[0].XP != 12 {
		t.Errorf("ajuste não aplicado no catálogo: %+v", aplicadas[0])
	}
	if aplicadas[1].ID != "maratona" || aplicadas[1].Recompensa != 20 || aplicadas[1].XP != 10 {
		t.Errorf("missão sem ajuste perdeu padrão: %+v", aplicadas[1])
	}
}

func TestAdminMissoesRecompensas_SemAuthRetorna401(t *testing.T) {
	h := &MissoesHandler{}
	rec := httptest.NewRecorder()
	h.HandleGetAdminMissoesRecompensas(rec, httptest.NewRequest(http.MethodGet, "/api/admin/missoes/recompensas", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("GET sem auth esperava 401, veio %d", rec.Code)
	}

	rec2 := httptest.NewRecorder()
	h.HandleSaveAdminMissoesRecompensas(rec2, httptest.NewRequest(http.MethodPut, "/api/admin/missoes/recompensas", nil))
	if rec2.Code != http.StatusUnauthorized {
		t.Fatalf("PUT sem auth esperava 401, veio %d", rec2.Code)
	}
}
