package handlers

import (
	"log"
	"math/rand"
	"strings"

	supabase "github.com/supabase-community/supabase-go"
)

// Materiais da Forja (sql/122). A lista repete o CHECK de rpg_materiais e MATERIAIS na tela.
const (
	materialGarra   = "garra_de_fera"
	materialChifre  = "chifre_de_fera"
	materialCranio  = "cranio_de_fera"
	materialEscama  = "escama_de_dragao"
	materialPena    = "pena_celeste"
	materialGelo    = "cristal_de_gelo"
	materialFogo    = "cristal_de_fogo"
	materialLuz     = "cristal_de_luz"
	materialVazio   = "cristal_do_vazio"
	materialNucleo  = "nucleo_da_tempestade"
	materialSilvest = "gema_silvestre"
)

// pesoDoMaterial é a chance de cada material num sorteio, em milésimos (soma 1000).
type pesoDoMaterial struct {
	id   string
	peso int
}

// Na expedição, os restos de fera são comuns e a Escama é rara. Os sete materiais de
// conjunto têm o mesmo peso, para nenhum conjunto ficar mais fácil de forjar.
var sorteioDaExpedicao = []pesoDoMaterial{
	{materialGarra, 300}, {materialChifre, 200},
	{materialGelo, 60}, {materialFogo, 60}, {materialLuz, 60}, {materialVazio, 60},
	{materialNucleo, 60}, {materialSilvest, 60}, {materialPena, 60},
	{materialCranio, 65}, {materialEscama, 15},
}

// Na masmorra completa, o que é raro fica mais fácil: ela é uma vez por dia e mais difícil.
var sorteioDaMasmorra = []pesoDoMaterial{
	{materialGarra, 230}, {materialChifre, 150},
	{materialGelo, 70}, {materialFogo, 70}, {materialLuz, 70}, {materialVazio, 70},
	{materialNucleo, 70}, {materialSilvest, 70}, {materialPena, 70},
	{materialCranio, 100}, {materialEscama, 30},
}

const (
	// Chance, em porcento, de a vitória na expedição dar um material.
	chanceMaterialExpedicao = 60
	// A masmorra completa dá sempre esta quantidade de sorteios.
	sorteiosDaMasmorra = 2
)

func sortearUm(rng *rand.Rand, tabela []pesoDoMaterial) string {
	alvo := rng.Intn(1000)
	for _, p := range tabela {
		if alvo < p.peso {
			return p.id
		}
		alvo -= p.peso
	}
	return tabela[0].id
}

// SortearMateriaisDaExpedicao: na vitória, 60% de chance de um material.
func SortearMateriaisDaExpedicao(rng *rand.Rand, venceu bool) map[string]int {
	if !venceu || rng.Intn(100) >= chanceMaterialExpedicao {
		return nil
	}
	return map[string]int{sortearUm(rng, sorteioDaExpedicao): 1}
}

// SortearMateriaisDaMasmorra: só quem completa a masmorra ganha, e ganha sempre.
func SortearMateriaisDaMasmorra(rng *rand.Rand, completou bool) map[string]int {
	if !completou {
		return nil
	}
	ganhos := map[string]int{}
	for range sorteiosDaMasmorra {
		ganhos[sortearUm(rng, sorteioDaMasmorra)]++
	}
	return ganhos
}

// entregarMateriais grava os materiais pelo service role, depois de a luta já estar
// registrada. Falha só deixa de dar o material: a luta e as outras recompensas já valeram.
// Devolve o que foi gravado, para a tela não mostrar material que não chegou.
func entregarMateriais(servico *supabase.Client, userID string, materiais map[string]int) map[string]int {
	if len(materiais) == 0 || servico == nil {
		return nil
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_ganhar_materiais", "", map[string]interface{}{
		"p_user_id":   userID,
		"p_materiais": materiais,
	}))
	if !strings.Contains(bruto, `"ok"`) {
		// Sem o sql/122 aplicado, a função não existe: a luta segue sem material.
		log.Printf("[RPG] Falha ao entregar materiais (user=%s): %s", userID, bruto)
		return nil
	}
	return materiais
}
