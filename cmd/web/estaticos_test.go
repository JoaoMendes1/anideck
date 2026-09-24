package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// montarDist cria um client/dist de mentira: o index, um asset com hash e o service worker.
func montarDist(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	arquivos := map[string]string{
		"index.html":             "<html>indice</html>",
		"assets/index-abc123.js": "console.log('app')",
		"sw.js":                  "self.addEventListener('push', () => {})",
	}
	for nome, conteudo := range arquivos {
		caminho := filepath.Join(dir, nome)
		if err := os.MkdirAll(filepath.Dir(caminho), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(caminho, []byte(conteudo), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestServirEstaticos(t *testing.T) {
	handler := servirEstaticos(montarDist(t))

	casos := []struct {
		nome          string
		caminho       string
		cacheEsperado string
		corpoContem   string
	}{
		{"asset com hash fica um ano em cache", "/assets/index-abc123.js", "public, max-age=31536000, immutable", "console.log('app')"},
		{"asset de deploy antigo cai no index sem immutable", "/assets/index-antigo.js", "no-cache", "indice"},
		{"raiz entrega o index", "/", "no-cache", "indice"},
		{"rota da SPA entrega o index", "/deck", "no-cache", "indice"},
		{"service worker é conferido a cada visita", "/sw.js", "no-cache", "addEventListener"},
		{"pasta não é listada, cai no index", "/assets/", "no-cache", "indice"},
	}

	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			rec := httptest.NewRecorder()
			handler(rec, httptest.NewRequest(http.MethodGet, c.caminho, nil))

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, esperado 200", rec.Code)
			}
			if got := rec.Header().Get("Cache-Control"); got != c.cacheEsperado {
				t.Errorf("Cache-Control = %q, esperado %q", got, c.cacheEsperado)
			}
			if !strings.Contains(rec.Body.String(), c.corpoContem) {
				t.Errorf("corpo = %q, esperado conter %q", rec.Body.String(), c.corpoContem)
			}
		})
	}
}
