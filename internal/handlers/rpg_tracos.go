package handlers

// Traços de monstro: o que o corpo dele favorece ou atrapalha conforme a classe do herói.
// Um voador está fora do alcance da espada, mas não da flecha nem do feitiço; uma couraça
// segura a lâmina leve e cede ao martelo; quem resiste à magia pune a maga; o etéreo deixa o
// golpe físico atravessar. O fator multiplica todo o dano do herói contra o monstro.
//
// Os fatores foram calibrados para que, somando o catálogo inteiro, nenhuma classe ganhe ou
// perca mais de 2% na média (TestTracos_NenhumaClasseSaiNaFrente).

// TracoMonstro é o traço como a tela o mostra; FatorClasse vem preenchido só na lista do
// jogador, com o fator da classe dele.
type TracoMonstro struct {
	ID          string  `json:"id"`
	Nome        string  `json:"nome"`
	Descricao   string  `json:"descricao"`
	FatorClasse float64 `json:"fator_classe,omitempty"`
}

const (
	tracoVoador    = "voador"
	tracoBlindado  = "blindado"
	tracoAntimagia = "antimagia"
	tracoEtereo    = "etereo"
)

var descricaoDosTracos = map[string]TracoMonstro{
	tracoVoador:    {ID: tracoVoador, Nome: "Voador", Descricao: "Fica fora do alcance de quem luta de perto: arqueiros e magas causam mais dano; espadachins, guerreiros e paladinas, menos."},
	tracoBlindado:  {ID: tracoBlindado, Nome: "Blindado", Descricao: "Couraça grossa: martelos, lanças e magia passam; lâminas leves, adagas e flechas resvalam."},
	tracoAntimagia: {ID: tracoAntimagia, Nome: "Resistente à magia", Descricao: "Absorve feitiços: a maga causa bem menos dano; assassinas, guerreiros e arqueiros, mais."},
	tracoEtereo:    {ID: tracoEtereo, Nome: "Etéreo", Descricao: "Corpo de névoa: golpes físicos atravessam. Magia, luz sagrada e a lâmina de éter acertam em cheio."},
}

// fatorDoTraco é o multiplicador do dano do herói por classe. Classe ausente é 1.
var fatorDoTraco = map[string]map[string]float64{
	tracoVoador:    {"arqueiro": 1.20, "maga": 1.10, "lanceiro": 1.00, "assassina": 1.00, "espadachim": 0.90, "paladina": 0.90, "guerreiro": 0.85},
	tracoBlindado:  {"guerreiro": 1.20, "lanceiro": 1.10, "maga": 1.05, "paladina": 1.05, "espadachim": 0.95, "assassina": 0.90, "arqueiro": 0.85},
	tracoAntimagia: {"maga": 0.70, "paladina": 0.95, "espadachim": 1.05, "lanceiro": 1.05, "guerreiro": 1.10, "arqueiro": 1.10, "assassina": 1.20},
	tracoEtereo:    {"maga": 1.10, "paladina": 1.20, "espadachim": 1.15, "assassina": 1.00, "arqueiro": 0.90, "lanceiro": 0.90, "guerreiro": 0.85},
}

// tracosDosMonstros: o chefe final fica sem traço, para não mudar a calibração dele.
var tracosDosMonstros = map[string][]string{
	// Voadores
	"vespa_eletrica": {tracoVoador}, "wyvern_esmeralda": {tracoVoador}, "fenix_solar": {tracoVoador},
	"grifo_glacial": {tracoVoador}, "revena_glacial": {tracoVoador}, "dragao_de_eter": {tracoVoador},
	"dragao_glacial": {tracoVoador}, "grifo_dourado": {tracoVoador}, "serafim_celestial": {tracoVoador},
	"draconato_do_trovao": {tracoVoador}, "dragao_tempestade": {tracoVoador}, "dragao_do_vazio": {tracoVoador},
	"golem_flutuante": {tracoVoador},
	// Blindados
	"golem_de_runas": {tracoBlindado}, "cavaleiro_caido": {tracoBlindado}, "golem_musgoso": {tracoBlindado},
	"fera_de_obsidiana": {tracoBlindado}, "golem_de_magma": {tracoBlindado}, "beemote_de_lava": {tracoBlindado},
	"golem_de_gelo": {tracoBlindado}, "cavaleiro_da_geada": {tracoBlindado}, "colosso_glacial": {tracoBlindado},
	"golem_do_vazio": {tracoBlindado}, "arcanjo_blindado": {tracoBlindado}, "dragao_esqueleto": {tracoBlindado},
	// Resistentes à magia
	"slime_de_eter": {tracoAntimagia}, "colosso_runico": {tracoAntimagia}, "beholder_abissal": {tracoAntimagia},
	"lich_das_sombras": {tracoAntimagia}, "rei_lich": {tracoAntimagia}, "lorde_da_geada": {tracoAntimagia},
	// Etéreos
	"espectro_do_vazio": {tracoEtereo}, "espectro_acorrentado": {tracoEtereo}, "fantasma_do_vazio": {tracoEtereo},
	"ceifador_espectral": {tracoEtereo}, "serpente_espectral": {tracoEtereo}, "fragmento_do_olho": {tracoEtereo},
	"vortex_do_olho": {tracoEtereo}, "horror_da_fenda": {tracoEtereo},
}

// TracosDoMonstro devolve os traços do monstro, para a tela.
func TracosDoMonstro(id string) []TracoMonstro {
	ids := tracosDosMonstros[id]
	if len(ids) == 0 {
		return nil
	}
	saida := make([]TracoMonstro, 0, len(ids))
	for _, t := range ids {
		saida = append(saida, descricaoDosTracos[t])
	}
	return saida
}

// FatorDeClasse é o multiplicador do dano da classe contra o monstro, somando os traços dele.
func FatorDeClasse(classe string, tracos []TracoMonstro) float64 {
	fator := 1.0
	for _, t := range tracos {
		if f, ok := fatorDoTraco[t.ID][classe]; ok {
			fator *= f
		}
	}
	return fator
}

// classeDoJogador devolve a classe do personagem do elenco.
func classeDoJogador(ctx contextoPersonagem) string {
	if ctx.linha != nil {
		if pb, ok := PersonagensBase()[ctx.linha.PersonagemBase]; ok {
			return pb.Classe
		}
	}
	return PersonagensBase()[personagemBasePadrao].Classe
}
