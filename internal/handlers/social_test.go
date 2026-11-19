package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMontarEventos_RetratoSemIdECursor(t *testing.T) {
	linhas := []linhaEvento{
		{Tipo: "comentou", Quando: "2026-11-17T12:00:00Z", AutorID: "u1", AutorHandle: "beto", AutorNome: "Beto", AutorNivel: 15, AutorAvatar: json.RawMessage(`{"fundo":"x"}`), MalID: 1, Episodio: 2, TextoOculto: true, ContemSpoiler: false},
		{Tipo: "comentou", Quando: "2026-11-17T11:30:00Z", AutorID: "u1", AutorHandle: "beto", AutorNome: "Beto", AutorNivel: 15, MalID: 1, Episodio: 1, Texto: "Spoiler aqui", TextoOculto: false, ContemSpoiler: true},
		{Tipo: "episodios", Quando: "2026-11-17T11:00:00Z", AutorID: "u2", AutorHandle: "ana", AutorNome: "Ana", AutorNivel: 0, AutorAvatar: json.RawMessage(`{}`), MalID: 1, Episodio: 1, EpisodioAte: 3},
	}
	retratos := map[string]retratoDoMembro{"u1": {Base: "maga_agua"}}
	pagina := montarEventos(linhas, retratos, nil, 3)

	if len(pagina.Eventos) != 3 {
		t.Fatalf("esperava 3 eventos, veio %d", len(pagina.Eventos))
	}
	if !pagina.Eventos[1].ContemSpoiler {
		t.Errorf("ContemSpoiler deveria ser preservado em montarEventos: %+v", pagina.Eventos[1])
	}
	if pagina.Proximo != "2026-11-17T11:00:00Z" {
		t.Errorf("página cheia deveria trazer o cursor do último evento, veio %q", pagina.Proximo)
	}
	b := pagina.Eventos[0].Autor
	if b.PersonagemBase != "maga_agua" || string(b.Avatar) != `{"fundo":"x"}` || b.Estagio == "" {
		t.Errorf("retrato de Beto incompleto: %+v", b)
	}
	a := pagina.Eventos[2].Autor
	if a.Nivel != 1 || a.Avatar != nil {
		t.Errorf("nível 0 vira 1 e avatar vazio fica de fora: %+v", a)
	}
	corpo, _ := json.Marshal(pagina)
	if containsAny(string(corpo), "u1", "u2", "autor_id") {
		t.Errorf("a resposta não pode levar o id do autor: %s", corpo)
	}
	if montarEventos(linhas[:1], nil, nil, 2).Proximo != "" {
		t.Errorf("página incompleta não tem próxima")
	}
}

func containsAny(s string, termos ...string) bool {
	for _, t := range termos {
		if strings.Contains(s, t) {
			return true
		}
	}
	return false
}

func TestCursorValido(t *testing.T) {
	casos := map[string]bool{
		"":                                 true,
		"2026-11-17T12:00:00Z":             true,
		"2026-11-17T12:00:00.123456+00:00": true,
		"ontem":                            false,
		"2026-11-17' OR 1=1":               false,
	}
	for entrada, quer := range casos {
		if _, ok := cursorValido(entrada); ok != quer {
			t.Errorf("cursorValido(%q) = %v, quer %v", entrada, ok, quer)
		}
	}
}

func TestResumoDaResposta(t *testing.T) {
	if r, ok := resumoDaResposta(`{"seguidores":3,"seguindo":1,"eu_sigo":true,"ele_me_segue":true,"amigos":true,"sou_eu":false,"mostra_atividade":true}`); !ok || r.Seguidores != 3 || !r.EuSigo || !r.EleMeSegue || !r.Amigos {
		t.Errorf("resumo válido mal lido: %+v %v", r, ok)
	}
	for _, bruto := range []string{"null", "", `{"code":"P0002","message":"Membro não encontrado."}`, "[]"} {
		if _, ok := resumoDaResposta(bruto); ok {
			t.Errorf("resumoDaResposta(%q) deveria falhar", bruto)
		}
	}
}

func TestSocial_SemLoginRecusa(t *testing.T) {
	h := &SocialHandler{}
	for nome, handler := range map[string]http.HandlerFunc{"feed": h.HandleFeed, "seguir": h.HandleSeguir} {
		w := httptest.NewRecorder()
		handler(w, httptest.NewRequest(http.MethodPost, "/", nil))
		if w.Code != http.StatusUnauthorized {
			t.Errorf("%s sem login: esperado 401, veio %d", nome, w.Code)
		}
	}
}
