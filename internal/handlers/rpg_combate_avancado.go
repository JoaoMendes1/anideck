// internal/handlers/rpg_combate_avancado.go
// Elementos e poderes dos monstros. Ficam no código, como as habilidades das classes: a
// simulação depende deles, e um valor editado sem os testes de equilíbrio mudaria a chance
// de vitória sem ninguém medir.
package handlers

const (
	elementoNeutro = "neutro"
	// Vantagem de elemento: quem tem vantagem bate 12% mais forte; quem está em desvantagem,
	// 8% mais fraco. Os dois lados da luta usam a mesma regra.
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
	// O mapa só tem quem vence alguém: Éter, neutro e vazio nunca entram nas comparações.
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

// elementoDosMonstros: o tutorial e o chefe final ficam no Éter, que é neutro, para o
// primeiro contato e a prova final não dependerem do personagem escolhido.
var elementoDosMonstros = map[string]string{
	"slime_de_eter":        "eter",
	"goblin_batedor":       "terra",
	"lobo_sombrio":         "trevas",
	"golem_de_runas":       "terra",
	"espectro_do_vazio":    "trevas",
	"cavaleiro_caido":      "fogo",
	"dragao_de_eter":       "raio",
	"primordial_esquecido": "eter",
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
	ID        string `json:"id"`
	Nome      string `json:"nome"`
	Descricao string `json:"descricao"`
	Tipo      string `json:"tipo"`
	// ChancePorMil é a chance em cada vez do monstro, depois das condições.
	ChancePorMil int `json:"-"`
	// AbaixoDePct: só quando a Vida do monstro está abaixo desta fração; 0 é sempre.
	AbaixoDePct int `json:"-"`
	// APartirDaRodada: não antes desta rodada.
	APartirDaRodada int     `json:"-"`
	MaxUsos         int     `json:"-"`
	Fator           float64 `json:"-"`
	Rodadas         int     `json:"-"`
	// Ajudante chamado por um poder de invocar, em porcentagem da Vida e do Ataque do monstro.
	Ajudante        string `json:"-"`
	AjudanteVidaPct int    `json:"-"`
	AjudanteAtqPct  int    `json:"-"`
}

// poderesDosMonstros: os dois do tutorial não têm poder, para o primeiro contato ser simples.
var poderesDosMonstros = map[string][]PoderMonstro{
	"lobo_sombrio": {
		{ID: "uivo", Nome: "Uivo da Matilha", Descricao: "Abaixo da metade da Vida, pode chamar um lobo jovem.", Tipo: poderInvocar,
			ChancePorMil: 450, AbaixoDePct: 50, MaxUsos: 1, Ajudante: "Lobo Jovem", AjudanteVidaPct: 22, AjudanteAtqPct: 35},
	},
	"golem_de_runas": {
		{ID: "muralha", Nome: "Muralha de Runas", Descricao: "Abaixo de 70% da Vida, pode reduzir o dano recebido em 40% por 2 rodadas.", Tipo: poderEscudo,
			ChancePorMil: 300, AbaixoDePct: 70, MaxUsos: 2, Fator: 0.40, Rodadas: 2},
	},
	"espectro_do_vazio": {
		{ID: "toque", Nome: "Toque do Vazio", Descricao: "Golpe 30% mais forte que devolve ao espectro metade do dano.", Tipo: poderDrenar,
			ChancePorMil: 250, MaxUsos: 3, Fator: 1.30},
	},
	"cavaleiro_caido": {
		{ID: "juramento", Nome: "Juramento Partido", Descricao: "A partir da 3ª rodada, golpe 40% mais forte.", Tipo: poderGolpe,
			ChancePorMil: 250, APartirDaRodada: 3, MaxUsos: 2, Fator: 1.40},
		{ID: "escudeiro", Nome: "Chamado do Escudeiro", Descricao: "Abaixo de 40% da Vida, pode chamar um escudeiro fantasma.", Tipo: poderInvocar,
			ChancePorMil: 400, AbaixoDePct: 40, MaxUsos: 1, Ajudante: "Escudeiro Fantasma", AjudanteVidaPct: 8, AjudanteAtqPct: 20},
	},
	"dragao_de_eter": {
		{ID: "sopro", Nome: "Sopro da Tempestade", Descricao: "Golpe 50% mais forte.", Tipo: poderGolpe,
			ChancePorMil: 200, MaxUsos: 2, Fator: 1.50},
		{ID: "furia", Nome: "Fúria Ancestral", Descricao: "Abaixo de 30% da Vida, o ataque sobe 15% até o fim da luta.", Tipo: poderFuria,
			ChancePorMil: 1000, AbaixoDePct: 30, MaxUsos: 1, Fator: 1.15},
	},
	"primordial_esquecido": {
		{ID: "eco", Nome: "Eco do Primeiro Reino", Descricao: "Abaixo de 60% da Vida, pode chamar um fragmento de si mesmo.", Tipo: poderInvocar,
			ChancePorMil: 250, AbaixoDePct: 50, MaxUsos: 1, Ajudante: "Fragmento Primordial", AjudanteVidaPct: 6, AjudanteAtqPct: 18},
	},
}

// PoderesDoMonstro devolve os poderes do monstro do catálogo, ou nenhum.
func PoderesDoMonstro(id string) []PoderMonstro {
	return poderesDosMonstros[id]
}

// AjudanteNaLuta é um ajudante chamado durante a luta.
type AjudanteNaLuta struct {
	Nome   string
	Vida   int
	Ataque int
	Defesa int
}
