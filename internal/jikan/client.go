package jikan

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/time/rate"
)

type Client struct {
	httpClient *http.Client
	limiter    *rate.Limiter
	baseURL    string
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		limiter:    rate.NewLimiter(rate.Every(1*time.Second), 1),
		baseURL:    "https://api.jikan.moe/v4",
	}
}

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
			return nil, err
		}

		// Identifica a nossa aplicação para evitar bloqueios agressivos da Jikan API
		req.Header.Set("User-Agent", "AniDeck-App/1.0")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		
		if resp.StatusCode == http.StatusOK {
			var result AnimeSearchResponse
			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				resp.Body.Close()
				return nil, err
			}
			resp.Body.Close()
			return &result, nil
		}
		
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		return nil, fmt.Errorf("erro inesperado da API: status %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("limite de tentativas excedido")
}