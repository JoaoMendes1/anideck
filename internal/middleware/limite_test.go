package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestLimitadorPorIPPermiteAteOMaximoNaJanela(t *testing.T) {
	l := NovoLimitadorPorIP(3, time.Minute)
	agora := time.Date(2026, 11, 15, 10, 0, 0, 0, time.UTC)

	for i := 1; i <= 3; i++ {
		if ok, _ := l.Permitir("1.1.1.1", agora); !ok {
			t.Fatalf("requisição %d deveria passar", i)
		}
	}
	ok, espera := l.Permitir("1.1.1.1", agora.Add(10*time.Second))
	if ok {
		t.Fatal("a quarta requisição na mesma janela deveria ser recusada")
	}
	if espera != 50*time.Second {
		t.Fatalf("espera = %v, queria 50s", espera)
	}
}

func TestLimitadorPorIPContaCadaIPSeparado(t *testing.T) {
	l := NovoLimitadorPorIP(1, time.Minute)
	agora := time.Now()

	if ok, _ := l.Permitir("1.1.1.1", agora); !ok {
		t.Fatal("primeiro IP deveria passar")
	}
	if ok, _ := l.Permitir("2.2.2.2", agora); !ok {
		t.Fatal("segundo IP não pode ser afetado pelo primeiro")
	}
}

func TestLimitadorPorIPLiberaQuandoAJanelaVence(t *testing.T) {
	l := NovoLimitadorPorIP(1, time.Minute)
	agora := time.Now()

	l.Permitir("1.1.1.1", agora)
	if ok, _ := l.Permitir("1.1.1.1", agora.Add(59*time.Second)); ok {
		t.Fatal("ainda dentro da janela: deveria recusar")
	}
	if ok, _ := l.Permitir("1.1.1.1", agora.Add(time.Minute)); !ok {
		t.Fatal("janela vencida: deveria liberar")
	}
}

func TestLimitadorPorIPVarreJanelasVencidas(t *testing.T) {
	l := NovoLimitadorPorIP(1, time.Minute)
	agora := time.Now()
	l.Permitir("antigo", agora)

	depois := agora.Add(2 * time.Minute)
	for i := 0; i < chamadasEntreLimpezas; i++ {
		l.Permitir("novo", depois)
	}
	if _, existe := l.contagens["antigo"]; existe {
		t.Fatal("a janela vencida deveria ter sido removida do mapa")
	}
}

func TestMiddlewareResponde429ComRetryAfter(t *testing.T) {
	l := NovoLimitadorPorIP(1, time.Minute)
	rota := l.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	pedir := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/beta/request-invite", nil)
		req.Header.Set("X-Forwarded-For", "9.9.9.9")
		rec := httptest.NewRecorder()
		rota.ServeHTTP(rec, req)
		return rec
	}

	if rec := pedir(); rec.Code != http.StatusNoContent {
		t.Fatalf("primeira requisição: status %d", rec.Code)
	}
	rec := pedir()
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("segunda requisição: status %d, queria 429", rec.Code)
	}
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("faltou o cabeçalho Retry-After")
	}
}

func TestIPDoCliente(t *testing.T) {
	casos := []struct {
		nome, encaminhado, remoto, quer string
	}{
		{"usa a última entrada do X-Forwarded-For", "6.6.6.6, 7.7.7.7", "10.0.0.2:5000", "7.7.7.7"},
		{"entrada única", "7.7.7.7", "10.0.0.2:5000", "7.7.7.7"},
		{"sem cabeçalho, usa o endereço da conexão", "", "10.0.0.2:5000", "10.0.0.2"},
		{"endereço sem porta", "", "10.0.0.2", "10.0.0.2"},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = c.remoto
			if c.encaminhado != "" {
				req.Header.Set("X-Forwarded-For", c.encaminhado)
			}
			if tem := IPDoCliente(req); tem != c.quer {
				t.Fatalf("IPDoCliente = %q, queria %q", tem, c.quer)
			}
		})
	}
}

func TestLimitarCorpoRecusaCorpoGrande(t *testing.T) {
	rota := LimitarCorpo(8)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 64)
		if _, err := r.Body.Read(buf); err != nil && err.Error() == "http: request body too large" {
			http.Error(w, "grande demais", http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	rec := httptest.NewRecorder()
	rota.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader("corpo bem maior que oito bytes")))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status %d, queria 413", rec.Code)
	}
}
