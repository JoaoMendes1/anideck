package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func TestParsearXMLMyAnimeList(t *testing.T) {
	xmlExemplo := `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
	<anime>
		<series_animedb_id>52991</series_animedb_id>
		<series_title><![CDATA[Sousou no Frieren]]></series_title>
		<my_watched_episodes>28</my_watched_episodes>
		<my_score>10</my_score>
		<my_status>Completed</my_status>
	</anime>
	<anime>
		<series_animedb_id>21</series_animedb_id>
		<series_title>One Piece</series_title>
		<my_watched_episodes>1100</my_watched_episodes>
		<my_score>9</my_score>
		<my_status>Watching</my_status>
	</anime>
	<anime>
		<series_animedb_id>9999</series_animedb_id>
		<series_title>Pausado</series_title>
		<my_watched_episodes>4</my_watched_episodes>
		<my_score>0</my_score>
		<my_status>On-Hold</my_status>
	</anime>
</myanimelist>`

	itens, err := ParsearXMLMyAnimeList([]byte(xmlExemplo))
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(itens) != 3 {
		t.Fatalf("esperava 3 itens, veio %d", len(itens))
	}
	if itens[0].MalID != 52991 || itens[0].Status != "Completo" || itens[0].EpisodiosAssistidos != 28 || itens[0].Nota != 10 {
		t.Fatalf("item 0 incorreto: %+v", itens[0])
	}
	if itens[1].Status != "Assistindo" {
		t.Fatalf("esperava Assistindo, veio %s", itens[1].Status)
	}
	if itens[2].Status != "Quero Assistir" {
		t.Fatalf("esperava Quero Assistir para On-Hold, veio %s", itens[2].Status)
	}
}

func TestMontarLinhasProgressoLote_WatchedAtNuloExplicito(t *testing.T) {
	jaMarcados := map[int]bool{2: true}
	linhas := MontarLinhasProgressoLote("user-abc", 52991, 3, jaMarcados)
	if len(linhas) != 2 {
		t.Fatalf("esperava 2 linhas (pulando ep 2), veio %d", len(linhas))
	}
	for _, l := range linhas {
		val, existeChave := l["watched_at"]
		if !existeChave {
			t.Fatalf("chave watched_at obrigatoria para nao acionar DEFAULT now() no PostgREST")
		}
		if val != nil {
			t.Fatalf("watched_at deveria ser nil, veio %v", val)
		}
	}
}

func TestHandleImportMAL(t *testing.T) {
	orig := executarImportacaoMAL
	t.Cleanup(func() { executarImportacaoMAL = orig })

	h := &EntriesHandler{}

	t.Run("rejeita sem autenticacao", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/entries/import/mal", bytes.NewBufferString(`{}`))
		rec := httptest.NewRecorder()
		h.HandleImportMAL(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("esperava 401, veio %d", rec.Code)
		}
	})

	t.Run("importa com sucesso extraindo user_id do JWT", func(t *testing.T) {
		executarImportacaoMAL = func(token, userID string, itens []ItemImportacaoMAL, opcoes OpcoesImportacaoMAL) (ResumoImportacaoMAL, error) {
			if userID != "u-jwt" || len(itens) != 1 || !opcoes.ImportarNotas {
				t.Fatalf("chamada inesperada: user=%s len=%d opcoes=%+v", userID, len(itens), opcoes)
			}
			return ResumoImportacaoMAL{
				TotalNoArquivo:       1,
				Importados:           1,
				EpisodiosRegistrados: 12,
			}, nil
		}

		corpo, _ := json.Marshal(map[string]interface{}{
			"xml":               `<myanimelist><anime><series_animedb_id>1</series_animedb_id><series_title>Cowboy Bebop</series_title><my_watched_episodes>12</my_watched_episodes><my_score>9</my_score><my_status>Watching</my_status></anime></myanimelist>`,
			"importar_notas":     true,
			"ignorar_duplicados": true,
		})
		ctx := context.WithValue(context.Background(), middleware.TokenKey, "tok")
		ctx = context.WithValue(ctx, middleware.UserIDKey, "u-jwt")
		req := httptest.NewRequest(http.MethodPost, "/api/entries/import/mal", bytes.NewReader(corpo)).WithContext(ctx)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		h.HandleImportMAL(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("esperava 200, veio %d (%s)", rec.Code, rec.Body.String())
		}
	})
}
