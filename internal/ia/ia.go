// Package ia concentra as chamadas ao Gemini: o botão "Reescrever com IA" do Painel e o
// worker da fila de curadoria usam as mesmas funções, com o mesmo fallback de modelos.
package ia

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"
)

// Modelos em ordem de preferência: se um falha (congestionado, fora), tenta o seguinte.
var Modelos = []string{"gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"}

// ErrIndisponivel indica que todos os modelos falharam: falha de terceiro, que vira 503.
var ErrIndisponivel = errors.New("serviço de IA indisponível")

// PromptCuradoriaPadrao é usado quando app_settings.ai_curation_prompt não responde.
const PromptCuradoriaPadrao = "Você é o redator-chefe do catálogo AniDeck. Seu tom de voz é instigante, moderno e direto ao ponto. Sua função é ler sinopses frias e técnicas (que podem estar em inglês), traduzi-las e reescrevê-las transformando-as em resumos empolgantes de no máximo 2 parágrafos, sem spoilers, estritamente em Português do Brasil (pt-BR). Utilize formatação Markdown para enriquecer a leitura: destaque nomes de personagens, lugares ou facções em **negrito** e use *itálico* para termos estrangeiros ou de impacto. Você também deve sugerir até 4 tags genéricas em português (ex: Ação, Drama, Cyberpunk). Retorne APENAS um objeto JSON estrito com as chaves 'sinopse' e 'tags'."

// Gerar envia o texto ao primeiro modelo que responder e devolve a resposta inteira.
func Gerar(ctx context.Context, config *genai.GenerateContentConfig, texto string) (*genai.GenerateContentResponse, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  os.Getenv("GEMINI_API_KEY"),
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("criar cliente Gemini: %w", err)
	}

	var ultimoErro error
	for _, modelo := range Modelos {
		tentativa, cancelar := context.WithTimeout(ctx, 90*time.Second)
		resp, err := client.Models.GenerateContent(tentativa, modelo, genai.Text(texto), config)
		cancelar()
		if err == nil && resp != nil {
			log.Printf("[IA] Resposta do modelo %s", modelo)
			return resp, nil
		}
		ultimoErro = err
		log.Printf("[IA] Falha no modelo %s: %v. Tentando o próximo...", modelo, err)
	}
	return nil, fmt.Errorf("%w: %v", ErrIndisponivel, ultimoErro)
}

// ConfigCuradoria pede JSON com sinopse e tags, com temperatura baixa: curadoria é
// classificação, e o mesmo anime precisa devolver as mesmas tags.
func ConfigCuradoria(instrucao string) *genai.GenerateContentConfig {
	return &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{Parts: []*genai.Part{{Text: instrucao}}},
		ResponseMIMEType:  "application/json",
		Temperature:       genai.Ptr[float32](0.3),
	}
}

// Curadoria é a resposta de ConfigCuradoria.
type Curadoria struct {
	Sinopse string   `json:"sinopse"`
	Tags    []string `json:"tags"`
}

// LerCuradoria interpreta a resposta. Sinopse vazia é erro: não há o que revisar.
func LerCuradoria(texto string) (Curadoria, error) {
	var c Curadoria
	if err := json.Unmarshal([]byte(limparCercaJSON(texto)), &c); err != nil {
		return Curadoria{}, fmt.Errorf("resposta da IA não é o JSON esperado: %w", err)
	}
	c.Sinopse = strings.TrimSpace(c.Sinopse)
	if c.Sinopse == "" {
		return Curadoria{}, errors.New("a IA devolveu sinopse vazia")
	}
	tags := make([]string, 0, len(c.Tags))
	for _, t := range c.Tags {
		if t = strings.TrimSpace(t); t != "" {
			tags = append(tags, t)
		}
	}
	c.Tags = tags
	return c, nil
}

// limparCercaJSON tira a cerca ```json que alguns modelos põem em volta da resposta.
func limparCercaJSON(texto string) string {
	t := strings.TrimSpace(texto)
	if strings.HasPrefix(t, "```") {
		t = strings.TrimPrefix(t, "```json")
		t = strings.TrimPrefix(t, "```")
		t = strings.TrimSuffix(strings.TrimSpace(t), "```")
	}
	return strings.TrimSpace(t)
}

