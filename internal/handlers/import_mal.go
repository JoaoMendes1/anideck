package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

const (
	limiteBytesImportacaoMAL = 12 * 1024 * 1024 // 12 MB descompactado
	maxEpisodiosPorAnimeMAL  = 2500
)

type ItemImportacaoMAL struct {
	MalID               int     `json:"mal_id"`
	Titulo              string  `json:"titulo"`
	Status              string  `json:"status"`
	EpisodiosAssistidos int     `json:"episodios_assistidos"`
	Nota                float64 `json:"nota"`
}

type OpcoesImportacaoMAL struct {
	ImportarNotas     bool `json:"importar_notas"`
	IgnorarDuplicados bool `json:"ignorar_duplicados"`
}

type ResumoImportacaoMAL struct {
	TotalNoArquivo       int `json:"total_no_arquivo"`
	Importados           int `json:"importados"`
	Atualizados          int `json:"atualizados"`
	Ignorados            int `json:"ignorados"`
	EpisodiosRegistrados int `json:"episodios_registrados"`
}

type xmlListaMAL struct {
	XMLName xml.Name      `xml:"myanimelist"`
	Animes  []xmlAnimeMAL `xml:"anime"`
}

type xmlAnimeMAL struct {
	MalID          int     `xml:"series_animedb_id"`
	Titulo         string  `xml:"series_title"`
	EpisodiosVisto int     `xml:"my_watched_episodes"`
	Nota           float64 `xml:"my_score"`
	Status         string  `xml:"my_status"`
}

// MapearStatusMAL converte o status em inglês exportado pelo MyAnimeList para o status do AniDeck.
func MapearStatusMAL(statusMAL string) (string, bool) {
	switch strings.TrimSpace(statusMAL) {
	case "Completed":
		return "Completo", true
	case "Watching":
		return "Assistindo", true
	case "Plan to Watch", "On-Hold":
		return "Quero Assistir", true
	case "Dropped":
		return "Dropado", true
	default:
		return "", false
	}
}

// ParsearXMLMyAnimeList lê um arquivo XML (ou .xml.gz) exportado pelo MyAnimeList.
func ParsearXMLMyAnimeList(dados []byte) ([]ItemImportacaoMAL, error) {
	if len(dados) == 0 {
		return nil, errors.New("arquivo vazio")
	}

	leitor := io.Reader(bytes.NewReader(dados))
	if len(dados) >= 2 && dados[0] == 0x1f && dados[1] == 0x8b {
		gz, err := gzip.NewReader(leitor)
		if err != nil {
			return nil, errors.New("arquivo .gz inválido")
		}
		defer gz.Close()
		leitor = io.LimitReader(gz, limiteBytesImportacaoMAL)
	} else {
		leitor = io.LimitReader(leitor, limiteBytesImportacaoMAL)
	}

	var doc xmlListaMAL
	dec := xml.NewDecoder(leitor)
	if err := dec.Decode(&doc); err != nil {
		return nil, errors.New("XML inválido ou fora do padrão do MyAnimeList")
	}

	vistos := make(map[int]bool, len(doc.Animes))
	itens := make([]ItemImportacaoMAL, 0, len(doc.Animes))

	for _, a := range doc.Animes {
		if a.MalID <= 0 || vistos[a.MalID] {
			continue
		}
		statusPT, ok := MapearStatusMAL(a.Status)
		if !ok {
			continue
		}
		vistos[a.MalID] = true

		eps := a.EpisodiosVisto
		if eps < 0 {
			eps = 0
		} else if eps > maxEpisodiosPorAnimeMAL {
			eps = maxEpisodiosPorAnimeMAL
		}

		nota := a.Nota
		if nota < 0 || nota > 10 {
			nota = 0
		}

		itens = append(itens, ItemImportacaoMAL{
			MalID:               a.MalID,
			Titulo:              strings.TrimSpace(a.Titulo),
			Status:              statusPT,
			EpisodiosAssistidos: eps,
			Nota:                nota,
		})
	}

	if len(itens) == 0 {
		return nil, errors.New("nenhum anime válido encontrado no XML")
	}

	return itens, nil
}

// MontarLinhasProgressoLote gera os registros para episode_progress com watched_at explicitamente
// nulo (Armadilha 4 e Armadilha 20: sem omitempty, para não acionar DEFAULT now() nem contaminar
// Streak, Atividade Recente e Padrão de Horário).
func MontarLinhasProgressoLote(userID string, malID int, qtd int, jaMarcados map[int]bool) []map[string]interface{} {
	if qtd <= 0 || malID <= 0 || strings.TrimSpace(userID) == "" {
		return nil
	}
	if qtd > maxEpisodiosPorAnimeMAL {
		qtd = maxEpisodiosPorAnimeMAL
	}

	linhas := make([]map[string]interface{}, 0, qtd)
	for ep := 1; ep <= qtd; ep++ {
		if jaMarcados != nil && jaMarcados[ep] {
			continue
		}
		linhas = append(linhas, map[string]interface{}{
			"user_id":        userID,
			"mal_id":         malID,
			"episode_number": ep,
			"watched_at":     nil,
		})
	}
	return linhas
}

