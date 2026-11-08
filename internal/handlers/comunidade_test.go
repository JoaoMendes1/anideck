package handlers

import "testing"

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
