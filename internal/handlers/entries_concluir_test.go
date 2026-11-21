package handlers

import (
	"github.com/JoaoMendes1/anideck/internal/models"
	"encoding/json"
	"reflect"
	"testing"
)

func marcados(n ...int) map[int]bool {
	m := map[int]bool{}
	for _, x := range n {
		m[x] = true
	}
	return m
}

func TestDeveConcluir(t *testing.T) {
	quinze := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15}
	todos := marcados(quinze...)
	casos := []struct {
		nome       string
		status     string
		numeros    []int
		marcados   map[int]bool
		total      int
		finalizado bool
		quer       bool
	}{
		{"curadoria com 15, AniList 13, tudo visto", "Assistindo", quinze, todos, 13, false, true},
		{"Em Dia também conclui", "Em Dia", quinze, todos, 15, false, true},
		{"falta um episódio da curadoria", "Assistindo", quinze, marcados(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14), 13, false, false},
		{"em lançamento sem total: só os lançados não basta", "Em Dia", []int{1, 2, 3}, marcados(1, 2, 3), 0, false, false},
		{"em lançamento com total maior", "Assistindo", []int{1, 2, 3}, marcados(1, 2, 3), 12, false, false},
		{"sem total, mas a curadoria diz que terminou", "Assistindo", []int{1, 2}, marcados(1, 2), 0, true, true},
		{"Quero Assistir não muda aqui", "Quero Assistir", quinze, todos, 13, false, false},
		{"Dropado continua Dropado", "Dropado", quinze, todos, 13, false, false},
		{"sem lista de episódios", "Assistindo", nil, todos, 13, false, false},
	}
	for _, c := range casos {
		if got := DeveConcluir(c.status, c.numeros, c.marcados, c.total, c.finalizado); got != c.quer {
			t.Errorf("%s: esperava %v, veio %v", c.nome, c.quer, got)
		}
	}
}

func TestNumerosDaCuradoria(t *testing.T) {
	if nums, ok := numerosDaCuradoria(nil); ok || nums != nil {
		t.Fatalf("curado nil deveria retornar (nil, false), veio (%v, %v)", nums, ok)
	}
	if nums, ok := numerosDaCuradoria(&models.CuratedAnime{CustomEpisodes: json.RawMessage("null")}); ok || nums != nil {
		t.Fatalf("CustomEpisodes null deveria retornar (nil, false), veio (%v, %v)", nums, ok)
	}
	curado := &models.CuratedAnime{
		CustomEpisodes: json.RawMessage(`[{"number":1},{"number":0},{"number":2},{"number":13}]`),
	}
	nums, ok := numerosDaCuradoria(curado)
	if !ok {
		t.Fatal("esperava ok=true para curado válido")
	}
	if !reflect.DeepEqual(nums, []int{1, 2, 13}) {
		t.Fatalf("esperava [1 2 13], veio %v", nums)
	}
}
