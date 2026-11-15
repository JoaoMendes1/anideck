package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// LimitarCorpo recusa corpo de requisição acima de maxBytes. Sem teto, uma rota pública
// aceita um corpo de qualquer tamanho e o servidor o lê inteiro para a memória.
func LimitarCorpo(maxBytes int64) func(http.Handler) http.Handler {
	return func(proximo http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			proximo.ServeHTTP(w, r)
		})
	}
}

// LimitadorPorIP conta requisições por endereço numa janela fixa de tempo. Serve para as
// rotas públicas que custam caro a cada chamada (consulta à AniList, gravação com o
// service role): um visitante sozinho não consegue gastar a cota de todos.
//
// Fica na memória do processo: a contagem zera a cada deploy, e com mais de uma instância
// cada uma contaria por conta própria. O AniDeck roda numa instância só.
type LimitadorPorIP struct {
	maximo int
	janela time.Duration

	mu        sync.Mutex
	contagens map[string]*contagemDaJanela
	chamadas  int
}

type contagemDaJanela struct {
	inicio time.Time
	total  int
}

// De quantas em quantas chamadas as janelas vencidas são varridas do mapa.
const chamadasEntreLimpezas = 500

// NovoLimitadorPorIP cria um limitador de "maximo" requisições por "janela" para cada IP.
func NovoLimitadorPorIP(maximo int, janela time.Duration) *LimitadorPorIP {
	return &LimitadorPorIP{maximo: maximo, janela: janela, contagens: make(map[string]*contagemDaJanela)}
}

// Permitir registra uma requisição do IP e diz se ela cabe no limite. Quando não cabe,
// devolve também quanto falta para a janela atual terminar.
func (l *LimitadorPorIP) Permitir(ip string, agora time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.chamadas++
	if l.chamadas%chamadasEntreLimpezas == 0 {
		for chave, c := range l.contagens {
			if agora.Sub(c.inicio) >= l.janela {
				delete(l.contagens, chave)
			}
		}
	}

	c, existe := l.contagens[ip]
	if !existe || agora.Sub(c.inicio) >= l.janela {
		l.contagens[ip] = &contagemDaJanela{inicio: agora, total: 1}
		return true, 0
	}
	if c.total >= l.maximo {
		return false, l.janela - agora.Sub(c.inicio)
	}
	c.total++
	return true, 0
}

// Middleware responde 429 (requisições demais) com Retry-After quando o IP passa do limite.
func (l *LimitadorPorIP) Middleware(proximo http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		permitido, espera := l.Permitir(IPDoCliente(r), time.Now())
		if !permitido {
			segundos := int(espera.Seconds()) + 1
			w.Header().Set("Retry-After", strconv.Itoa(segundos))
			http.Error(w, "Muitas requisições. Tente de novo em instantes.", http.StatusTooManyRequests)
			return
		}
		proximo.ServeHTTP(w, r)
	})
}

// IPDoCliente devolve o endereço de quem fez a requisição. Em produção o app fica atrás
// do proxy, que acrescenta o IP real ao fim do X-Forwarded-For: vale a última entrada,
// porque as anteriores vêm do próprio cliente e podem ser inventadas.
func IPDoCliente(r *http.Request) string {
	if encaminhado := r.Header.Get("X-Forwarded-For"); encaminhado != "" {
		partes := strings.Split(encaminhado, ",")
		if ultimo := strings.TrimSpace(partes[len(partes)-1]); ultimo != "" {
			return ultimo
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
