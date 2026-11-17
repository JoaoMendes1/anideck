package handlers

// Efeitos que o combate sabe aplicar. A habilidade nova escolhe um deles; efeito novo
// exige código no SimularBatalha.
const (
	efeitoDano       = "dano"        // um golpe com o Ataque multiplicado
	efeitoGolpeDuplo = "golpe_duplo" // dois golpes seguidos, cada um multiplicado
	efeitoCura       = "cura"        // recupera parte da Vida máxima
	efeitoArcano     = "arcano"      // golpe que soma Ataque e Magia
	efeitoDespertar  = "despertar"   // única: uma vez por luta, abaixo de metade da Vida
)

// HabilidadeRPG é uma entrada do livro de habilidades. As comuns são da classe; a única é
// do personagem do elenco. Os números de efeito não vão para a tela: ela mostra a descrição.
type HabilidadeRPG struct {
	ID           string `json:"id"`
	Nome         string `json:"nome"`
	Descricao    string `json:"descricao"`
	Tipo         string `json:"tipo"` // comum ou unica
	NivelMinimo  int    `json:"nivel_minimo"`
	CustoEter    int    `json:"custo_eter"`
	Recarga      int    `json:"recarga"` // rodadas de espera depois do uso
	Desbloqueada bool   `json:"desbloqueada"`

	Efeito string  `json:"-"`
	Fator  float64 `json:"-"` // multiplicador do Ataque, ou fração da Vida na cura
	Fator2 float64 `json:"-"` // multiplicador da Magia no arcano; na única, do próximo golpe
	// Só da habilidade única, depois que ela dispara.
	IgnoraDefesa bool    `json:"-"` // o próximo golpe atravessa a defesa
	Esquivas     int     `json:"-"` // golpes do monstro que erram com certeza
	Reducao      float64 `json:"-"` // fração do dano recebido que é absorvida
	Rodadas      int     `json:"-"` // por quantas rodadas a redução vale
}

// hab encurta a declaração do catálogo.
func hab(id, nome, descricao string, nivel, eter, recarga int, efeito string, fator, fator2 float64) HabilidadeRPG {
	return HabilidadeRPG{ID: id, Nome: nome, Descricao: descricao, Tipo: "comum", NivelMinimo: nivel,
		CustoEter: eter, Recarga: recarga, Efeito: efeito, Fator: fator, Fator2: fator2}
}

