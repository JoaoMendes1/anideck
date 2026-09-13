package handlers

import (
	"encoding/json"
	"math"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

const tolerancia = 1e-9

func TestCalcularRankingBayesiano_SemPopularity(t *testing.T) {
	// Caminho de emergência: anime_metadata_cache não guarda popularity, então
	// todo anime chega com Popularity 0 e m sai zerado.
	animes := []anilist.Anime{
		{MalID: 1, Title: "A", Score: 8.0},
		{MalID: 2, Title: "B", Score: 9.0},
	}

	C, m, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{}, pesoVotoComunitarioPadrao)
	if !ok {
		t.Fatal("esperava ok=true com dois animes com nota")
	}
	if m != 0 {
		t.Fatalf("esperava m=0 sem popularity, veio %v", m)
	}
	if math.Abs(C-8.5) > tolerancia {
		t.Errorf("C: esperava 8.5, veio %v", C)
	}

	for _, a := range animes {
		if math.IsNaN(a.BayesianScore) {
			t.Fatalf("%s saiu com BayesianScore NaN", a.Title)
		}
	}

	// Sem suavização, a ordem tem que ser a das notas cruas.
	if animes[0].Title != "B" || animes[1].Title != "A" {
		t.Errorf("ordem errada: %s, %s", animes[0].Title, animes[1].Title)
	}
	if math.Abs(animes[0].BayesianScore-9.0) > tolerancia {
		t.Errorf("B: esperava 9.0, veio %v", animes[0].BayesianScore)
	}
}

func TestCalcularRankingBayesiano_SemPopularityComVotoLocal(t *testing.T) {
	// m=0 mas vLocal > 0: o divisor não zera, e o peso comunitário domina sozinho.
	animes := []anilist.Anime{{MalID: 1, Title: "A", Score: 8.0}}
	votos := map[int]communityScoreRow{
		1: {MalID: 1, LocalVotes: 2, LocalScore: 9.0},
	}

	_, m, ok := calcularRankingBayesiano(animes, votos, pesoVotoComunitarioPadrao)
	if !ok {
		t.Fatal("esperava ok=true")
	}
	if m != 0 {
		t.Fatalf("esperava m=0, veio %v", m)
	}
	if math.IsNaN(animes[0].BayesianScore) {
		t.Fatal("BayesianScore saiu NaN")
	}
	if math.Abs(animes[0].BayesianScore-9.0) > tolerancia {
		t.Errorf("esperava 9.0 (só o voto local pesa), veio %v", animes[0].BayesianScore)
	}
}

func TestCalcularRankingBayesiano_CaminhoNormal(t *testing.T) {
	// Regressão: com popularity presente, a guarda não pode ter mudado nada.
	// C = (9+7)/2 = 8 ; m = (1000+100)/2 = 550
	animes := []anilist.Anime{
		{MalID: 1, Title: "A", Score: 9.0, Popularity: 1000},
		{MalID: 2, Title: "B", Score: 7.0, Popularity: 100},
	}

	C, m, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{}, pesoVotoComunitarioPadrao)
	if !ok {
		t.Fatal("esperava ok=true")
	}
	if math.Abs(C-8.0) > tolerancia || math.Abs(m-550.0) > tolerancia {
		t.Fatalf("C/m errados: C=%v m=%v", C, m)
	}

	esperado := map[string]float64{
		"A": (1000.0/1550.0)*9.0 + (550.0/1550.0)*8.0,
		"B": (100.0/650.0)*7.0 + (550.0/650.0)*8.0,
	}
	for _, a := range animes {
		if math.Abs(a.BayesianScore-esperado[a.Title]) > tolerancia {
			t.Errorf("%s: esperava %v, veio %v", a.Title, esperado[a.Title], a.BayesianScore)
		}
	}

	if animes[0].Title != "A" || animes[0].CurrentRank != 1 {
		t.Errorf("A deveria ser rank 1, veio %s rank %d", animes[0].Title, animes[0].CurrentRank)
	}
}

func TestCalcularRankingBayesiano_SemNotaNenhuma(t *testing.T) {
	animes := []anilist.Anime{{MalID: 1, Title: "A", Score: 0}}
	if _, _, ok := calcularRankingBayesiano(animes, map[int]communityScoreRow{}, pesoVotoComunitarioPadrao); ok {
		t.Error("esperava ok=false quando nenhum anime tem nota")
	}
}

