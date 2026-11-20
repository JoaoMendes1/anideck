// internal/handlers/rpg_combate_avancado.go
// Elementos, 8 atributos, evolução, poderes dos monstros e regiões do mapa 2D.
// Ficam no código, como as habilidades das classes: a simulação depende deles, e um valor
// editado sem os testes de equilíbrio mudaria a chance de vitória sem ninguém medir.
package handlers

import "time"

const (
	elementoNeutro = "neutro"
	// Vantagem de elemento: quem tem vantagem bate 10% mais forte; quem está em desvantagem,
	// 3% mais fraco. Os dois lados da luta usam a mesma regra.
	multVantagemElemental    = 1.10
	multDesvantagemElemental = 0.97
)

// vence diz qual elemento cada um vence. Fogo, Terra, Raio e Água formam uma roda; Luz e
// Trevas se vencem uma à outra; Éter e neutro não vencem nem perdem para ninguém.
var vence = map[string]string{
	"fogo":   "terra",
	"terra":  "raio",
	"raio":   "agua",
	"agua":   "fogo",
	"luz":    "trevas",
	"trevas": "luz",
}

// RelacaoElemental devolve "vantagem", "desvantagem" ou "neutro" do atacante sobre o defensor.
func RelacaoElemental(atacante, defensor string) string {
	if v, ok := vence[atacante]; ok && v == defensor {
		return "vantagem"
	}
	if v, ok := vence[defensor]; ok && v == atacante {
		return "desvantagem"
	}
	return elementoNeutro
}

// MultiplicadorElemental é o fator do dano de um golpe do atacante no defensor.
func MultiplicadorElemental(atacante, defensor string) float64 {
	switch RelacaoElemental(atacante, defensor) {
	case "vantagem":
		return multVantagemElemental
	case "desvantagem":
		return multDesvantagemElemental
	default:
		return 1
	}
}

// elementoDosMonstros define o elemento de todos os 64 monstros do catálogo.
var elementoDosMonstros = map[string]string{
	// Originais (sql/072)
	"slime_de_eter":        "eter",
	"goblin_batedor":       "terra",
	"lobo_sombrio":         "trevas",
	"golem_de_runas":       "terra",
	"espectro_do_vazio":    "trevas",
	"cavaleiro_caido":      "fogo",
	"dragao_de_eter":       "raio",
	"primordial_esquecido": "eter",

	// Clareira Inicial
	"slime_espinhoso":     "terra",
	"cogumelo_esporifero": "terra",
	"vespa_eletrica":      "raio",
	"golem_musgoso":       "terra",

	// Bosque Sombrio
	"arvore_de_esporos":   "terra",
	"slime_de_cranios":    "terra",
	"planta_carnivora":    "terra",
	"druida_da_floresta":  "terra",
	"centopeia_toxica":    "trevas",
	"ent_apodrecido":      "terra",
	"alquimista_da_praga": "trevas",
	"wyvern_esmeralda":    "terra",

	// Fendas Vulcânicas
	"javali_vulcanico":  "fogo",
	"aranha_rubra":      "fogo",
	"cao_de_magma":      "fogo",
	"fera_de_obsidiana": "fogo",
	"golem_de_magma":    "fogo",
	"beemote_de_lava":   "fogo",
	"fenix_solar":       "fogo",

	// Picos Glaciais
	"serpente_marinha":   "agua",
	"revena_glacial":     "agua",
	"grifo_glacial":      "agua",
	"aranha_glacial":     "agua",
	"golem_de_gelo":      "agua",
	"yeti_glacial":       "agua",
	"leviata_relampago":  "raio",
	"cavaleiro_da_geada": "agua",
	"colosso_glacial":    "agua",
	"dragao_glacial":     "agua",
	"lorde_da_geada":     "agua",

	// Ruínas do Vazio
	"espectro_acorrentado": "trevas",
	"fragmento_do_olho":    "trevas",
	"fantasma_do_vazio":    "trevas",
	"lobo_abissal":         "trevas",
	"golem_flutuante":      "terra",
	"beemote_fungico":      "terra",
	"ceifador_sombrio":     "trevas",
	"vortex_do_olho":       "trevas",
	"slime_do_vazio":       "trevas",
	"ceifador_espectral":   "trevas",
	"colosso_runico":       "terra",
	"golem_do_vazio":       "trevas",

	// Santuário Astral
	"beholder_abissal":    "trevas",
	"lich_das_sombras":    "trevas",
	"dragao_esqueleto":    "trevas",
	"grifo_dourado":       "luz",
	"serpente_espectral":  "trevas",
	"rei_lich":            "trevas",
	"draconato_do_trovao": "raio",
	"serafim_celestial":   "luz",
	"kraken_abissal":      "agua",

	// Cume Ancestral
	"dragao_tempestade": "raio",
	"dragao_do_vazio":   "trevas",
	"senhor_infernal":   "fogo",
	"arcanjo_blindado":  "luz",
	"horror_da_fenda":   "trevas",
}

// ElementoDoMonstro devolve o elemento do monstro do catálogo; monstro novo é neutro.
func ElementoDoMonstro(id string) string {
	if e, ok := elementoDosMonstros[id]; ok {
		return e
	}
	return elementoNeutro
}

// Tipos de poder de monstro.
const (
	poderGolpe   = "golpe"   // golpe com o ataque multiplicado
	poderDrenar  = "drenar"  // golpe que devolve ao monstro metade do dano
	poderEscudo  = "escudo"  // reduz o dano recebido por algumas rodadas
	poderFuria   = "furia"   // aumenta o ataque até o fim da luta
	poderInvocar = "invocar" // chama um ajudante que luta junto e protege o monstro
)

// PoderMonstro é uma ação especial que o monstro tenta no lugar do golpe comum.
type PoderMonstro struct {
	ID              string  `json:"id"`
	Nome            string  `json:"nome"`
	Descricao       string  `json:"descricao"`
	Tipo            string  `json:"tipo"`
	Arcano          bool    `json:"arcano,omitempty"`
	FatorMagia      float64 `json:"-"`
	CustoEter       int     `json:"custo_eter,omitempty"`
	ChancePorMil    int     `json:"-"`
	AbaixoDePct     int     `json:"-"`
	APartirDaRodada int     `json:"-"`
	MaxUsos         int     `json:"-"`
	Fator           float64 `json:"-"`
	Rodadas         int     `json:"-"`
	Ajudante        string  `json:"-"`
	AjudanteVidaPct int     `json:"-"`
	AjudanteAtqPct  int     `json:"-"`
}