// habilidadesDaClasse é o catálogo por classe. Fica no código, como o elenco: cada
// habilidade precisa do efeito no combate, que é código. Toda classe segue a mesma régua
// (níveis 1, 8, 15, 25 e 40; custo e força parecidos), para nenhuma vencer mais só por ser
// outra classe: a diferença está no estilo, no elemento e na habilidade única.
func habilidadesDaClasse(classe string) []HabilidadeRPG {
	switch classe {
	case "espadachim":
		return []HabilidadeRPG{
			hab("golpe_firme", "Golpe Firme", "Um corte com o peso do corpo: 1,5x o Ataque.", 1, 8, 0, efeitoDano, 1.5, 0),
			hab("corte_duplo", "Corte Duplo", "Dois cortes seguidos, cada um com quase todo o Ataque.", 8, 14, 0, efeitoGolpeDuplo, 0.95, 0),
			hab("postura_de_guarda", "Postura de Guarda", "Recupera 20% da Vida quando ela passa da metade para baixo.", 15, 12, 3, efeitoCura, 0.20, 0),
			hab("lamina_arcana", "Lâmina Arcana", "A lâmina conduz o Éter: soma Ataque e Magia num golpe.", 25, 18, 0, efeitoArcano, 1.1, 1.2),
			hab("tempestade_de_aco", "Tempestade de Aço", "Uma sequência de cortes: 2,8x o Ataque.", 40, 30, 3, efeitoDano, 2.8, 0),
		}
	case "lanceiro":
		return []HabilidadeRPG{
			hab("estocada", "Estocada", "Um avanço certeiro com a ponta da lança: 1,5x o Ataque.", 1, 8, 0, efeitoDano, 1.5, 0),
			hab("investida_dupla", "Investida Dupla", "Duas estocadas seguidas, cada uma com quase todo o Ataque.", 8, 14, 0, efeitoGolpeDuplo, 0.95, 0),
			hab("folego_de_brasa", "Fôlego de Brasa", "Recupera 20% da Vida quando ela passa da metade para baixo.", 15, 12, 3, efeitoCura, 0.20, 0),
			hab("lanca_flamejante", "Lança Flamejante", "A lâmina pega fogo: soma Ataque e Magia num golpe.", 25, 18, 0, efeitoArcano, 1.2, 1.0),
			hab("chuva_de_lancas", "Chuva de Lanças", "Uma sequência de estocadas em chamas: 2,8x o Ataque.", 40, 30, 3, efeitoDano, 2.8, 0),
		}
	case "assassina":
		return []HabilidadeRPG{
			hab("corte_rapido", "Corte Rápido", "Um golpe veloz por trás da guarda: 1,5x o Ataque.", 1, 7, 0, efeitoDano, 1.5, 0),
			hab("laminas_gemeas", "Lâminas Gêmeas", "As duas adagas de uma vez, cada uma com todo o Ataque.", 8, 14, 0, efeitoGolpeDuplo, 1.0, 0),
			hab("sombra_fugaz", "Sombra Fugaz", "Some nas sombras e recupera 18% da Vida quando ela passa da metade para baixo.", 15, 10, 3, efeitoCura, 0.18, 0),
			hab("relampago_fatal", "Relâmpago Fatal", "As lâminas conduzem o raio: soma Ataque e Magia num golpe.", 25, 18, 0, efeitoArcano, 1.3, 0.8),
			hab("mil_cortes", "Mil Cortes", "Uma rajada de cortes elétricos: 2,9x o Ataque.", 40, 30, 3, efeitoDano, 2.9, 0),
		}
	case "maga":
		return []HabilidadeRPG{
			hab("seta_dagua", "Seta d'Água", "Um projétil de água: soma parte do Ataque e da Magia.", 1, 8, 0, efeitoArcano, 0.6, 1.2),
			hab("lanca_de_gelo", "Lança de Gelo", "Um espinho de gelo puro: mais Magia que Ataque.", 8, 14, 0, efeitoArcano, 0.8, 1.6),
			hab("bencao_da_mare", "Bênção da Maré", "Recupera 22% da Vida quando ela passa da metade para baixo.", 15, 12, 3, efeitoCura, 0.22, 0),
			hab("explosao_gelida", "Explosão Gélida", "Uma explosão de frio: Ataque e o dobro da Magia.", 25, 20, 0, efeitoArcano, 1.1, 2.2),
			hab("onda_glacial", "Onda Glacial", "Uma onda que congela tudo à frente.", 40, 30, 3, efeitoArcano, 1.3, 2.9),
		}
	case "guerreiro":
		return []HabilidadeRPG{
			hab("golpe_pesado", "Golpe Pesado", "O martelo desce com todo o peso: 1,5x o Ataque.", 1, 8, 0, efeitoDano, 1.5, 0),
			hab("impacto_duplo", "Impacto Duplo", "Dois golpes de martelo, cada um com quase todo o Ataque.", 8, 14, 0, efeitoGolpeDuplo, 0.95, 0),
			hab("forja_interior", "Forja Interior", "Recupera 20% da Vida quando ela passa da metade para baixo.", 15, 12, 3, efeitoCura, 0.20, 0),
			hab("golpe_vulcanico", "Golpe Vulcânico", "O martelo em brasa: soma Ataque e Magia num golpe.", 25, 18, 0, efeitoArcano, 1.3, 0.8),
			hab("terremoto", "Terremoto", "Um golpe no chão que racha a terra: 2,8x o Ataque.", 40, 30, 3, efeitoDano, 2.8, 0),
		}
	case "paladina":
		return []HabilidadeRPG{
			hab("golpe_sagrado", "Golpe Sagrado", "Um golpe abençoado: 1,4x o Ataque.", 1, 7, 0, efeitoDano, 1.4, 0),
			hab("lamina_e_escudo", "Lâmina e Escudo", "Espada e escudo em sequência, cada um com quase todo o Ataque.", 8, 13, 0, efeitoGolpeDuplo, 0.9, 0),
			hab("cura_sagrada", "Cura Sagrada", "Recupera 26% da Vida quando ela passa da metade para baixo.", 15, 12, 3, efeitoCura, 0.26, 0),
			hab("julgamento_da_luz", "Julgamento da Luz", "A espada brilha: soma Ataque e Magia num golpe.", 25, 18, 0, efeitoArcano, 1.0, 1.4),
			hab("luz_da_esperanca", "Luz da Esperança", "Um raio de luz sobre o inimigo: 2,7x o Ataque.", 40, 30, 3, efeitoDano, 2.7, 0),
		}
	}
	return nil
}

