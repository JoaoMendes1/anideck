// Conversão dos campos JSONB da curadoria para os formatos que o resto do app consome.
//
// São funções puras de propósito: recebem o JSON cru e o valor que viria da AniList, e
// devolvem o resultado. Sem banco, sem rede e sem estado — o que permite testar as regras de
// precedência e o posicionamento de episódios sem subir nada.
//
// Regra geral (Bloco 1): valor curado ganha; ausente cai para a fonte seguinte; presente mas
// vazio significa "curei e está vazio de propósito".
package handlers

import (
	"encoding/json"
	"log"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
)

// episodioCurado é o formato gravado em curated_animes.custom_episodes.
type episodioCurado struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	Image   string `json:"image"`
	AiredAt string `json:"aired_at"`
}

// linkCurado é o formato gravado em curated_animes.custom_external_links.
type linkCurado struct {
	Platform string `json:"platform"`
	URL      string `json:"url"`
}

// jsonAusente distingue "coluna nula" de "array vazio gravado de propósito".
// Uma coluna JSONB nula chega aqui como slice vazio ou como o literal "null".
func jsonAusente(bruto json.RawMessage) bool {
	return len(bruto) == 0 || string(bruto) == "null"
}

// ConverterEpisodios sobrepõe os episódios curados aos que vieram da AniList.
//
// A sobreposição é **por posição do episódio**, não por ordem no array: o episódio de
// `number` 7 vai para o índice 6, mesmo que seja o único item curado. Compactar a lista
// colocaria o episódio 7 na primeira posição da grade, e como `episode_progress` referencia
// o número do episódio, todo o progresso já marcado passaria a apontar para o episódio
// errado — sem erro e sem aviso (é a armadilha documentada no sql/014).
//
// Dentro de cada episódio a precedência também vale campo a campo: curar só a imagem de um
// episódio preserva o título que a AniList já trazia.
func ConverterEpisodios(bruto json.RawMessage, daAniList []anilist.StreamingEpisode) []anilist.StreamingEpisode {
	if jsonAusente(bruto) {
		return daAniList
	}

	var curados []episodioCurado
	if err := json.Unmarshal(bruto, &curados); err != nil {
		// Curadoria malformada não pode derrubar a página: cai para a AniList e registra.
		log.Printf("[CURADORIA] custom_episodes inválido, usando os episódios da AniList: %v", err)
		return daAniList
	}

	resultado := make([]anilist.StreamingEpisode, len(daAniList))
	copy(resultado, daAniList)

	for _, ep := range curados {
		// Número inválido não tem posição na grade. Ignorar é melhor que adivinhar: colocar
		// no fim deslocaria a numeração, que é exatamente o que não pode acontecer.
		if ep.Number < 1 {
			log.Printf("[CURADORIA] episódio curado com número inválido (%d), ignorado", ep.Number)
			continue
		}

		indice := ep.Number - 1
		for len(resultado) <= indice {
			resultado = append(resultado, anilist.StreamingEpisode{})
		}

		if ep.Title != "" {
			resultado[indice].Title = ep.Title
		}
		if ep.Image != "" {
			resultado[indice].Thumbnail = ep.Image
		}
		if ep.AiredAt != "" {
			resultado[indice].AiredAt = ep.AiredAt
		}
	}

	return resultado
}

// ConverterLinks troca os links de streaming da AniList pelos curados.
//
// Aqui é substituição e não sobreposição, ao contrário dos episódios: o motivo de curar um
// link é justamente que o da AniList está quebrado, então mantê-lo ao lado do correto
// devolveria o problema para o usuário. Um array vazio gravado de propósito significa "esta
// obra não tem onde assistir" e zera a lista.
func ConverterLinks(bruto json.RawMessage, daAniList []anilist.StreamingLink) []anilist.StreamingLink {
	if jsonAusente(bruto) {
		return daAniList
	}

	var curados []linkCurado
	if err := json.Unmarshal(bruto, &curados); err != nil {
		log.Printf("[CURADORIA] custom_external_links inválido, usando os links da AniList: %v", err)
		return daAniList
	}

	links := make([]anilist.StreamingLink, 0, len(curados))
	for _, l := range curados {
		// Link sem URL não leva a lugar nenhum e viraria um botão morto na tela.
		if l.URL == "" {
			continue
		}
		links = append(links, anilist.StreamingLink{Name: l.Platform, URL: l.URL})
	}
	return links
}

// formatosDeEstreia cobre o que o PostgREST devolve para uma coluna TIMESTAMPTZ e também a
// data simples, caso o valor tenha sido gravado à mão pelo painel do Supabase.
var formatosDeEstreia = []string{
	time.RFC3339,
	"2006-01-02T15:04:05.999999999",
	"2006-01-02T15:04:05",
	"2006-01-02",
}

// ConverterEstreia traduz a data de estreia curada para as duas formas que o app usa:
// a data quebrada em ano/mês/dia (que a grade de episódios já sabe consumir) e o instante
// completo em ISO, para o navegador calcular a contagem regressiva no fuso certo.
//
// Devolve os valores originais quando não há curadoria ou quando o texto é ilegível.
func ConverterEstreia(bruto *string, daAniList *anilist.FuzzyDate) (*anilist.FuzzyDate, string) {
	if bruto == nil || *bruto == "" {
		return daAniList, ""
	}

	for _, formato := range formatosDeEstreia {
		instante, err := time.Parse(formato, *bruto)
		if err != nil {
			continue
		}
		data := &anilist.FuzzyDate{
			Year:  instante.Year(),
			Month: int(instante.Month()),
			Day:   instante.Day(),
		}
		return data, instante.Format(time.RFC3339)
	}

	log.Printf("[CURADORIA] custom_first_aired_at ilegível (%q), usando a data da AniList", *bruto)
	return daAniList, ""
}
