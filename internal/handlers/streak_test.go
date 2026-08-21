package handlers

import (
	"testing"
	"time"
)

func TestCalculateStreak(t *testing.T) {
	today := time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC) // quinta-feira, 20/08/2026

	tests := []struct {
		name        string
		dates       []string
		wantCurrent int
		wantLongest int
	}{
		{
			name:        "sem dados",
			dates:       []string{},
			wantCurrent: 0,
			wantLongest: 0,
		},
		{
			name:        "streak ativo terminando hoje",
			dates:       []string{"2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"},
			wantCurrent: 4,
			wantLongest: 4,
		},
		{
			name:        "streak ativo terminando ontem (ainda conta como ativo)",
			dates:       []string{"2026-08-17", "2026-08-18", "2026-08-19"},
			wantCurrent: 3,
			wantLongest: 3,
		},
		{
			name:        "streak quebrado (última atividade há 3 dias)",
			dates:       []string{"2026-08-10", "2026-08-11", "2026-08-17"},
			wantCurrent: 0,
			wantLongest: 2,
		},
		{
			name:        "streak atual menor que o recorde histórico",
			dates:       []string{"2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-19", "2026-08-20"},
			wantCurrent: 2,
			wantLongest: 4,
		},
		{
			name:        "único dia, hoje",
			dates:       []string{"2026-08-20"},
			wantCurrent: 1,
			wantLongest: 1,
		},
		{
			name:        "data inválida é ignorada sem quebrar o cálculo",
			dates:       []string{"2026-08-19", "data-invalida", "2026-08-20"},
			wantCurrent: 2,
			wantLongest: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotCurrent, gotLongest := CalculateStreak(tt.dates, today)
			if gotCurrent != tt.wantCurrent {
				t.Errorf("currentStreak = %d, esperado %d", gotCurrent, tt.wantCurrent)
			}
			if gotLongest != tt.wantLongest {
				t.Errorf("longestStreak = %d, esperado %d", gotLongest, tt.wantLongest)
			}
		})
	}
}
