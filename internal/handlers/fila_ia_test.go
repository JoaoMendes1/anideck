package handlers

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/JoaoMendes1/anideck/internal/ia"
	"github.com/JoaoMendes1/anideck/internal/models"
)

func TestFiltrarTagsPelaTaxonomia(t *testing.T) {
	aceitas, descartadas := filtrarTagsPelaTaxonomia(
		[]string{"Magic", "Magia", "Cyberpunk", "Environmental", " Isekai "},
		taxonomiaDeTeste,
	)
	if len(aceitas) != 2 || aceitas[0] != "Magia" || aceitas[1] != "Isekai" {
		t.Errorf("esperado [Magia Isekai], recebido %v", aceitas)
	}
	if len(descartadas) != 2 || descartadas[0] != "Cyberpunk" || descartadas[1] != "Environmental" {
		t.Errorf("esperado [Cyberpunk Environmental] descartadas, recebido %v", descartadas)
	}
}

func TestValidarConfigFila(t *testing.T) {
	if p := validarConfigFila(configFilaPadrao); p != "" {
		t.Fatalf("o padrão deveria ser válido: %s", p)
	}
	// Cada caso estraga um campo só do padrão, para a recusa ser por aquele campo.
	ruins := map[string]func(c *configFila){
		"modo":               func(c *configFila) { c.Modo = "sempre" },
		"lote":               func(c *configFila) { c.Lote = 0 },
		"intervalo":          func(c *configFila) { c.Intervalo = 5 },
		"episódios":          func(c *configFila) { c.EpisodiosPorLote = 0 },
		"sem {titulo}":       func(c *configFila) { c.PromptPesquisa = "Pesquise o anime." },
		"estruturar vazio":   func(c *configFila) { c.PromptEstruturar = "  " },
		"prompt muito longo": func(c *configFila) { c.PromptEstruturar = strings.Repeat("a", maxPromptFila+1) },
	}
	for nome, estragar := range ruins {
		c := configFilaPadrao
		estragar(&c)
		if validarConfigFila(c) == "" {
			t.Errorf("%s: deveria recusar", nome)
		}
	}
}

func TestFaixaDeEpisodios_ComecaNoPrimeiroSemTitulo(t *testing.T) {
	de, ate := faixaDeEpisodios([]episodioCurado{{Number: 1, Title: "A"}, {Number: 2, Title: "B"}, {Number: 3}}, 12)
	if de != 3 || ate != 14 {
		t.Fatalf("esperado 3 a 14, recebido %d a %d", de, ate)
	}
	if de, ate := faixaDeEpisodios(nil, 12); de != 1 || ate != 12 {
		t.Fatalf("sem episódios, esperado 1 a 12, recebido %d a %d", de, ate)
	}
}

func TestMesclarEpisodios_SoPreencheVazioENuncaRenumera(t *testing.T) {
	atuais := []episodioCurado{
		{Number: 1, Title: "Título curado", AiredAt: "2026-10-04T14:00:00Z"},
		{Number: 2},
	}
	pesquisados := []ia.EpisodioPesquisado{
		{Numero: 1, Titulo: "Outro título", Data: "2026-10-04T23:00:00+09:00"}, // mesma data em outro fuso
		{Numero: 2, Titulo: "Novo título", Data: "2026-10-11T23:00:00+09:00"},
		{Numero: 4, Titulo: "Quarto"},
		{Numero: 4, Data: "2026-10-25T23:00:00+09:00"},
		{Numero: 3},
		{Numero: 0, Titulo: "inválido"},
		{Numero: 5, Data: "11/10/2026"},
	}
	resultado, relatorio := mesclarEpisodios(atuais, pesquisados)

	if len(resultado) != 3 || resultado[0].Number != 1 || resultado[1].Number != 2 || resultado[2].Number != 4 {
		t.Fatalf("numeração errada: %+v", resultado)
	}
	if resultado[0].Title != "Título curado" {
		t.Errorf("título curado não pode ser trocado, recebido %q", resultado[0].Title)
	}
	if resultado[1].Title != "Novo título" || resultado[1].AiredAt != "2026-10-11T14:00:00Z" {
		t.Errorf("episódio 2 deveria ser preenchido em UTC, recebido %+v", resultado[1])
	}
	if resultado[2].Title != "Quarto" || resultado[2].AiredAt != "2026-10-25T14:00:00Z" {
		t.Errorf("episódio 4 repetido deveria juntar título e data, recebido %+v", resultado[2])
	}
	// Título divergente no 1, episódio 3 vazio, e o 5 com data fora do formato (que então
	// também fica sem título nem data).
	if len(relatorio) != 4 {
		t.Errorf("esperado 4 ressalvas, recebido %v", relatorio)
	}
}

