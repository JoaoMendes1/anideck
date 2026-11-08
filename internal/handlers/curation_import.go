package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
)

type CuratedEpisodePayload struct {
	Number  int    `json:"number"`
	Title   string `json:"title,omitempty"`
	Image   string `json:"image,omitempty"`
	AiredAt string `json:"aired_at,omitempty"`
}

type AutoImportItemResult struct {
	MalID    int    `json:"mal_id"`
	Title    string `json:"title"`
	Episodes int    `json:"episodes"`
	Status   string `json:"status"` // "importado", "sem_episodios", "erro"
	Mensagem string `json:"mensagem,omitempty"`
}

type AutoImportResponse struct {
	Total        int                    `json:"total"`
	Importados   int                    `json:"importados"`
	SemEpisodios int                    `json:"sem_episodios"`
	Itens        []AutoImportItemResult `json:"itens"`
}

// HandleAutoImportEpisodes importa automaticamente episódios da AniList para obras
// curadas que estão sem custom_episodes cadastrados, poupando trabalho manual.
//
// Pode receber `?mal_id=NNN` para importar apenas uma obra específica ou rodar
// para todas as obras pendentes da curadoria.
func (h *CurationHandler) HandleAutoImportEpisodes(w http.ResponseWriter, r *http.Request) {
	client := h.AniListClient
	if client == nil {
		client = anilist.NewClient()
	}

	serviceClient, errService := database.ServiceRoleClient()
	if errService != nil {
		http.Error(w, "Erro ao obter cliente de banco", http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	var malIDFiltrado int
	if s := r.URL.Query().Get("mal_id"); s != "" {
		if id, err := strconv.Atoi(s); err == nil && id > 0 {
			malIDFiltrado = id
		}
	}

	// 1. Busca obras curadas
	query := serviceClient.From("curated_animes").
		Select("id,mal_id,custom_title,custom_episodes", "", false)
	if malIDFiltrado > 0 {
		query = query.Eq("mal_id", strconv.Itoa(malIDFiltrado))
	}

	dataCurated, _, err := query.Execute()
	if err != nil {
		log.Printf("[AUTO IMPORT EPISODES] Erro ao buscar curadoria: %v", err)
		http.Error(w, "Erro ao consultar obras curadas", http.StatusInternalServerError)
		return
	}

	type CuratedRow struct {
		ID             string          `json:"id"`
		MalID          int             `json:"mal_id"`
		CustomTitle    string          `json:"custom_title"`
		CustomEpisodes json.RawMessage `json:"custom_episodes"`
	}

	var curados []CuratedRow
	if err := json.Unmarshal(dataCurated, &curados); err != nil {
		log.Printf("[AUTO IMPORT EPISODES] Payload inválido de curadoria: %v", err)
		http.Error(w, "Erro ao processar dados", http.StatusInternalServerError)
		return
	}

	var itensProcessar []CuratedRow
	for _, c := range curados {
		if malIDFiltrado > 0 {
			itensProcessar = append(itensProcessar, c)
			continue
		}
		// Sem custom_episodes ou array vazio
		hasEps := false
		if len(c.CustomEpisodes) > 0 && string(c.CustomEpisodes) != "null" && string(c.CustomEpisodes) != "[]" {
			var eps []any
			if json.Unmarshal(c.CustomEpisodes, &eps) == nil && len(eps) > 0 {
				hasEps = true
			}
		}
		if !hasEps {
			itensProcessar = append(itensProcessar, c)
		}
	}

	resp := AutoImportResponse{
		Total: len(itensProcessar),
		Itens: make([]AutoImportItemResult, 0, len(itensProcessar)),
	}

	for i, c := range itensProcessar {
		if i > 0 {
			time.Sleep(300 * time.Millisecond) // polidez com o rate limit da AniList
		}

		res, err := client.GetAnimeById(ctx, fmt.Sprintf("%d", c.MalID))
		if err != nil || res == nil {
			resp.Itens = append(resp.Itens, AutoImportItemResult{
				MalID:    c.MalID,
				Title:    c.CustomTitle,
				Episodes: 0,
				Status:   "erro",
				Mensagem: fmt.Sprintf("AniList não respondeu: %v", err),
			})
			continue
		}

		episodes := res.Data.Episodes
		if episodes <= 0 && len(res.Data.StreamingEpisodes) > 0 {
			episodes = len(res.Data.StreamingEpisodes)
		}

		// Atualiza o cache de metadados para que todas as telas enxerguem a quantidade
		genres := make([]string, len(res.Data.Genres))
		for idx, g := range res.Data.Genres {
			genres[idx] = g.Name
		}
		studios := make([]string, len(res.Data.Studios))
		for idx, s := range res.Data.Studios {
			studios[idx] = s.Name
		}
		cachePayload := map[string]interface{}{
			"mal_id":           res.Data.MalID,
			"title":            res.Data.Title,
			"episodes":         episodes,
			"duration_minutes": res.Data.Duration,
			"genres":           genres,
			"studios":          studios,
			"average_score":    res.Data.Score,
			"tags":             res.Data.Tags,
			"last_updated":     time.Now().UTC().Format(time.RFC3339),
		}
		if res.Data.SeasonYear > 0 {
			cachePayload["season_year"] = res.Data.SeasonYear
		}
		_, _, _ = serviceClient.From("anime_metadata_cache").
			Upsert(cachePayload, "", "exact", "mal_id").
			Execute()

		if episodes <= 0 {
			resp.SemEpisodios++
			resp.Itens = append(resp.Itens, AutoImportItemResult{
				MalID:    c.MalID,
				Title:    c.CustomTitle,
				Episodes: 0,
				Status:   "sem_episodios",
				Mensagem: "Obra ainda sem episódios anunciados ou exibidos na AniList",
			})
			continue
		}

		// Monta os episódios estritamente de 1 a N (Pitfall 9)
		eps := make([]CuratedEpisodePayload, episodes)
		for epIdx := 0; epIdx < episodes; epIdx++ {
			epNum := epIdx + 1
			item := CuratedEpisodePayload{Number: epNum}
			if epIdx < len(res.Data.StreamingEpisodes) {
				item.Title = res.Data.StreamingEpisodes[epIdx].Title
				item.Image = res.Data.StreamingEpisodes[epIdx].Thumbnail
			}
			eps[epIdx] = item
		}

		updatePayload := map[string]interface{}{
			"custom_episodes": eps,
		}

		_, _, errUp := serviceClient.From("curated_animes").
			Update(updatePayload, "", "exact").
			Eq("id", c.ID).
			Execute()

		if errUp != nil {
			resp.Itens = append(resp.Itens, AutoImportItemResult{
				MalID:    c.MalID,
				Title:    c.CustomTitle,
				Episodes: episodes,
				Status:   "erro",
				Mensagem: fmt.Sprintf("Erro ao salvar no banco: %v", errUp),
			})
		} else {
			resp.Importados++
			resp.Itens = append(resp.Itens, AutoImportItemResult{
				MalID:    c.MalID,
				Title:    c.CustomTitle,
				Episodes: episodes,
				Status:   "importado",
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