// TestMontarLinhasCache_ChavesIdenticas trava o defeito que gerava PGRST102: o
// PostgREST monta um único INSERT com as colunas do primeiro objeto do lote, e
// recusa a lista inteira se algum objeto seguinte tiver chaves diferentes.
func TestMontarLinhasCache_ChavesIdenticas(t *testing.T) {
	animes := []anilist.Anime{
		{MalID: 21, Title: "One Piece"},      // tem voto local
		{MalID: 199, Title: "Spirited Away"}, // não tem
	}
	votos := map[int]communityScoreRow{
		21: {MalID: 21, LocalVotes: 3, LocalScore: 8.4},
	}

	linhas := montarLinhasCache(animes, votos, "2026-09-12T00:00:00Z")
	if len(linhas) != 2 {
		t.Fatalf("esperava 2 linhas, veio %d", len(linhas))
	}

	chavesDe := func(l currentCacheRow) []string {
		bruto, err := json.Marshal(l)
		if err != nil {
			t.Fatalf("falha ao serializar: %v", err)
		}
		var m map[string]json.RawMessage
		if err := json.Unmarshal(bruto, &m); err != nil {
			t.Fatalf("falha ao ler o JSON gerado: %v", err)
		}
		out := make([]string, 0, len(m))
		for k := range m {
			out = append(out, k)
		}
		sort.Strings(out)
		return out
	}

	comVoto, semVoto := chavesDe(linhas[0]), chavesDe(linhas[1])
	if !reflect.DeepEqual(comVoto, semVoto) {
		t.Errorf("conjuntos de chaves divergem — o PostgREST devolveria PGRST102\n com voto: %v\n sem voto: %v", comVoto, semVoto)
	}
}

// TestMontarLinhasCache_SemVotoGravaNulo garante que ausência de voto vira NULL e
// nunca 0. Nota zero é um número válido e contaminaria o cálculo do peso local.
func TestMontarLinhasCache_SemVotoGravaNulo(t *testing.T) {
	linhas := montarLinhasCache(
		[]anilist.Anime{{MalID: 199, Title: "Spirited Away"}},
		map[int]communityScoreRow{},
		"2026-09-12T00:00:00Z",
	)
	if len(linhas) != 1 {
		t.Fatalf("esperava 1 linha, veio %d", len(linhas))
	}
	if linhas[0].LocalScore != nil {
		t.Errorf("LocalScore deveria ser nil, veio %v", *linhas[0].LocalScore)
	}

	bruto, _ := json.Marshal(linhas[0])
	if !strings.Contains(string(bruto), `"local_score":null`) {
		t.Errorf("esperava local_score explícito como null, veio: %s", bruto)
	}
}

// TestMontarLinhasCache_NumeracaoContigua cobre o motivo de position ser contador
// próprio: mal_id inválido é pulado sem abrir buraco na chave primária.
func TestMontarLinhasCache_NumeracaoContigua(t *testing.T) {
	animes := []anilist.Anime{
		{MalID: 21},
		{MalID: 0}, // inválido, item 16 do PITFALLS
		{MalID: 199},
	}

	linhas := montarLinhasCache(animes, nil, "2026-09-12T00:00:00Z")
	if len(linhas) != 2 {
		t.Fatalf("esperava 2 linhas, veio %d", len(linhas))
	}
	if linhas[0].Position != 1 || linhas[1].Position != 2 {
		t.Errorf("posições não contíguas: %d e %d", linhas[0].Position, linhas[1].Position)
	}
}

// TestInterpretarPeso cobre o parse do valor de app_settings, que é TEXT e por isso
// aceita qualquer coisa. Peso <= 0 anularia o vLocal e tiraria o voto da comunidade
// do ranking inteiro, sem erro nenhum na tela.
func TestInterpretarPeso(t *testing.T) {
	casos := []struct {
		nome     string
		valor    string
		esperado float64
	}{
		{"valor válido", "500", 500.0},
		{"decimal", "350.5", 350.5},
		{"com espaços", "  420  ", 420.0},
		{"vazio", "", pesoVotoComunitarioPadrao},
		{"texto", "muito", pesoVotoComunitarioPadrao},
		{"zero anularia o voto local", "0", pesoVotoComunitarioPadrao},
		{"negativo", "-100", pesoVotoComunitarioPadrao},
	}

	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			if got := interpretarPeso(c.valor); got != c.esperado {
				t.Errorf("esperava %v, veio %v", c.esperado, got)
			}
		})
	}
}