func TestMesclarLinks(t *testing.T) {
	pesquisados := []ia.LinkPesquisado{
		{Plataforma: "Crunchyroll", URL: "https://crunchyroll.com/x"},
		{Plataforma: "Golpe", URL: "javascript:alert(1)"},
	}
	links, rel := mesclarLinks(nil, pesquisados)
	if len(links) != 1 || links[0].Platform != "Crunchyroll" || len(rel) != 1 {
		t.Fatalf("esperado só o link seguro, recebido %+v %v", links, rel)
	}
	atuais := []linkCurado{{Platform: "Netflix", URL: "https://netflix.com/y"}}
	links, rel = mesclarLinks(atuais, pesquisados)
	if len(links) != 1 || links[0].Platform != "Netflix" || len(rel) != 1 {
		t.Fatalf("link curado deveria ser mantido, recebido %+v %v", links, rel)
	}
}

func TestCamposParaAplicar_SinopseETags(t *testing.T) {
	resultado, _ := json.Marshal(resultadoSinopseTags{Sinopse: "Nova", Tags: []string{"Magia", "Inventada"}})
	mudancas, _, err := camposParaAplicar(tipoSinopseTags, resultado, models.CuratedAnime{}, nil, taxonomiaDeTeste)
	if err != nil {
		t.Fatal(err)
	}
	tags, _ := mudancas["custom_tags"].([]string)
	if mudancas["custom_synopsis"] != "Nova" || len(tags) != 1 || tags[0] != "Magia" {
		t.Fatalf("esperado sinopse e só a tag da taxonomia, recebido %+v", mudancas)
	}

	soSinopse, _, _ := camposParaAplicar(tipoSinopseTags, resultado, models.CuratedAnime{}, []string{"sinopse"}, taxonomiaDeTeste)
	if _, temTags := soSinopse["custom_tags"]; temTags || soSinopse["custom_synopsis"] != "Nova" {
		t.Fatalf("pedido só de sinopse não pode mexer nas tags: %+v", soSinopse)
	}
}

func TestCamposParaAplicar_EpisodiosNaoTrocaEstreiaCurada(t *testing.T) {
	estreia := "2026-01-01T00:00:00Z"
	curado := models.CuratedAnime{CustomFirstAiredAt: &estreia}
	resultado, _ := json.Marshal(resultadoEpisodios{Pesquisa: &ia.Episodios{
		Estreia:   "2026-10-04T23:00:00+09:00",
		Episodios: []ia.EpisodioPesquisado{{Numero: 1, Titulo: "Um"}},
	}})
	mudancas, _, err := camposParaAplicar(tipoEpisodios, resultado, curado, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, trocou := mudancas["custom_first_aired_at"]; trocou {
		t.Error("estreia curada não pode ser trocada")
	}
	if _, temEpisodios := mudancas["custom_episodes"]; !temEpisodios {
		t.Error("o episódio pesquisado deveria entrar")
	}
}

func TestCamposParaAplicar_SemPesquisaEstruturada(t *testing.T) {
	resultado, _ := json.Marshal(resultadoEpisodios{TextoBruto: "só o texto"})
	if _, _, err := camposParaAplicar(tipoEpisodios, resultado, models.CuratedAnime{}, nil, nil); err == nil {
		t.Fatal("sem a pesquisa estruturada não há o que aplicar")
	}
}
