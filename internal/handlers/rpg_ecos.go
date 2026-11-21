package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	postgrest "github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

// EcoDoAnime representa o bônus tático derivado de uma Carta Foil equipada no personagem.
type EcoDoAnime struct {
	MalID           int     `json:"mal_id"`
	Titulo          string  `json:"titulo"`
	ImagemURL       string  `json:"imagem_url"`
	Raridade        string  `json:"raridade"`
	Nota            float64 `json:"nota"`
	GeneroPrincipal string  `json:"genero_principal"`
	NomeEfeito      string  `json:"nome_efeito"`
	Resumo          string  `json:"resumo"`
	Vida            int     `json:"vida,omitempty"`
	Ataque          int     `json:"ataque,omitempty"`
	Defesa          int     `json:"defesa,omitempty"`
	Magia           int     `json:"magia,omitempty"`
	Eter            int     `json:"eter,omitempty"`
	Velocidade      int     `json:"velocidade,omitempty"`
	CriticoPorMil   int     `json:"critico_por_mil,omitempty"`
	EsquivaPorMil   int     `json:"esquiva_por_mil,omitempty"`
	SorteItem       int     `json:"sorte_item,omitempty"`
}

var normalizarGeneroEco = map[string]string{
	"action":            "Ação",
	"ação":              "Ação",
	"adventure":         "Aventura",
	"aventura":          "Aventura",
	"comedy":            "Comédia",
	"comédia":           "Comédia",
	"drama":             "Drama",
	"fantasy":           "Fantasia",
	"fantasia":          "Fantasia",
	"horror":            "Terror",
	"terror":            "Terror",
	"mystery":           "Mistério",
	"mistério":          "Mistério",
	"psychological":     "Psicológico",
	"psicológico":       "Psicológico",
	"romance":           "Romance",
	"sci-fi":            "Ficção Científica",
	"ficção científica": "Ficção Científica",
	"slice of life":     "Slice of Life",
	"sports":            "Esporte",
	"esporte":           "Esporte",
	"supernatural":      "Sobrenatural",
	"sobrenatural":      "Sobrenatural",
	"suspense":          "Suspense",
	"thriller":          "Suspense",
	"mecha":             "Mecha",
	"isekai":            "Isekai",
}

func multiplicadorRaridadeEco(raridade string) int {
	switch raridade {
	case "lendaria":
		return 135
	case "rarissima":
		return 125
	case "rara":
		return 115
	default:
		return 100
	}
}

func escalaEco(valor, multPct int) int {
	return max(1, (valor*multPct+50)/100)
}

func resumoEco(e EcoDoAnime) string {
	var p []string
	if e.Vida > 0 {
		p = append(p, fmt.Sprintf("+%d Vida", e.Vida))
	}
	if e.Ataque > 0 {
		p = append(p, fmt.Sprintf("+%d Ataque", e.Ataque))
	}
	if e.Defesa > 0 {
		p = append(p, fmt.Sprintf("+%d Defesa", e.Defesa))
	}
	if e.Magia > 0 {
		p = append(p, fmt.Sprintf("+%d Magia", e.Magia))
	}
	if e.Eter > 0 {
		p = append(p, fmt.Sprintf("+%d Éter", e.Eter))
	}
	if e.Velocidade > 0 {
		p = append(p, fmt.Sprintf("+%d Velocidade", e.Velocidade))
	}
	if e.CriticoPorMil > 0 {
		p = append(p, fmt.Sprintf("+%.1f%% Crítico", float64(e.CriticoPorMil)/10))
	}
	if e.EsquivaPorMil > 0 {
		p = append(p, fmt.Sprintf("+%.1f%% Esquiva", float64(e.EsquivaPorMil)/10))
	}
	if e.SorteItem > 0 {
		p = append(p, fmt.Sprintf("+%d%% Sorte de item", e.SorteItem))
	}
	return strings.Join(p, " · ")
}

