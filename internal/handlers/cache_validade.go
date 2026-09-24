package handlers

import (
	"sync"
	"time"
)

// cacheComValidade guarda um valor carregado de fora (banco, API) por um tempo fixo.
//
// O carregamento acontece com a trava segura, de propósito: se dez requisições chegam
// juntas com o cache vencido, a primeira vai ao banco e as outras nove esperam por ela,
// em vez de fazerem dez consultas iguais ao mesmo tempo.
type cacheComValidade[T any] struct {
	mu          sync.Mutex
	valor       T
	carregado   bool
	carregadoEm time.Time
	validade    time.Duration
	agora       func() time.Time // trocável nos testes, para não depender do relógio
}

func novoCacheComValidade[T any](validade time.Duration) *cacheComValidade[T] {
	return &cacheComValidade[T]{validade: validade, agora: time.Now}
}

// obter devolve o valor guardado enquanto ele estiver na validade. Vencido, chama
// carregar. Se carregar falhar (ok == false), devolve o que ele trouxe sem guardar:
// um erro de banco não pode ficar preso no cache pelo próximo minuto inteiro.
func (c *cacheComValidade[T]) obter(carregar func() (T, bool)) T {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.carregado && c.agora().Sub(c.carregadoEm) < c.validade {
		return c.valor
	}

	valor, ok := carregar()
	if ok {
		c.valor = valor
		c.carregado = true
		c.carregadoEm = c.agora()
	}
	return valor
}

// invalidar força a próxima leitura a ir buscar de novo.
func (c *cacheComValidade[T]) invalidar() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.carregado = false
}
