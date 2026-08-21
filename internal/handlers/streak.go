package handlers

import (
	"sort"
	"time"
)

// CalculateStreak recebe uma lista de datas (formato "2006-01-02", já sem duplicatas)
// e a data de "hoje" (injetada como parâmetro para facilitar testes), e retorna:
//   - currentStreak: sequência de dias consecutivos assistindo, contando pra trás a partir de hoje.
//     Só é considerada "ativa" se o usuário assistiu algo hoje ou ontem; caso contrário, é 0.
//   - longestStreak: a maior sequência de dias consecutivos já registrada, independente de estar ativa.
func CalculateStreak(dates []string, today time.Time) (currentStreak int, longestStreak int) {
	if len(dates) == 0 {
		return 0, 0
	}

	parsed := make([]time.Time, 0, len(dates))
	for _, d := range dates {
		t, err := time.Parse("2006-01-02", d)
		if err != nil {
			continue
		}
		parsed = append(parsed, t)
	}
	if len(parsed) == 0 {
		return 0, 0
	}

	sort.Slice(parsed, func(i, j int) bool { return parsed[i].Before(parsed[j]) })

	// Maior streak já registrado (histórico completo)
	longest := 1
	run := 1
	for i := 1; i < len(parsed); i++ {
		diffDays := int(parsed[i].Sub(parsed[i-1]).Hours() / 24)
		if diffDays == 1 {
			run++
		} else {
			run = 1
		}
		if run > longest {
			longest = run
		}
	}

	// Streak atual: só conta se a última data assistida foi hoje ou ontem
	todayDate := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)
	lastDate := parsed[len(parsed)-1]
	diffFromToday := int(todayDate.Sub(lastDate).Hours() / 24)

	if diffFromToday > 1 {
		return 0, longest
	}

	current := 1
	for i := len(parsed) - 1; i > 0; i-- {
		diffDays := int(parsed[i].Sub(parsed[i-1]).Hours() / 24)
		if diffDays == 1 {
			current++
		} else {
			break
		}
	}

	return current, longest
}
