package jikan

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
	"log"

	"golang.org/x/time/rate"
)

type Client struct {
	httpClient *http.Client
	limiter    *rate.Limiter
	baseURL    string
}

func NewClient() *Client {
	return &Client{
		// Aumentamos o timeout para 15s conforme sugerido na auditoria
		httpClient: &http.Client{Timeout: 15 * time.Second},
		limiter:    rate.NewLimiter(rate.Every(1*time.Second), 1),
		baseURL:    "https://api.jikan.moe/v4",
	}
}

// SearchAnime busca animes por texto
func (c *Client) SearchAnime(ctx context.Context, query string) (*AnimeSearchResponse, error) {
	err := c.limiter.Wait(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro no rate limiter: %w", err)
	}

	safeQuery := url.QueryEscape(query)
	targetURL := fmt.Sprintf("%s/anime?q=%s", c.baseURL, safeQuery)

	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
		if err != nil {
			return nil, fmt.Errorf("erro ao criar requisição: %w", err) // Erro embrulhado
		}

		req.Header.Set("User-Agent", "AniDeck-App/1.0")
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("erro ao executar requisição HTTP: %w", err) // Erro embrulhado
		}

		if resp.StatusCode == http.StatusOK {
			var result AnimeSearchResponse
			err := json.NewDecoder(resp.Body).Decode(&result)
			resp.Body.Close()
			if err != nil {
				return nil, fmt.Errorf("erro ao decodificar JSON: %w", err)
			}
			return &result, nil
		}

		resp.Body.Close() // Fechamento manual (Previne vazamento de memória em loops)

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			// Backoff exponencial (1s, 2s, 4s)
			sleepTime := time.Duration(1<<(attempt-1)) * time.Second
			time.Sleep(sleepTime)
			continue
		}

		return nil, fmt.Errorf("erro inesperado da API: status %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("limite de tentativas excedido na Jikan API")
}

// GetAnimeById busca os detalhes ricos do anime usando a rota /full
func (c *Client) GetAnimeById(ctx context.Context, id string) (*AnimeByIdResponse, error) {
	err := c.limiter.Wait(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro no rate limiter: %w", err)
	}

	// Correção da auditoria aplicada: usamos /full
	targetURL := fmt.Sprintf("%s/anime/%s/full", c.baseURL, id)

	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
		if err != nil {
			return nil, fmt.Errorf("erro ao criar requisição: %w", err)
		}

		req.Header.Set("User-Agent", "AniDeck-App/1.0")
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("erro ao executar requisição HTTP: %w", err)
		}

		if resp.StatusCode == http.StatusOK {
			var result AnimeByIdResponse
			err := json.NewDecoder(resp.Body).Decode(&result)
			resp.Body.Close()
			if err != nil {
				return nil, fmt.Errorf("erro ao decodificar JSON: %w", err)
			}
			return &result, nil
		}

		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			sleepTime := time.Duration(1<<(attempt-1)) * time.Second
			time.Sleep(sleepTime)
			continue
		}

		return nil, fmt.Errorf("erro inesperado da API: status %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("limite de tentativas excedido na Jikan API")
}

// GetAnimeStatistics busca a distribuição de notas para o Histograma
func (c *Client) GetAnimeStatistics(ctx context.Context, id string) (*AnimeStatisticsResponse, error) {
	err := c.limiter.Wait(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro no rate limiter: %w", err)
	}

	targetURL := fmt.Sprintf("%s/anime/%s/statistics", c.baseURL, id)

	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
		if err != nil {
			return nil, fmt.Errorf("erro ao criar requisição: %w", err)
		}

		req.Header.Set("User-Agent", "AniDeck-App/1.0")
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("erro ao executar requisição HTTP: %w", err)
		}

		if resp.StatusCode == http.StatusOK {
			var result AnimeStatisticsResponse
			err := json.NewDecoder(resp.Body).Decode(&result)
			resp.Body.Close()
			if err != nil {
				return nil, fmt.Errorf("erro ao decodificar JSON: %w", err)
			}
			return &result, nil
		}

		resp.Body.Close()

		// LOG TEMPORÁRIO — remover depois de descobrir a causa real
        log.Printf("[DEBUG JIKAN] status=%d tentativa=%d", resp.StatusCode, attempt)

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			sleepTime := time.Duration(1<<(attempt-1)) * time.Second
			time.Sleep(sleepTime)
			continue
		}

		return nil, fmt.Errorf("erro inesperado da API: status %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("limite de tentativas excedido na Jikan API")
}