// poderesDosMonstros: os do tutorial inicial permanecem simples; formas médias e evoluídas
// ganham golpes arcanos, escudos, invocações e drenagens coerentes com o bioma.
var poderesDosMonstros = map[string][]PoderMonstro{
	"lobo_sombrio": {
		{ID: "uivo", Nome: "Uivo da Matilha", Descricao: "Abaixo da metade da Vida, pode chamar um lobo jovem.", Tipo: poderInvocar,
			CustoEter: 6, ChancePorMil: 450, AbaixoDePct: 50, MaxUsos: 1, Ajudante: "Lobo Jovem", AjudanteVidaPct: 22, AjudanteAtqPct: 35},
	},
	"golem_de_runas": {
		{ID: "muralha", Nome: "Muralha de Runas", Descricao: "Abaixo de 70% da Vida, pode reduzir o dano recebido em 40% por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 8, ChancePorMil: 300, AbaixoDePct: 70, MaxUsos: 2, Fator: 0.40, Rodadas: 2},
	},
	"espectro_do_vazio": {
		{ID: "toque", Nome: "Toque do Vazio", Descricao: "Golpe arcano que mistura Ataque e Magia e devolve metade do dano em Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.18, CustoEter: 10, ChancePorMil: 240, MaxUsos: 3, Fator: 1.05},
	},
	"cavaleiro_caido": {
		{ID: "juramento", Nome: "Juramento Partido", Descricao: "A partir da 3ª rodada, golpe 40% mais forte.", Tipo: poderGolpe,
			CustoEter: 10, ChancePorMil: 240, APartirDaRodada: 3, MaxUsos: 2, Fator: 1.40},
		{ID: "escudeiro", Nome: "Chamado do Escudeiro", Descricao: "Abaixo de 40% da Vida, pode chamar um escudeiro fantasma.", Tipo: poderInvocar,
			CustoEter: 14, ChancePorMil: 380, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Escudeiro Fantasma", AjudanteVidaPct: 8, AjudanteAtqPct: 20},
	},
	"dragao_de_eter": {
		{ID: "sopro", Nome: "Sopro da Tempestade", Descricao: "Descarga arcana de raio que combina Ataque e Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.15, CustoEter: 14, ChancePorMil: 190, MaxUsos: 2, Fator: 1.22},
		{ID: "furia", Nome: "Fúria Ancestral", Descricao: "Abaixo de 30% da Vida, o ataque sobe 15% até o fim da luta.", Tipo: poderFuria,
			CustoEter: 10, ChancePorMil: 1000, AbaixoDePct: 30, MaxUsos: 1, Fator: 1.15},
	},
	"primordial_esquecido": {
		{ID: "eco", Nome: "Eco do Primeiro Reino", Descricao: "Abaixo de 50% da Vida, pode chamar um fragmento de si mesmo.", Tipo: poderInvocar,
			CustoEter: 16, ChancePorMil: 250, AbaixoDePct: 50, MaxUsos: 1, Ajudante: "Fragmento Primordial", AjudanteVidaPct: 6, AjudanteAtqPct: 18},
	},

	// Novos monstros com habilidades táticas
	"slime_de_cranios": {
		{ID: "acido_corrosivo", Nome: "Ácido Corrosivo", Descricao: "Dissolve a guarda com dano que combina Ataque e Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.16, CustoEter: 6, ChancePorMil: 240, MaxUsos: 2, Fator: 1.12},
	},
	"druida_da_floresta": {
		{ID: "seiva_vital", Nome: "Dreno de Seiva", Descricao: "Absorve energia vital com o cajado silvestre.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.18, CustoEter: 8, ChancePorMil: 240, MaxUsos: 2, Fator: 1.05},
	},
	"ent_apodrecido": {
		{ID: "casca_esporo", Nome: "Casca de Esporos", Descricao: "Abaixo de 65% da Vida, reduz dano em 35% por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 8, ChancePorMil: 300, AbaixoDePct: 65, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"alquimista_da_praga": {
		{ID: "elixir_proibido", Nome: "Elixir da Praga", Descricao: "Arremessa frasco arcano que drena metade do dano em Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.12, CustoEter: 9, ChancePorMil: 220, MaxUsos: 1, Fator: 0.94},
		{ID: "nuvem_esporo", Nome: "Esporo Mutante", Descricao: "Abaixo de 40% da Vida, chama um Broto Tóxico.", Tipo: poderInvocar,
			CustoEter: 12, ChancePorMil: 300, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Broto Tóxico", AjudanteVidaPct: 10, AjudanteAtqPct: 20},
	},
	"wyvern_esmeralda": {
		{ID: "investida_alado", Nome: "Mergulho Cortante", Descricao: "A partir da 2ª rodada, golpe veloz 28% mais forte.", Tipo: poderGolpe,
			CustoEter: 8, ChancePorMil: 240, APartirDaRodada: 2, MaxUsos: 2, Fator: 1.28},
	},
	"cao_de_magma": {
		{ID: "mordida_lava", Nome: "Mordida Incandescente", Descricao: "Golpe flamejante 25% mais forte.", Tipo: poderGolpe,
			CustoEter: 8, ChancePorMil: 230, MaxUsos: 2, Fator: 1.25},
	},
	"fera_de_obsidiana": {
		{ID: "couraca_negra", Nome: "Placa de Obsidiana", Descricao: "Abaixo de 60% da Vida, reduz dano recebido em 38% por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 9, ChancePorMil: 280, AbaixoDePct: 60, MaxUsos: 2, Fator: 0.38, Rodadas: 2},
	},
	"golem_de_magma": {
		{ID: "manto_lava", Nome: "Manto Vulcânico", Descricao: "Abaixo de 70% da Vida, reduz dano em 35% e aquece o ataque.", Tipo: poderEscudo,
			CustoEter: 10, ChancePorMil: 280, AbaixoDePct: 70, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"beemote_de_lava": {
		{ID: "erupcao", Nome: "Erupção Tectônica", Descricao: "A partir da 3ª rodada, golpe arcano de lava.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.14, CustoEter: 11, ChancePorMil: 220, APartirDaRodada: 3, MaxUsos: 2, Fator: 1.22},
		{ID: "furia_vulcao", Nome: "Núcleo em Fúria", Descricao: "Abaixo de 35% da Vida, ataque sobe 15%.", Tipo: poderFuria,
			CustoEter: 10, ChancePorMil: 900, AbaixoDePct: 35, MaxUsos: 1, Fator: 1.15},
	},
	"fenix_solar": {
		{ID: "chama_solar", Nome: "Asas do Sol", Descricao: "Chama arcana que drena calor para regenerar Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.16, CustoEter: 12, ChancePorMil: 230, MaxUsos: 2, Fator: 1.10},
		{ID: "renascer", Nome: "Brilho Renascido", Descricao: "Abaixo de 35% da Vida, ataque sobe 15% até o fim.", Tipo: poderFuria,
			CustoEter: 10, ChancePorMil: 900, AbaixoDePct: 35, MaxUsos: 1, Fator: 1.15},
	},
	"golem_de_gelo": {
		{ID: "bastião_gelo", Nome: "Bastião Glacial", Descricao: "Abaixo de 65% da Vida, reduz o dano em 35% por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 9, ChancePorMil: 280, AbaixoDePct: 65, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"yeti_glacial": {
		{ID: "rugido_nevasca", Nome: "Rugido da Nevasca", Descricao: "Abaixo de 40% da Vida, aumenta a força em 15%.", Tipo: poderFuria,
			CustoEter: 8, ChancePorMil: 850, AbaixoDePct: 40, MaxUsos: 1, Fator: 1.15},
	},
	"leviata_relampago": {
		{ID: "descarga_abissal", Nome: "Descarga Elétrica", Descricao: "Golpe arcano que combina velocidade e raio.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.15, CustoEter: 10, ChancePorMil: 220, MaxUsos: 2, Fator: 1.18},
	},
	"cavaleiro_da_geada": {
		{ID: "lanca_gelo", Nome: "Lâmina Glacial", Descricao: "A partir da 2ª rodada, golpe cortante 30% mais forte.", Tipo: poderGolpe,
			CustoEter: 10, ChancePorMil: 230, APartirDaRodada: 2, MaxUsos: 2, Fator: 1.30},
	},
	"colosso_glacial": {
		{ID: "muralha_eterna", Nome: "Cristal Eterno", Descricao: "Abaixo de 65% da Vida, ergue barreira que corta 35% do dano.", Tipo: poderEscudo,
			CustoEter: 11, ChancePorMil: 300, AbaixoDePct: 65, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"dragao_glacial": {
		{ID: "nevasca_sopro", Nome: "Sopro de Geleira", Descricao: "Sopro arcano que atravessa parte da defesa física.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.15, CustoEter: 12, ChancePorMil: 210, MaxUsos: 2, Fator: 1.22},
	},
	"lorde_da_geada": {
		{ID: "sentenca_fria", Nome: "Alabarda Rúnica", Descricao: "Golpe arcano que drena energia do oponente.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.14, CustoEter: 12, ChancePorMil: 210, MaxUsos: 1, Fator: 1.02},
		{ID: "espectro_frio", Nome: "Guarda de Gelo", Descricao: "Abaixo de 40% da Vida, convoca um Servo Glacial.", Tipo: poderInvocar,
			CustoEter: 14, ChancePorMil: 300, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Servo Glacial", AjudanteVidaPct: 8, AjudanteAtqPct: 20},
	},
	"lobo_abissal": {
		{ID: "alcateia_vazio", Nome: "Uivo Abissal", Descricao: "Abaixo de 45% da Vida, chama um Cão do Vazio.", Tipo: poderInvocar,
			CustoEter: 9, ChancePorMil: 360, AbaixoDePct: 45, MaxUsos: 1, Ajudante: "Cão do Vazio", AjudanteVidaPct: 14, AjudanteAtqPct: 26},
	},
	"golem_flutuante": {
		{ID: "levitacao_runica", Nome: "Campo Magnético", Descricao: "Abaixo de 60% da Vida, reduz dano recebido em 35% por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 9, ChancePorMil: 280, AbaixoDePct: 60, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"beemote_fungico": {
		{ID: "esporos_violeta", Nome: "Esmagamento Fúngico", Descricao: "Golpe pesado 30% mais forte a partir da 2ª rodada.", Tipo: poderGolpe,
			CustoEter: 9, ChancePorMil: 230, APartirDaRodada: 2, MaxUsos: 2, Fator: 1.30},
	},
	"ceifador_sombrio": {
		{ID: "ceifa_violeta", Nome: "Ceifa de Éter", Descricao: "Corte arcano que mistura Ataque e Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.16, CustoEter: 10, ChancePorMil: 220, MaxUsos: 2, Fator: 1.18},
	},
	"vortex_do_olho": {
		{ID: "olhar_orbitante", Nome: "Raio Orbital", Descricao: "Feixe arcano concentrado que atravessa armadura.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.18, CustoEter: 10, ChancePorMil: 230, MaxUsos: 2, Fator: 1.18},
	},
	"slime_do_vazio": {
		{ID: "absorcao_vazio", Nome: "Absorção Violeta", Descricao: "Drena energia com bolhas de antimatéria.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.15, CustoEter: 10, ChancePorMil: 220, MaxUsos: 2, Fator: 1.06},
	},
	"ceifador_espectral": {
		{ID: "lamina_turquesa", Nome: "Corte Turquesa", Descricao: "Golpe arcano que devolve metade do dano em Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.12, CustoEter: 11, ChancePorMil: 210, MaxUsos: 1, Fator: 0.98},
	},
	"colosso_runico": {
		{ID: "bastião_esmeralda", Nome: "Armadura Esmeralda", Descricao: "Abaixo de 65% da Vida, absorve 35% do dano por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 12, ChancePorMil: 300, AbaixoDePct: 65, MaxUsos: 2, Fator: 0.35, Rodadas: 2},
	},
	"golem_do_vazio": {
		{ID: "pulso_fissura", Nome: "Pulso da Fissura", Descricao: "Explosão arcana que combina força rochosa e Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.16, CustoEter: 12, ChancePorMil: 220, MaxUsos: 2, Fator: 1.22},
	},
	"beholder_abissal": {
		{ID: "olhar_central", Nome: "Olhar Central", Descricao: "Feixe arcano de precisão que escala com Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.18, CustoEter: 12, ChancePorMil: 230, MaxUsos: 2, Fator: 1.20},
	},
	"lich_das_sombras": {
		{ID: "chama_necrotica", Nome: "Chamas Verdes", Descricao: "Fogo necrótico que drena metade do dano em Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.17, CustoEter: 12, ChancePorMil: 220, MaxUsos: 2, Fator: 1.06},
	},
	"dragao_esqueleto": {
		{ID: "sopro_necrose", Nome: "Sopro de Ossos", Descricao: "Rajada arcana antiga que atravessa parte da Defesa.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.15, CustoEter: 12, ChancePorMil: 210, MaxUsos: 2, Fator: 1.20},
	},
	"grifo_dourado": {
		{ID: "rasante_solar", Nome: "Rasante Dourado", Descricao: "Golpe veloz abençoado com 28% a mais de impacto.", Tipo: poderGolpe,
			CustoEter: 11, ChancePorMil: 230, MaxUsos: 2, Fator: 1.28},
	},
	"serpente_espectral": {
		{ID: "nevoa_estelar", Nome: "Mordida Estelar", Descricao: "Golpe arcano espectral que drena Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.16, CustoEter: 12, ChancePorMil: 210, MaxUsos: 2, Fator: 1.08},
	},
	"rei_lich": {
		{ID: "cetro_soberano", Nome: "Decreto do Lich", Descricao: "Rajada arcana necrótica com dreno de Vida.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.14, CustoEter: 14, ChancePorMil: 200, MaxUsos: 1, Fator: 1.00},
		{ID: "guarda_ossario", Nome: "Erguei-vos!", Descricao: "Abaixo de 40% da Vida, chama um Guarda Esqueleto.", Tipo: poderInvocar,
			CustoEter: 14, ChancePorMil: 280, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Guarda Esqueleto", AjudanteVidaPct: 7, AjudanteAtqPct: 18},
	},
	"draconato_do_trovao": {
		{ID: "machado_trovao", Nome: "Machado Fulminante", Descricao: "Impacto elétrico arcano que escala com Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.12, CustoEter: 13, ChancePorMil: 210, MaxUsos: 2, Fator: 1.20},
	},
	"serafim_celestial": {
		{ID: "anel_da_aurora", Nome: "Anéis da Aurora", Descricao: "Feixe sagrado que drena energia ao atingir.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.14, CustoEter: 13, ChancePorMil: 200, MaxUsos: 1, Fator: 1.02},
	},
	"kraken_abissal": {
		{ID: "mare_hipnotica", Nome: "Vórtice Oceânico", Descricao: "Pressão arcana que envolve o campo inteiro.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.14, CustoEter: 14, ChancePorMil: 200, MaxUsos: 2, Fator: 1.18},
		{ID: "tentaculo", Nome: "Tentáculo Abissal", Descricao: "Abaixo de 40% da Vida, ergue um Tentáculo Guardião.", Tipo: poderInvocar,
			CustoEter: 14, ChancePorMil: 280, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Tentáculo Guardião", AjudanteVidaPct: 6, AjudanteAtqPct: 18},
	},
	"dragao_tempestade": {
		{ID: "raio_supremo", Nome: "Relâmpago Antigo", Descricao: "Descarga elétrica arcana de alta voltagem.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.16, CustoEter: 13, ChancePorMil: 210, MaxUsos: 2, Fator: 1.22},
	},
	"dragao_do_vazio": {
		{ID: "rasgo_espacial", Nome: "Rasgo Espacial", Descricao: "Golpe arcano violeta que atravessa parte da Defesa.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.13, CustoEter: 14, ChancePorMil: 200, MaxUsos: 2, Fator: 1.18},
		{ID: "furia_vazio", Nome: "Fúria do Vazio", Descricao: "Abaixo de 35% da Vida, ataque sobe 15% até o fim.", Tipo: poderFuria,
			CustoEter: 10, ChancePorMil: 900, AbaixoDePct: 35, MaxUsos: 1, Fator: 1.15},
	},
	"senhor_infernal": {
		{ID: "espada_abismo", Nome: "Lâmina do Inferno", Descricao: "Golpe flamejante pesado com espada vulcânica.", Tipo: poderGolpe,
			CustoEter: 14, ChancePorMil: 210, APartirDaRodada: 2, MaxUsos: 2, Fator: 1.26},
		{ID: "chamas_infernais", Nome: "Ira Demoníaca", Descricao: "Abaixo de 35% da Vida, ataque sobe 15%.", Tipo: poderFuria,
			CustoEter: 12, ChancePorMil: 900, AbaixoDePct: 35, MaxUsos: 1, Fator: 1.15},
	},
	"arcanjo_blindado": {
		{ID: "julgar_sagrado", Nome: "Julgamento Sagrado", Descricao: "Espada de luz pura que soma Ataque e Magia.", Tipo: poderGolpe,
			Arcano: true, FatorMagia: 0.13, CustoEter: 15, ChancePorMil: 190, MaxUsos: 2, Fator: 1.18},
		{ID: "egide_asas", Nome: "Égide de Seis Asas", Descricao: "Abaixo de 55% da Vida, corta 30% do dano por 2 rodadas.", Tipo: poderEscudo,
			CustoEter: 12, ChancePorMil: 260, AbaixoDePct: 55, MaxUsos: 1, Fator: 0.30, Rodadas: 2},
	},
	"horror_da_fenda": {
		{ID: "devorar_eter", Nome: "Fome da Fenda", Descricao: "Mordida arcana dimensional que regenera metade do dano.", Tipo: poderDrenar,
			Arcano: true, FatorMagia: 0.12, CustoEter: 15, ChancePorMil: 180, MaxUsos: 1, Fator: 0.98},
		{ID: "prole_fenda", Nome: "Olho Menor", Descricao: "Abaixo de 40% da Vida, gera um Olho da Fenda.", Tipo: poderInvocar,
			CustoEter: 16, ChancePorMil: 240, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Olho da Fenda", AjudanteVidaPct: 5, AjudanteAtqPct: 16},
	},
}

// PoderesDoMonstro devolve os poderes do monstro do catálogo, ou nenhum.
func PoderesDoMonstro(id string) []PoderMonstro {
	return poderesDosMonstros[id]
}

// RegiaoMapa descreve uma zona do mapa-múndi 2D conectado das expedições.
type RegiaoMapa struct {
	ID            string   `json:"id"`
	Nome          string   `json:"nome"`
	Subtitulo     string   `json:"subtitulo"`
	Bioma         string   `json:"bioma"`
	EfeitoBioma   string   `json:"efeito_bioma"`
	FaixaNivel    string   `json:"faixa_nivel"`
	Ordem         int      `json:"ordem"`
	X             int      `json:"x"`
	Y             int      `json:"y"`
	Conexoes      []string `json:"conexoes,omitempty"`
	MonstroIDs    []string `json:"monstros"`
	EmDestaque    bool     `json:"em_destaque,omitempty"`
	BonusDestaque string   `json:"bonus_destaque,omitempty"`
}

// CatalogoRegioes devolve as sete regiões conectadas no mapa-múndi 2D de exploração (64 monstros).
func CatalogoRegioes() []RegiaoMapa {
	return []RegiaoMapa{
		{
			ID:          "clareira_inicial",
			Nome:        "Clareira Inicial",
			Subtitulo:   "Primeiros passos na fronteira",
			Bioma:       "Brisa de Éter",
			EfeitoBioma: "Efeito do bioma: +3% de Ataque para Éter e Terra em campo aberto.",
			FaixaNivel:  "Nv 1–8",
			Ordem:       1,
			X:           28,
			Y:           75,
			Conexoes:    []string{"bosque_sombrio", "forja_vulcanica"},
			MonstroIDs:  []string{"slime_de_eter", "slime_espinhoso", "cogumelo_esporifero", "goblin_batedor", "vespa_eletrica", "golem_musgoso"},
		},
		{
			ID:          "bosque_sombrio",
			Nome:        "Bosque Sombrio",
			Subtitulo:   "Trilhas fechadas e raízes rúnicas",
			Bioma:       "Névoa Espessa",
			EfeitoBioma: "Efeito do bioma: +1,5% de Esquiva para ambos; Fogo ganha +3% de Ataque.",
			FaixaNivel:  "Nv 10–25",
			Ordem:       2,
			X:           19,
			Y:           47,
			Conexoes:    []string{"clareira_inicial", "mares_e_geada", "ruinas_do_vazio"},
			MonstroIDs:  []string{"lobo_sombrio", "arvore_de_esporos", "slime_de_cranios", "planta_carnivora", "druida_da_floresta", "centopeia_toxica", "golem_de_runas", "ent_apodrecido", "alquimista_da_praga", "wyvern_esmeralda"},
		},
		{
			ID:          "forja_vulcanica",
			Nome:        "Fendas Vulcânicas",
			Subtitulo:   "Rios de lava e rocha viva",
			Bioma:       "Cinzas Incandescentes",
			EfeitoBioma: "Efeito do bioma: +3% de Ataque para ambos; Água recebe +3% de Defesa.",
			FaixaNivel:  "Nv 14–42",
			Ordem:       3,
			X:           63,
			Y:           75,
			Conexoes:    []string{"clareira_inicial", "ruinas_do_vazio", "cume_ancestral"},
			MonstroIDs:  []string{"javali_vulcanico", "aranha_rubra", "cao_de_magma", "fera_de_obsidiana", "golem_de_magma", "beemote_de_lava", "fenix_solar"},
		},
		{
			ID:          "mares_e_geada",
			Nome:        "Picos Glaciais",
			Subtitulo:   "Marés congeladas e geleiras",
			Bioma:       "Ventos Cortantes",
			EfeitoBioma: "Efeito do bioma: +2% de Crítico para ambos; Raio ganha +3% de Ataque.",
			FaixaNivel:  "Nv 17–46",
			Ordem:       4,
			X:           35,
			Y:           22,
			Conexoes:    []string{"bosque_sombrio", "santuario_astral"},
			MonstroIDs:  []string{"serpente_marinha", "revena_glacial", "grifo_glacial", "aranha_glacial", "golem_de_gelo", "yeti_glacial", "leviata_relampago", "cavaleiro_da_geada", "colosso_glacial", "dragao_glacial", "lorde_da_geada"},
		},
		{
			ID:          "ruinas_do_vazio",
			Nome:        "Ruínas do Vazio",
			Subtitulo:   "Salões de um reino esquecido",
			Bioma:       "Ecos Arcanos",
			EfeitoBioma: "Efeito do bioma: +3% de Magia para ambos; Luz recebe +3% de Defesa.",
			FaixaNivel:  "Nv 16–41",
			Ordem:       5,
			X:           50,
			Y:           49,
			Conexoes:    []string{"bosque_sombrio", "forja_vulcanica", "santuario_astral", "cume_ancestral"},
			MonstroIDs:  []string{"espectro_acorrentado", "fragmento_do_olho", "fantasma_do_vazio", "lobo_abissal", "golem_flutuante", "espectro_do_vazio", "beemote_fungico", "ceifador_sombrio", "vortex_do_olho", "slime_do_vazio", "cavaleiro_caido", "ceifador_espectral", "colosso_runico", "golem_do_vazio"},
		},
		{
			ID:          "santuario_astral",
			Nome:        "Santuário Astral",
			Subtitulo:   "Onde luz e abismo se cruzam",
			Bioma:       "Fronteira Astral",
			EfeitoBioma: "Efeito do bioma: +2% de Crítico para ambos; Luz e Trevas ganham +2% de Ataque.",
			FaixaNivel:  "Nv 42–54",
			Ordem:       6,
			X:           69,
			Y:           21,
			Conexoes:    []string{"mares_e_geada", "ruinas_do_vazio", "cume_ancestral"},
			MonstroIDs:  []string{"beholder_abissal", "lich_das_sombras", "dragao_esqueleto", "grifo_dourado", "serpente_espectral", "rei_lich", "draconato_do_trovao", "serafim_celestial", "kraken_abissal"},
		},
		{
			ID:          "cume_ancestral",
			Nome:        "Cume Ancestral",
			Subtitulo:   "Altar das tempestades primordiais",
			Bioma:       "Tempestade Etérea",
			EfeitoBioma: "Efeito do bioma: +3% de Velocidade e +3% de Magia para ambos; Éter ganha +3% de Defesa.",
			FaixaNivel:  "Nv 48–60+",
			Ordem:       7,
			X:           88,
			Y:           50,
			Conexoes:    []string{"forja_vulcanica", "ruinas_do_vazio", "santuario_astral"},
			MonstroIDs:  []string{"dragao_tempestade", "dragao_de_eter", "dragao_do_vazio", "senhor_infernal", "arcanjo_blindado", "horror_da_fenda", "primordial_esquecido"},
		},
	}
}

// RegiaoEmDestaqueEm escolhe deterministicamente a região em destaque do dia no fuso da Guilda.
func RegiaoEmDestaqueEm(agora time.Time) string {
	regioes := CatalogoRegioes()
	diaBrasilia := agora.In(fusoGuilda)
	dias := int(time.Date(diaBrasilia.Year(), diaBrasilia.Month(), diaBrasilia.Day(), 0, 0, 0, 0, time.UTC).Unix() / 86400)
	if dias < 0 {
		dias = -dias
	}
	return regioes[dias%len(regioes)].ID
}

// RegiaoDoMonstroID devolve o id e o nome da região do catálogo; vazio fora dele.
func RegiaoDoMonstroID(monstroID string) (string, string) {
	for _, r := range CatalogoRegioes() {
		for _, id := range r.MonstroIDs {
			if id == monstroID {
				return r.ID, r.Nome
			}
		}
	}
	return "", ""
}

// PerfilMonstro guarda os atributos complementares, identidade tática e evolução de cada monstro.
type PerfilMonstro struct {
	Magia         int
	Eter          int
	CriticoPorMil int
	DanoCritico   int
	EsquivaPorMil int
	Comportamento string
	Habitat       string
	DicaTatica    string
	Familia       string
	Estagio       int
	EvoluiDe      string
	EvoluiPara    []string
}

var perfisDosMonstros = map[string]PerfilMonstro{
	// === Clareira Inicial ===
	"slime_de_eter": {
		Magia: 4, Eter: 10, CriticoPorMil: 50, DanoCritico: 140, EsquivaPorMil: 0,
		Comportamento: "Instintivo",
		Habitat:       "Forma-se nas poças de Éter puro na orla da Clareira Inicial.",
		DicaTatica:    "Não possui poderes especiais nem esquiva — ideal para testar suas primeiras habilidades.",
	},
	"slime_espinhoso": {
		Magia: 6, Eter: 12, CriticoPorMil: 65, DanoCritico: 140, EsquivaPorMil: 0,
		Comportamento: "Instintivo",
		Habitat:       "Cresce perto de brejos ácidos nas margens da Clareira.",
		DicaTatica:    "Forma inicial dos Slimes ácidos. Golpes rápidos derrubam antes da evolução.",
		Familia:       "Slimes", Estagio: 1, EvoluiPara: []string{"slime_de_cranios"},
	},
	"cogumelo_esporifero": {
		Magia: 8, Eter: 14, CriticoPorMil: 70, DanoCritico: 145, EsquivaPorMil: 10,
		Comportamento: "Territorial",
		Habitat:       "Brota em tocos úmidos no limite entre a Clareira e o Bosque.",
		DicaTatica:    "Baixa defesa física; ataques de Fogo levam vantagem contra Terra.",
		Familia:       "Esporos", Estagio: 1, EvoluiPara: []string{"arvore_de_esporos"},
	},
	"goblin_batedor": {
		Magia: 2, Eter: 8, CriticoPorMil: 110, DanoCritico: 155, EsquivaPorMil: 30,
		Comportamento: "Astuto",
		Habitat:       "Patrulha as trilhas de pedra em busca de aventureiros distraídos.",
		DicaTatica:    "Tem esquiva leve e crítico acima da média inicial; derrube-o antes que acerte um crítico.",
	},
	"vespa_eletrica": {
		Magia: 14, Eter: 16, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 35,
		Comportamento: "Veloz",
		Habitat:       "Zune sobre colinas abertas acumulando faíscas estáticas.",
		DicaTatica:    "Alta velocidade e esquiva para o início; personagens de Terra resistem melhor ao Raio.",
	},
	"golem_musgoso": {
		Magia: 10, Eter: 16, CriticoPorMil: 60, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Vigias de pedra cobertos de musgo na ponte para o Bosque Sombrio.",
		DicaTatica:    "Zero esquiva, mas Vida alta para o nível. Fogo tem vantagem direta.",
		Familia:       "Golens de Terra", Estagio: 1, EvoluiPara: []string{"golem_de_runas"},
	},

	// === Bosque Sombrio ===
	"lobo_sombrio": {
		Magia: 10, Eter: 16, CriticoPorMil: 115, DanoCritico: 155, EsquivaPorMil: 35,
		Comportamento: "Predador",
		Habitat:       "Caça em matilha sob a copa fechada do Bosque Sombrio.",
		DicaTatica:    "Abaixo de 50% da Vida chama um Lobo Jovem que intercepta seus golpes. Luz tem vantagem direta.",
		Familia:       "Lobos Sombrios", Estagio: 1, EvoluiPara: []string{"lobo_abissal"},
	},
	"arvore_de_esporos": {
		Magia: 18, Eter: 22, CriticoPorMil: 75, DanoCritico: 145, EsquivaPorMil: 10,
		Comportamento: "Territorial",
		Habitat:       "Caminha entre raízes antigas espalhando esporos luminosos.",
		DicaTatica:    "Evolução do Cogumelo Esporífero. Fogo garante +10% de dano contra seu corpo vegetal.",
		Familia:       "Esporos", Estagio: 2, EvoluiDe: "cogumelo_esporifero", EvoluiPara: []string{"ent_apodrecido", "beemote_fungico"},
	},
	"slime_de_cranios": {
		Magia: 28, Eter: 26, CriticoPorMil: 85, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Corrosivo",
		Habitat:       "Acumula restos mortais nas poças fundas do Bosque Sombrio.",
		DicaTatica:    "Ácido Corrosivo usa Magia e atravessa parte da Defesa física.",
		Familia:       "Slimes", Estagio: 2, EvoluiDe: "slime_espinhoso", EvoluiPara: []string{"slime_do_vazio"},
	},
	"planta_carnivora": {
		Magia: 14, Eter: 20, CriticoPorMil: 95, DanoCritico: 155, EsquivaPorMil: 10,
		Comportamento: "Emboscador",
		Habitat:       "Esconde a bocarra atrás de folhagens densas esperando passos próximos.",
		DicaTatica:    "Crítico pesado no ataque corpo a corpo; evite lutar com pouca Defesa ou use vantagem de Fogo.",
	},
	"druida_da_floresta": {
		Magia: 38, Eter: 32, CriticoPorMil: 85, DanoCritico: 145, EsquivaPorMil: 20,
		Comportamento: "Arcano",
		Habitat:       "Guarda clareiras sagradas entre galhadas de musgo.",
		DicaTatica:    "Dreno de Seiva devolve Vida a ele; corte a luta rápido com habilidades de dano alto.",
		Familia:       "Eruditos da Praga", Estagio: 1, EvoluiPara: []string{"alquimista_da_praga"},
	},
	"centopeia_toxica": {
		Magia: 22, Eter: 24, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Predador",
		Habitat:       "Rasteja por troncos caídos pingando veneno ácido.",
		DicaTatica:    "Rápida e de Trevas; personagens de Luz encerram a luta com folga.",
	},
	"golem_de_runas": {
		Magia: 24, Eter: 24, CriticoPorMil: 70, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Ergue-se entre obeliscos antigos cobertos de musgo e runas.",
		DicaTatica:    "Não esquiva, mas ergue Muralha de Runas abaixo de 70% da Vida (-40% dano recebido). Fogo e ataques arcanos rendem mais.",
		Familia:       "Golens de Terra", Estagio: 2, EvoluiDe: "golem_musgoso", EvoluiPara: []string{"golem_flutuante"},
	},
	"ent_apodrecido": {
		Magia: 30, Eter: 30, CriticoPorMil: 80, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Árvore anciã corrompida por fungos nos confins do bosque.",
		DicaTatica:    "Casca de Esporos corta o dano abaixo de 65% de Vida. Fogo reduz drasticamente a resistência dele.",
		Familia:       "Esporos", Estagio: 3, EvoluiDe: "arvore_de_esporos",
	},
	"alquimista_da_praga": {
		Magia: 36, Eter: 34, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Estrategista",
		Habitat:       "Laboratório improvisado sob árvores retorcidas no coração da névoa.",
		DicaTatica:    "Alterna Elixir drenante com invocação de Broto Tóxico abaixo de 40% de Vida. Luz leva vantagem direta.",
		Familia:       "Eruditos da Praga", Estagio: 2, EvoluiDe: "druida_da_floresta",
	},
	"wyvern_esmeralda": {
		Magia: 46, Eter: 36, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Predador",
		Habitat:       "Nidifica nos penhascos altos sobre o Bosque Sombrio.",
		DicaTatica:    "Mergulho Cortante acelera o dano a partir da 2ª rodada; Fogo vence Terra.",
	},

	// === Fendas Vulcânicas ===
	"javali_vulcanico": {
		Magia: 14, Eter: 20, CriticoPorMil: 95, DanoCritico: 155, EsquivaPorMil: 10,
		Comportamento: "Agressivo",
		Habitat:       "Percorre encostas quentes abrindo trilhas em rocha quente.",
		DicaTatica:    "Ataque físico sólido; personagens de Água ganham vantagem elemental direta.",
		Familia:       "Feras de Magma", Estagio: 1, EvoluiPara: []string{"cao_de_magma"},
	},
	"aranha_rubra": {
		Magia: 32, Eter: 28, CriticoPorMil: 115, DanoCritico: 155, EsquivaPorMil: 30,
		Comportamento: "Emboscador",
		Habitat:       "Pendura-se nos arcos de basalto sobre fissuras de lava.",
		DicaTatica:    "Crítico e esquiva altos. Mantenha Vida acima de 60% antes de enfrentar e explore elemento Água.",
	},
	"cao_de_magma": {
		Magia: 42, Eter: 36, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Predador",
		Habitat:       "Caça ao redor dos lagos incandescentes das Fendas Vulcânicas.",
		DicaTatica:    "Mordida Incandescente bate forte no começo; Água segura o ritmo da luta.",
		Familia:       "Feras de Magma", Estagio: 2, EvoluiDe: "javali_vulcanico", EvoluiPara: []string{"fera_de_obsidiana", "beemote_de_lava"},
	},
	"fera_de_obsidiana": {
		Magia: 44, Eter: 38, CriticoPorMil: 90, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Blindado",
		Habitat:       "Habita os túneis de lava solidificada sob o vulcão.",
		DicaTatica:    "Defesa muito alta e Placa de Obsidiana abaixo de 60% de Vida; habilidades arcanas brilham contra ela.",
		Familia:       "Feras de Magma", Estagio: 3, EvoluiDe: "cao_de_magma",
	},
	"golem_de_magma": {
		Magia: 62, Eter: 42, CriticoPorMil: 85, DanoCritico: 150, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Ergue-se das poças de rocha líquida perto das fornalhas naturais.",
		DicaTatica:    "Sem esquiva, mas Manto Vulcânico segura 35% do dano abaixo de 70% de Vida.",
	},
	"beemote_de_lava": {
		Magia: 74, Eter: 50, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Soberano",
		Habitat:       "Domina a câmara central do vulcão com rugidos sísmicos.",
		DicaTatica:    "Combina Erupção Tectônica após a 3ª rodada com fúria final. Água reduz pressão.",
		Familia:       "Feras de Magma", Estagio: 3, EvoluiDe: "cao_de_magma",
	},
	"fenix_solar": {
		Magia: 118, Eter: 58, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Soberano",
		Habitat:       "Plana sobre a cratera mais alta onde o calor alimenta suas penas.",
		DicaTatica:    "Asas do Sol regeneram Vida e Brilho Renascido sobe o ataque abaixo de 35%. Água leva vantagem direta.",
	},

	// === Picos Glaciais ===
	"serpente_marinha": {
		Magia: 34, Eter: 28, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Ágil",
		Habitat:       "Desliza pelas enseadas geladas entre blocos de gelo.",
		DicaTatica:    "Rápida para o nível; heróis de Raio têm vantagem de +10% sobre Água.",
		Familia:       "Serpentes & Dragões", Estagio: 1, EvoluiPara: []string{"leviata_relampago"},
	},
	"revena_glacial": {
		Magia: 32, Eter: 30, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Persistente",
		Habitat:       "Patrulha navios presos na geleira segurando seu tridente.",
		DicaTatica:    "Equilibrado entre ataque e defesa; Raio acelera o abate.",
		Familia:       "Guerreiros da Geada", Estagio: 1, EvoluiPara: []string{"cavaleiro_da_geada"},
	},
	"grifo_glacial": {
		Magia: 40, Eter: 34, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Veloz",
		Habitat:       "Ninhos nos picos ventosos acima da costa gelada.",
		DicaTatica:    "Velocidade alta; ataque com habilidades logo no início antes que acumule críticos.",
		Familia:       "Grifos", Estagio: 1, EvoluiPara: []string{"grifo_dourado"},
	},
	"aranha_glacial": {
		Magia: 38, Eter: 30, CriticoPorMil: 115, DanoCritico: 155, EsquivaPorMil: 30,
		Comportamento: "Emboscador",
		Habitat:       "Escala cavernas translúcidas de gelo sólido.",
		DicaTatica:    "Muito crítica e esquiva ágil; Raio dá vantagem direta.",
	},
	"golem_de_gelo": {
		Magia: 36, Eter: 34, CriticoPorMil: 75, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Vigia passagens estreitas entre paredes de cristal azul.",
		DicaTatica:    "Bastião Glacial reduz dano abaixo de 65% de Vida; nunca esquiva.",
		Familia:       "Golens de Gelo", Estagio: 1, EvoluiPara: []string{"colosso_glacial"},
	},
	"yeti_glacial": {
		Magia: 30, Eter: 32, CriticoPorMil: 105, DanoCritico: 155, EsquivaPorMil: 15,
		Comportamento: "Brutal",
		Habitat:       "Domina ravinas cobertas de neve espessa e neblina.",
		DicaTatica:    "Rugido da Nevasca aumenta o ataque abaixo de 40% de Vida — guarde uma cura ou golpe forte para finalizar.",
	},
	"leviata_relampago": {
		Magia: 72, Eter: 46, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Arcano",
		Habitat:       "Desperta tempestades elétricas acima do mar congelado.",
		DicaTatica:    "Troca de Água para Raio ao evoluir! Terra tem vantagem direta contra ele.",
		Familia:       "Serpentes & Dragões", Estagio: 2, EvoluiDe: "serpente_marinha", EvoluiPara: []string{"dragao_tempestade"},
	},
	"cavaleiro_da_geada": {
		Magia: 66, Eter: 46, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Estrategista",
		Habitat:       "Guarda o portão da cidadela congelada.",
		DicaTatica:    "Lâmina Glacial começa na 2ª rodada; armadura alta pede golpes arcanos ou elemento Raio.",
		Familia:       "Guerreiros da Geada", Estagio: 2, EvoluiDe: "revena_glacial", EvoluiPara: []string{"lorde_da_geada"},
	},
	"colosso_glacial": {
		Magia: 82, Eter: 52, CriticoPorMil: 85, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Auge do gelo vivo no centro da geleira eterna.",
		DicaTatica:    "Erga dano alto constante contra Cristal Eterno; nunca esquiva.",
		Familia:       "Golens de Gelo", Estagio: 2, EvoluiDe: "golem_de_gelo",
	},
	"dragao_glacial": {
		Magia: 104, Eter: 56, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Soberano",
		Habitat:       "Sobrevoa os cumes nevados que dividem os Picos do Santuário.",
		DicaTatica:    "Sopro de Geleira atravessa parte da Defesa física; elemento Raio facilita a luta.",
	},
	"lorde_da_geada": {
		Magia: 120, Eter: 62, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Soberano",
		Habitat:       "Trono congelado no topo das geleiras.",
		DicaTatica:    "Forma final dos Guerreiros da Geada. Alabarda Rúnica drena Vida e chama Servo Glacial abaixo de 40%.",
		Familia:       "Guerreiros da Geada", Estagio: 3, EvoluiDe: "cavaleiro_da_geada",
	},

	// === Ruínas do Vazio ===
	"espectro_acorrentado": {
		Magia: 40, Eter: 32, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Errante",
		Habitat:       "Flutua nas galerias baixas das Ruínas arrastando correntes.",
		DicaTatica:    "Raiz dos Espectros; elemento Luz garante vantagem contra Trevas.",
		Familia:       "Espectros & Liches", Estagio: 1, EvoluiPara: []string{"fantasma_do_vazio", "ceifador_espectral"},
	},
	"fragmento_do_olho": {
		Magia: 58, Eter: 38, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Observador",
		Habitat:       "Orbita pilares partidos emitindo estilhaços violeta.",
		DicaTatica:    "Alta Magia para o nível; finalize rápido antes que acumule acertos arcanos.",
		Familia:       "Olhos do Vazio", Estagio: 1, EvoluiPara: []string{"vortex_do_olho"},
	},
	"fantasma_do_vazio": {
		Magia: 66, Eter: 42, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 30,
		Comportamento: "Astuto",
		Habitat:       "Ecoa risos entre arcos destruídos onde a névoa é mais densa.",
		DicaTatica:    "Esquiva acima da média; Luz traz vantagem contra Trevas.",
		Familia:       "Espectros & Liches", Estagio: 2, EvoluiDe: "espectro_acorrentado", EvoluiPara: []string{"ceifador_sombrio"},
	},
	"lobo_abissal": {
		Magia: 48, Eter: 40, CriticoPorMil: 115, DanoCritico: 155, EsquivaPorMil: 30,
		Comportamento: "Predador",
		Habitat:       "Lobo Sombrio corrompido pelo Éter nas bordas das Ruínas.",
		DicaTatica:    "Veloz e chama um Cão do Vazio abaixo de 45% da Vida. Luz vence Trevas.",
		Familia:       "Lobos Sombrios", Estagio: 2, EvoluiDe: "lobo_sombrio",
	},
	"golem_flutuante": {
		Magia: 64, Eter: 42, CriticoPorMil: 85, DanoCritico: 145, EsquivaPorMil: 10,
		Comportamento: "Guardião",
		Habitat:       "Blocos erguidos por magnetismo antigo nos pátios arcanos.",
		DicaTatica:    "Campo Magnético reduz dano abaixo de 60% da Vida; Fogo vence Terra.",
		Familia:       "Golens de Terra", Estagio: 3, EvoluiDe: "golem_de_runas", EvoluiPara: []string{"colosso_runico"},
	},
	"espectro_do_vazio": {
		Magia: 85, Eter: 40, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Arcano",
		Habitat:       "Flutua pelos salões partidos onde o Éter condensou em névoa fria.",
		DicaTatica:    "Toque do Vazio escala com Magia, atravessa parte da Defesa física e drena Vida. Luz tem vantagem contra Trevas.",
	},
	"beemote_fungico": {
		Magia: 58, Eter: 44, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 5,
		Comportamento: "Brutal",
		Habitat:       "Cogumelo gigante fundido com rocha nas criptas úmidas das Ruínas.",
		DicaTatica:    "Esmagamento Fúngico cresce a partir da 2ª rodada; Fogo leva vantagem.",
		Familia:       "Esporos", Estagio: 3, EvoluiDe: "arvore_de_esporos",
	},
	"ceifador_sombrio": {
		Magia: 82, Eter: 46, CriticoPorMil: 110, DanoCritico: 155, EsquivaPorMil: 25,
		Comportamento: "Assassino",
		Habitat:       "Caminha pelas sombras dos corredores centrais com sua foice.",
		DicaTatica:    "Ceifa de Éter atravessa defesa física; Luz ajuda tanto no ataque quanto na sobrevivência.",
		Familia:       "Espectros & Liches", Estagio: 3, EvoluiDe: "fantasma_do_vazio", EvoluiPara: []string{"lich_das_sombras"},
	},
	"vortex_do_olho": {
		Magia: 92, Eter: 48, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Arcano",
		Habitat:       "Suspenso sobre fendas abertas manipulando detritos ao redor.",
		DicaTatica:    "Raio Orbital escala forte com Magia; traga resistência arcana ou elemento Luz.",
		Familia:       "Olhos do Vazio", Estagio: 2, EvoluiDe: "fragmento_do_olho", EvoluiPara: []string{"beholder_abissal"},
	},
	"slime_do_vazio": {
		Magia: 88, Eter: 48, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Corrosivo",
		Habitat:       "Poço mais profundo onde a energia do Vazio se condensou em gelatina negra.",
		DicaTatica:    "Ápice evolutivo dos Slimes. Absorção Violeta recupera Vida no golpe arcano.",
		Familia:       "Slimes", Estagio: 3, EvoluiDe: "slime_de_cranios",
	},
	"cavaleiro_caido": {
		Magia: 55, Eter: 42, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Estrategista",
		Habitat:       "Guarda a praça central das Ruínas em memória de um juramento quebrado.",
		DicaTatica:    "Segura Juramento Partido até a 3ª rodada e chama um Escudeiro Fantasma abaixo de 40% da Vida. Água reduz a pressão.",
	},
	"ceifador_espectral": {
		Magia: 74, Eter: 48, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 18,
		Comportamento: "Arcano",
		Habitat:       "Sala do trono quebrado onde almas guardam espadas espectrais.",
		DicaTatica:    "Corte Turquesa drena Vida com dano arcano; Luz mantém vantagem de elemento.",
		Familia:       "Espectros & Liches", Estagio: 2, EvoluiDe: "espectro_acorrentado", EvoluiPara: []string{"rei_lich"},
	},
	"colosso_runico": {
		Magia: 70, Eter: 48, CriticoPorMil: 80, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Último guardião das torres de pedra nas Ruínas.",
		DicaTatica:    "Defesa altíssima e Armadura Esmeralda (-35% dano); Fogo e ataques mágicos furam a pedra.",
		Familia:       "Golens de Terra", Estagio: 4, EvoluiDe: "golem_flutuante",
	},
	"golem_do_vazio": {
		Magia: 112, Eter: 56, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Arcano",
		Habitat:       "Monólito rachado no portal rumo ao Santuário Astral.",
		DicaTatica:    "Pulso da Fissura une força bruta e Magia. Elemento Luz acelera o confronto.",
	},

	// === Santuário Astral ===
	"beholder_abissal": {
		Magia: 126, Eter: 58, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Estrategista",
		Habitat:       "Salão astral onde dezenas de tentáculos vigiam todas as direções.",
		DicaTatica:    "Olhar Central atravessa parte da Defesa; elemento Luz equilibra o duelo.",
		Familia:       "Olhos do Vazio", Estagio: 3, EvoluiDe: "vortex_do_olho", EvoluiPara: []string{"kraken_abissal", "horror_da_fenda"},
	},
	"lich_das_sombras": {
		Magia: 132, Eter: 60, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Arcano",
		Habitat:       "Cripta astral iluminada por fogos verdes perpétuos.",
		DicaTatica:    "Chamas Verdes drenam Vida continuamente; use combos de alto dano sob vantagem de Luz.",
		Familia:       "Espectros & Liches", Estagio: 4, EvoluiDe: "ceifador_sombrio", EvoluiPara: []string{"rei_lich"},
	},
	"dragao_esqueleto": {
		Magia: 118, Eter: 58, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Soberano",
		Habitat:       "Ossário elevado suspenso sobre o abismo astral.",
		DicaTatica:    "Sopro de Ossos é arcano; traga boa Vida e elemento Luz.",
	},
	"grifo_dourado": {
		Magia: 108, Eter: 58, CriticoPorMil: 110, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Nobre",
		Habitat:       "Torres luminosas do Santuário onde sentinelas solares patrulham.",
		DicaTatica:    "Forma evoluída do Grifo Glacial. Rápido e de Luz — Trevas têm vantagem elemental.",
		Familia:       "Grifos", Estagio: 2, EvoluiDe: "grifo_glacial",
	},
	"serpente_espectral": {
		Magia: 130, Eter: 62, CriticoPorMil: 105, DanoCritico: 150, EsquivaPorMil: 25,
		Comportamento: "Predador",
		Habitat:       "Serpeia pelo céu violeta entre cometas de Éter.",
		DicaTatica:    "Alta velocidade e Mordida Estelar com dreno; Luz ou dano explosivo resolvem rápido.",
	},
	"rei_lich": {
		Magia: 120, Eter: 62, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 12,
		Comportamento: "Soberano",
		Habitat:       "Trono de ossos rúnicos no centro do Santuário Astral.",
		DicaTatica:    "Ápice dos Espectros. Decreto do Lich drena Vida e chama Guarda Esqueleto abaixo de 40%.",
		Familia:       "Espectros & Liches", Estagio: 5, EvoluiDe: "lich_das_sombras",
	},
	"draconato_do_trovao": {
		Magia: 112, Eter: 60, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Campeão",
		Habitat:       "Arena de tempestade dourada nos degraus antes do Cume.",
		DicaTatica:    "Machado Fulminante mistura físico e arcano; Terra ganha vantagem contra Raio.",
	},
	"serafim_celestial": {
		Magia: 122, Eter: 62, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Celestial",
		Habitat:       "Arcos radiantes que guardam a ascensão divina.",
		DicaTatica:    "Anéis da Aurora regeneram Vida no golpe; Trevas leva vantagem contra Luz.",
		Familia:       "Celestiais", Estagio: 1, EvoluiPara: []string{"arcanjo_blindado"},
	},
	"kraken_abissal": {
		Magia: 124, Eter: 64, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 12,
		Comportamento: "Soberano",
		Habitat:       "Fossa abissal inundada sob o Santuário Astral.",
		DicaTatica:    "Vórtice Oceânico escala com Magia e invoca Tentáculo Guardião abaixo de 40%. Raio vence Água.",
		Familia:       "Olhos do Vazio", Estagio: 4, EvoluiDe: "beholder_abissal",
	},

	// === Cume Ancestral ===
	"dragao_tempestade": {
		Magia: 132, Eter: 62, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 15,
		Comportamento: "Soberano",
		Habitat:       "Nuvens carregadas de relâmpago logo abaixo do pico final.",
		DicaTatica:    "Ápice da Serpente Marinha. Relâmpago Antigo fura Defesa; Terra domina Raio.",
		Familia:       "Serpentes & Dragões", Estagio: 3, EvoluiDe: "leviata_relampago",
	},
	"dragao_de_eter": {
		Magia: 135, Eter: 60, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Soberano",
		Habitat:       "Sobrevoa os picos carregados de relâmpagos do Cume Ancestral.",
		DicaTatica:    "Combina Sopro arcano com Fúria Ancestral abaixo de 30% da Vida. Terra vence Raio e segura o dano melhor.",
	},
	"dragao_do_vazio": {
		Magia: 132, Eter: 66, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 12,
		Comportamento: "Soberano",
		Habitat:       "Fendas espaciais abertas nas correntes altas do Cume.",
		DicaTatica:    "Rasgo Espacial + Fúria do Vazio abaixo de 35%. Personagens de Luz suportam melhor o duelo.",
	},
	"senhor_infernal": {
		Magia: 128, Eter: 66, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Conquistador",
		Habitat:       "Trono de cinzas no flanco ardente do Cume Ancestral.",
		DicaTatica:    "Lâmina do Inferno + Ira Demoníaca. Água segura a pressão elemental.",
	},
	"arcanjo_blindado": {
		Magia: 134, Eter: 68, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 12,
		Comportamento: "Celestial",
		Habitat:       "Portão dourado que antecede o altar do Primordial.",
		DicaTatica:    "Forma evoluída do Serafim. Julgamento Sagrado + Égide de Seis Asas — Trevas oferece vantagem elemental.",
		Familia:       "Celestiais", Estagio: 2, EvoluiDe: "serafim_celestial",
	},
	"horror_da_fenda": {
		Magia: 140, Eter: 70, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Abissal",
		Habitat:       "Rasgo vivo ao lado do altar onde o espaço se dobra.",
		DicaTatica:    "Ápice dos Olhos do Vazio. Fome da Fenda drena Vida e invoca Olho da Fenda abaixo de 40%. Venha com conjunto completo.",
		Familia:       "Olhos do Vazio", Estagio: 4, EvoluiDe: "beholder_abissal",
	},
	"primordial_esquecido": {
		Magia: 165, Eter: 75, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Primordial",
		Habitat:       "Desperta no altar mais alto do mundo quando um herói alcança o ápice.",
		DicaTatica:    "Abaixo de 50% da Vida invoca um Fragmento Primordial e alterna críticos com alto Éter. Venha com conjunto completo e poções em dia.",
	},
}

// EnriquecerMonstro preenche velocidade, elemento, poderes, região, evolução e os 8 atributos de combate.
// Monstros fora do catálogo mantêm os padrões clássicos para não alterar lutas sintéticas.
func EnriquecerMonstro(m *MonstroRPG) {
	if m.Velocidade == 0 {
		m.Velocidade = VelocidadeDoMonstro(*m)
	}
	if m.Elemento == "" {
		m.Elemento = ElementoDoMonstro(m.ID)
	}
	if ef, ok := EfeitoDoElemento(m.Elemento); ok && m.Efeito == nil {
		m.Efeito = &ef
	}
	if m.Poderes == nil {
		m.Poderes = PoderesDoMonstro(m.ID)
	}
	if p, ok := perfisDosMonstros[m.ID]; ok {
		if m.Magia == 0 {
			m.Magia = p.Magia
		}
		if m.Eter == 0 {
			m.Eter = p.Eter
		}
		if m.CriticoPorMil == 0 {
			m.CriticoPorMil = p.CriticoPorMil
		}
		if m.DanoCritico == 0 {
			m.DanoCritico = p.DanoCritico
		}
		if m.EsquivaPorMil == 0 {
			m.EsquivaPorMil = p.EsquivaPorMil
		}
		if m.Comportamento == "" {
			m.Comportamento = p.Comportamento
		}
		if m.Habitat == "" {
			m.Habitat = p.Habitat
		}
		if m.Regiao == "" {
			m.Regiao, m.RegiaoNome = RegiaoDoMonstroID(m.ID)
		}
		if m.Familia == "" {
			m.Familia = p.Familia
		}
		if m.Estagio == 0 {
			m.Estagio = p.Estagio
		}
		if m.EvoluiDe == "" {
			m.EvoluiDe = p.EvoluiDe
		}
		if len(m.EvoluiPara) == 0 && len(p.EvoluiPara) > 0 {
			m.EvoluiPara = append([]string(nil), p.EvoluiPara...)
		}
		return
	}
	if m.CriticoPorMil == 0 {
		m.CriticoPorMil = critMonstroPorMil
	}
	if m.DanoCritico == 0 {
		m.DanoCritico = 150
	}
}

// DicaTaticaDoMonstro devolve a dica tática do catálogo para quem já venceu ao menos uma vez.
func DicaTaticaDoMonstro(id string, vitorias int) string {
	if vitorias < 1 {
		return ""
	}
	return perfisDosMonstros[id].DicaTatica
}

// AjudanteNaLuta é um ajudante chamado durante a luta.
type AjudanteNaLuta struct {
	Nome   string
	Vida   int
	Ataque int
	Defesa int
}

func somarPercentual(valor, pct int) int {
	if valor <= 0 || pct <= 0 {
		return valor
	}
	return valor + max(1, (valor*pct+50)/100)
}

// aplicarEfeitoBioma aplica os modificadores táticos sutis do bioma da região do monstro.
// Nunca altera Vida máxima para manter a referência de PerdaPorMil entre batalhas.
func aplicarEfeitoBioma(jogador *CombatenteRPG, monstro *MonstroRPG) {
	if monstro == nil || monstro.Regiao == "" || jogador == nil {
		return
	}
	switch monstro.Regiao {
	case "clareira_inicial":
		if jogador.Elemento == "eter" || jogador.Elemento == "terra" {
			jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, 3)
		}
		if monstro.Elemento == "eter" || monstro.Elemento == "terra" {
			monstro.Ataque = somarPercentual(monstro.Ataque, 3)
		}
	case "bosque_sombrio":
		jogador.Atributos.EsquivaPorMil += 15
		monstro.EsquivaPorMil += 15
		if jogador.Elemento == "fogo" {
			jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, 3)
		}
		if monstro.Elemento == "fogo" {
			monstro.Ataque = somarPercentual(monstro.Ataque, 3)
		}
	case "forja_vulcanica":
		jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, 3)
		monstro.Ataque = somarPercentual(monstro.Ataque, 3)
		if jogador.Elemento == "agua" {
			jogador.Atributos.Defesa = somarPercentual(jogador.Atributos.Defesa, 3)
		}
		if monstro.Elemento == "agua" {
			monstro.Defesa = somarPercentual(monstro.Defesa, 3)
		}
	case "mares_e_geada":
		jogador.Atributos.CriticoPorMil += 20
		monstro.CriticoPorMil += 20
		if jogador.Elemento == "raio" {
			jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, 3)
		}
		if monstro.Elemento == "raio" {
			monstro.Ataque = somarPercentual(monstro.Ataque, 3)
		}
	case "ruinas_do_vazio":
		jogador.Atributos.Magia = somarPercentual(jogador.Atributos.Magia, 3)
		monstro.Magia = somarPercentual(monstro.Magia, 3)
		if jogador.Elemento == "luz" {
			jogador.Atributos.Defesa = somarPercentual(jogador.Atributos.Defesa, 3)
		}
		if monstro.Elemento == "luz" {
			monstro.Defesa = somarPercentual(monstro.Defesa, 3)
		}
	case "santuario_astral":
		jogador.Atributos.CriticoPorMil += 20
		monstro.CriticoPorMil += 20
		if jogador.Elemento == "luz" || jogador.Elemento == "trevas" {
			jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, 2)
		}
		if monstro.Elemento == "luz" || monstro.Elemento == "trevas" {
			monstro.Ataque = somarPercentual(monstro.Ataque, 2)
		}
	case "cume_ancestral":
		jogador.Atributos.Velocidade = somarPercentual(jogador.Atributos.Velocidade, 3)
		monstro.Velocidade = somarPercentual(monstro.Velocidade, 3)
		jogador.Atributos.Magia = somarPercentual(jogador.Atributos.Magia, 3)
		monstro.Magia = somarPercentual(monstro.Magia, 3)
		if jogador.Elemento == "eter" {
			jogador.Atributos.Defesa = somarPercentual(jogador.Atributos.Defesa, 3)
		}
		if monstro.Elemento == "eter" {
			monstro.Defesa = somarPercentual(monstro.Defesa, 3)
		}
	}
}

// aplicarPassivaEspecialidade aplica o bônus passivo da Especialidade de Gênero do jogador.
func aplicarPassivaEspecialidade(jogador *CombatenteRPG) {
	if jogador == nil || jogador.Passiva == nil || jogador.Passiva.ValorPct <= 0 {
		return
	}
	pct := jogador.Passiva.ValorPct
	switch jogador.Passiva.Tipo {
	case "ataque":
		jogador.Atributos.Ataque = somarPercentual(jogador.Atributos.Ataque, pct)
	case "magia":
		jogador.Atributos.Magia = somarPercentual(jogador.Atributos.Magia, pct)
	case "velocidade":
		jogador.Atributos.Velocidade = somarPercentual(jogador.Atributos.Velocidade, pct)
	case "defesa":
		jogador.Atributos.Defesa = somarPercentual(jogador.Atributos.Defesa, pct)
	case "vida":
		jogador.Atributos.Vida = somarPercentual(jogador.Atributos.Vida, pct)
	case "critico":
		jogador.Atributos.CriticoPorMil += pct * 10
	case "esquiva":
		jogador.Atributos.EsquivaPorMil += pct * 10
	}
}

