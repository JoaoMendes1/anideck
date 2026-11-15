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
	Fator2 float64 `json:"-"` // multiplicador da Magia no arcano
}

// habilidadesDaClasse é o catálogo por classe. Fica no código, como o elenco: cada
// habilidade precisa do efeito no combate, que é código.
func habilidadesDaClasse(classe string) []HabilidadeRPG {
	switch classe {
	case "espadachim":
		return []HabilidadeRPG{
			{ID: "golpe_firme", Nome: "Golpe Firme", Descricao: "Um corte com o peso do corpo: 1,5x o Ataque.",
				Tipo: "comum", NivelMinimo: 1, CustoEter: 8, Efeito: efeitoDano, Fator: 1.5},
			{ID: "corte_duplo", Nome: "Corte Duplo", Descricao: "Dois cortes seguidos, cada um com quase todo o Ataque.",
				Tipo: "comum", NivelMinimo: 8, CustoEter: 14, Efeito: efeitoGolpeDuplo, Fator: 0.95},
			{ID: "postura_de_guarda", Nome: "Postura de Guarda", Descricao: "Recupera 20% da Vida quando ela passa da metade para baixo.",
				Tipo: "comum", NivelMinimo: 15, CustoEter: 12, Recarga: 3, Efeito: efeitoCura, Fator: 0.20},
			{ID: "lamina_arcana", Nome: "Lâmina Arcana", Descricao: "A lâmina conduz o Éter: soma Ataque e Magia num golpe.",
				Tipo: "comum", NivelMinimo: 25, CustoEter: 18, Efeito: efeitoArcano, Fator: 1.1, Fator2: 1.2},
			{ID: "tempestade_de_aco", Nome: "Tempestade de Aço", Descricao: "Uma sequência de cortes: 2,8x o Ataque.",
				Tipo: "comum", NivelMinimo: 40, CustoEter: 30, Recarga: 3, Efeito: efeitoDano, Fator: 2.8},
		}
	}
	return nil
}

// habilidadeUnica é a habilidade de cada personagem do elenco, como nos animes em que o
// protagonista desperta um poder que só ele tem.
func habilidadeUnica(personagemBase string) *HabilidadeRPG {
	switch personagemBase {
	case personagemBasePadrao:
		return &HabilidadeRPG{ID: "despertar_do_eter", Nome: "Despertar do Éter",
			Descricao: "Uma vez por luta, ao cair abaixo de metade da Vida, recupera 30% dela e o próximo golpe causa o dobro.",
			Tipo:      "unica", NivelMinimo: 5, Efeito: efeitoDespertar, Fator: 0.30}
	}
	return nil
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
