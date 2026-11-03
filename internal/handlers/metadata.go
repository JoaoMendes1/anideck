// Re-sincronização em lote do cache de metadados.
//
// Por que isso existe: o anime_metadata_cache só é atualizado quando o usuário salva uma
// entrada. Quando um campo novo passa a ser buscado na AniList (foi o caso das tags e do
// ano de estreia), todos os animes já cadastrados continuam com o cache antigo — e as
// Estatísticas que dependem desses campos aparecem vazias. Este endpoint reprocessa tudo
// de uma vez, sem precisar reabrir e re-salvar anime por anime.
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

const janelaResyncRecente = 24 * time.Hour

// linhaMalID é o formato devolvido pelas duas consultas abaixo. Declarado uma vez porque
// o idsUnicos recebe exatamente este tipo, e repetir a struct anônima em cada chamada faria
// o Go tratá-las como tipos diferentes.
type linhaMalID struct {
	MalID int `json:"mal_id"`
}

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

	// [1] O deck do admin.
	dataDeck, _, err := dbClient.From("media_entries").
		Select("mal_id", "exact", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleResyncMetadata deck (user=%s): %v", userID, err)
		http.Error(w, "Erro ao listar animes do deck", http.StatusInternalServerError)
		return
	}

	var doDeck []linhaMalID
	if err := json.Unmarshal(dataDeck, &doDeck); err != nil {
		log.Printf("[ERRO DB] HandleResyncMetadata deck: payload inesperado: %v", err)
		http.Error(w, "Erro ao ler animes do deck", http.StatusInternalServerError)
		return
	}

	// [2] O catálogo curado.
	var daCuradoria []linhaMalID
	dataCurada, _, errCurada := dbClient.From("curated_animes").
		Select("mal_id", "exact", false).
		Execute()
	if errCurada != nil {
		log.Printf("[RESYNC METADATA] Falha ao listar a curadoria, seguindo só com o deck: %v", errCurada)
	} else if err := json.Unmarshal(dataCurada, &daCuradoria); err != nil {
		log.Printf("[RESYNC METADATA] Curadoria com payload inesperado, seguindo só com o deck: %v", err)
		daCuradoria = nil
	}

	todosIDs := idsUnicos(append(append([]linhaMalID{}, doDeck...), daCuradoria...))

	// [3] Filtra quem já foi sincronizado nas últimas 24h (a menos que ?force=true seja enviado).
	forcar := r.URL.Query().Get("force") == "true"
	recentes := map[int]bool{}
	if !forcar {
		if dataCache, _, errCache := dbClient.From("anime_metadata_cache").
			Select("mal_id,last_updated", "exact", false).
			Execute(); errCache == nil {
			var linhasCache []struct {
				MalID       int    `json:"mal_id"`
				LastUpdated string `json:"last_updated"`
			}
			if json.Unmarshal(dataCache, &linhasCache) == nil {
				limite := time.Now().UTC().Add(-janelaResyncRecente)
				for _, c := range linhasCache {
					if t, errT := time.Parse(time.RFC3339, c.LastUpdated); errT == nil && t.After(limite) {
						recentes[c.MalID] = true
					}
				}
			}
		}
	}

	malIDs := make([]int, 0, len(todosIDs))
	for _, id := range todosIDs {
		if !recentes[id] {
			malIDs = append(malIDs, id)
		}
	}
	pulados := len(todosIDs) - len(malIDs)

	go func() {
		ctx := context.Background()
		sucesso := 0
		for _, malID := range malIDs {
			if err := syncMetadataCacheServico(ctx, h.AniListClient, malID); err != nil {
				log.Printf("[RESYNC METADATA] %v", err)
				continue
			}
			sucesso++
		}
		log.Printf("[RESYNC METADATA] Concluído: %d de %d animes sincronizados (%d pulados por já estarem em dia)",
			sucesso, len(malIDs), pulados)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "em andamento",
		"total":     len(malIDs),
		"pulados":   pulados,
		"deck":      len(doDeck),
		"curadoria": len(daCuradoria),
	})
}

// idsUnicos elimina mal_ids repetidos preservando a ordem original.
// Repetição acontece de verdade: o mesmo anime pode estar no deck e na curadoria, ou
// aparecer em mais de uma entrada — e re-sincronizar duas vezes é gastar cota à toa.
func idsUnicos(linhas []linhaMalID) []int {
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

// syncMetadataCacheServico faz o mesmo que o syncMetadataCache, mas grava com a service
// role em vez do token do usuário.
//
// POR QUE EXISTE: o token do Supabase expira em cerca de uma hora, e um resync do catálogo
// inteiro passa disso com folga quando a AniList está lenta. Na execução de 12/09/2026, 34
// dos 114 animes foram buscados com sucesso e perdidos na gravação com (PGRST303) JWT
// expired — trabalho de background não pode depender do token de uma requisição que já
// terminou.
//
// É o caso de exceção descrito no comentário do ServiceRoleClient em internal/database:
// worker sem usuário, sem JWT para anexar. Seguro aqui porque anime_metadata_cache não
// guarda dado de usuário nenhum, e a policy de escrita dele já era restrita a admin.
func syncMetadataCacheServico(ctx context.Context, client anilist.Service, malID int) error {
	res, err := client.GetAnimeById(ctx, fmt.Sprintf("%d", malID))
	if err != nil || res == nil {
		return fmt.Errorf("erro ao buscar dados na AniList para mal_id %d: %w", malID, err)
	}

	dbClient, errClient := database.ServiceRoleClient()
	if errClient != nil {
		return fmt.Errorf("erro ao criar cliente de serviço: %w", errClient)
	}

	payload := buildMetadataPayload(res.Data)
	if _, _, err := dbClient.From("anime_metadata_cache").
		Upsert(payload, "", "exact", "mal_id").Execute(); err != nil {
		return fmt.Errorf("erro ao salvar no banco para mal_id %d: %w", malID, err)
	}

	log.Printf("[CACHE METADATA] Metadados sincronizados com sucesso para: %s", res.Data.Title)
	return nil
}
