package handlers

// Reações Elementais ocorrem quando um ataque elemental acerta um alvo marcado por outro
// elemento (pelo golpe anterior de outro herói do esquadrão/grupo). A aura é consumida no
// disparo e gera um efeito tático adicional que recompensa combinar elementos distintos.

// ReacaoElemental descreve uma reação entre dois elementos distintos no combate.
type ReacaoElemental struct {
	ID                      string    `json:"id"`
	Nome                    string    `json:"nome"`
	Descricao               string    `json:"descricao"`
	Elementos               [2]string `json:"elementos"`
	BonusDanoPct            int       `json:"bonus_dano_pct"`
	IgnoraDefesa            bool      `json:"ignora_defesa,omitempty"`
	QuebraEscudo            bool      `json:"quebra_escudo,omitempty"`
	FragilizaDefesa         bool      `json:"fragiliza_defesa,omitempty"`
	DobrarQueimadura        bool      `json:"dobrar_queimadura,omitempty"`
	CongelaAlvo             bool      `json:"congela_alvo,omitempty"`
	OfuscaAlvo              bool      `json:"ofusca_alvo,omitempty"`
	DosesVeneno             int       `json:"doses_veneno,omitempty"`
	ChanceAtordoarPorMil    int       `json:"chance_atordoar_por_mil,omitempty"`
	ReducaoDanoHeroiPct     int       `json:"reducao_dano_heroi_pct,omitempty"`
	CuraAliadoMaisFeridoPct int       `json:"cura_aliado_mais_ferido_pct,omitempty"`
	RecuperaEterGrupo       int       `json:"recupera_eter_grupo,omitempty"`
}

func parElemental(a, b string) string {
	if a > b {
		a, b = b, a
	}
	return a + "+" + b
}

var catalogoReacoes = []ReacaoElemental{
	{
		ID: "vaporizacao", Nome: "Vaporização", Elementos: [2]string{"fogo", "agua"},
		Descricao:    "Explosão de vapor: +35% de dano no golpe e racha a armadura do inimigo.",
		BonusDanoPct: 35, FragilizaDefesa: true,
	},
	{
		ID: "tempestade_fogo", Nome: "Tempestade de Fogo", Elementos: [2]string{"fogo", "vento"},
		Descricao:    "As chamas se espalham: +30% de dano e intensifica Queimadura no alvo.",
		BonusDanoPct: 30, DobrarQueimadura: true,
	},
	{
		ID: "sobrecarga", Nome: "Sobrecarga Explosiva", Elementos: [2]string{"fogo", "raio"},
		Descricao:    "Detonação térmica: +45% de dano e estilhaça qualquer escudo do inimigo.",
		BonusDanoPct: 45, QuebraEscudo: true,
	},
	{
		ID: "magma", Nome: "Erupção de Magma", Elementos: [2]string{"fogo", "terra"},
		Descricao:    "Rocha derretida: +35% de dano e aplica Queimadura contínua.",
		BonusDanoPct: 35, DobrarQueimadura: true,
	},
	{
		ID: "sobrecarga_eletrica", Nome: "Eletrochoque", Elementos: [2]string{"agua", "raio"},
		Descricao:    "Corrente na água: +30% de dano e 35% de chance de atordoar o alvo.",
		BonusDanoPct: 30, ChanceAtordoarPorMil: 350,
	},
	{
		ID: "cristalizacao", Nome: "Cristalização", Elementos: [2]string{"agua", "terra"},
		Descricao:    "Barreira mineral: +25% de dano e protege o herói com 20% menos dano recebido.",
		BonusDanoPct: 25, ReducaoDanoHeroiPct: 20,
	},
	{
		ID: "nevasca", Nome: "Nevasca", Elementos: [2]string{"agua", "vento"},
		Descricao:    "Vento glacial: +25% de dano e aplica Congelamento (-25% dano do inimigo).",
		BonusDanoPct: 25, CongelaAlvo: true,
	},
	{
		ID: "abismo_gelido", Nome: "Maré Sombria", Elementos: [2]string{"agua", "trevas"},
		Descricao:    "Águas turvas: +25% de dano, aplica Veneno e Congelamento no alvo.",
		BonusDanoPct: 25, DosesVeneno: 1, CongelaAlvo: true,
	},
	{
		ID: "impulso_sismico", Nome: "Abalo Magnético", Elementos: [2]string{"raio", "terra"},
		Descricao:    "Pulso telúrico: +30% de dano e racha a armadura do inimigo.",
		BonusDanoPct: 30, FragilizaDefesa: true,
	},
	{
		ID: "ciclone_eletrico", Nome: "Ciclone Voltaico", Elementos: [2]string{"raio", "vento"},
		Descricao:    "Redemoinho carregado: +30% de dano e 25% de chance de atordoar o alvo.",
		BonusDanoPct: 30, ChanceAtordoarPorMil: 250,
	},
	{
		ID: "descarga_sombria", Nome: "Descarga Sombria", Elementos: [2]string{"raio", "trevas"},
		Descricao:    "Raio abissal: +35% de dano e quebra escudos ativos do inimigo.",
		BonusDanoPct: 35, QuebraEscudo: true,
	},
	{
		ID: "tempestade_areia", Nome: "Tempestade de Areia", Elementos: [2]string{"terra", "vento"},
		Descricao:    "Nuvem abrasiva: +25% de dano e ofusca o alvo (30% de chance de erro).",
		BonusDanoPct: 25, OfuscaAlvo: true,
	},
	{
		ID: "fissura_abissal", Nome: "Fissura Abissal", Elementos: [2]string{"terra", "trevas"},
		Descricao:    "Fenda sombria: +30% de dano e aplica Armadura Rachada no inimigo.",
		BonusDanoPct: 30, FragilizaDefesa: true,
	},
	{
		ID: "eclipse_toxico", Nome: "Corrosão Sombria", Elementos: [2]string{"fogo", "trevas"},
		Descricao:    "Combustão sombria: +25% de dano e acumula 2 doses de Veneno no alvo.",
		BonusDanoPct: 25, DosesVeneno: 2,
	},
	{
		ID: "vendaval_sombrio", Nome: "Eclipse Tóxico", Elementos: [2]string{"vento", "trevas"},
		Descricao:    "Névoa cortante: +25% de dano e acumula 2 doses de Veneno no alvo.",
		BonusDanoPct: 25, DosesVeneno: 2,
	},
	{
		ID: "juizo_crepuscular", Nome: "Juízo Crepuscular", Elementos: [2]string{"luz", "trevas"},
		Descricao:    "Choque astral: +35% de dano ignorando defesa e cura o aliado mais ferido (8%).",
		BonusDanoPct: 35, IgnoraDefesa: true, CuraAliadoMaisFeridoPct: 8,
	},
}

