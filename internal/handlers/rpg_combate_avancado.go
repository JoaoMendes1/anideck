// internal/handlers/rpg_combate_avancado.go
// Elementos e poderes dos monstros. Ficam no código, como as habilidades das classes: a
// simulação depende deles, e um valor editado sem os testes de equilíbrio mudaria a chance
// de vitória sem ninguém medir.
package handlers

import "time"

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
	// Arcano: soma Magia do monstro e atravessa parte da Defesa física do jogador.
	Arcano     bool    `json:"arcano,omitempty"`
	FatorMagia float64 `json:"-"`
	CustoEter  int     `json:"custo_eter,omitempty"`
	// ChancePorMil é a chance base em cada vez do monstro, depois das condições.
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
}

// PoderesDoMonstro devolve os poderes do monstro do catálogo, ou nenhum.
func PoderesDoMonstro(id string) []PoderMonstro {
	return poderesDosMonstros[id]
}

// RegiaoMapa descreve uma zona do mapa 2D das expedições.
type RegiaoMapa struct {
	ID            string   `json:"id"`
	Nome          string   `json:"nome"`
	Subtitulo     string   `json:"subtitulo"`
	Bioma         string   `json:"bioma"`
	EfeitoBioma   string   `json:"efeito_bioma"`
	FaixaNivel    string   `json:"faixa_nivel"`
	Ordem         int      `json:"ordem"`
	MonstroIDs    []string `json:"monstros"`
	EmDestaque    bool     `json:"em_destaque,omitempty"`
	BonusDestaque string   `json:"bonus_destaque,omitempty"`
}

