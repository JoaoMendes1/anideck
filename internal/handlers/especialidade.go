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

// PassivaEspecialidade traduz a Especialidade de Gênero em um bônus passivo de combate no RPG.
type PassivaEspecialidade struct {
	ID       string `json:"id"`
	Nome     string `json:"nome"`
	Genero   string `json:"genero"`
	Resumo   string `json:"resumo"`
	Tipo     string `json:"tipo"`
	ValorPct int    `json:"valor_pct"`
}

var passivasPorGenero = map[string]struct {
	ID   string
	Nome string
	Tipo string
}{
	"Ação":              {"golpe_protagonista", "Golpe Protagonista", "ataque"},
	"Shounen":           {"golpe_protagonista", "Golpe Protagonista", "ataque"},
	"Esporte":           {"golpe_protagonista", "Golpe Protagonista", "ataque"},
	"Fantasia":          {"canalizacao_arcana", "Canalização Arcana", "magia"},
	"Ficção Científica": {"canalizacao_arcana", "Canalização Arcana", "magia"},
	"Garotas Mágicas":   {"canalizacao_arcana", "Canalização Arcana", "magia"},
	"Mecha":             {"canalizacao_arcana", "Canalização Arcana", "magia"},
	"Aventura":          {"passo_explorador", "Passo do Explorador", "velocidade"},
	"Isekai":            {"passo_explorador", "Passo do Explorador", "velocidade"},
	"Suspense":          {"passo_explorador", "Passo do Explorador", "velocidade"},
	"Mistério":          {"leitura_fria", "Leitura Fria", "critico"},
	"Seinen":            {"leitura_fria", "Leitura Fria", "critico"},
	"Drama":             {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Romance":           {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Shoujo":            {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Josei":             {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Boys Love":         {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Yuri":              {"escudo_coracao", "Escudo do Coração", "defesa"},
	"Slice of Life":     {"folego_cotidiano", "Fôlego Cotidiano", "vida"},
	"Comédia":           {"folego_cotidiano", "Fôlego Cotidiano", "vida"},
	"Terror":            {"instinto_fuga", "Instinto de Fuga", "esquiva"},
}

// PassivaDaEspecialidade calcula o bônus tático de combate para quem já conquistou N1..N5.
func PassivaDaEspecialidade(esp *Especialidade) *PassivaEspecialidade {
	if esp == nil || esp.Nivel < 1 {
		return nil
	}
	nivel := min(5, max(1, esp.Nivel))
	cfg, ok := passivasPorGenero[esp.Genero]
	if !ok {
		cfg = struct {
			ID   string
			Nome string
			Tipo string
		}{"foco_especialista", "Foco do Especialista", "ataque"}
	}

	var valor int
	var resumo string
	switch cfg.Tipo {
	case "ataque":
		valor = 1 + nivel // 2%..6%
		resumo = "+" + itoaSimples(valor) + "% de Ataque físico no RPG"
	case "magia":
		valor = 1 + nivel
		resumo = "+" + itoaSimples(valor) + "% de Magia nas habilidades arcanas"
	case "velocidade":
		valor = 1 + nivel
		resumo = "+" + itoaSimples(valor) + "% de Velocidade para agir primeiro"
	case "defesa":
		valor = 1 + nivel
		resumo = "+" + itoaSimples(valor) + "% de Defesa contra golpes recebidos"
	case "vida":
		valor = 1 + nivel
		resumo = "+" + itoaSimples(valor) + "% de Vida máxima ao entrar em combate"
	case "critico":
		valor = 1 + nivel/2 // 1..3 pp
		resumo = "+" + itoaSimples(valor) + "% de chance de Crítico em combate"
	case "esquiva":
		valor = 1 + nivel/2 // 1..3 pp
		resumo = "+" + itoaSimples(valor) + "% de chance de Esquiva em combate"
	}

	return &PassivaEspecialidade{
		ID:       cfg.ID,
		Nome:     cfg.Nome,
		Genero:   esp.Genero,
		Resumo:   resumo,
		Tipo:     cfg.Tipo,
		ValorPct: valor,
	}
}

func itoaSimples(n int) string {
	if n <= 0 {
		return "0"
	}
	buf := [16]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

