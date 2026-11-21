package handlers

import (
	"encoding/json"
	"strconv"
	"sync"

	"github.com/JoaoMendes1/anideck/internal/models"
	supabase "github.com/supabase-community/supabase-go"
)

// Conclusão automática: quem está em "Assistindo" ou "Em Dia" e marca o último episódio de
// uma obra que já terminou passa para "Completo". Os gatilhos do banco cuidam do resto (data
// de conclusão, carta de coleção e missões), como na troca manual de status.

// DeveConcluir decide a passagem para "Completo". numeros são os episódios conhecidos da obra
// (curadoria, ou 1..total do cache); totalDeclarado é o total da AniList (0 quando ela não
// sabe); curadoFinalizado é a curadoria dizendo que a obra terminou.
//
// A obra só conta como fechada com o total declarado alcançado ou com a curadoria dizendo que
// terminou: uma obra em lançamento lista só os episódios já lançados, e ver todos eles não é
// terminar.
func DeveConcluir(status string, numeros []int, marcados map[int]bool, totalDeclarado int, curadoFinalizado bool) bool {
	if status != "Assistindo" && status != "Em Dia" {
		return false
	}
	if len(numeros) == 0 {
		return false
	}
	for _, n := range numeros {
		if !marcados[n] {
			return false
		}
	}
	return curadoFinalizado || (totalDeclarado > 0 && len(marcados) >= totalDeclarado)
}

// totalDeclarado lê o total de episódios que a AniList informou (cache); 0 quando não há.
func totalDeclarado(dbClient *supabase.Client, malID int) int {
	dados, _, err := dbClient.From("anime_metadata_cache").
		Select("episodes", "exact", false).
		Eq("mal_id", strconv.Itoa(malID)).
		Execute()
	if err != nil {
		return 0
	}
	var linhas []struct {
		Episodes int `json:"episodes"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return 0
	}
	return linhas[0].Episodes
}

// statusDaEntrada lê o status do anime na lista do usuário; vazio quando não está na lista.
func statusDaEntrada(dbClient *supabase.Client, userID string, malID int) string {
	dados, _, err := dbClient.From("media_entries").
		Select("status", "exact", false).
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		Execute()
	if err != nil {
		return ""
	}
	var linhas []struct {
		Status string `json:"status"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return ""
	}
	return linhas[0].Status
}

// numerosDaCuradoria extrai os números positivos de custom_episodes quando preenchido (nil = usar cache).
func numerosDaCuradoria(curado *models.CuratedAnime) ([]int, bool) {
	if curado == nil || len(curado.CustomEpisodes) == 0 || string(curado.CustomEpisodes) == "null" {
		return nil, false
	}
	var eps []struct {
		Number int `json:"number"`
	}
	if json.Unmarshal(curado.CustomEpisodes, &eps) != nil {
		return nil, false
	}
	numeros := make([]int, 0, len(eps))
	for _, ep := range eps {
		if ep.Number > 0 {
			numeros = append(numeros, ep.Number)
		}
	}
	return numeros, true
}

// concluirSeAssistiuTudo aplica DeveConcluir depois de um episódio marcado. Devolve true
// quando o anime passou para "Completo". Falha de leitura não conclui: o pior caso é o
// jogador mover à mão, como antes.
func concluirSeAssistiuTudo(dbClient *supabase.Client, userID string, malID int, curado *models.CuratedAnime) bool {
	if dbClient == nil || userID == "" || malID <= 0 {
		return false
	}

	var (
		status     string
		marcados   map[int]bool
		totalCache int
		wg         sync.WaitGroup
	)
	wg.Add(3)
	go func() {
		defer wg.Done()
		status = statusDaEntrada(dbClient, userID, malID)
	}()
	go func() {
		defer wg.Done()
		marcados = episodiosJaMarcados(dbClient, userID, malID)
	}()
	go func() {
		defer wg.Done()
		totalCache = totalDeclarado(dbClient, malID)
	}()
	wg.Wait()

	if status != "Assistindo" && status != "Em Dia" {
		return false
	}

	numeros, temCuradoria := numerosDaCuradoria(curado)
	if !temCuradoria && totalCache > 0 {
		numeros = make([]int, 0, totalCache)
		for i := 1; i <= totalCache; i++ {
			numeros = append(numeros, i)
		}
	}

	curadoFinalizado := curado != nil && ordemDoStatus(curado.CustomStatus) == 3
	if !DeveConcluir(status, numeros, marcados, totalCache, curadoFinalizado) {
		return false
	}
	_, _, err := dbClient.From("media_entries").
		Update(map[string]string{"status": "Completo"}, "", "").
		Eq("user_id", userID).
		Eq("mal_id", strconv.Itoa(malID)).
		In("status", []string{"Assistindo", "Em Dia"}).
		Execute()
	return err == nil
}