// CatalogoRegioes devolve as quatro regiões conectadas no mapa 2D de exploração.
func CatalogoRegioes() []RegiaoMapa {
	return []RegiaoMapa{
		{
			ID:          "clareira_inicial",
			Nome:        "Clareira Inicial",
			Subtitulo:   "Primeiros passos na fronteira",
			Bioma:       "Brisa de Éter",
			EfeitoBioma: "Campo aberto onde monstros recentes se concentram.",
			FaixaNivel:  "Nv 1–5",
			Ordem:       1,
			MonstroIDs:  []string{"slime_de_eter", "goblin_batedor"},
		},
		{
			ID:          "bosque_sombrio",
			Nome:        "Bosque Sombrio",
			Subtitulo:   "Trilhas fechadas e ruínas rúnicas",
			Bioma:       "Névoa Espessa",
			EfeitoBioma: "Feras velozes e guardiões de pedra protegem o caminho.",
			FaixaNivel:  "Nv 8–20",
			Ordem:       2,
			MonstroIDs:  []string{"lobo_sombrio", "golem_de_runas"},
		},
		{
			ID:          "ruinas_do_vazio",
			Nome:        "Ruínas do Vazio",
			Subtitulo:   "Salões de um reino esquecido",
			Bioma:       "Ecos Arcanos",
			EfeitoBioma: "Energia instável amplifica ataques arcanos e táticos.",
			FaixaNivel:  "Nv 24–40",
			Ordem:       3,
			MonstroIDs:  []string{"espectro_do_vazio", "cavaleiro_caido"},
		},
		{
			ID:          "cume_ancestral",
			Nome:        "Cume Ancestral",
			Subtitulo:   "Altar das tempestades primordiais",
			Bioma:       "Tempestade Etérea",
			EfeitoBioma: "Os soberanos dominam Éter puro e poderes de chefe.",
			FaixaNivel:  "Nv 45–60+",
			Ordem:       4,
			MonstroIDs:  []string{"dragao_de_eter", "primordial_esquecido"},
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

// PerfilMonstro guarda os atributos complementares e a identidade tática de cada monstro.
type PerfilMonstro struct {
	Magia         int
	Eter          int
	CriticoPorMil int
	DanoCritico   int
	EsquivaPorMil int
	Comportamento string
	Habitat       string
	DicaTatica    string
}

var perfisDosMonstros = map[string]PerfilMonstro{
	"slime_de_eter": {
		Magia: 4, Eter: 10, CriticoPorMil: 50, DanoCritico: 140, EsquivaPorMil: 0,
		Comportamento: "Instintivo",
		Habitat:       "Forma-se nas poças de Éter puro na orla da Clareira Inicial.",
		DicaTatica:    "Não possui poderes especiais nem esquiva — ideal para testar suas primeiras habilidades.",
	},
	"goblin_batedor": {
		Magia: 2, Eter: 8, CriticoPorMil: 110, DanoCritico: 155, EsquivaPorMil: 30,
		Comportamento: "Astuto",
		Habitat:       "Patrulha as trilhas de pedra em busca de aventureiros distraídos.",
		DicaTatica:    "Tem esquiva leve e crítico acima da média inicial; derrube-o antes que acerte um crítico.",
	},
	"lobo_sombrio": {
		Magia: 10, Eter: 16, CriticoPorMil: 115, DanoCritico: 155, EsquivaPorMil: 35,
		Comportamento: "Predador",
		Habitat:       "Caça em matilha sob a copa fechada do Bosque Sombrio.",
		DicaTatica:    "Abaixo de 50% da Vida chama um Lobo Jovem que intercepta seus golpes. Personagem de Luz tem vantagem direta.",
	},
	"golem_de_runas": {
		Magia: 24, Eter: 24, CriticoPorMil: 70, DanoCritico: 145, EsquivaPorMil: 0,
		Comportamento: "Guardião",
		Habitat:       "Ergue-se entre obeliscos antigos cobertos de musgo e runas.",
		DicaTatica:    "Não esquiva, mas ergue Muralha de Runas abaixo de 70% da Vida (-40% dano recebido). Fogo e ataques arcanos rendem mais.",
	},
	"espectro_do_vazio": {
		Magia: 85, Eter: 40, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 20,
		Comportamento: "Arcano",
		Habitat:       "Flutua pelos salões partidos onde o Éter condensou em névoa fria.",
		DicaTatica:    "Toque do Vazio escala com Magia, atravessa parte da Defesa física e drena Vida. Luz tem vantagem contra Trevas.",
	},
	"cavaleiro_caido": {
		Magia: 55, Eter: 42, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Estrategista",
		Habitat:       "Guarda a praça central das Ruínas em memória de um juramento quebrado.",
		DicaTatica:    "Segura Juramento Partido até a 3ª rodada e chama um Escudeiro Fantasma abaixo de 40% da Vida. Água reduz a pressão.",
	},
	"dragao_de_eter": {
		Magia: 135, Eter: 60, CriticoPorMil: 95, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Soberano",
		Habitat:       "Sobrevoa os picos carregados de relâmpagos do Cume Ancestral.",
		DicaTatica:    "Combina Sopro arcano com Fúria Ancestral abaixo de 30% da Vida. Terra vence Raio e segura o dano melhor.",
	},
	"primordial_esquecido": {
		Magia: 165, Eter: 75, CriticoPorMil: 100, DanoCritico: 150, EsquivaPorMil: 10,
		Comportamento: "Primordial",
		Habitat:       "Desperta no altar mais alto do mundo quando um herói alcança o ápice.",
		DicaTatica:    "Abaixo de 50% da Vida invoca um Fragmento Primordial e alterna críticos com alto Éter. Venha com conjunto completo e poções em dia.",
	},
}

// EnriquecerMonstro preenche velocidade, elemento, poderes, região e os 8 atributos de combate.
// Monstros fora do catálogo mantêm os padrões clássicos para não alterar lutas sintéticas.
func EnriquecerMonstro(m *MonstroRPG) {
	if m.Velocidade == 0 {
		m.Velocidade = VelocidadeDoMonstro(*m)
	}
	if m.Elemento == "" {
		m.Elemento = ElementoDoMonstro(m.ID)
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
