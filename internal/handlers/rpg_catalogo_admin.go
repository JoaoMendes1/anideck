package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	postgrest "github.com/supabase-community/postgrest-go"
)

// itemCatalogoBanco espelha uma linha da tabela rpg_itens para o catálogo do Painel Admin.
type itemCatalogoBanco struct {
	ID                  string   `json:"id"`
	Slot                string   `json:"slot"`
	Nome                string   `json:"nome"`
	Descricao           string   `json:"descricao"`
	Raridade            string   `json:"raridade"`
	Vida                int      `json:"vida"`
	Ataque              int      `json:"ataque"`
	Defesa              int      `json:"defesa"`
	Magia               int      `json:"magia"`
	Velocidade          int      `json:"velocidade"`
	CriticoPorMil       int      `json:"critico_por_mil"`
	DanoCritico         int      `json:"dano_critico"`
	EsquivaPorMil       int      `json:"esquiva_por_mil"`
	NivelMinimo         int      `json:"nivel_minimo"`
	Classes             []string `json:"classes"`
	PersonagemExclusivo string   `json:"personagem_exclusivo"`
	Conjunto            string   `json:"conjunto"`
	Elemento            string   `json:"elemento"`
	PrecoOuro           *int     `json:"preco_ouro"`
	Inicial             bool     `json:"inicial"`
	Ativo               bool     `json:"ativo"`
	Ordem               int      `json:"ordem"`
}

// ItemCatalogoAdmin apresenta cada equipamento com fonte de obtenção, elemento e posse do admin.
type ItemCatalogoAdmin struct {
	ID                  string   `json:"id"`
	Slot                string   `json:"slot"`
	Nome                string   `json:"nome"`
	Descricao           string   `json:"descricao"`
	Raridade            string   `json:"raridade"`
	Vida                int      `json:"vida"`
	Ataque              int      `json:"ataque"`
	Defesa              int      `json:"defesa"`
	Magia               int      `json:"magia"`
	Velocidade          int      `json:"velocidade"`
	CriticoPorMil       int      `json:"critico_por_mil"`
	DanoCritico         int      `json:"dano_critico"`
	EsquivaPorMil       int      `json:"esquiva_por_mil"`
	NivelMinimo         int      `json:"nivel_minimo"`
	Classes             []string `json:"classes"`
	Generico            bool     `json:"generico"`
	PersonagemExclusivo string   `json:"personagem_exclusivo,omitempty"`
	Conjunto            string   `json:"conjunto,omitempty"`
	Elemento            string   `json:"elemento"`
	PrecoOuro           *int     `json:"preco_ouro,omitempty"`
	NaForja             bool     `json:"na_forja"`
	ForjaOuro           int      `json:"forja_ouro,omitempty"`
	Inicial             bool     `json:"inicial"`
	Ativo               bool     `json:"ativo"`
	Possui              bool     `json:"possui"`
	Quantidade          int      `json:"quantidade"`
	Ordem               int      `json:"ordem"`
}

// ResumoCatalogoRPGAdmin consolida as contagens do acervo por dimensão.
type ResumoCatalogoRPGAdmin struct {
	Total       int            `json:"total"`
	Ativos      int            `json:"ativos"`
	Inativos    int            `json:"inativos"`
	NoMercado   int            `json:"no_mercado"`
	NaForja     int            `json:"na_forja"`
	Possuidos   int            `json:"possuidos"`
	PorSlot     map[string]int `json:"por_slot"`
	PorRaridade map[string]int `json:"por_raridade"`
	PorClasse   map[string]int `json:"por_classe"`
	PorElemento map[string]int `json:"por_elemento"`
	PorConjunto map[string]int `json:"por_conjunto"`
}

// RespostaCatalogoRPGAdmin é o payload de GET /api/admin/rpg/catalogo.
type RespostaCatalogoRPGAdmin struct {
	Resumo ResumoCatalogoRPGAdmin `json:"resumo"`
	Itens  []ItemCatalogoAdmin    `json:"itens"`
}

var classesCatalogoRPG = []string{"espadachim", "lanceiro", "assassina", "maga", "guerreiro", "paladina", "arqueiro"}
var elementosCatalogoRPG = []string{"fogo", "agua", "terra", "vento", "raio", "luz", "trevas", "eter", "neutro"}

// InferirElementoItem resolve o elemento salvo ou o deriva do conjunto/id antes do sql/126.
func InferirElementoItem(elemento, conjunto, id string) string {
	if elemento != "" {
		return elemento
	}
	switch conjunto {
	case "carmesim":
		return "fogo"
	case "glacial":
		return "agua"
	case "terra":
		return "terra"
	case "aurora":
		return "luz"
	case "sombrio":
		return "trevas"
	case "arcano":
		return "eter"
	case "silvestre":
		return "vento"
	}
	switch id {
	case "lanca_da_tempestade", "adaga_do_relampago":
		return "raio"
	case "lanca_carmesim", "machado_do_nucleo":
		return "fogo"
	case "anel_de_safira":
		return "agua"
	case "espada_da_aurora":
		return "luz"
	case "lamina_de_eter", "amuleto_de_eter", "manto_estelar", "medalhao_estelar", "colar_de_ametista":
		return "eter"
	}
	return "neutro"
}

