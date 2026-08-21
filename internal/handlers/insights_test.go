package handlers

import (
	"reflect"
	"testing"
	"time"
)

func momento(dia, hora, minuto int) time.Time {
	return time.Date(2026, 8, dia, hora, minuto, 0, 0, time.UTC)
}

func TestAgruparSessoes(t *testing.T) {
	tests := []struct {
		name      string
		marcacoes []time.Time
		quero     []time.Time
	}{
		{
			name:      "sem marcações",
			marcacoes: nil,
			quero:     nil,
		},
		{
			name:      "uma marcação é uma sessão",
			marcacoes: []time.Time{momento(20, 21, 0)},
			quero:     []time.Time{momento(20, 21, 0)},
		},
		{
			// O caso que motivou a função: backlog inteiro cadastrado de uma vez.
			name: "quarenta marcações no mesmo minuto contam como uma sessão",
			marcacoes: []time.Time{
				momento(20, 23, 10), momento(20, 23, 10), momento(20, 23, 10),
				momento(20, 23, 11), momento(20, 23, 11),
			},
			quero: []time.Time{momento(20, 23, 10)},
		},
		{
			name: "maratona longa sem buraco continua sendo uma sessão",
			marcacoes: []time.Time{
				momento(20, 14, 0), momento(20, 14, 30), momento(20, 15, 10),
				momento(20, 16, 0), momento(20, 17, 30),
			},
			quero: []time.Time{momento(20, 14, 0)},
		},
		{
			name: "manhã e noite do mesmo dia são duas sessões",
			marcacoes: []time.Time{
				momento(20, 9, 0), momento(20, 9, 25),
				momento(20, 22, 0), momento(20, 22, 40),
			},
			quero: []time.Time{momento(20, 9, 0), momento(20, 22, 0)},
		},
		{
			name: "gap exatamente no limite não abre sessão nova",
			marcacoes: []time.Time{
				momento(20, 10, 0), momento(20, 12, 0),
			},
			quero: []time.Time{momento(20, 10, 0)},
		},
		{
			name: "um minuto além do limite abre sessão nova",
			marcacoes: []time.Time{
				momento(20, 10, 0), momento(20, 12, 1),
			},
			quero: []time.Time{momento(20, 10, 0), momento(20, 12, 1)},
		},
		{
			name: "marcações fora de ordem são normalizadas",
			marcacoes: []time.Time{
				momento(21, 20, 0), momento(20, 9, 0), momento(20, 9, 15),
			},
			quero: []time.Time{momento(20, 9, 0), momento(21, 20, 0)},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := AgruparSessoes(tt.marcacoes, gapDeSessaoPadrao); !reflect.DeepEqual(got, tt.quero) {
				t.Errorf("AgruparSessoes() = %v, queria %v", got, tt.quero)
			}
		})
	}
}

func TestVariacaoSemanal(t *testing.T) {
	tests := []struct {
		name       string
		semanas    []int
		queroPct   float64
		queroValid bool
	}{
		{
			name:       "histórico curto demais não compara",
			semanas:    []int{3, 5, 8},
			queroValid: false,
		},
		{
			name:       "dobrou o ritmo",
			semanas:    []int{5, 5, 5, 5, 10, 10, 10, 10},
			queroPct:   100,
			queroValid: true,
		},
		{
			name:       "caiu pela metade",
			semanas:    []int{10, 10, 10, 10, 5, 5, 5, 5},
			queroPct:   -50,
			queroValid: true,
		},
		{
			name:       "ritmo estável",
			semanas:    []int{7, 7, 7, 7, 7, 7, 7, 7},
			queroPct:   0,
			queroValid: true,
		},
		{
			name:       "período anterior zerado não vira percentual infinito",
			semanas:    []int{0, 0, 0, 0, 4, 4, 4, 4},
			queroValid: false,
		},
		{
			name:       "usa só as 8 semanas mais recentes",
			semanas:    []int{99, 99, 2, 2, 2, 2, 4, 4, 4, 4},
			queroPct:   100,
			queroValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pct, ok := VariacaoSemanal(tt.semanas)
			if ok != tt.queroValid {
				t.Fatalf("validade = %v, queria %v", ok, tt.queroValid)
			}
			if ok && pct != tt.queroPct {
				t.Errorf("variação = %.1f%%, queria %.1f%%", pct, tt.queroPct)
			}
		})
	}
}

func TestPerfilDeGosto(t *testing.T) {
	tests := []struct {
		name        string
		totais      []int
		queroPerfil string
	}{
		{name: "sem dados", totais: nil, queroPerfil: ""},
		{name: "poucos animes ainda não classifica", totais: []int{2, 1, 1}, queroPerfil: ""},
		{name: "menos de três rótulos não classifica", totais: []int{20, 15}, queroPerfil: ""},
		{name: "concentrado em dois gêneros", totais: []int{30, 20, 5, 3, 2}, queroPerfil: "especialista"},
		{name: "espalhado por muitos gêneros", totais: []int{6, 5, 5, 5, 5, 5, 5, 5, 5, 5}, queroPerfil: "explorador"},
		{name: "no meio do caminho", totais: []int{10, 8, 7, 7, 6, 6}, queroPerfil: "equilibrado"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			perfil, concentracao := PerfilDeGosto(tt.totais)
			if perfil != tt.queroPerfil {
				t.Errorf("perfil = %q (concentração %.1f%%), queria %q", perfil, concentracao, tt.queroPerfil)
			}
		})
	}
}

func TestTaxaDeConclusao(t *testing.T) {
	tests := []struct {
		name       string
		completos  int
		dropados   int
		queroTaxa  float64
		queroValid bool
	}{
		{name: "amostra pequena demais", completos: 1, dropados: 1, queroValid: false},
		{name: "termina sete de cada dez", completos: 7, dropados: 3, queroTaxa: 7, queroValid: true},
		{name: "nunca dropa", completos: 10, dropados: 0, queroTaxa: 10, queroValid: true},
		{name: "dropa tudo", completos: 0, dropados: 5, queroTaxa: 0, queroValid: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taxa, ok := TaxaDeConclusao(tt.completos, tt.dropados)
			if ok != tt.queroValid {
				t.Fatalf("validade = %v, queria %v", ok, tt.queroValid)
			}
			if ok && taxa != tt.queroTaxa {
				t.Errorf("taxa = %.1f, queria %.1f", taxa, tt.queroTaxa)
			}
		})
	}
}

func TestParseTimestamps(t *testing.T) {
	linhas := []map[string]interface{}{
		{"watched_at": "2026-08-20T23:10:00+00:00"},   // timestamptz
		{"watched_at": "2026-08-20T23:15:00.123456"},  // timestamp sem fuso
		{"watched_at": "2026-08-20T23:20:00"},         // sem fração de segundo
		{"watched_at": "data quebrada"},               // ignorada
		{"watched_at": 42},                            // tipo errado, ignorada
		{"outra_coluna": "2026-08-20T23:25:00+00:00"}, // sem a chave, ignorada
	}

	got := parseTimestamps(linhas)

	if len(got) != 3 {
		t.Fatalf("parseTimestamps devolveu %d marcações, queria 3: %v", len(got), got)
	}
	if !got[0].Equal(momento(20, 23, 10)) {
		t.Errorf("primeira marcação = %v, queria %v", got[0], momento(20, 23, 10))
	}
	if !got[2].Equal(momento(20, 23, 20)) {
		t.Errorf("terceira marcação = %v, queria %v", got[2], momento(20, 23, 20))
	}
}
