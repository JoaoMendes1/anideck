package ia

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// O Groq é o modelo principal para sinopse e tags: no plano grátis ele aceita cerca de
// 1.000 pedidos por dia, contra 20 de cada modelo Gemini. Ele não pesquisa na web, então
// não serve para episódios. Só é usado se GROQ_API_KEY estiver no .env.
const (
	ModeloGroq = "openai/gpt-oss-120b"
	urlGroq    = "https://api.groq.com/openai/v1/chat/completions"
)

// GroqDisponivel diz se a chave do Groq está configurada.
func GroqDisponivel() bool {
	return strings.TrimSpace(os.Getenv("GROQ_API_KEY")) != ""
}

// GerarCuradoria usa o Groq primeiro e o Gemini de reserva. A cota grátis do Gemini
// (20 pedidos por dia por modelo) acaba cedo e fica guardada para a pesquisa de
// episódios, que só ele faz, porque precisa de busca na web.
func GerarCuradoria(ctx context.Context, instrucao, texto string) (string, error) {
	if GroqDisponivel() {
		saida, err := GerarGroq(ctx, instrucao, texto)
		if err == nil {
			return saida, nil
		}
		if ctx.Err() != nil {
			return "", err
		}
		log.Printf("[IA] Groq falhou (%s), tentando o Gemini", resumirErro(err))
	}
	resp, err := Gerar(ctx, ConfigCuradoria(instrucao), texto)
	if err != nil {
		return "", err
	}
	return resp.Text(), nil
}

// GerarGroq chama a API do Groq (formato da OpenAI) pedindo resposta em JSON.
func GerarGroq(ctx context.Context, instrucao, texto string) (string, error) {
	corpo := map[string]any{
		"model": ModeloGroq,
		"messages": []map[string]string{
			{"role": "system", "content": instrucao},
			{"role": "user", "content": texto},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.3,
	}
	dados, err := json.Marshal(corpo)
	if err != nil {
		return "", err
	}

	tentativa, cancelar := context.WithTimeout(ctx, 90*time.Second)
	defer cancelar()
	req, err := http.NewRequestWithContext(tentativa, http.MethodPost, urlGroq, bytes.NewReader(dados))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(os.Getenv("GROQ_API_KEY")))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("falha ao chamar o Groq: %w", err)
	}
	defer resp.Body.Close()
	bruto, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return "", fmt.Errorf("falha ao ler a resposta do Groq: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		// 429 é o limite grátis do dia ou do minuto: o item vai para "Com erro" e o
		// "Tentar de novo" resolve depois. Nada é cobrado.
		return "", fmt.Errorf("Groq respondeu HTTP %d: %s", resp.StatusCode, resumirErro(errors.New(string(bruto))))
	}
	log.Printf("[IA] Resposta do modelo %s", ModeloGroq)
	return lerRespostaGroq(bruto)
}

// lerRespostaGroq tira o texto da primeira escolha da resposta.
func lerRespostaGroq(bruto []byte) (string, error) {
	var r struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(bruto, &r); err != nil {
		return "", fmt.Errorf("resposta do Groq ilegível: %w", err)
	}
	if len(r.Choices) == 0 || strings.TrimSpace(r.Choices[0].Message.Content) == "" {
		return "", errors.New("o Groq devolveu resposta vazia")
	}
	return strings.TrimSpace(r.Choices[0].Message.Content), nil
}
