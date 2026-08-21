// Re-sincronização em lote do cache de metadados.
//
// Por que isso existe: o anime_metadata_cache só é atualizado quando o usuário salva uma
// entrada. Quando um campo novo passa a ser buscado na AniList (foi o caso das tags e do
// ano de estreia), todos os animes já cadastrados continuam com o cache antigo — e as
// Estatísticas que dependem desses campos aparecem vazias. Este endpoint reprocessa o
// deck inteiro de uma vez, sem precisar reabrir e re-salvar anime por anime.
package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type MetadataHandler struct {
	AniListClient anilist.Service
}

func (h *MetadataHandler) HandleResyncMetadata(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").
		Select("mal_id", "exact", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleResyncMetadata (user=%s): %v", userID, err)
		http.Error(w, "Erro ao listar animes do deck", http.StatusInternalServerError)
		return
	}

	var linhas []struct {
		MalID int `json:"mal_id"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[ERRO DB] HandleResyncMetadata: payload inesperado: %v", err)
		http.Error(w, "Erro ao ler animes do deck", http.StatusInternalServerError)
		return
	}

	malIDs := idsUnicos(linhas)

	// Roda em background: com o rate limit da AniList (1,5 req/s) um deck grande levaria
	// minutos, e a requisição HTTP estouraria o timeout antes de terminar.
	go func() {
		ctx := context.Background()
		sucesso := 0
		for _, malID := range malIDs {
			if err := syncMetadataCache(ctx, h.AniListClient, malID, token); err != nil {
				log.Printf("[RESYNC METADATA] %v", err)
				continue
			}
			sucesso++
		}
		log.Printf("[RESYNC METADATA] Concluído: %d de %d animes sincronizados", sucesso, len(malIDs))
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "em andamento",
		"total":  len(malIDs),
	})
}

// idsUnicos elimina mal_ids repetidos preservando a ordem original.
// Repetição acontece de verdade: o mesmo anime pode aparecer em mais de uma entrada,
// e re-sincronizar duas vezes é gastar cota da AniList à toa.
func idsUnicos(linhas []struct {
	MalID int `json:"mal_id"`
}) []int {
	vistos := make(map[int]bool, len(linhas))
	ids := make([]int, 0, len(linhas))
	for _, l := range linhas {
		if l.MalID <= 0 || vistos[l.MalID] {
			continue
		}
		vistos[l.MalID] = true
		ids = append(ids, l.MalID)
	}
	return ids
}
