package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func TestMontarConversa(t *testing.T) {
	cinco := 125
	linhas := []linhaComentario{
		{ID: "c1", UserID: "ana", Texto: "primeiro", CreatedAt: "2026-11-08T10:00:00Z"},
		{ID: "c2", UserID: "bia", Texto: "do bloqueado", CreatedAt: "2026-11-08T11:00:00Z"},
		{ID: "c3", UserID: "eu", Texto: "meu", MomentoSeg: &cinco, CreatedAt: "2026-11-08T12:00:00Z"},
		{ID: "c4", UserID: "sem_perfil", Texto: "anônimo", CreatedAt: "2026-11-08T09:00:00Z"},
	}
	linhas[0].CommentLikes = append(linhas[0].CommentLikes, struct {
		Count int `json:"count"`
	}{Count: 3})

	autores := map[string]autorComentario{"ana": {Handle: "ana", Nome: "Ana"}, "eu": {Handle: "eu_mesmo", Nome: "Eu"}}
	bloqueados := map[string]bool{"bia": true}
	curtidos := map[string]bool{"c1": true}

	lista := montarConversa(linhas, autores, bloqueados, curtidos, "eu", "")
	if len(lista) != 3 {
		t.Fatalf("o comentário de quem foi bloqueado deve sumir: %d itens", len(lista))
	}
	if lista[0].ID != "c1" || lista[0].Curtidas != 3 || !lista[0].CurtidoPorMim {
		t.Errorf("curtidas do c1 erradas: %+v", lista[0])
	}
	if !lista[1].Meu || lista[1].MomentoSeg == nil || *lista[1].MomentoSeg != 125 {
		t.Errorf("o comentário próprio deve vir marcado como meu e com o minuto: %+v", lista[1])
	}
	if lista[2].Autor.Nome != "Membro" || lista[2].Autor.Handle != "" {
		t.Errorf("autor sem perfil vira 'Membro' sem link: %+v", lista[2].Autor)
	}

	populares := montarConversa(linhas, autores, bloqueados, curtidos, "eu", "populares")
	if populares[0].ID != "c1" || populares[1].ID != "c3" {
		t.Errorf("populares: mais curtido primeiro, empate pelo mais recente; recebido %s, %s", populares[0].ID, populares[1].ID)
	}
}

func TestAgruparDenuncias(t *testing.T) {
	denuncias := []denunciaBruta{
		{CommentID: "a", Motivo: "spoiler", CreatedAt: "2026-11-08T10:00:00Z"},
		{CommentID: "b", Motivo: "ofensa", Detalhe: "xingou", CreatedAt: "2026-11-08T11:00:00Z"},
		{CommentID: "b", Motivo: "ofensa", CreatedAt: "2026-11-08T12:00:00Z"},
		{CommentID: "b", Motivo: "spam", CreatedAt: "2026-11-08T09:00:00Z"},
		{CommentID: "apagado", Motivo: "spam", CreatedAt: "2026-11-08T13:00:00Z"},
	}
	comentarios := map[string]comentarioDenunciado{
		"a": {ID: "a", UserID: "u1", Texto: "x"},
		"b": {ID: "b", UserID: "u2", Texto: "y"},
	}
	autores := map[string]autorComentario{"u2": {Handle: "dois", Nome: "Dois"}}

	fila := agruparDenuncias(denuncias, comentarios, autores)
	if len(fila) != 2 {
		t.Fatalf("comentário já apagado sai da fila: %d itens", len(fila))
	}
	b := fila[0]
	if b.Comentario.ID != "b" || b.Denuncias != 3 || b.Motivos["ofensa"] != 2 || b.Motivos["spam"] != 1 {
		t.Errorf("o mais denunciado vem primeiro com os motivos somados: %+v", b)
	}
	if b.PrimeiraEm != "2026-11-08T09:00:00Z" || b.UltimaEm != "2026-11-08T12:00:00Z" || len(b.Detalhes) != 1 {
		t.Errorf("datas e detalhes do grupo errados: %+v", b)
	}
	if fila[1].Autor.Nome != "Membro sem perfil público" {
		t.Errorf("autor sem perfil precisa de rótulo: %+v", fila[1].Autor)
	}
}

func TestValidarNomeExibicao(t *testing.T) {
	if nome, err := validarNomeExibicao("  João Mendes  "); err != "" || nome != "João Mendes" {
		t.Errorf("nome válido falhou: %q %q", nome, err)
	}
	if _, err := validarNomeExibicao("   "); err == "" {
		t.Errorf("nome vazio deveria falhar")
	}
	if _, err := validarNomeExibicao(strings.Repeat("ã", 41)); err == "" {
		t.Errorf("nome com 41 runas deveria falhar")
	}
	if nome, err := validarNomeExibicao(strings.Repeat("ã", 40)); err != "" || len([]rune(nome)) != 40 {
		t.Errorf("nome com 40 runas deveria passar: %d %q", len([]rune(nome)), err)
	}
}

