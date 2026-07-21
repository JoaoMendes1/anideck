package jikan

import (
	"context"
	"strings"
	"testing"
)

func TestSearchAnime(t *testing.T) {
	client := NewClient()

	resp, err := client.SearchAnime(context.Background(), "naruto")
	
	if err != nil {
		// Se o erro for especificamente o nosso limite de tentativas (bloqueio da API),
		// nós pulamos o teste em vez de falhar, pois a culpa não é do nosso código.
		if strings.Contains(err.Error(), "limite de tentativas excedido") {
			t.Skip("Teste pulado: A Jikan API está bloqueando nosso IP temporariamente (Rate Limit).")
		}
		t.Fatalf("não esperava erro na busca, mas obteve: %v", err)
	}

	if resp == nil || len(resp.Data) == 0 {
		t.Fatal("esperava receber resultados da busca, mas a lista veio vazia")
	}

	if resp.Data[0].Title == "" {
		t.Error("esperava que o anime tivesse um título, mas veio vazio")
	}
}