var executarImportacaoMAL = func(token, userID string, itens []ItemImportacaoMAL, opcoes OpcoesImportacaoMAL) (ResumoImportacaoMAL, error) {
	resumo := ResumoImportacaoMAL{TotalNoArquivo: len(itens)}
	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		return resumo, err
	}

	// 1. Lê entradas existentes do usuário
	existentesBytes, _, err := dbClient.From("media_entries").
		Select("id, mal_id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return resumo, err
	}
	var existentes []struct {
		ID    string `json:"id"`
		MalID int    `json:"mal_id"`
	}
	_ = json.Unmarshal(existentesBytes, &existentes)
	mapaExistentes := make(map[int]string, len(existentes))
	for _, e := range existentes {
		mapaExistentes[e.MalID] = e.ID
	}

	// 2. Lê episódios já marcados pelo usuário para nunca sobrescrever um watched_at real
	epBytes, _, _ := dbClient.From("episode_progress").
		Select("mal_id, episode_number", "", false).
		Eq("user_id", userID).
		Execute()
	var epExistentes []struct {
		MalID         int `json:"mal_id"`
		EpisodeNumber int `json:"episode_number"`
	}
	_ = json.Unmarshal(epBytes, &epExistentes)
	marcadosPorAnime := make(map[int]map[int]bool)
	for _, ep := range epExistentes {
		if marcadosPorAnime[ep.MalID] == nil {
			marcadosPorAnime[ep.MalID] = make(map[int]bool)
		}
		marcadosPorAnime[ep.MalID][ep.EpisodeNumber] = true
	}

	novasEntradas := make([]map[string]interface{}, 0, len(itens))
	todosEpisodios := make([]map[string]interface{}, 0)
	malIDsProcessados := make([]int, 0, len(itens))
	completosSemContagem := make([]int, 0)

	for _, item := range itens {
		idExistente, jaTem := mapaExistentes[item.MalID]
		var valorNota interface{} = nil
		if opcoes.ImportarNotas && item.Nota > 0 {
			valorNota = item.Nota
		}

		if jaTem {
			if opcoes.IgnorarDuplicados {
				resumo.Ignorados++
				continue
			}
			atualizacao := map[string]interface{}{
				"status": item.Status,
			}
			if opcoes.ImportarNotas && item.Nota > 0 {
				atualizacao["nota"] = item.Nota
			}
			if _, _, errUpd := dbClient.From("media_entries").
				Update(atualizacao, "", "").
				Eq("id", idExistente).
				Eq("user_id", userID).
				Execute(); errUpd == nil {
				resumo.Atualizados++
			}
		} else {
			// Armadilha 20: todas as linhas do lote precisam ter exatamente as mesmas chaves.
			novasEntradas = append(novasEntradas, map[string]interface{}{
				"user_id": userID,
				"mal_id":  item.MalID,
				"tipo":    "TV",
				"status":  item.Status,
				"nota":    valorNota,
			})
		}

		malIDsProcessados = append(malIDsProcessados, item.MalID)
		if item.EpisodiosAssistidos > 0 {
			linhasEp := MontarLinhasProgressoLote(userID, item.MalID, item.EpisodiosAssistidos, marcadosPorAnime[item.MalID])
			todosEpisodios = append(todosEpisodios, linhasEp...)
		} else if item.Status == "Completo" {
			completosSemContagem = append(completosSemContagem, item.MalID)
		}
	}

	// 3. Insere novas entradas em lotes de 200
	const tamLoteEntradas = 200
	for i := 0; i < len(novasEntradas); i += tamLoteEntradas {
		fim := i + tamLoteEntradas
		if fim > len(novasEntradas) {
			fim = len(novasEntradas)
		}
		lote := novasEntradas[i:fim]
		if _, _, errIns := dbClient.From("media_entries").Insert(lote, false, "", "", "").Execute(); errIns != nil {
			log.Printf("[IMPORT MAL] Erro ao inserir lote de entradas (user=%s): %v", userID, errIns)
			return resumo, errIns
		}
		resumo.Importados += len(lote)
	}

	// 4. Insere episódios em lotes de 500 com watched_at: nil
	const tamLoteEps = 500
	for i := 0; i < len(todosEpisodios); i += tamLoteEps {
		fim := i + tamLoteEps
		if fim > len(todosEpisodios) {
			fim = len(todosEpisodios)
		}
		lote := todosEpisodios[i:fim]
		if _, _, errEp := dbClient.From("episode_progress").Insert(lote, false, "", "", "").Execute(); errEp != nil {
			log.Printf("[IMPORT MAL] Aviso ao inserir lote de episódios (user=%s): %v", userID, errEp)
			continue
		}
		resumo.EpisodiosRegistrados += len(lote)
	}

	if len(malIDsProcessados) > 0 {
		sincronizarMetadadosEmLoteAsync(malIDsProcessados, completosSemContagem, token, userID)
	}

	return resumo, nil
}

