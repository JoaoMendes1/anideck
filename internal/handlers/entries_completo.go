package handlers

import (
	"encoding/json"
	"log"
	"strconv"

	"github.com/JoaoMendes1/anideck/internal/database"
	supabase "github.com/supabase-community/supabase-go"
)

// Preenchimento de episode_progress quando um anime é marcado como "Completo".
//
// Contexto: desde a Fase 6.8, episode_progress é a fonte de verdade do tempo
// assistido. Marcar um anime como Completo não gravava nada lá, então anime
// completo contava zero hora nas Estatísticas.
//
// A decisão central está no DECISIONS.md: episódio preenchido em lote grava
// watched_at NULL, que significa "assistiu, mas não sei quando". Gravar now()
// inventaria um pico de atividade que nunca existiu e contaminaria Padrão de
// Horário, Streak e Atividade Recente.
//
// IMPORTANTE: o insert usa map com "watched_at": nil em vez da struct
// entries.EpisodeProgress. O campo WatchedAt da struct tem `omitempty`, então
// a struct simplesmente omitiria a coluna e o DEFAULT do banco gravaria o
// horário de agora — exatamente o que este código existe para evitar.

// numerosDeEpisodios devolve a lista de números de episódio do anime, seguindo
// a mesma precedência de leitura do resto do projeto: curadoria primeiro, cache
// depois. Devolve lista vazia quando nenhuma das duas fontes sabe responder —
// nesse caso o preenchimento é pulado em silêncio, sem falhar a operação.
func numerosDeEpisodios(dbClient *supabase.Client, malID int) []int {
	malIDStr := strconv.Itoa(malID)

	// 1) Curadoria: custom_episodes é a fonte de maior precedência.
	// NULL aqui significa "não curado" e cai para o cache. Um array vazio
	// significa "curei e está vazio de propósito" — nesse caso não há
	// episódio para preencher, e a lista vazia é a resposta certa.
	dataCur, _, errCur := dbClient.From("curated_animes").
		Select("custom_episodes", "exact", false).
		Eq("mal_id", malIDStr).
		Execute()

	if errCur == nil {
		var linhas []struct {
			CustomEpisodes []struct {
				Number int `json:"number"`
			} `json:"custom_episodes"`
		}
		if err := json.Unmarshal(dataCur, &linhas); err == nil && len(linhas) > 0 {
			if linhas[0].CustomEpisodes != nil {
				numeros := make([]int, 0, len(linhas[0].CustomEpisodes))
				for _, ep := range linhas[0].CustomEpisodes {
					if ep.Number > 0 {
						numeros = append(numeros, ep.Number)
					}
				}
				return numeros
			}
		}
	}

	// 2) Cache: guarda só a contagem, não a lista. Para efeito de progresso
	// isso basta — a grade bonita é assunto de tela, o progresso só precisa
	// do número.
	dataCache, _, errCache := dbClient.From("anime_metadata_cache").
		Select("episodes", "exact", false).
		Eq("mal_id", malIDStr).
		Execute()

	if errCache != nil {
		return nil
	}

	var linhasCache []struct {
		Episodes int `json:"episodes"`
	}
	if err := json.Unmarshal(dataCache, &linhasCache); err != nil || len(linhasCache) == 0 {
		return nil
	}

	total := linhasCache[0].Episodes
	if total <= 0 {
		return nil
	}

	numeros := make([]int, 0, total)
	for i := 1; i <= total; i++ {
		numeros = append(numeros, i)
	}
	return numeros
}

// episodiosJaMarcados devolve os números que o usuário já tem gravados, para
// que o preenchimento em lote nunca sobrescreva um watched_at real.
func episodiosJaMarcados(dbClient *supabase.Client, userID string, malID int) map[int]bool {
	marcados := make(map[int]bool)

	data, _, err := dbClient.From("episode_progress").
		Select("episode_number", "exact", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Execute()

	if err != nil {
		// Em caso de erro devolvemos o mapa vazio de propósito: o banco tem
		// chave única em (user_id, mal_id, episode_number), então o pior caso
		// é o insert ser recusado — nunca um watched_at real sobrescrito.
		log.Printf("[EPISODIOS LOTE] Falha ao ler progresso existente (user=%s, mal_id=%d): %v", userID, malID, err)
		return marcados
	}

	var linhas []struct {
		EpisodeNumber int `json:"episode_number"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return marcados
	}

	for _, l := range linhas {
		marcados[l.EpisodeNumber] = true
	}
	return marcados
}

// preencherEpisodiosCompleto grava os episódios que faltam para o anime,
// com watched_at NULL. É idempotente: chamar de novo não duplica nada e não
// altera o que já existe.
//
// Nunca devolve erro para o chamador de propósito. A mudança de status do
// anime é a operação principal e não pode falhar porque o preenchimento não
// deu certo — falha aqui é registrada em log e o usuário segue com o status
// salvo, que é o que ele pediu.
func preencherEpisodiosCompleto(token, userID string, malID int) {
	if malID <= 0 {
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		log.Printf("[EPISODIOS LOTE] Falha ao criar cliente (user=%s, mal_id=%d): %v", userID, malID, err)
		return
	}

	numeros := numerosDeEpisodios(dbClient, malID)
	if len(numeros) == 0 {
		// Anime sem contagem conhecida em nenhuma das fontes. Não é erro:
		// o status foi salvo e o usuário pode marcar manualmente depois.
		log.Printf("[EPISODIOS LOTE] Sem contagem de episódios para mal_id=%d, preenchimento pulado", malID)
		return
	}

	marcados := episodiosJaMarcados(dbClient, userID, malID)

	linhas := make([]map[string]interface{}, 0, len(numeros))
	for _, n := range numeros {
		if marcados[n] {
			continue
		}
		linhas = append(linhas, map[string]interface{}{
			"user_id":        userID,
			"mal_id":         malID,
			"episode_number": n,
			// Explícito e não omitido: ver comentário no topo do arquivo.
			"watched_at": nil,
		})
	}

	if len(linhas) == 0 {
		return
	}

	if _, _, err := dbClient.From("episode_progress").Insert(linhas, false, "exact", "", "").Execute(); err != nil {
		log.Printf("[EPISODIOS LOTE] Falha ao inserir %d episódios (user=%s, mal_id=%d): %v", len(linhas), userID, malID, err)
		return
	}

	log.Printf("[EPISODIOS LOTE] %d episódios preenchidos com watched_at nulo (user=%s, mal_id=%d)", len(linhas), userID, malID)
}