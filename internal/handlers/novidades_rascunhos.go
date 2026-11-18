package handlers

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
)

// Rascunhos de novidades escritos junto com cada entrega. Entram no banco no boot do site
// como rascunho; o admin só publica (sql/116).
//
//go:embed novidades_rascunhos.json
var rascunhosNovidadesJSON []byte

// RascunhoNovidade é um item de novidades_rascunhos.json.
type RascunhoNovidade struct {
	Chave     string `json:"chave"`
	Titulo    string `json:"titulo"`
	Categoria string `json:"categoria"`
	Resumo    string `json:"resumo"`
	Links     []struct {
		Rotulo  string `json:"rotulo"`
		Caminho string `json:"caminho"`
	} `json:"links"`
}

var categoriasNovidade = map[string]bool{"novidade": true, "correcao": true, "layout": true, "balanceamento": true}

// LerRascunhosNovidades valida o arquivo inteiro: um item errado recusa todos, para o erro
// aparecer no teste e não virar novidade quebrada no Painel.
func LerRascunhosNovidades(bruto []byte) ([]RascunhoNovidade, error) {
	var lista []RascunhoNovidade
	if err := json.Unmarshal(bruto, &lista); err != nil {
		return nil, fmt.Errorf("rascunhos de novidades: %w", err)
	}
	vistas := map[string]bool{}
	for i, r := range lista {
		switch {
		case strings.TrimSpace(r.Chave) == "":
			return nil, fmt.Errorf("rascunho %d sem chave", i)
		case vistas[r.Chave]:
			return nil, fmt.Errorf("chave repetida: %s", r.Chave)
		case len([]rune(strings.TrimSpace(r.Titulo))) < 3 || len([]rune(r.Titulo)) > 120:
			return nil, fmt.Errorf("%s: título precisa ter de 3 a 120 letras", r.Chave)
		case len([]rune(strings.TrimSpace(r.Resumo))) < 3 || len([]rune(r.Resumo)) > 2000:
			return nil, fmt.Errorf("%s: texto precisa ter de 3 a 2000 letras", r.Chave)
		case !categoriasNovidade[r.Categoria]:
			return nil, fmt.Errorf("%s: categoria inválida %q", r.Chave, r.Categoria)
		case len(r.Links) > 6:
			return nil, fmt.Errorf("%s: no máximo 6 caminhos", r.Chave)
		}
		for _, l := range r.Links {
			if strings.TrimSpace(l.Rotulo) == "" || !strings.HasPrefix(l.Caminho, "/") || strings.HasPrefix(l.Caminho, "//") {
				return nil, fmt.Errorf("%s: caminho inválido %q", r.Chave, l.Caminho)
			}
		}
		vistas[r.Chave] = true
	}
	return lista, nil
}

// ImportarRascunhosNovidades leva ao banco os rascunhos que ainda não vieram. Falha aqui só
// vai para o log: novidade nunca impede o site de subir.
func ImportarRascunhosNovidades() {
	lista, err := LerRascunhosNovidades(rascunhosNovidadesJSON)
	if err != nil {
		log.Printf("[NOVIDADES] %v", err)
		return
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		log.Printf("[NOVIDADES] service role indisponível: %v", err)
		return
	}
	novos := 0
	for _, r := range lista {
		bruto := strings.TrimSpace(client.Rpc("importar_rascunho_novidade", "", map[string]interface{}{
			"p_chave":     r.Chave,
			"p_titulo":    r.Titulo,
			"p_resumo":    r.Resumo,
			"p_categoria": r.Categoria,
			"p_links":     r.Links,
		}))
		switch bruto {
		case "true":
			novos++
		case "false":
		default:
			log.Printf("[NOVIDADES] Falha ao importar %s: %s", r.Chave, bruto)
		}
	}
	if novos > 0 {
		log.Printf("[NOVIDADES] %d rascunho(s) novo(s) prontos para publicar no Painel", novos)
	}
}
