package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	supabase "github.com/supabase-community/supabase-go"
)

const (
	chaveRPGEstagios     = "rpg_estagios"
	personagemBasePadrao = "espadachim_eter"
	nomePersonagemMinimo = 2
	nomePersonagemMaximo = 24
)

// EstagioRPG é um degrau da jornada visual do personagem, alcançado por nível.
type EstagioRPG struct {
	ID          string `json:"id"`
	Nome        string `json:"nome"`
	NivelMinimo int    `json:"nivel_minimo"`
}

// EstagioStatusRPG é o estágio como a tela o exibe: com a marca de já alcançado.
type EstagioStatusRPG struct {
	ID          string `json:"id"`
	Nome        string `json:"nome"`
	NivelMinimo int    `json:"nivel_minimo"`
	Alcancado   bool   `json:"alcancado"`
}

// PersonagemBase descreve um personagem do elenco. A classe de combate e o elemento
// pertencem ao personagem, não ao usuário, e por isso não são colunas da tabela.
type PersonagemBase struct {
	ID       string
	Classe   string
	Elemento string
}

// IdentidadePersonagem é o que foi gravado no despertar, somado ao catálogo.
type IdentidadePersonagem struct {
	Nome           string `json:"nome"`
	PersonagemBase string `json:"personagem_base"`
	Classe         string `json:"classe"`
	Elemento       string `json:"elemento"`
	CriadoEm       string `json:"criado_em"`
}

// ProgressaoPersonagem repete os números da Guilda: o personagem não tem XP próprio.
type ProgressaoPersonagem struct {
	Nivel         int    `json:"nivel"`
	XPTotal       int    `json:"xp_total"`
	XPNoNivel     int    `json:"xp_no_nivel"`
	XPParaProximo int    `json:"xp_para_proximo"`
	ProgressoPct  int    `json:"progresso_pct"`
	Rank          string `json:"rank"`
	TituloRank    string `json:"titulo_rank"`
}

// RespostaPersonagem é o corpo de GET e POST /api/personagem. Quem ainda não despertou
// recebe só `existe: false`; os demais campos são ponteiros para sair do JSON nesse caso,
// em vez de aparecerem zerados.
type RespostaPersonagem struct {
	Existe         bool                  `json:"existe"`
	Personagem     *IdentidadePersonagem `json:"personagem,omitempty"`
	Progressao     *ProgressaoPersonagem `json:"progressao,omitempty"`
	Estagio        *EstagioRPG           `json:"estagio,omitempty"`
	ProximoEstagio *EstagioRPG           `json:"proximo_estagio,omitempty"`
	Estagios       []EstagioStatusRPG    `json:"estagios,omitempty"`
}

// EstagiosPadrao devolve os quatro estágios, do primeiro ao último. Os níveis acompanham
// as faixas de rank F, D, B e S da Guilda.
func EstagiosPadrao() []EstagioRPG {
	return []EstagioRPG{
		{ID: "iniciante", Nome: "Iniciante", NivelMinimo: 1},
		{ID: "aventureiro", Nome: "Aventureiro", NivelMinimo: 10},
		{ID: "veterano", Nome: "Veterano", NivelMinimo: 28},
		{ID: "lendario", Nome: "Lendário", NivelMinimo: 55},
	}
}

// PersonagensBase é o elenco disponível. Personagem novo entra aqui, no CHECK da tabela
// e nas artes do frontend.
func PersonagensBase() map[string]PersonagemBase {
	return map[string]PersonagemBase{
		personagemBasePadrao: {ID: personagemBasePadrao, Classe: "espadachim", Elemento: "eter"},
	}
}

