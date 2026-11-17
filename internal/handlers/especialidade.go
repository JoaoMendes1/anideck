// internal/handlers/especialidade.go
// Especialidade: o gênero em que o jogador mais assiste vira um título de classe, mostrado na
// Guilda e no perfil público. Não é a classe do personagem do RPG nem a das Previsões.
package handlers

// Especialidade é o gênero principal do jogador com o título temático e o nível N1..N5.
type Especialidade struct {
	Genero      string `json:"genero"`
	Epiteto     string `json:"epiteto"`
	Icone       string `json:"icone"`
	Lema        string `json:"lema"`
	Nivel       int    `json:"nivel"`
	RotuloNivel string `json:"rotulo_nivel"`
	TituloNivel string `json:"titulo_nivel"`
	TotalVistos int    `json:"total_vistos"`
	ProximoAlvo int    `json:"proximo_alvo"`
	// Segundo gênero com nível, mostrado como "subclasse".
	Secundario string `json:"secundario,omitempty"`
}

type temaEspecialidade struct {
	Epiteto string
	Icone   string
	Lema    string
}

// temasDeEspecialidade liga os nomes de exibição da genre_taxonomy a um título. Os nomes
// são substantivos de dois gêneros sempre que possível, para servir a qualquer jogador.
var temasDeEspecialidade = map[string]temaEspecialidade{
	"Ação":              {"Duelista", "⚔️", "Vive pelas lutas que ninguém esquece"},
	"Aventura":          {"Desbravador", "🧭", "Sempre atrás do próximo horizonte"},
	"Comédia":           {"Arlequim", "🎭", "Coleciona risadas como troféus"},
	"Drama":             {"Poeta", "🎻", "Sente cada cena até o fim"},
	"Fantasia":          {"Arcanista", "🔮", "Fala a língua dos mundos mágicos"},
	"Romance":           {"Trovador", "💌", "Torce por cada casal desde o primeiro olhar"},
	"Ficção Científica": {"Tecnomante", "🛰️", "Enxerga o futuro antes dele chegar"},
	"Mistério":          {"Detetive", "🔍", "Nenhuma pista passa despercebida"},
	"Slice of Life":     {"Cronista", "🍵", "Acha beleza no dia a dia"},
	"Esporte":           {"Atleta", "🏅", "Vibra em cada ponto decisivo"},
	"Suspense":          {"Sentinela", "🕯️", "Não pisca nos momentos de tensão"},
	"Terror":            {"Exorcista", "👻", "Encara o que os outros evitam"},
	"Shounen":           {"Protagonista", "🔥", "Nunca desiste, nem no último episódio"},
	"Seinen":            {"Estrategista", "♟️", "Prefere histórias que pedem cabeça fria"},
	"Shoujo":            {"Idealista", "🌸", "Acredita no poder dos sentimentos"},
	"Josei":             {"Realista", "🌙", "Gosta de histórias com os pés no chão"},
	"Isekai":            {"Viajante", "🌀", "Já viveu em mil mundos diferentes"},
	"Mecha":             {"Piloto", "🤖", "Conhece cada robô pelo ronco do motor"},
	"Garotas Mágicas":   {"Ilusionista", "✨", "Transforma qualquer temporada em espetáculo"},
	"Boys Love":         {"Confidente", "💞", "Guarda os segredos de cada casal"},
	"Yuri":              {"Confidente", "💞", "Guarda os segredos de cada casal"},
}

// temaPadrao serve para gênero novo cadastrado pelo Painel sem título próprio.
var temaPadrao = temaEspecialidade{"Especialista", "🎴", "Conhece o gênero como poucos"}

// CalcularEspecialidade escolhe o gênero de maior volume com nível N1 ou mais. Sem nenhum,
// devolve nil: a especialidade se conquista, não vem de graça.
func CalcularEspecialidade(especialistas []EspecialistaGenero) *Especialidade {
	var principal *EspecialistaGenero
	secundario := ""
	// CalcularEspecialistasGenero já devolve em ordem de volume, e o nome desempata.
	for i := range especialistas {
		e := especialistas[i]
		if e.Nivel < 1 {
			continue
		}
		if principal == nil {
			principal = &especialistas[i]
			continue
		}
		secundario = e.Genero
		break
	}
	if principal == nil {
		return nil
	}
	tema, ok := temasDeEspecialidade[principal.Genero]
	if !ok {
		tema = temaPadrao
	}
	return &Especialidade{
		Genero:      principal.Genero,
		Epiteto:     tema.Epiteto,
		Icone:       tema.Icone,
		Lema:        tema.Lema,
		Nivel:       principal.Nivel,
		RotuloNivel: principal.RotuloNivel,
		TituloNivel: principal.TituloNivel,
		TotalVistos: principal.TotalVistos,
		ProximoAlvo: principal.ProximoAlvo,
		Secundario:  secundario,
	}
}