// MontarCatalogoRPGAdmin constrói a lista e as contagens de itens sem tocar no banco.
func MontarCatalogoRPGAdmin(itens []itemCatalogoBanco, receitas map[string]int, inventario map[string]int) RespostaCatalogoRPGAdmin {
	resumo := ResumoCatalogoRPGAdmin{
		PorSlot:     map[string]int{},
		PorRaridade: map[string]int{},
		PorClasse:   map[string]int{"generico": 0},
		PorElemento: map[string]int{},
		PorConjunto: map[string]int{},
	}
	for _, c := range classesCatalogoRPG {
		resumo.PorClasse[c] = 0
	}
	for _, el := range elementosCatalogoRPG {
		resumo.PorElemento[el] = 0
	}

	saida := make([]ItemCatalogoAdmin, 0, len(itens))
	for _, it := range itens {
		resumo.Total++
		if it.Ativo {
			resumo.Ativos++
		} else {
			resumo.Inativos++
		}

		forjaOuro, naForja := receitas[it.ID]
		qtd := inventario[it.ID]
		possui := qtd > 0
		elem := InferirElementoItem(it.Elemento, it.Conjunto, it.ID)
		generico := it.Classes == nil && it.PersonagemExclusivo == ""

		if it.Ativo {
			if it.PrecoOuro != nil {
				resumo.NoMercado++
			}
			if naForja {
				resumo.NaForja++
			}
			if possui {
				resumo.Possuidos++
			}
			resumo.PorSlot[it.Slot]++
			resumo.PorRaridade[it.Raridade]++
			resumo.PorElemento[elem]++
			conj := it.Conjunto
			if conj == "" {
				conj = "sem_conjunto"
			}
			resumo.PorConjunto[conj]++
			if generico {
				resumo.PorClasse["generico"]++
			} else {
				for _, cls := range it.Classes {
					resumo.PorClasse[cls]++
				}
			}
		}

		saida = append(saida, ItemCatalogoAdmin{
			ID:                  it.ID,
			Slot:                it.Slot,
			Nome:                it.Nome,
			Descricao:           it.Descricao,
			Raridade:            it.Raridade,
			Vida:                it.Vida,
			Ataque:              it.Ataque,
			Defesa:              it.Defesa,
			Magia:               it.Magia,
			Velocidade:          it.Velocidade,
			CriticoPorMil:       it.CriticoPorMil,
			DanoCritico:         it.DanoCritico,
			EsquivaPorMil:       it.EsquivaPorMil,
			NivelMinimo:         it.NivelMinimo,
			Classes:             it.Classes,
			Generico:            generico,
			PersonagemExclusivo: it.PersonagemExclusivo,
			Conjunto:            it.Conjunto,
			Elemento:            elem,
			PrecoOuro:           it.PrecoOuro,
			NaForja:             naForja,
			ForjaOuro:           forjaOuro,
			Inicial:             it.Inicial,
			Ativo:               it.Ativo,
			Possui:              possui,
			Quantidade:          qtd,
			Ordem:               it.Ordem,
		})
	}

	sort.SliceStable(saida, func(i, j int) bool {
		if saida[i].Ativo != saida[j].Ativo {
			return saida[i].Ativo
		}
		if saida[i].Ordem != saida[j].Ordem {
			return saida[i].Ordem < saida[j].Ordem
		}
		return saida[i].Nome < saida[j].Nome
	})

	return RespostaCatalogoRPGAdmin{Resumo: resumo, Itens: saida}
}

// HandleGetAdminCatalogoRPG devolve todos os equipamentos cadastrados, fontes e contagens
// por elemento, classe, slot e raridade para o Painel Admin.
func (h *RPGHandler) HandleGetAdminCatalogoRPG(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || token == "" || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	campos := "id,slot,nome,descricao,raridade,vida,ataque,defesa,magia,velocidade,critico_por_mil,dano_critico,esquiva_por_mil,nivel_minimo,classes,personagem_exclusivo,conjunto,elemento,preco_ouro,inicial,ativo,ordem"
	dados, _, err := dbClient.From("rpg_itens").
		Select(campos, "", false).
		Order("ordem", &postgrest.OrderOpts{Ascending: true}).
		Execute()
	if err != nil {
		// Tolerância antes da aplicação do sql/126 (coluna elemento) ou sql/121.
		camposSemElemento := "id,slot,nome,descricao,raridade,vida,ataque,defesa,magia,velocidade,critico_por_mil,dano_critico,esquiva_por_mil,nivel_minimo,classes,personagem_exclusivo,conjunto,preco_ouro,inicial,ativo,ordem"
		dados, _, err = dbClient.From("rpg_itens").
			Select(camposSemElemento, "", false).
			Order("ordem", &postgrest.OrderOpts{Ascending: true}).
			Execute()
	}
	if err != nil {
		log.Printf("[ADMIN-RPG] erro ao ler rpg_itens: %v", err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível carregar o catálogo RPG agora.")
		return
	}

	var itens []itemCatalogoBanco
	if err := json.Unmarshal(dados, &itens); err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Resposta inesperada ao ler equipamentos.")
		return
	}

	receitas := map[string]int{}
	if recDados, _, rErr := dbClient.From("rpg_receitas").Select("item_id,ouro", "", false).Execute(); rErr == nil {
		var linhasRec []struct {
			ItemID string `json:"item_id"`
			Ouro   int    `json:"ouro"`
		}
		if json.Unmarshal(recDados, &linhasRec) == nil {
			for _, rec := range linhasRec {
				receitas[rec.ItemID] = rec.Ouro
			}
		}
	}

	inventario := map[string]int{}
	if invDados, _, iErr := dbClient.From("rpg_inventario").
		Select("item_id,quantidade", "", false).
		Eq("user_id", userID).
		Execute(); iErr == nil {
		var linhasInv []struct {
			ItemID     string `json:"item_id"`
			Quantidade int    `json:"quantidade"`
		}
		if json.Unmarshal(invDados, &linhasInv) == nil {
			for _, inv := range linhasInv {
				inventario[inv.ItemID] += inv.Quantidade
			}
		}
	}

	responderJSON(w, http.StatusOK, MontarCatalogoRPGAdmin(itens, receitas, inventario))
}
