package handlers

import (
	"math/rand"
	"os"
	"regexp"
	"strconv"
	"testing"
)

// Os números do sql/078 e sql/124, por id, para montar as masmorras nos testes.
func catalogoParaMasmorras(t *testing.T) []MonstroRPG {
	t.Helper()
	mk := func(id string, nivel int, tipo string, v, a, d, bil, chance int, rar string) MonstroRPG {
		return MonstroRPG{ID: id, Nome: id, Tipo: tipo, Nivel: nivel, Vida: v, Ataque: a, Defesa: d, Bilhetes: bil, ChanceItem: chance, RaridadeItem: rar}
	}
	lista := []MonstroRPG{
		mk("slime_de_eter", 1, "comum", 60, 8, 3, 1, 0, "comum"),
		mk("goblin_batedor", 4, "comum", 120, 14, 6, 1, 0, "comum"),
		mk("lobo_sombrio", 10, "comum", 380, 48, 24, 1, 20, "raro"),
		mk("golem_de_runas", 18, "raro", 900, 70, 50, 1, 25, "raro"),
		mk("espectro_do_vazio", 26, "raro", 1400, 120, 62, 1, 20, "epico"),
		mk("cavaleiro_caido", 35, "chefe", 2100, 145, 80, 2, 30, "epico"),
		mk("dragao_de_eter", 50, "chefe", 3600, 210, 120, 2, 25, "lendario"),
		mk("primordial_esquecido", 60, "chefe", 4800, 255, 155, 3, 35, "lendario"),
	}
	bruto, err := os.ReadFile("../../sql/124_rpg_novos_monstros.sql")
	if err != nil {
		t.Fatalf("falha ao ler sql/124_rpg_novos_monstros.sql: %v", err)
	}
	re := regexp.MustCompile(`\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']+)',\s*(\d+)\s*\)`)
	for _, m := range re.FindAllStringSubmatch(string(bruto), -1) {
		nivel, _ := strconv.Atoi(m[5])
		vida, _ := strconv.Atoi(m[6])
		ataque, _ := strconv.Atoi(m[7])
		defesa, _ := strconv.Atoi(m[8])
		bilhetes, _ := strconv.Atoi(m[9])
		chance, _ := strconv.Atoi(m[10])
		lista = append(lista, mk(m[1], nivel, m[4], vida, ataque, defesa, bilhetes, chance, m[11]))
	}
	return lista
}

func itemDaFaixa(nivel int) ItemRPG {
	switch {
	case nivel >= 50:
		return ItemRPG{Vida: 400, Ataque: 60, Defesa: 40}
	case nivel >= 26:
		return ItemRPG{Vida: 220, Ataque: 34, Defesa: 27}
	default:
		return ItemRPG{Vida: 90, Ataque: 15, Defesa: 11}
	}
}

func TestMasmorras_CatalogoValido(t *testing.T) {
	catalogo := catalogoParaMasmorras(t)
	ids := map[string]bool{}
	for _, m := range CatalogoMasmorras() {
		if ids[m.ID] || len(m.Andares) < 2 {
			t.Errorf("masmorra %s repetida ou com menos de 2 andares", m.ID)
		}
		ids[m.ID] = true
		andaresVistos := map[string]bool{}
		for _, a := range m.Andares {
			if andaresVistos[a] {
				t.Errorf("masmorra %s repete o monstro %s em andares seguidos", m.ID, a)
			}
			andaresVistos[a] = true
		}
		if _, ok := monstrosDosAndares(m, catalogo); !ok {
			t.Errorf("masmorra %s tem andar fora do catálogo", m.ID)
		}
	}
	if _, ok := monstrosDosAndares(CatalogoMasmorras()[0], catalogo[:2]); ok {
		t.Error("masmorra com monstro desativado deveria ficar fora")
	}
}

// No nível mínimo, cada masmorra é possível para todo o elenco (desvantagem de elemento
// incluída, ao menos 20%); o trono é a prova final.
func TestMasmorras_Equilibrio(t *testing.T) {
	catalogo := catalogoParaMasmorras(t)
	for _, m := range CatalogoMasmorras() {
		monstros, _ := monstrosDosAndares(m, catalogo)
		for base, pb := range PersonagensBase() {
			j := jogadorDoElenco(base, m.NivelMinimo, itemDaFaixa(m.NivelMinimo))
			j.Elemento = pb.Elemento
			completas := 0
			for s := int64(0); s < 200; s++ {
				if SimularMasmorra(j, monstros, rand.New(rand.NewSource(s))).Completou {
					completas++
				}
			}
			taxa := float64(completas) / 200
			minimo, maximo := 0.20, 1.0
			if m.ID == "trono_primordial" {
				minimo, maximo = 0.005, 0.40
			}
			t.Logf("%-25s %-16s nível %2d: %3.0f%%", m.ID, base, m.NivelMinimo, taxa*100)
			if taxa < minimo || taxa > maximo {
				t.Errorf("%s com %s no nível %d: completou %.0f%%, esperava entre %.0f%% e %.0f%%", m.ID, base, m.NivelMinimo, taxa*100, minimo*100, maximo*100)
			}
		}
	}
}

// A Vida passa de um andar para o outro, e a masmorra para no primeiro andar perdido.
func TestSimularMasmorra_VidaPassaEParaNaDerrota(t *testing.T) {
	catalogo := catalogoParaMasmorras(t)
	monstros, _ := monstrosDosAndares(CatalogoMasmorras()[0], catalogo)
	j := jogadorDoElenco("espadachim_eter", 12, itemDaFaixa(12))
	r := SimularMasmorra(j, monstros, rand.New(rand.NewSource(1)))
	for i := 1; i < len(r.Andares); i++ {
		quer := min(j.Atributos.Vida, r.Andares[i-1].Resultado.VidaFinal+j.Atributos.Vida*curaEntreAndaresPct/100)
		if r.Andares[i].Resultado.VidaInicial != quer {
			t.Fatalf("andar %d começou com %d, esperava %d (fim do anterior mais o fôlego)", i, r.Andares[i].Resultado.VidaInicial, quer)
		}
	}
	fraco := jogadorDoElenco("espadachim_eter", 1, ItemRPG{})
	r = SimularMasmorra(fraco, monstros, rand.New(rand.NewSource(1)))
	if r.Completou || len(r.Andares) == len(monstros) && r.Andares[len(r.Andares)-1].Resultado.Venceu {
		t.Fatal("nível 1 não completa o Bosque Sombrio")
	}
	if last := r.Andares[len(r.Andares)-1]; last.Resultado.Venceu || len(r.Vencidos) != len(r.Andares)-1 {
		t.Errorf("deveria parar no andar perdido: %d andares, %d vencidos", len(r.Andares), len(r.Vencidos))
	}
}