// sincronizarMetadadosEmLoteAsync sincroniza anime_metadata_cache em lotes de 50 mal_ids
// respeitando o rate limit da AniList, sem abrir uma goroutine por anime.
func sincronizarMetadadosEmLoteAsync(malIDs []int, completosSemContagem []int, token, userID string) {
	go func() {
		srvClient, err := database.ServiceRoleClient()
		if err != nil {
			return
		}

		idStrs := make([]string, 0, len(malIDs))
		for _, id := range malIDs {
			idStrs = append(idStrs, strconv.Itoa(id))
		}

		jaNoCache := make(map[int]bool)
		if cacheBytes, _, errCache := srvClient.From("anime_metadata_cache").
			Select("mal_id", "", false).
			In("mal_id", idStrs).
			Execute(); errCache == nil {
			var rows []struct {
				MalID int `json:"mal_id"`
			}
			if json.Unmarshal(cacheBytes, &rows) == nil {
				for _, r := range rows {
					jaNoCache[r.MalID] = true
				}
			}
		}

		faltantes := make([]int, 0)
		for _, id := range malIDs {
			if !jaNoCache[id] {
				faltantes = append(faltantes, id)
			}
		}

		client := anilist.NewClient()
		const tamPagina = 50
		for i := 0; i < len(faltantes); i += tamPagina {
			fim := i + tamPagina
			if fim > len(faltantes) {
				fim = len(faltantes)
			}
			loteIDs := faltantes[i:fim]
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			res, errAni := client.GetAnimesByMalIDs(ctx, loteIDs)
			cancel()
			if errAni != nil || res == nil || len(res.Data) == 0 {
				continue
			}

			payloads := make([]map[string]interface{}, 0, len(res.Data))
			for _, anime := range res.Data {
				p := buildMetadataPayload(anime)
				// Armadilha 20: garante que a chave season_year exista em todos os itens do lote
				if _, ok := p["season_year"]; !ok {
					p["season_year"] = nil
				}
				payloads = append(payloads, p)
			}
			if len(payloads) > 0 {
				_, _, _ = srvClient.From("anime_metadata_cache").Upsert(payloads, "", "", "mal_id").Execute()
			}
			time.Sleep(1500 * time.Millisecond)
		}

		for _, malID := range completosSemContagem {
			preencherEpisodiosCompleto(token, userID, malID)
		}
	}()
}

// HandleImportMAL recebe o XML exportado do MyAnimeList e importa os animes e episódios para o Deck do usuário.
func (h *EntriesHandler) HandleImportMAL(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || strings.TrimSpace(token) == "" || strings.TrimSpace(userID) == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, limiteBytesImportacaoMAL)
	corpo, err := io.ReadAll(r.Body)
	if err != nil || len(corpo) == 0 {
		http.Error(w, "Arquivo ausente ou grande demais", http.StatusBadRequest)
		return
	}

	opcoes := OpcoesImportacaoMAL{
		ImportarNotas:     true,
		IgnorarDuplicados: true,
	}
	dadosXML := corpo

	if strings.Contains(r.Header.Get("Content-Type"), "application/json") {
		var req struct {
			XML               string `json:"xml"`
			ImportarNotas     *bool  `json:"importar_notas"`
			IgnorarDuplicados *bool  `json:"ignorar_duplicados"`
		}
		if err := json.Unmarshal(corpo, &req); err != nil || strings.TrimSpace(req.XML) == "" {
			http.Error(w, "Payload JSON inválido", http.StatusBadRequest)
			return
		}
		dadosXML = []byte(req.XML)
		if req.ImportarNotas != nil {
			opcoes.ImportarNotas = *req.ImportarNotas
		}
		if req.IgnorarDuplicados != nil {
			opcoes.IgnorarDuplicados = *req.IgnorarDuplicados
		}
	}

	itens, err := ParsearXMLMyAnimeList(dadosXML)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	resumo, err := executarImportacaoMAL(token, userID, itens, opcoes)
	if err != nil {
		log.Printf("[ERRO DB] HandleImportMAL (user=%s): %v", userID, err)
		http.Error(w, "Erro ao importar lista para o Deck", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resumo)
}
