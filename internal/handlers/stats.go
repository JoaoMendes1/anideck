// Consultar as views de forma segura usando o token do usuário
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type StatsHandler struct{}

func (h *StatsHandler) HandleGetUserStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)

	if !ok || !tokenOk || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	queryView := func(viewName string) []map[string]interface{} {
		var result []map[string]interface{}
		data, _, err := dbClient.From(viewName).Select("*", "exact", false).Execute()
		if err == nil {
			_ = json.Unmarshal(data, &result)
		} else {
			log.Printf("[ERRO DB] HandleGetUserStats (%s): %v", viewName, err)
		}
		return result
	}

	statsData := queryView("view_user_stats")
	genresData := queryView("view_user_genre_affinity")
	activityData := queryView("view_user_activity")
	ratingData := queryView("view_user_rating_distribution")
	yearData := queryView("view_user_year_distribution")
	watchHoursData := queryView("view_user_watch_hours")
	longestAnimeData := queryView("view_user_longest_anime")
	topRatedData := queryView("view_user_top_rated")
	fastestBingeData := queryView("view_user_fastest_binge")

	// Streak: busca as datas distintas assistidas e calcula em Go
	watchDates := queryView("view_user_watch_dates")
	dates := make([]string, 0, len(watchDates))
	for _, row := range watchDates {
		if dia, ok := row["dia"].(string); ok {
			dates = append(dates, dia)
		}
	}
	currentStreak, longestStreak := CalculateStreak(dates, time.Now())

	// Recordes: cada view devolve 0 ou 1 linha
	var longestAnime, topRated, fastestBinge map[string]interface{}
	if len(longestAnimeData) > 0 {
		longestAnime = longestAnimeData[0]
	}
	if len(topRatedData) > 0 {
		topRated = topRatedData[0]
	}
	if len(fastestBingeData) > 0 {
		fastestBinge = fastestBingeData[0]
	}

	response := map[string]interface{}{
		"overview":    statsData,
		"genres":      genresData,
		"activity":    activityData,
		"ratings":     ratingData,
		"years":       yearData,
		"watch_hours": watchHoursData,
		"streak": map[string]int{
			"current": currentStreak,
			"longest": longestStreak,
		},
		"records": map[string]interface{}{
			"longest_anime": longestAnime,
			"top_rated":     topRated,
			"fastest_binge": fastestBinge,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}