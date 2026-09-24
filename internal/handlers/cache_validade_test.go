package handlers

import (
	"testing"
	"time"
)

// relogio é um relógio de mentira que o teste avança à mão.
type relogio struct{ agora time.Time }

func (r *relogio) ler() time.Time          { return r.agora }
func (r *relogio) avancar(d time.Duration) { r.agora = r.agora.Add(d) }

func TestCacheComValidade(t *testing.T) {
	r := &relogio{agora: time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)}
	cache := novoCacheComValidade[int](time.Minute)
	cache.agora = r.ler

	cargas := 0
	carregar := func() (int, bool) { cargas++; return cargas * 10, true }

	if v := cache.obter(carregar); v != 10 || cargas != 1 {
		t.Fatalf("primeira leitura: valor %d, cargas %d; esperado 10 e 1", v, cargas)
	}

	r.avancar(30 * time.Second)
	if v := cache.obter(carregar); v != 10 || cargas != 1 {
		t.Errorf("dentro da validade: valor %d, cargas %d; esperado o guardado (10) sem nova carga", v, cargas)
	}

	r.avancar(31 * time.Second)
	if v := cache.obter(carregar); v != 20 || cargas != 2 {
		t.Errorf("vencido: valor %d, cargas %d; esperado nova carga (20)", v, cargas)
	}

	cache.invalidar()
	if v := cache.obter(carregar); v != 30 || cargas != 3 {
		t.Errorf("depois de invalidar: valor %d, cargas %d; esperado nova carga (30)", v, cargas)
	}
}

func TestCacheComValidadeNaoGuardaFalha(t *testing.T) {
	cache := novoCacheComValidade[string](time.Minute)

	if v := cache.obter(func() (string, bool) { return "vazio", false }); v != "vazio" {
		t.Fatalf("a falha deve devolver o que a carga trouxe, veio %q", v)
	}
	if v := cache.obter(func() (string, bool) { return "certo", true }); v != "certo" {
		t.Errorf("depois de uma falha, a próxima leitura tem que tentar de novo; veio %q", v)
	}
}