// CalcularEcoDoAnime deriva o efeito tático de uma Carta Foil a partir do gênero principal,
// raridade da carta e nível do personagem.
func CalcularEcoDoAnime(malID int, titulo, imagemURL, raridade string, nota float64, genres []string, nivel int) EcoDoAnime {
	if nivel < 1 {
		nivel = 1
	}
	genero := "Geral"
	for _, g := range genres {
		limpo := strings.TrimSpace(g)
		if limpo == "" {
			continue
		}
		if norm, ok := normalizarGeneroEco[strings.ToLower(limpo)]; ok {
			genero = norm
		} else {
			genero = limpo
		}
		break
	}

	mult := multiplicadorRaridadeEco(raridade)
	baseAtq := max(3, 2+nivel/3)
	baseVida := max(15, 10+nivel*2)
	baseDef := max(2, 1+nivel/4)

	eco := EcoDoAnime{
		MalID:           malID,
		Titulo:          titulo,
		ImagemURL:       imagemURL,
		Raridade:        raridade,
		Nota:            nota,
		GeneroPrincipal: genero,
	}

	switch genero {
	case "Ação", "Esporte", "Mecha":
		eco.NomeEfeito = "Eco de Impacto"
		eco.Ataque = escalaEco(baseAtq, mult)
		eco.Velocidade = escalaEco(max(1, nivel/10), mult)
		eco.CriticoPorMil = escalaEco(15, mult)
	case "Fantasia", "Ficção Científica", "Sobrenatural":
		eco.NomeEfeito = "Eco Arcano"
		eco.Magia = escalaEco(baseAtq+2, mult)
		eco.Eter = escalaEco(max(5, 4+nivel/4), mult)
	case "Aventura", "Isekai":
		eco.NomeEfeito = "Eco do Explorador"
		eco.Velocidade = escalaEco(max(2, 1+nivel/6), mult)
		eco.Ataque = escalaEco(max(2, baseAtq/2), mult)
		eco.SorteItem = escalaEco(4, mult)
	case "Romance", "Drama", "Slice of Life":
		eco.NomeEfeito = "Eco Vital"
		eco.Vida = escalaEco(baseVida, mult)
		eco.Defesa = escalaEco(baseDef, mult)
	case "Mistério", "Suspense", "Terror", "Psicológico":
		eco.NomeEfeito = "Eco da Sombra"
		eco.CriticoPorMil = escalaEco(25, mult)
		eco.EsquivaPorMil = escalaEco(20, mult)
		eco.Ataque = escalaEco(max(2, baseAtq/2), mult)
	default:
		eco.NomeEfeito = "Eco da Harmonia"
		eco.Defesa = escalaEco(baseDef, mult)
		eco.EsquivaPorMil = escalaEco(15, mult)
		eco.Eter = escalaEco(max(4, 3+nivel/5), mult)
	}
	eco.Resumo = resumoEco(eco)
	return eco
}

// AplicarEcoNoEstado soma os atributos do Eco ao EstadoEquipamento e recalcula o Poder.
func AplicarEcoNoEstado(estado *EstadoEquipamento, eco *EcoDoAnime) {
	if estado == nil || eco == nil {
		return
	}
	estado.Eco = eco
	a := &estado.Atributos
	a.Vida += eco.Vida
	a.Ataque += eco.Ataque
	a.Defesa += eco.Defesa
	a.Magia += eco.Magia
	a.Eter += eco.Eter
	a.Velocidade += eco.Velocidade
	a.CriticoPorMil = min(tetoCriticoPorMil, a.CriticoPorMil+eco.CriticoPorMil)
	a.EsquivaPorMil = min(tetoEsquivaPorMil, a.EsquivaPorMil+eco.EsquivaPorMil)
	a.SorteItem += eco.SorteItem
	a.Poder = CalcularPoder(*a)
}