// Fonte é uma página que a busca do Gemini usou para responder.
type Fonte struct {
	Titulo string `json:"titulo"`
	URL    string `json:"url"`
}

// ConfigPesquisa liga a busca do Google, sem pedir JSON: a API recusa as duas coisas
// na mesma chamada (400 INVALID_ARGUMENT).
func ConfigPesquisa() *genai.GenerateContentConfig {
	return &genai.GenerateContentConfig{
		Tools:       []*genai.Tool{{GoogleSearch: &genai.GoogleSearch{}}},
		Temperature: genai.Ptr[float32](0.2),
	}
}

// FontesDaResposta lê as páginas citadas pela busca, sem repetir URL.
func FontesDaResposta(resp *genai.GenerateContentResponse) []Fonte {
	fontes := []Fonte{}
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].GroundingMetadata == nil {
		return fontes
	}
	vistas := map[string]bool{}
	for _, chunk := range resp.Candidates[0].GroundingMetadata.GroundingChunks {
		if chunk == nil || chunk.Web == nil || chunk.Web.URI == "" || vistas[chunk.Web.URI] {
			continue
		}
		vistas[chunk.Web.URI] = true
		fontes = append(fontes, Fonte{Titulo: chunk.Web.Title, URL: chunk.Web.URI})
	}
	return fontes
}

// EpisodioPesquisado é um episódio como a segunda chamada o estrutura.
type EpisodioPesquisado struct {
	Numero int    `json:"numero"`
	Titulo string `json:"titulo"`
	Data   string `json:"data"`
	Fonte  string `json:"fonte"`
}

// LinkPesquisado é uma plataforma onde o anime está disponível.
type LinkPesquisado struct {
	Plataforma string `json:"plataforma"`
	URL        string `json:"url"`
	Fonte      string `json:"fonte"`
}

// Episodios é a resposta estruturada da pesquisa de episódios, datas e onde assistir.
type Episodios struct {
	Estreia   string               `json:"estreia"`
	Episodios []EpisodioPesquisado `json:"episodios"`
	Links     []LinkPesquisado     `json:"links"`
	Ressalvas []string             `json:"ressalvas"`
}

// ConfigEstruturarEpisodios transforma o texto da pesquisa em JSON pelo schema, sem busca.
func ConfigEstruturarEpisodios() *genai.GenerateContentConfig {
	texto := &genai.Schema{Type: genai.TypeString}
	return &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		Temperature:      genai.Ptr[float32](0),
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"estreia": {Type: genai.TypeString, Description: "Data e hora da estreia do episódio 1 em RFC 3339 com fuso, ou vazio se a fonte não diz."},
				"episodios": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"numero": {Type: genai.TypeInteger},
						"titulo": {Type: genai.TypeString, Description: "Título oficial em português do Brasil, ou vazio se não foi publicado."},
						"data":   {Type: genai.TypeString, Description: "Data e hora de exibição em RFC 3339 com fuso, ou vazio."},
						"fonte":  {Type: genai.TypeString, Description: "URL da página de onde saiu o dado."},
					},
					Required: []string{"numero", "titulo", "data", "fonte"},
				}},
				"links": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"plataforma": texto,
						"url":        texto,
						"fonte":      texto,
					},
					Required: []string{"plataforma", "url", "fonte"},
				}},
				"ressalvas": {Type: genai.TypeArray, Items: texto, Description: "O que não foi encontrado, fontes que divergem e o que é estimativa."},
			},
			Required: []string{"estreia", "episodios", "links", "ressalvas"},
		},
	}
}

// LerEpisodios interpreta a resposta da segunda chamada.
func LerEpisodios(texto string) (Episodios, error) {
	var e Episodios
	if err := json.Unmarshal([]byte(limparCercaJSON(texto)), &e); err != nil {
		return Episodios{}, fmt.Errorf("resposta estruturada inválida: %w", err)
	}
	return e, nil
}
