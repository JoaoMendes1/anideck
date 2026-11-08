package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// tamanhoPaginaPostgREST é o teto de linhas por pedido do PostgREST no Supabase (Max Rows,
// 1.000 por padrão). Acima disso a resposta vem cortada, sem erro e sem aviso.
const tamanhoPaginaPostgREST = 1000

// maxPaginasProgresso protege contra laço sem fim se o banco devolver páginas cheias para
// sempre: 200 páginas são 200 mil linhas, muito além de qualquer conta real.
const maxPaginasProgresso = 200

type episodioMarcado struct {
	MalID         int `json:"mal_id"`
	EpisodeNumber int `json:"episode_number"`
}

// paginar junta páginas de `tamanho` linhas até vir uma incompleta. A busca de cada
// página é recebida como função para o laço ser testado sem banco.
func paginar[T any](buscar func(de, ate int) ([]byte, error), tamanho int) ([]T, error) {
	var todos []T
	for pagina := 0; pagina < maxPaginasProgresso; pagina++ {
		de := pagina * tamanho
		dados, err := buscar(de, de+tamanho-1)
		if err != nil {
			return nil, err
		}
		var linhas []T
		if err := json.Unmarshal(dados, &linhas); err != nil {
			return nil, fmt.Errorf("resposta inesperada do banco: %w", err)
		}
		todos = append(todos, linhas...)
		if len(linhas) < tamanho {
			return todos, nil
		}
	}
	return todos, fmt.Errorf("leitura passou de %d páginas", maxPaginasProgresso)
}

// lerEpisodiosMarcados devolve os episódios marcados do usuário, por anime. Com malIDs,
// lê só esses animes. Pagina sempre, ordenando por id para as páginas não se sobreporem.
func lerEpisodiosMarcados(dbClient *supabase.Client, userID string, malIDs []string) (map[int]map[int]bool, error) {
	linhas, err := paginar[episodioMarcado](func(de, ate int) ([]byte, error) {
		consulta := dbClient.From("episode_progress").
			Select("mal_id,episode_number", "", false).
			Eq("user_id", userID)
		if len(malIDs) > 0 {
			consulta = consulta.In("mal_id", malIDs)
		}
		dados, _, err := consulta.
			Order("id", &postgrest.OrderOpts{Ascending: true}).
			Range(de, ate, "").
			Execute()
		return dados, err
	}, tamanhoPaginaPostgREST)
	if err != nil {
		return nil, err
	}

	marcados := make(map[int]map[int]bool)
	for _, l := range linhas {
		if marcados[l.MalID] == nil {
			marcados[l.MalID] = make(map[int]bool)
		}
		marcados[l.MalID][l.EpisodeNumber] = true
	}
	return marcados, nil
}