func lerCartasFoilEnriquecidas(dbClient *supabase.Client, userID string, nivel int, malIDFiltro int) ([]EcoDoAnime, error) {
	q := dbClient.From("user_cards").
		Select("id,mal_id,raridade,is_foil,estreia,nota,obtida_em", "", false).
		Eq("user_id", userID).
		Eq("is_foil", "true")
	if malIDFiltro > 0 {
		q = q.Eq("mal_id", strconv.Itoa(malIDFiltro))
	} else {
		q = q.Order("obtida_em", &postgrest.OrderOpts{Ascending: false})
	}
	data, _, err := q.Execute()
	if err != nil {
		return nil, err
	}
	var rawCards []linhaCartaBanco
	if err := json.Unmarshal(data, &rawCards); err != nil {
		return nil, err
	}
	if len(rawCards) == 0 {
		return []EcoDoAnime{}, nil
	}

	ids := make([]string, len(rawCards))
	for i, c := range rawCards {
		ids[i] = strconv.Itoa(c.MalID)
	}

	type metaEco struct {
		MalID  int      `json:"mal_id"`
		Title  string   `json:"title"`
		Genres []string `json:"genres"`
	}
	metas := map[int]metaEco{}
	if dataM, _, errM := dbClient.From("anime_metadata_cache").
		Select("mal_id,title,genres", "", false).
		In("mal_id", ids).
		Execute(); errM == nil {
		var lista []metaEco
		if json.Unmarshal(dataM, &lista) == nil {
			for _, m := range lista {
				metas[m.MalID] = m
			}
		}
	}

	curadas := map[int]metaCuradaCarta{}
	if dataC, _, errC := dbClient.From("curated_animes").
		Select("mal_id,custom_title,custom_cover_image", "", false).
		In("mal_id", ids).
		Execute(); errC == nil {
		var lista []metaCuradaCarta
		if json.Unmarshal(dataC, &lista) == nil {
			for _, c := range lista {
				curadas[c.MalID] = c
			}
		}
	}

	saida := make([]EcoDoAnime, 0, len(rawCards))
	for _, c := range rawCards {
		titulo := fmt.Sprintf("Anime #%d", c.MalID)
		imagem := ""
		var genres []string
		if m, ok := metas[c.MalID]; ok {
			if m.Title != "" {
				titulo = m.Title
			}
			genres = m.Genres
		}
		if cur, ok := curadas[c.MalID]; ok {
			if cur.CustomTitle != "" {
				titulo = cur.CustomTitle
			}
			if cur.CustomCoverImage != "" {
				imagem = cur.CustomCoverImage
			}
		}
		saida = append(saida, CalcularEcoDoAnime(c.MalID, titulo, imagem, c.Raridade, c.Nota, genres, nivel))
	}
	return saida, nil
}

func carregarEcoEquipado(dbClient *supabase.Client, userID string, ecoMalID *int, nivel int) *EcoDoAnime {
	if ecoMalID == nil || *ecoMalID <= 0 || dbClient == nil {
		return nil
	}
	lista, err := lerCartasFoilEnriquecidas(dbClient, userID, nivel, *ecoMalID)
	if err != nil || len(lista) == 0 {
		return nil
	}
	eco := lista[0]
	return &eco
}

// HandleGetEcos lista todas as Cartas Foil do usuário com a prévia do bônus de Eco no seu nível atual.
func (h *RPGHandler) HandleGetEcos(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	cartas, err := lerCartasFoilEnriquecidas(sessao.dbClient, sessao.userID, sessao.nivel, 0)
	if err != nil {
		log.Printf("[RPG] Falha ao listar Ecos do Anime (user=%s): %v", sessao.userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Ecos do Anime indisponíveis no momento.")
		return
	}
	var ativoID int
	if sessao.ctx.linha != nil && sessao.ctx.linha.EcoMalID != nil {
		ativoID = *sessao.ctx.linha.EcoMalID
	}
	var ativo *EcoDoAnime
	for i := range cartas {
		if cartas[i].MalID == ativoID {
			copia := cartas[i]
			ativo = &copia
			break
		}
	}
	responderJSON(w, http.StatusOK, map[string]interface{}{
		"eco_mal_id": ativoID,
		"eco_ativo":  ativo,
		"cartas":     cartas,
	})
}

// HandleEquiparEco equipa ou remove uma Carta Foil como Eco do Anime e devolve o equipamento atualizado.
func (h *RPGHandler) HandleEquiparEco(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		MalID int `json:"mal_id"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 256)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}
	if corpo.MalID < 0 {
		responderErroJSON(w, http.StatusBadRequest, "Carta inválida.")
		return
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	var param interface{}
	if corpo.MalID > 0 {
		param = corpo.MalID
	}
	bruto := strings.TrimSpace(sessao.dbClient.Rpc("rpg_equipar_eco", "", map[string]interface{}{
		"p_mal_id": param,
	}))
	erroDaRegra, falhou := lerRetornoRPG(bruto)
	if falhou {
		responderErroJSON(w, http.StatusServiceUnavailable, "Ecos do Anime indisponíveis no momento.")
		return
	}
	if erroDaRegra != "" {
		responderErroJSON(w, http.StatusBadRequest, erroDaRegra)
		return
	}

	ctx, err := carregarContextoPersonagem(sessao.dbClient, sessao.userID)
	if err != nil || ctx.linha == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Equipamentos indisponíveis no momento.")
		return
	}
	estado, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Equipamentos indisponíveis no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}