// InterpretarEstagios lê a configuração de app_settings.rpg_estagios. Ela só pode mudar o
// nome e o nível mínimo dos quatro estágios conhecidos: o frontend tem uma arte por id, e
// um id novo ficaria sem imagem. Qualquer configuração fora dessas regras cai no padrão.
func InterpretarEstagios(bruto string) []EstagioRPG {
	padrao := EstagiosPadrao()
	if strings.TrimSpace(bruto) == "" {
		return padrao
	}

	var lidos []EstagioRPG
	if json.Unmarshal([]byte(bruto), &lidos) != nil || len(lidos) != len(padrao) {
		return padrao
	}

	porID := make(map[string]EstagioRPG, len(lidos))
	for _, e := range lidos {
		porID[e.ID] = e
	}

	saida := make([]EstagioRPG, 0, len(padrao))
	nivelAnterior := 0
	for i, p := range padrao {
		e, existe := porID[p.ID]
		if !existe {
			return padrao
		}
		// O primeiro estágio começa no nível 1, para todo nível ter um estágio; os
		// seguintes precisam subir, senão um deles nunca seria alcançado.
		if (i == 0 && e.NivelMinimo != 1) || e.NivelMinimo <= nivelAnterior {
			return padrao
		}
		if strings.TrimSpace(e.Nome) == "" {
			e.Nome = p.Nome
		}
		nivelAnterior = e.NivelMinimo
		saida = append(saida, EstagioRPG{ID: p.ID, Nome: strings.TrimSpace(e.Nome), NivelMinimo: e.NivelMinimo})
	}
	return saida
}

// CalcularEstagio devolve o estágio do nível informado e o próximo, que é nil no último.
// Espera a lista em ordem crescente de nível, como EstagiosPadrao e InterpretarEstagios
// devolvem.
func CalcularEstagio(nivel int, estagios []EstagioRPG) (EstagioRPG, *EstagioRPG) {
	if len(estagios) == 0 {
		estagios = EstagiosPadrao()
	}

	indice := 0
	for i, e := range estagios {
		if nivel >= e.NivelMinimo {
			indice = i
		}
	}

	if indice+1 < len(estagios) {
		proximo := estagios[indice+1]
		return estagios[indice], &proximo
	}
	return estagios[indice], nil
}

// ValidarNomePersonagem limpa o nome e confere tamanho e caracteres. Aceita letras de
// qualquer alfabeto, números, espaço, hífen e apóstrofo. O banco repete a conferência de
// tamanho, porque a função despertar_personagem também pode ser chamada sem passar aqui.
func ValidarNomePersonagem(nome string) (string, error) {
	limpo := strings.Join(strings.Fields(nome), " ")

	tamanho := utf8.RuneCountInString(limpo)
	if tamanho < nomePersonagemMinimo || tamanho > nomePersonagemMaximo {
		return "", errors.New("O nome precisa ter de 2 a 24 caracteres.")
	}

	for _, r := range limpo {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '-' || r == '\'' {
			continue
		}
		return "", errors.New("Use só letras, números, espaço, hífen e apóstrofo no nome.")
	}
	return limpo, nil
}

// PersonagemHandler responde pelas rotas do personagem do jogador.
type PersonagemHandler struct{}

type linhaPersonagemBanco struct {
	Nome           string `json:"nome"`
	PersonagemBase string `json:"personagem_base"`
	CriadoEm       string `json:"criado_em"`
}

// lerPersonagem busca a linha do usuário. Devolve nil, sem erro, para quem não despertou.
func lerPersonagem(dbClient *supabase.Client, userID string) (*linhaPersonagemBanco, error) {
	dados, _, err := dbClient.From("rpg_personagens").
		Select("nome,personagem_base,criado_em", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return nil, err
	}

	var linhas []linhaPersonagemBanco
	if err := json.Unmarshal(dados, &linhas); err != nil {
		return nil, err
	}
	if len(linhas) == 0 {
		return nil, nil
	}
	return &linhas[0], nil
}

