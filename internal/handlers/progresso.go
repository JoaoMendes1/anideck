package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/supabase-community/postgrest-go"
)

// linhaProgresso é uma linha de episode_progress com o que o resumo usa.
// WatchedAt é ponteiro porque a marcação em lote de "Completo" grava NULL (sql/023).
type linhaProgresso struct {
	MalID         int     `json:"mal_id"`
	EpisodeNumber int     `json:"episode_number"`
	WatchedAt     *string `json:"watched_at"`
}

// resumoProgresso diz, por anime, até onde a pessoa chegou e quando marcou por último.
type resumoProgresso struct {
	MalID          int    `json:"mal_id"`
	UltimoEpisodio int    `json:"ultimo_episodio"`
	Marcados       int    `json:"marcados"`
	UltimoEm       string `json:"ultimo_em,omitempty"`
}

// limiteLinhasProgresso cobre com folga o histórico recente. As linhas vêm da mais
// recente para a mais antiga, então o corte só afeta animes parados há muito tempo.
const limiteLinhasProgresso = 1000

// resumirProgresso agrupa as marcações por anime, do marcado mais recentemente para o
// mais antigo. Anime só com marcação sem data (lote de "Completo") vai para o fim.
func resumirProgresso(linhas []linhaProgresso) []resumoProgresso {
	porAnime := make(map[int]*resumoProgresso)
	for _, l := range linhas {
		if l.MalID <= 0 || l.EpisodeNumber <= 0 {
			continue
		}
		r, ok := porAnime[l.MalID]
		if !ok {
			r = &resumoProgresso{MalID: l.MalID}
			porAnime[l.MalID] = r
		}
		r.Marcados++
		if l.EpisodeNumber > r.UltimoEpisodio {
			r.UltimoEpisodio = l.EpisodeNumber
		}
		// RFC 3339 com o mesmo fuso compara certo como texto; o Postgres devolve sempre UTC.
		if l.WatchedAt != nil && *l.WatchedAt > r.UltimoEm {
			r.UltimoEm = *l.WatchedAt
		}
	}

	lista := make([]resumoProgresso, 0, len(porAnime))
	for _, r := range porAnime {
		lista = append(lista, *r)
	}
	sort.Slice(lista, func(i, j int) bool {
		if lista[i].UltimoEm != lista[j].UltimoEm {
			return lista[i].UltimoEm > lista[j].UltimoEm
		}
		return lista[i].MalID < lista[j].MalID
	})
	return lista
}

// HandleResumoProgresso devolve o progresso de cada anime do usuário logado, para o
// bloco "continue de onde parou" da Início.
func (h *EntriesHandler) HandleResumoProgresso(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("episode_progress").
		Select("mal_id,episode_number,watched_at", "", false).
		Eq("user_id", userID).
		Order("watched_at", &postgrest.OrderOpts{Ascending: false, NullsFirst: false}).
		Limit(limiteLinhasProgresso, "").
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleResumoProgresso (user=%s): %v", userID, err)
		http.Error(w, "Erro ao buscar o progresso", http.StatusInternalServerError)
		return
	}

	var linhas []linhaProgresso
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[ERRO DB] HandleResumoProgresso: payload inesperado: %v", err)
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resumirProgresso(linhas)); err != nil {
		log.Printf("[ERRO] HandleResumoProgresso: falha ao serializar resposta: %v", err)
	}
}
