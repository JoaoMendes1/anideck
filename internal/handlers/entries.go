package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/entries"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/supabase-community/supabase-go"
)

type EntriesHandler struct{}

func (h *EntriesHandler) HandleList(w http.ResponseWriter, r *http.Request) {
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

	data, _, err := dbClient.From("media_entries").Select("*", "exact", false).Eq("user_id", userID).Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleList Entries (user=%s): %v", userID, err)
		http.Error(w, "Erro ao buscar entries", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").Insert(entrada, false, "exact", "", "").Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleCreate Entries (user=%s, mal_id=%d): %v", userID, entrada.MalID, err)
		http.Error(w, "Erro ao salvar entry", http.StatusInternalServerError)
		return
	}

	if entrada.Status == "Completo" {
		preencherEpisodiosCompleto(token, userID, entrada.MalID)
	}
	syncMetadataCacheAsync(entrada.MalID, token, entrada.Status == "Completo", userID)

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	// Recusa aqui o que o Postgres recusaria depois com 22P02. Deixar passar faz o
	// handler devolver 500, que significa "meu código quebrou" e manda o diagnóstico
	// para o lado errado — o dado veio do cliente, então é 400.
	if err := uuid.Validate(id); err != nil {
		http.Error(w, "ID de entrada inválido", http.StatusBadRequest)
		return
	}

	var entrada entries.MediaEntry
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	entrada.UserID = userID

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("media_entries").
		Update(entrada, "", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleUpdate Entries (user=%s, id=%s): %v", userID, id, err)
		http.Error(w, "Erro ao atualizar entry", http.StatusInternalServerError)
		return
	}

	if entrada.Status == "Completo" {
		preencherEpisodiosCompleto(token, userID, entrada.MalID)
	}
	syncMetadataCacheAsync(entrada.MalID, token, entrada.Status == "Completo", userID)

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *EntriesHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	if err := uuid.Validate(id); err != nil {
		http.Error(w, "ID de entrada inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("media_entries").
		Delete("", "exact").
		Eq("id", id).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleDelete Entries (user=%s, id=%s): %v", userID, id, err)
		http.Error(w, "Erro ao excluir entry", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// buildMetadataPayload traduz o anime da AniList para as colunas de anime_metadata_cache.
// Fica separado da função de I/O justamente pra poder ser testado sem rede nem banco.
func buildMetadataPayload(anime anilist.Anime) map[string]interface{} {
	var genres, studios []string
	for _, g := range anime.Genres {
		genres = append(genres, g.Name)
	}
	for _, s := range anime.Studios {
		studios = append(studios, s.Name)
	}

	payload := map[string]interface{}{
		"mal_id":           anime.MalID,
		"title":            anime.Title,
		"episodes":         anime.Episodes,
		"duration_minutes": anime.Duration,
		"genres":           genres,
		"studios":          studios,
		"average_score":    anime.Score,
		// As tags da AniList são a fonte de categorias como Isekai, que não existem
		// como "genre". Sem elas a taxonomia do AniDeck não consegue classificar o anime.
		"tags":         anime.Tags,
		"last_updated": time.Now().UTC().Format(time.RFC3339),
	}

	// Só grava o ano quando a AniList realmente devolveu um. Enviar 0 sobrescreveria
	// um ano correto que já estivesse no cache por um valor sem sentido.
	if anime.SeasonYear > 0 {
		payload["season_year"] = anime.SeasonYear
	}

	return payload
}

// animeEstaNoDeck confirma que o mal_id pertence ao deck de quem pediu a sincronização.
//
// POR QUE EXISTE: o syncMetadataCache grava com ServiceRoleClient, que ignora RLS. Sem
// esta trava, qualquer autenticado poderia disparar gravação no cache para qualquer
// mal_id, num laço. O conteúdo gravado vem da AniList e não do usuário, então não havia
// corrupção possível — mas havia poluição, e cada chamada consome a cota de 30 req/min
// que o app inteiro divide.
//
// Lê com ClientWithToken de propósito: a RLS de media_entries recorta por auth.uid(),
// então a consulta só enxerga o deck de quem chamou. Usar service role aqui anularia o
// sentido da verificação.
func animeEstaNoDeck(malID int, token, userID string) (bool, error) {
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		return false, err
	}

	data, _, err := dbClient.From("media_entries").
		Select("mal_id", "exact", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Execute()
	if err != nil {
		return false, err
	}

	var linhas []struct {
		MalID int `json:"mal_id"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return false, err
	}

	return len(linhas) > 0, nil
}

func syncMetadataCache(ctx context.Context, client anilist.Service, malID int) error {
	res, err := client.GetAnimeById(ctx, fmt.Sprintf("%d", malID))
	if err != nil || res == nil {
		return fmt.Errorf("erro ao buscar dados na AniList para mal_id %d: %w", malID, err)
	}
	anime := res.Data

	dbClient, errClient := database.ServiceRoleClient()
	if errClient != nil {
		return fmt.Errorf("erro ao criar cliente de serviço: %w", errClient)
	}

	payload := buildMetadataPayload(anime)
	if _, _, err := dbClient.From("anime_metadata_cache").Upsert(payload, "", "exact", "mal_id").Execute(); err != nil {
		return fmt.Errorf("erro ao salvar no banco para mal_id %d: %w", malID, err)
	}

	log.Printf("[CACHE METADATA] Metadados sincronizados com sucesso para: %s", anime.Title)
	return nil
}

// syncMetadataCacheAsync sincroniza o cache em segundo plano e, quando o anime foi
// salvo como "Completo", preenche episode_progress logo em seguida.
//
// Chamamos preencherEpisodiosCompleto antes E depois da sincronização da AniList:
// se o anime já estiver em cache/curadoria (caso comum), ele preenche em milissegundos
// sem esperar a resposta externa da AniList.
func syncMetadataCacheAsync(malID int, token string, completo bool, userID string) {
	go func() {
		if completo {
			preencherEpisodiosCompleto(token, userID, malID)
		}

		// A gravação usa service role, então a autorização acontece ANTES. Falha na
		// consulta bloqueia por padrão: não sincronizar é perda de cache recuperável
		// pelo Resync, enquanto sincronizar sem confirmar abre escrita sem RLS.
		noDeck, errDeck := animeEstaNoDeck(malID, token, userID)
		if errDeck != nil {
			log.Printf("[CACHE METADATA] Não foi possível confirmar o mal_id %d no deck de %s: %v",
				malID, userID, errDeck)
			return
		}
		if !noDeck {
			log.Printf("[CACHE METADATA] mal_id %d não está no deck de %s — sincronização recusada.",
				malID, userID)
			return
		}

		if err := syncMetadataCache(context.Background(), anilist.NewClient(), malID); err != nil {
			log.Printf("[CACHE METADATA] %v", err)
		}

		if completo {
			preencherEpisodiosCompleto(token, userID, malID)
		}
	}()
}

func (h *EntriesHandler) HandleGetEpisodes(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	malID := chi.URLParam(r, "mal_id")

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("episode_progress").
		Select("episode_number", "exact", false).
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleGetEpisodes (user=%s, mal_id=%s): %v", userID, malID, err)
		http.Error(w, "Erro ao buscar episódios", http.StatusInternalServerError)
		return
	}

	var raw []map[string]int
	_ = json.Unmarshal(data, &raw)

	episodes := make([]int, 0)
	for _, row := range raw {
		episodes = append(episodes, row["episode_number"])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(episodes)
}

func (h *EntriesHandler) HandleMarkEpisode(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID, _ := strconv.Atoi(chi.URLParam(r, "mal_id"))
	episodeNumber, _ := strconv.Atoi(chi.URLParam(r, "number"))
	if malID <= 0 || episodeNumber <= 0 {
		http.Error(w, "Episódio ou obra inválidos", http.StatusBadRequest)
		return
	}

	progresso := entries.EpisodeProgress{
		UserID:        userID,
		MalID:         malID,
		EpisodeNumber: episodeNumber,
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	var curadoRef *models.CuratedAnime
	if curados := CarregarCuradoria(dbClient); len(curados) > 0 {
		if curado, existe := curados[malID]; existe {
			if episodioCuradoNoFuturo(curado, episodeNumber) {
				http.Error(w, "Este episódio ainda não foi lançado", http.StatusBadRequest)
				return
			}
			copia := curado
			curadoRef = &copia
		}
	}

	_, _, err := dbClient.From("episode_progress").Insert(progresso, false, "exact", "", "").Execute()

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") || strings.Contains(err.Error(), "23505") {
			var wgDup sync.WaitGroup
			var concluiu bool
			wgDup.Add(3)
			go func() {
				defer wgDup.Done()
				promoverQueroAssistirParaAssistindo(dbClient, userID, malID)
			}()
			go func() {
				defer wgDup.Done()
				marcarNotificacaoDoEpisodioComoLida(dbClient, userID, malID, episodeNumber)
			}()
			go func() {
				defer wgDup.Done()
				concluiu = concluirSeAssistiuTudo(dbClient, userID, malID, curadoRef)
			}()
			wgDup.Wait()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"xp_earned": 0,
				"reason":    "episódio já marcado",
				"concluiu":  concluiu,
			})
			return
		}
		log.Printf("[ERRO DB] HandleMarkEpisode (user=%s, mal_id=%d, ep=%d): %v", userID, malID, episodeNumber, err)
		http.Error(w, "Erro ao marcar episódio", http.StatusInternalServerError)
		return
	}

	var (
		xpGanho  int
		motivoXP string
		maratona *ResultadoMaratonaEpisodio
		wgPos    sync.WaitGroup
	)
	wgPos.Add(4)
	go func() {
		defer wgPos.Done()
		promoverQueroAssistirParaAssistindo(dbClient, userID, malID)
	}()
	go func() {
		defer wgPos.Done()
		marcarNotificacaoDoEpisodioComoLida(dbClient, userID, malID, episodeNumber)
	}()
	go func() {
		defer wgPos.Done()
		xpGanho, motivoXP = RegistrarXPEpisodio(dbClient, userID, malID, episodeNumber, curadoRef)
	}()
	go func() {
		defer wgPos.Done()
		// Antes da conclusão: a maratona conta este episódio pela hora em que foi marcado.
		maratona = registrarEpisodioNaMaratona(userID, malID, episodeNumber)
	}()
	wgPos.Wait()

	// Depois do XP e promoção de status: o episódio conta antes de o anime virar Completo.
	concluiu := concluirSeAssistiuTudo(dbClient, userID, malID, curadoRef)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"xp_earned": xpGanho,
		"reason":    motivoXP,
		"concluiu":  concluiu,
		"maratona":  maratona,
	})
}

// episodioCuradoNoFuturo verifica se a curadoria indica que o episódio ainda não foi ao ar.
func episodioCuradoNoFuturo(curado models.CuratedAnime, episodeNumber int) bool {
	if curado.CustomStatus == "NOT_YET_RELEASED" || curado.CustomStatus == "Ainda não lançado" {
		return true
	}
	if proximo := CalcularProximoEpisodioCurado(curado.CustomEpisodes, curado.CustomFirstAiredAt); proximo != nil {
		if episodeNumber >= proximo.Episode {
			return true
		}
	}
	return false
}

// marcarNotificacaoDoEpisodioComoLida sincroniza o sino de notificações quando o usuário
// marca o episódio diretamente na página do anime ou na tela Início.
func marcarNotificacaoDoEpisodioComoLida(dbClient *supabase.Client, userID string, malID, episodeNumber int) {
	if dbClient == nil || userID == "" || malID <= 0 || episodeNumber <= 0 {
		return
	}
	_, _, _ = dbClient.From("notifications").
		Update(map[string]interface{}{"read_at": time.Now().UTC().Format(time.RFC3339)}, "", "").
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Eq("episode_number", strconv.Itoa(episodeNumber)).
		Is("read_at", "null").
		Execute()
}

// promoverQueroAssistirParaAssistindo atualiza a entrada do usuário para "Assistindo"
// caso estivesse em "Quero Assistir" quando um episódio é marcado como assistido.
func promoverQueroAssistirParaAssistindo(dbClient *supabase.Client, userID string, malID int) {
	if dbClient == nil || userID == "" || malID <= 0 {
		return
	}
	_, _, _ = dbClient.From("media_entries").
		Update(map[string]string{"status": "Assistindo"}, "", "").
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Eq("status", "Quero Assistir").
		Execute()
}

func (h *EntriesHandler) HandleUnmarkEpisode(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID := chi.URLParam(r, "mal_id")
	episodeNumber := chi.URLParam(r, "number")
	// mal_id 0 no xp_ledger é XP sem episódio; um id não positivo nunca chega aos DELETEs.
	if n, err := strconv.Atoi(malID); err != nil || n <= 0 {
		http.Error(w, "mal_id inválido", http.StatusBadRequest)
		return
	}
	if n, err := strconv.Atoi(episodeNumber); err != nil || n <= 0 {
		http.Error(w, "Episódio inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("episode_progress").
		Delete("", "exact").
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Eq("episode_number", episodeNumber).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleUnmarkEpisode (user=%s, mal_id=%s, ep=%s): %v", userID, malID, episodeNumber, err)
		http.Error(w, "Erro ao desmarcar episódio", http.StatusInternalServerError)
		return
	}

	_, _, _ = dbClient.From("xp_ledger").
		Delete("", "").
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Eq("episode_number", episodeNumber).
		Execute()

	w.WriteHeader(http.StatusNoContent)
}

func (h *EntriesHandler) HandleClearEpisodes(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)

	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID := chi.URLParam(r, "mal_id")
	if n, err := strconv.Atoi(malID); err != nil || n <= 0 {
		http.Error(w, "mal_id inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err := dbClient.From("episode_progress").
		Delete("", "exact").
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Execute()

	if err != nil {
		log.Printf("[ERRO DB] HandleClearEpisodes (user=%s, mal_id=%s): %v", userID, malID, err)
		http.Error(w, "Erro ao zerar episódios", http.StatusInternalServerError)
		return
	}

	_, _, _ = dbClient.From("xp_ledger").
		Delete("", "").
		Eq("user_id", userID).
		Eq("mal_id", malID).
		Execute()

	w.WriteHeader(http.StatusNoContent)
}

type PreviaSaidaCompleto struct {
	XPAntes           int    `json:"xp_antes"`
	XPDepois          int    `json:"xp_depois"`
	XPPerdido         int    `json:"xp_perdido"`
	NivelAntes        int    `json:"nivel_antes"`
	NivelDepois       int    `json:"nivel_depois"`
	NiveisPerdidos    int    `json:"niveis_perdidos"`
	EpisodiosMarcados int    `json:"episodios_marcados"`
	CompletadoEm      string `json:"completado_em,omitempty"`
	Sugestao          string `json:"sugestao"`
	RankAntes         string `json:"rank_antes"`
	RankDepois        string `json:"rank_depois"`
}

type ResumoSaidaCompleto struct {
	XPAntes        int    `json:"xp_antes"`
	XPDepois       int    `json:"xp_depois"`
	XPPerdido      int    `json:"xp_perdido"`
	NivelAntes     int    `json:"nivel_antes"`
	NivelDepois    int    `json:"nivel_depois"`
	NiveisPerdidos int    `json:"niveis_perdidos"`
	Escolha        string `json:"escolha"`
	NovoStatus     string `json:"novo_status"`
	RevisaoAtiva   bool   `json:"revisao_ativa"`
	RankAntes      string `json:"rank_antes"`
	RankDepois     string `json:"rank_depois"`
}

type pedidoSaidaCompleto struct {
	Escolha    string   `json:"escolha"`
	NovoStatus string   `json:"novo_status"`
	Nota       *float64 `json:"nota"`
	Anotacao   *string  `json:"anotacao"`
	IsFavorite *bool    `json:"is_favorite"`
}

func validarPedidoSaidaCompleto(escolha, novoStatus string) error {
	if escolha != "vou_rever" && escolha != "desisti_ou_errado" {
		return errors.New("escolha inválida: use vou_rever ou desisti_ou_errado")
	}
	switch novoStatus {
	case "Assistindo", "Em Dia", "Quero Assistir", "Dropado":
		return nil
	default:
		return errors.New("status de destino inválido")
	}
}

func (h *EntriesHandler) HandlePreviaSaidaCompleto(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || token == "" || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID, err := strconv.Atoi(chi.URLParam(r, "mal_id"))
	if err != nil || malID <= 0 {
		http.Error(w, "mal_id inválido", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	entryBytes, _, errEntry := dbClient.From("media_entries").
		Select("id,status", "", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Limit(1, "").
		Execute()
	if errEntry != nil {
		log.Printf("[SAIDA COMPLETO] Falha ao buscar entrada (user=%s, mal_id=%d): %v", userID, malID, errEntry)
		http.Error(w, "Erro ao verificar entrada no deck", http.StatusInternalServerError)
		return
	}
	var entryRows []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if json.Unmarshal(entryBytes, &entryRows) != nil || len(entryRows) == 0 {
		http.Error(w, "Entrada não encontrada no seu deck", http.StatusNotFound)
		return
	}

	srvClient, errSrv := database.ServiceRoleClient()
	if errSrv != nil || srvClient == nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	raw := strings.TrimSpace(srvClient.Rpc("previa_saida_completo", "", map[string]interface{}{
		"p_user_id": userID,
		"p_mal_id":  malID,
	}))
	if raw == "" || strings.HasPrefix(raw, "error") || strings.Contains(raw, "\"code\"") {
		log.Printf("[SAIDA COMPLETO] Falha no RPC previa_saida_completo (user=%s, mal_id=%d): %s", userID, malID, raw)
		http.Error(w, "Erro ao calcular prévia de saída", http.StatusInternalServerError)
		return
	}

	var previa PreviaSaidaCompleto
	if err := json.Unmarshal([]byte(raw), &previa); err != nil {
		log.Printf("[SAIDA COMPLETO] Falha ao decodificar prévia (user=%s, mal_id=%d): %v", userID, malID, err)
		http.Error(w, "Erro ao processar prévia de saída", http.StatusInternalServerError)
		return
	}

	_, ranks, _ := carregarConfigGuilda(dbClient)
	previa.RankAntes = CalcularNivelERank(previa.XPAntes, ranks).Rank
	previa.RankDepois = CalcularNivelERank(previa.XPDepois, ranks).Rank

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(previa)
}

func (h *EntriesHandler) HandleExecutarSaidaCompleto(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || token == "" || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	malID, err := strconv.Atoi(chi.URLParam(r, "mal_id"))
	if err != nil || malID <= 0 {
		http.Error(w, "mal_id inválido", http.StatusBadRequest)
		return
	}

	corpo, errRead := io.ReadAll(io.LimitReader(r.Body, 16<<10))
	if errRead != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	var req pedidoSaidaCompleto
	if err := json.Unmarshal(corpo, &req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}
	var chaves map[string]json.RawMessage
	_ = json.Unmarshal(corpo, &chaves)

	if err := validarPedidoSaidaCompleto(req.Escolha, req.NovoStatus); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Nota != nil && (*req.Nota < 0 || *req.Nota > 10) {
		http.Error(w, "Nota deve ficar entre 0 e 10", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	entryBytes, _, errEntry := dbClient.From("media_entries").
		Select("id,status", "", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Limit(1, "").
		Execute()
	if errEntry != nil {
		log.Printf("[SAIDA COMPLETO] Falha ao buscar entrada (user=%s, mal_id=%d): %v", userID, malID, errEntry)
		http.Error(w, "Erro ao verificar entrada no deck", http.StatusInternalServerError)
		return
	}
	var entryRows []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if json.Unmarshal(entryBytes, &entryRows) != nil || len(entryRows) == 0 {
		http.Error(w, "Entrada não encontrada no seu deck", http.StatusNotFound)
		return
	}

	srvClient, errSrv := database.ServiceRoleClient()
	if errSrv != nil || srvClient == nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	raw := strings.TrimSpace(srvClient.Rpc("executar_saida_completo", "", map[string]interface{}{
		"p_user_id":     userID,
		"p_mal_id":      malID,
		"p_escolha":     req.Escolha,
		"p_novo_status": req.NovoStatus,
	}))
	if raw == "" || strings.HasPrefix(raw, "error") || strings.Contains(raw, "\"code\"") {
		log.Printf("[SAIDA COMPLETO] Falha no RPC executar_saida_completo (user=%s, mal_id=%d): %s", userID, malID, raw)
		http.Error(w, "Erro ao alterar status da obra", http.StatusInternalServerError)
		return
	}

	var resumo ResumoSaidaCompleto
	if err := json.Unmarshal([]byte(raw), &resumo); err != nil {
		log.Printf("[SAIDA COMPLETO] Falha ao decodificar resumo (user=%s, mal_id=%d): %v", userID, malID, err)
		http.Error(w, "Erro ao processar saída de Completo", http.StatusInternalServerError)
		return
	}

	extras := map[string]interface{}{}
	if _, temNota := chaves["nota"]; temNota {
		extras["nota"] = req.Nota
	}
	if _, temAnotacao := chaves["anotacao"]; temAnotacao && req.Anotacao != nil {
		extras["anotacao"] = *req.Anotacao
	}
	if _, temFav := chaves["is_favorite"]; temFav && req.IsFavorite != nil {
		extras["is_favorite"] = *req.IsFavorite
	}
	if len(extras) > 0 {
		if _, _, errUpd := dbClient.From("media_entries").
			Update(extras, "", "").
			Eq("user_id", userID).
			Eq("mal_id", strconv.Itoa(malID)).
			Execute(); errUpd != nil {
			log.Printf("[SAIDA COMPLETO] Falha ao atualizar campos extras (user=%s, mal_id=%d): %v", userID, malID, errUpd)
		}
	}

	var entradaAtualizada interface{}
	if atualBytes, _, errAtual := dbClient.From("media_entries").
		Select("*", "", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Limit(1, "").
		Execute(); errAtual == nil {
		var rows []entries.MediaEntry
		if json.Unmarshal(atualBytes, &rows) == nil && len(rows) > 0 {
			entradaAtualizada = rows[0]
		}
	}

	_, ranks, _ := carregarConfigGuilda(dbClient)
	resumo.RankAntes = CalcularNivelERank(resumo.XPAntes, ranks).Rank
	resumo.RankDepois = CalcularNivelERank(resumo.XPDepois, ranks).Rank

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"entrada": entradaAtualizada,
		"resumo":  resumo,
	})
}