// habilidadeUnica é a habilidade de cada personagem do elenco, como nos animes em que o
// protagonista desperta um poder que só ele tem. Todas disparam do mesmo jeito: uma vez por
// luta, quando a Vida cai abaixo da metade. Muda o que acontece depois.
func habilidadeUnica(personagemBase string) *HabilidadeRPG {
	u := HabilidadeRPG{Tipo: "unica", NivelMinimo: 5, Efeito: efeitoDespertar}
	switch personagemBase {
	case personagemBasePadrao:
		u.ID, u.Nome, u.Fator, u.Fator2 = "despertar_do_eter", "Despertar do Éter", 0.30, 2
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 30% dela e o próximo golpe causa o dobro."
	case "lanceiro_fogo":
		u.ID, u.Nome, u.Fator, u.Fator2, u.IgnoraDefesa = "coracao_ardente", "Coração Ardente", 0.20, 2, true
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 20% dela e o próximo golpe atravessa a defesa com o dobro de força."
	case "assassina_raio":
		u.ID, u.Nome, u.Fator, u.Fator2, u.Esquivas = "passo_relampago", "Passo Relâmpago", 0.12, 1.8, 2
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 12% dela, desvia com certeza dos dois próximos golpes e o próximo ataque causa 1,8x."
	case "maga_agua":
		u.ID, u.Nome, u.Fator, u.Fator2 = "mare_ancestral", "Maré Ancestral", 0.45, 2
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, a água ancestral recupera 45% dela e o próximo golpe causa o dobro."
	case "guerreiro_terra":
		u.ID, u.Nome, u.Fator, u.Fator2, u.Reducao, u.Rodadas = "pele_de_pedra", "Pele de Pedra", 0.25, 1.5, 0.5, 3
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 25% dela, recebe metade do dano por 3 rodadas e o próximo golpe causa 1,5x."
	case "paladina_luz":
		u.ID, u.Nome, u.Fator, u.Fator2, u.Esquivas, u.Reducao, u.Rodadas = "egide_da_aurora", "Égide da Aurora", 0.25, 1.5, 1, 0.3, 3
		u.Descricao = "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 25% dela, bloqueia o próximo golpe, recebe 30% menos dano por 3 rodadas e o próximo ataque causa 1,5x."
	default:
		return nil
	}
	return &u
}

// LivroDeHabilidades monta o livro do personagem: a única primeiro, depois as comuns por
// nível, cada uma marcada como liberada ou não.
func LivroDeHabilidades(personagemBase string, nivel int) []HabilidadeRPG {
	base, ok := PersonagensBase()[personagemBase]
	if !ok {
		base = PersonagensBase()[personagemBasePadrao]
	}
	livro := make([]HabilidadeRPG, 0, 6)
	if u := habilidadeUnica(base.ID); u != nil {
		livro = append(livro, *u)
	}
	livro = append(livro, habilidadesDaClasse(base.Classe)...)
	for i := range livro {
		livro[i].Desbloqueada = nivel >= livro[i].NivelMinimo
	}
	return livro
}
