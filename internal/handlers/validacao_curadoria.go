// Validação e higienização do que entra pela curadoria.
//
// A validação vive aqui, no backend, e não só no formulário do Painel: o front pode ser
// contornado com uma requisição direta, e estes campos são JSONB — o Postgres aceita
// qualquer coisa bem formada, inclusive número de episódio repetido ou `javascript:` num
// link. Quem barra é este arquivo.
package handlers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/models"
)

// SanitizarCuradoria valida e higieniza os campos JSONB de uma curadoria antes de gravar.
// Devolve erro com mensagem em português, pronta para ir ao usuário do Painel.
func SanitizarCuradoria(entrada *models.CuratedAnime) error {
	episodios, err := sanitizarEpisodios(entrada.CustomEpisodes)
	if err != nil {
		return err
	}
	entrada.CustomEpisodes = episodios

	links, err := sanitizarLinks(entrada.CustomExternalLinks)
	if err != nil {
		return err
	}
	entrada.CustomExternalLinks = links

	return nil
}

func sanitizarEpisodios(bruto json.RawMessage) (json.RawMessage, error) {
	if jsonAusente(bruto) {
		return bruto, nil
	}

	var episodios []episodioCurado
	if err := json.Unmarshal(bruto, &episodios); err != nil {
		return nil, fmt.Errorf("a lista de episódios está em formato inválido")
	}

	vistos := make(map[int]bool, len(episodios))
	for i := range episodios {
		if episodios[i].Number < 1 {
			return nil, fmt.Errorf("episódio com número inválido (%d): o número precisa ser 1 ou maior", episodios[i].Number)
		}
		// Dois episódios com o mesmo número disputariam a mesma posição na grade, e o
		// último a ser aplicado venceria — silenciosamente.
		if vistos[episodios[i].Number] {
			return nil, fmt.Errorf("o episódio %d aparece mais de uma vez", episodios[i].Number)
		}
		vistos[episodios[i].Number] = true

		// Título e imagem vão parar na tela. Passam pelo mesmo sanitizador da sinopse.
		episodios[i].Title = sanitizer.Sanitize(strings.TrimSpace(episodios[i].Title))
		episodios[i].Image = strings.TrimSpace(episodios[i].Image)
		episodios[i].AiredAt = strings.TrimSpace(episodios[i].AiredAt)

		if episodios[i].Image != "" && !urlSegura(episodios[i].Image) {
			return nil, fmt.Errorf("a imagem do episódio %d precisa começar com http:// ou https://", episodios[i].Number)
		}
	}

	return json.Marshal(episodios)
}

func sanitizarLinks(bruto json.RawMessage) (json.RawMessage, error) {
	if jsonAusente(bruto) {
		return bruto, nil
	}

	var links []linkCurado
	if err := json.Unmarshal(bruto, &links); err != nil {
		return nil, fmt.Errorf("a lista de links está em formato inválido")
	}

	for i := range links {
		links[i].Platform = sanitizer.Sanitize(strings.TrimSpace(links[i].Platform))
		links[i].URL = strings.TrimSpace(links[i].URL)

		if links[i].Platform == "" {
			return nil, fmt.Errorf("todo link precisa do nome da plataforma")
		}
		if !urlSegura(links[i].URL) {
			return nil, fmt.Errorf("o link da %s precisa começar com http:// ou https://", links[i].Platform)
		}
	}

	return json.Marshal(links)
}

// urlSegura aceita apenas http e https.
//
// O que isso barra na prática: um `javascript:alert(1)` gravado como link vira código
// executável no navegador de quem clicar no botão "Assistir". Uma lista de permissão de
// dois esquemas é mais segura que tentar enumerar o que é perigoso.
func urlSegura(bruto string) bool {
	endereco := strings.ToLower(strings.TrimSpace(bruto))
	return strings.HasPrefix(endereco, "http://") || strings.HasPrefix(endereco, "https://")
}