func TestHandleAtualizarNomeExibicao(t *testing.T) {
	hSemLogin := &ComunidadeHandler{}
	rec := httptest.NewRecorder()
	hSemLogin.HandleAtualizarNomeExibicao(rec, httptest.NewRequest(http.MethodPut, "/api/perfil/nome", strings.NewReader(`{"nome":"João"}`)))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("sem login esperava 401, veio %d", rec.Code)
	}

	var atualizouProfiles bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/rest/v1/profiles"):
			w.Write([]byte(`[{"handle":"joao","nome":"Antigo","bio":"","vitrine":[],"publico":true,"mostrar_atividade":true}]`))
		case r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/rest/v1/profiles"):
			atualizouProfiles = true
			w.WriteHeader(http.StatusNoContent)
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/rest/v1/"):
			w.Write([]byte(`[]`))
		default:
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{}`))
		}
	}))
	defer srv.Close()

	t.Setenv("SUPABASE_URL", srv.URL)
	t.Setenv("SUPABASE_ANON_KEY", "anon-teste")

	var syncedID, syncedNome string
	h := &ComunidadeHandler{
		SincronizarNomeAuth: func(userID, nome string) error {
			syncedID = userID
			syncedNome = nome
			return nil
		},
	}

	req := func(body string) *http.Request {
		r := httptest.NewRequest(http.MethodPut, "/api/perfil/nome", strings.NewReader(body))
		ctx := context.WithValue(r.Context(), middleware.UserIDKey, "u-123")
		ctx = context.WithValue(ctx, middleware.TokenKey, "tok-123")
		return r.WithContext(ctx)
	}

	// Erro de validação: nome vazio -> 400
	recBad := httptest.NewRecorder()
	h.HandleAtualizarNomeExibicao(recBad, req(`{"nome":"  "}`))
	if recBad.Code != http.StatusBadRequest {
		t.Fatalf("nome vazio esperava 400, veio %d", recBad.Code)
	}

	// Caminho feliz: atualiza profiles.nome e sincroniza display_name no auth
	recOK := httptest.NewRecorder()
	h.HandleAtualizarNomeExibicao(recOK, req(`{"nome":"  Novo Nome  "}`))
	if recOK.Code != http.StatusOK {
		t.Fatalf("esperava 200, veio %d (%s)", recOK.Code, recOK.Body.String())
	}
	if !atualizouProfiles {
		t.Errorf("deveria atualizar public.profiles.nome quando existe perfil")
	}
	if syncedID != "u-123" || syncedNome != "Novo Nome" {
		t.Errorf("auth sync incorreto: %q %q", syncedID, syncedNome)
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(recOK.Body.Bytes(), &resp); err != nil || resp["nome"] != "Novo Nome" {
		t.Errorf("resposta inesperada: %s (%v)", recOK.Body.String(), err)
	}

	// Serviço de autenticação fora retorna 503
	hFalha := &ComunidadeHandler{
		SincronizarNomeAuth: func(_, _ string) error {
			return errors.New("timeout")
		},
	}
	recErr := httptest.NewRecorder()
	hFalha.HandleAtualizarNomeExibicao(recErr, req(`{"nome":"Outro"}`))
	if recErr.Code != http.StatusServiceUnavailable {
		t.Fatalf("falha no serviço auth esperava 503, veio %d", recErr.Code)
	}
}

func TestHandleComentar_ContemSpoiler(t *testing.T) {
	var bodyEnviado map[string]interface{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/rest/v1/episode_comments") {
			_ = json.NewDecoder(r.Body).Decode(&bodyEnviado)
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`[{"id":"c1","user_id":"u-spoiler","texto":"||morre no final||","contem_spoiler":true,"created_at":"2026-11-17T12:00:00Z"}]`))
			return
		}
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/rest/v1/profiles") {
			w.Write([]byte(`[{"handle":"joao","nome":"João","bio":"","vitrine":[],"publico":true,"mostrar_atividade":true}]`))
			return
		}
		w.Write([]byte(`[]`))
	}))
	defer srv.Close()

	t.Setenv("SUPABASE_URL", srv.URL)
	t.Setenv("SUPABASE_ANON_KEY", "anon-teste")

	r := chi.NewRouter()
	h := &ComunidadeHandler{}
	r.Post("/api/anime/{id}/episodios/{n}/comentarios", h.HandleComentar)

	req := httptest.NewRequest(http.MethodPost, "/api/anime/21/episodios/3/comentarios", strings.NewReader(`{"texto":"||morre no final||","contem_spoiler":true}`))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "u-spoiler")
	ctx = context.WithValue(ctx, middleware.TokenKey, "tok-spoiler")
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("esperava 201, veio %d (%s)", rec.Code, rec.Body.String())
	}
	if bodyEnviado["contem_spoiler"] != true {
		t.Errorf("contem_spoiler deveria ir para o banco como true, veio %#v", bodyEnviado["contem_spoiler"])
	}
	var resp comentarioDaConversa
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("resposta JSON inválida: %v", err)
	}
	if !resp.ContemSpoiler || resp.Texto != "||morre no final||" {
		t.Errorf("resposta não preservou contem_spoiler/texto: %+v", resp)
	}
}
