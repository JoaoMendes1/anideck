package handlers

import (
	"math/rand"
	"time"
)

// PortalMapaVivo representa uma anomalia temporária ativa em uma das 7 regiões do Mapa-Múndi.
type PortalMapaVivo struct {
	ID               string `json:"id"`
	RegiaoID         string `json:"regiao_id"`
	RegiaoNome       string `json:"regiao_nome"`
	Titulo           string `json:"titulo"`
	Descricao        string `json:"descricao"`
	BonusDescricao   string `json:"bonus_descricao"`
	TerminaEm        string `json:"termina_em"`
	MinutosRestantes int    `json:"minutos_restantes"`
}

// SeloDesafio define um modificador opcional de risco e recompensa para Expedições (#334).
type SeloDesafio struct {
	ID         string `json:"id"`
	Nome       string `json:"nome"`
	Risco      string `json:"risco"`
	Recompensa string `json:"recompensa"`
}

const duracaoPortalSegundos int64 = 7200 // Janelas de 2 horas para alternar o mapa ao longo do dia.

var portaisTematicos = []struct {
	Titulo    string
	Descricao string
}{
	{Titulo: "Fenda de Éter Instável", Descricao: "O véu dimensional rasgou nesta região e está condensando cristais da Forja."},
	{Titulo: "Convergência Astral", Descricao: "Correntes arcanas amplificam monstros e precipitam espólios raros."},
	{Titulo: "Vórtice Dimensional", Descricao: "Criaturas desta fronteira carregam estilhaços extras do portal."},
	{Titulo: "Anomalia Primordial", Descricao: "Eco temporal abriu depósitos ocultos de materiais na região."},
}

var catalogoSelosDesafio = []SeloDesafio{
	{
		ID:         "pressa_mortal",
		Nome:       "Pressa Mortal",
		Risco:      "−20% de Defesa do esquadrão e +15% de Ataque dos monstros.",
		Recompensa: "+1 material da Forja garantido na vitória.",
	},
	{
		ID:         "furia_elemental",
		Nome:       "Fúria Elemental",
		Risco:      "+25% de Ataque e +15% de Magia dos monstros.",
		Recompensa: "+1 material da Forja extra (tabela de masmorra) na vitória.",
	},
	{
		ID:         "sem_cura",
		Nome:       "Voto Sem Cura",
		Risco:      "Desativa habilidades de cura do esquadrão durante a expedição.",
		Recompensa: "+1 material da Forja garantido na vitória.",
	},
}

// CatalogoSelosDesafio devolve a lista oficial de selos de risco/recompensa selecionáveis.
func CatalogoSelosDesafio() []SeloDesafio {
	out := make([]SeloDesafio, len(catalogoSelosDesafio))
	copy(out, catalogoSelosDesafio)
	return out
}

// PortalDimensionalAtivoEm calcula deterministicamente qual região abriga o Portal Dimensional no instante dado.
func PortalDimensionalAtivoEm(agora time.Time) PortalMapaVivo {
	regioes := CatalogoRegioes()
	unix := agora.In(fusoGuilda).Unix()
	if unix < 0 {
		unix = 0
	}
	janela := unix / duracaoPortalSegundos
	idxReg := int((janela*5 + 3) % int64(len(regioes)))
	idxTema := int(janela % int64(len(portaisTematicos)))

	reg := regioes[idxReg]
	tema := portaisTematicos[idxTema]
	fimUnix := (janela + 1) * duracaoPortalSegundos
	termina := time.Unix(fimUnix, 0).UTC()
	restantes := int(fimUnix-unix) / 60
	if restantes < 1 {
		restantes = 1
	}

	return PortalMapaVivo{
		ID:               "portal_" + reg.ID,
		RegiaoID:         reg.ID,
		RegiaoNome:       reg.Nome,
		Titulo:           tema.Titulo,
		Descricao:        tema.Descricao,
		BonusDescricao:   "+1 material garantido da tabela de masmorra na vitória",
		TerminaEm:        termina.Format(time.RFC3339),
		MinutosRestantes: restantes,
	}
}

// NormalizarSelosDesafio filtra duplicatas e mantém apenas IDs válidos do catálogo.
func NormalizarSelosDesafio(ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	permitidos := make(map[string]bool, len(catalogoSelosDesafio))
	for _, s := range catalogoSelosDesafio {
		permitidos[s.ID] = true
	}
	vistos := map[string]bool{}
	var out []string
	for _, id := range ids {
		if permitidos[id] && !vistos[id] {
			vistos[id] = true
			out = append(out, id)
		}
	}
	return out
}

// AplicarSelosNoCombate aplica os modificadores de risco ativos sobre os heróis e o monstro.
func AplicarSelosNoCombate(herois []CombatenteRPG, monstro *MonstroRPG, selos []string) {
	if len(selos) == 0 {
		return
	}
	ativos := map[string]bool{}
	for _, s := range selos {
		ativos[s] = true
	}
	if ativos["pressa_mortal"] {
		for i := range herois {
			herois[i].Atributos.Defesa = herois[i].Atributos.Defesa * 80 / 100
		}
		monstro.Ataque = max(1, monstro.Ataque*115/100)
	}
	if ativos["furia_elemental"] {
		monstro.Ataque = max(1, monstro.Ataque*125/100)
		monstro.Magia = monstro.Magia * 115 / 100
	}
	if ativos["sem_cura"] {
		for i := range herois {
			filtradas := make([]HabilidadeRPG, 0, len(herois[i].Habilidades))
			for _, h := range herois[i].Habilidades {
				if h.Efeito != efeitoCura {
					filtradas = append(filtradas, h)
				}
			}
			herois[i].Habilidades = filtradas
		}
	}
}

// SortearMateriaisMapaVivo gera materiais extras garantidos quando o jogador vence com Selos ou em Portal.
func SortearMateriaisMapaVivo(rng *rand.Rand, venceu, emPortal bool, qtdSelos int) map[string]int {
	if !venceu || (!emPortal && qtdSelos <= 0) {
		return nil
	}
	bonus := qtdSelos
	if emPortal {
		bonus++
	}
	ganhos := make(map[string]int, bonus)
	for i := 0; i < bonus; i++ {
		id := sortearUm(rng, sorteioDaMasmorra)
		ganhos[id]++
	}
	return ganhos
}