// carregarEstagiosRPG lê a sobrescrita opcional de app_settings. Sem a chave, ou com
// falha na leitura, valem os padrões: a tela não deixa de abrir por causa de configuração.
func carregarEstagiosRPG(dbClient *supabase.Client) []EstagioRPG {
	dados, _, err := dbClient.From("app_settings").
		Select("value", "", false).
		Eq("key", chaveRPGEstagios).
		Execute()
	if err != nil {
		return EstagiosPadrao()
	}

	var linhas []struct {
		Value string `json:"value"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return EstagiosPadrao()
	}
	return InterpretarEstagios(linhas[0].Value)
}

// montarRespostaPersonagem junta identidade, progressão e jornada. Não toca no banco, o
// que deixa a regra testável sem Supabase.
func montarRespostaPersonagem(linha linhaPersonagemBanco, xpTotal int, ranks []FaixaRank, estagios []EstagioRPG) RespostaPersonagem {
	base, conhecido := PersonagensBase()[linha.PersonagemBase]
	if !conhecido {
		base = PersonagensBase()[personagemBasePadrao]
	}

	status := CalcularNivelERank(xpTotal, ranks)
	atual, proximo := CalcularEstagio(status.Nivel, estagios)

	jornada := make([]EstagioStatusRPG, 0, len(estagios))
	for _, e := range estagios {
		jornada = append(jornada, EstagioStatusRPG{
			ID:          e.ID,
			Nome:        e.Nome,
			NivelMinimo: e.NivelMinimo,
			Alcancado:   status.Nivel >= e.NivelMinimo,
		})
	}

	return RespostaPersonagem{
		Existe: true,
		Personagem: &IdentidadePersonagem{
			Nome:           linha.Nome,
			PersonagemBase: base.ID,
			Classe:         base.Classe,
			Elemento:       base.Elemento,
			CriadoEm:       linha.CriadoEm,
		},
		Progressao: &ProgressaoPersonagem{
			Nivel:         status.Nivel,
			XPTotal:       status.XPTotal,
			XPNoNivel:     status.XPNoNivel,
			XPParaProximo: status.XPParaProximo,
			ProgressoPct:  status.ProgressoPct,
			Rank:          status.Rank,
			TituloRank:    status.TituloRank,
		},
		Estagio:        &atual,
		ProximoEstagio: proximo,
		Estagios:       jornada,
	}
}

// carregarRespostaPersonagem lê o que a tela precisa. O XP vem do mesmo ledger da Guilda,
// então o nível mostrado aqui é sempre o mesmo da pílula da Navbar.
func carregarRespostaPersonagem(dbClient *supabase.Client, userID string) (RespostaPersonagem, error) {
	linha, err := lerPersonagem(dbClient, userID)
	if err != nil {
		return RespostaPersonagem{}, err
	}
	if linha == nil {
		return RespostaPersonagem{Existe: false}, nil
	}

	_, ranks, _ := carregarConfigGuilda(dbClient)
	xpTotal := 0
	for _, l := range carregarLedgerUsuario(dbClient, userID) {
		xpTotal += l.XPEarned
	}

	return montarRespostaPersonagem(*linha, xpTotal, ranks, carregarEstagiosRPG(dbClient)), nil
}

// HandleGetPersonagem devolve o personagem do usuário autenticado, ou `existe: false`.
func (h *PersonagemHandler) HandleGetPersonagem(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil || dbClient == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}

	resposta, err := carregarRespostaPersonagem(dbClient, userID)
	if err != nil {
		log.Printf("[PERSONAGEM] Falha ao ler personagem (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}
	responderJSON(w, http.StatusOK, resposta)
}

// HandleDespertarPersonagem cria o personagem com o nome informado. Chamada repetida não
// duplica nem renomeia: devolve o personagem que já existe.
func (h *PersonagemHandler) HandleDespertarPersonagem(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}

	var corpo struct {
		Nome string `json:"nome"`
	}
	if err := json.NewDecoder(r.Body).Decode(&corpo); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}

	nome, err := ValidarNomePersonagem(corpo.Nome)
	if err != nil {
		responderErroJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil || dbClient == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}

	bruto := strings.TrimSpace(dbClient.Rpc("despertar_personagem", "", map[string]interface{}{
		"p_nome": nome,
	}))

	var retorno struct {
		Ok     bool   `json:"ok"`
		Criado bool   `json:"criado"`
		Erro   string `json:"erro"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil || (!retorno.Ok && retorno.Erro == "") {
		// Resposta vazia, ilegível ou no formato de erro do PostgREST: o banco falhou.
		log.Printf("[PERSONAGEM] Falha no despertar (user=%s): %s", userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}
	if retorno.Erro != "" {
		responderErroJSON(w, http.StatusBadRequest, retorno.Erro)
		return
	}

	resposta, err := carregarRespostaPersonagem(dbClient, userID)
	if err != nil || !resposta.Existe {
		log.Printf("[PERSONAGEM] Falha ao reler personagem (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}

	status := http.StatusOK
	if retorno.Criado {
		status = http.StatusCreated
	}
	responderJSON(w, status, resposta)
}