var mapaReacoes = func() map[string]ReacaoElemental {
	m := make(map[string]ReacaoElemental, len(catalogoReacoes))
	for _, r := range catalogoReacoes {
		m[parElemental(r.Elementos[0], r.Elementos[1])] = r
	}
	return m
}()

// CatalogoReacoesElementais devolve todas as reações documentadas para consulta da tela.
func CatalogoReacoesElementais() []ReacaoElemental {
	out := make([]ReacaoElemental, len(catalogoReacoes))
	copy(out, catalogoReacoes)
	return out
}

// BuscarReacaoElemental verifica se dois elementos disparam uma reação quando o segundo
// atinge um alvo já marcado pelo primeiro. Elementos neutros ou iguais não reagem.
func BuscarReacaoElemental(aura, golpe string) (ReacaoElemental, bool) {
	if aura == "" || golpe == "" || aura == elementoNeutro || golpe == elementoNeutro || aura == golpe {
		return ReacaoElemental{}, false
	}
	if r, ok := mapaReacoes[parElemental(aura, golpe)]; ok {
		return r, true
	}
	// Qualquer combinação distinta envolvendo Éter gera Ressonância de Éter.
	if aura == "eter" || golpe == "eter" {
		return ReacaoElemental{
			ID: "ressonancia_eter", Nome: "Ressonância de Éter", Elementos: [2]string{aura, golpe},
			Descricao:    "Fluxo arcano: +25% de dano e recupera +5 de Éter para todo o esquadrão.",
			BonusDanoPct: 25, RecuperaEterGrupo: 5,
		}, true
	}
	// Luz combinada com os demais elementos purifica e fortalece o grupo.
	if aura == "luz" || golpe == "luz" {
		return ReacaoElemental{
			ID: "claridade_elemental", Nome: "Claridade Elemental", Elementos: [2]string{aura, golpe},
			Descricao:    "Explosão radiante: +25% de dano, ofusca o alvo e cura o aliado mais ferido (5%).",
			BonusDanoPct: 25, OfuscaAlvo: true, CuraAliadoMaisFeridoPct: 5,
		}, true
	}
	return ReacaoElemental{}, false
}
