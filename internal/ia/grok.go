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

// O Groq é a reserva gratuita do Gemini para sinopse e tags: no plano grátis ele aceita
// cerca de 1.000 pedidos por dia, contra 20 de cada modelo Gemini. Ele não pesquisa na
// web, então não serve para episódios. Só é usado se GROQ_API_KEY estiver no .env.
const (
	ModeloGroq = "openai/gpt-oss-120b"
	urlGroq    = "https://api.groq.com/openai/v1/chat/completions"
)

// GroqDisponivel diz se a chave do Groq está configurada.
func GroqDisponivel() bool {
	return strings.TrimSpace(os.Getenv("GROQ_API_KEY")) != ""
}

// GerarCuradoria tenta os Gemini e, se todos falharem, o Groq. Devolve o texto JSON com
// sinopse e tags, para o LerCuradoria interpretar.
func GerarCuradoria(ctx context.Context, instrucao, texto string) (string, error) {
	resp, err := Gerar(ctx, ConfigCuradoria(instrucao), texto)
	if err == nil {
		return resp.Text(), nil
	}
	if ctx.Err() != nil || !GroqDisponivel() {
		return "", err
	}
	log.Printf("[IA] Gemini indisponível, tentando o Groq (%s)", ModeloGroq)
	saida, errGroq := GerarGroq(ctx, instrucao, texto)
	if errGroq != nil {
		return "", fmt.Errorf("%w | groq: %s", err, resumirErro(errGroq))
	}
	return saida, nil
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