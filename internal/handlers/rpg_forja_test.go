package handlers

import (
	"math/rand"
	"testing"
)

func somaDosPesos(t []pesoDoMaterial) int {
	total := 0
	for _, p := range t {
		total += p.peso
	}
	return total
}

func TestSorteiosSomamMil(t *testing.T) {
	if s := somaDosPesos(sorteioDaExpedicao); s != 1000 {
		t.Errorf("expedição soma %d, esperava 1000", s)
	}
	if s := somaDosPesos(sorteioDaMasmorra); s != 1000 {
		t.Errorf("masmorra soma %d, esperava 1000", s)
	}
}

// Todo material sorteado precisa existir no CHECK de rpg_materiais (sql/122).
func TestSorteiosSoUsamMateriaisConhecidos(t *testing.T) {
	conhecidos := map[string]bool{
		materialGarra: true, materialChifre: true, materialCranio: true, materialEscama: true, materialPena: true,
		materialGelo: true, materialFogo: true, materialLuz: true, materialVazio: true, materialNucleo: true, materialSilvest: true,
	}
	for _, tabela := range [][]pesoDoMaterial{sorteioDaExpedicao, sorteioDaMasmorra} {
		for _, p := range tabela {
			if !conhecidos[p.id] {
				t.Errorf("material desconhecido: %s", p.id)
			}
		}
	}
}

func TestSortearMateriaisDaExpedicao(t *testing.T) {
	rng := rand.New(rand.NewSource(1))
	if m := SortearMateriaisDaExpedicao(rng, false); m != nil {
		t.Errorf("derrota não dá material: %v", m)
	}

	ganhou, raros := 0, 0
	const lutas = 20000
	for range lutas {
		m := SortearMateriaisDaExpedicao(rng, true)
		if m == nil {
			continue
		}
		if len(m) != 1 {
			t.Fatalf("a expedição dá no máximo um material: %v", m)
		}
		ganhou++
		raros += m[materialEscama]
	}
	// 60% de chance, com folga para o acaso.
	if p := ganhou * 100 / lutas; p < 57 || p > 63 {
		t.Errorf("chance de material fora do esperado: %d%%", p)
	}
	// Escama: 1,5% dos sorteios.
	if raros == 0 || raros > ganhou*3/100 {
		t.Errorf("escamas fora do esperado: %d em %d", raros, ganhou)
	}
}

func TestSortearMateriaisDaMasmorra(t *testing.T) {
	rng := rand.New(rand.NewSource(2))
	if m := SortearMateriaisDaMasmorra(rng, false); m != nil {
		t.Errorf("masmorra incompleta não dá material: %v", m)
	}
	for range 200 {
		total := 0
		for _, q := range SortearMateriaisDaMasmorra(rng, true) {
			total += q
		}
		if total != sorteiosDaMasmorra {
			t.Fatalf("a masmorra completa dá %d materiais, veio %d", sorteiosDaMasmorra, total)
		}
	}
}

func TestEntregarMateriais_SemNadaNaoChamaOBanco(t *testing.T) {
	if got := entregarMateriais(nil, "u", map[string]int{materialGarra: 1}); got != nil {
		t.Errorf("sem cliente não entrega: %v", got)
	}
	if got := entregarMateriais(nil, "u", nil); got != nil {
		t.Errorf("sem material não entrega: %v", got)
	}
}

func TestSortearMateriaisDaExpedicaoEmDestaque(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	if m := SortearMateriaisDaExpedicaoEmDestaque(rng, false, true); m != nil {
		t.Fatalf("derrota não dá material mesmo em região em destaque: %v", m)
	}
	for range 200 {
		m := SortearMateriaisDaExpedicaoEmDestaque(rng, true, true)
		total := 0
		for _, q := range m {
			total += q
		}
		if total < 1 || total > 2 {
			t.Fatalf("região em destaque na vitória dá 1 ou 2 materiais, veio %d (%v)", total, m)
		}
	}
}

