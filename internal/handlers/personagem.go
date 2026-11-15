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

// VisualPersonagem é a aparência em uso. Hoje todo visual é um estágio; o jogador pode
// fixar um que já alcançou ou deixar no automático, que acompanha o estágio do nível.
type VisualPersonagem struct {
	ID         string `json:"id"`
	Automatico bool   `json:"automatico"`
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
	Visual         *VisualPersonagem     `json:"visual,omitempty"`
	// Estilo do cenário equipado na Loja; vazio é o fundo padrão.
	Cenario string `json:"cenario,omitempty"`
	// Estilo da aura equipada na Loja; vazio é sem aura.
	Aura     string             `json:"aura,omitempty"`
	Estagios []EstagioStatusRPG `json:"estagios,omitempty"`
	// Skins que o jogador possui: visuais desbloqueados por compra na Loja.
	Skins []SkinPersonagem `json:"skins,omitempty"`
	// Equipamento e atributos, só com ?completo=1: a barra superior não precisa deles.
	Equipamento *EstadoEquipamento `json:"equipamento,omitempty"`
}

// SkinPersonagem é um traje comprado na Loja. O id é o próprio visual.
type SkinPersonagem struct {
	ID     string `json:"id"`
	Nome   string `json:"nome"`
	Estilo string `json:"estilo"`
}

// prefixoSkin marca os ids de skin, que nunca se confundem com um estágio.
const prefixoSkin = "skin_"

// ehSkin diz se o visual é uma skin.
func ehSkin(visual string) bool {
	return strings.HasPrefix(visual, prefixoSkin)
}

func possuiSkin(skins []SkinPersonagem, id string) bool {
	for _, s := range skins {
		if s.ID == id {
			return true
		}
	}
	return false
}

// ResolverVisualComSkins vale como ResolverVisual, mais as skins: a skin fixada vale
// enquanto o jogador a possui. Devolvida na Loja, o personagem volta ao automático.
func ResolverVisualComSkins(equipado string, nivel int, estagios []EstagioRPG, skins []SkinPersonagem) VisualPersonagem {
	if ehSkin(equipado) && possuiSkin(skins, equipado) {
		return VisualPersonagem{ID: equipado, Automatico: false}
	}
	return ResolverVisual(equipado, nivel, estagios)
}

// ValidarEscolhaDeVisualComSkins aceita, além dos estágios alcançados, as skins possuídas.
func ValidarEscolhaDeVisualComSkins(visual string, nivel int, estagios []EstagioRPG, skins []SkinPersonagem) error {
	if ehSkin(visual) {
		if possuiSkin(skins, visual) {
			return nil
		}
		return errors.New("Você não possui esta skin.")
	}
	return ValidarEscolhaDeVisual(visual, nivel, estagios)
}

// VisualParaRetrato é o visual que o retrato de um membro mostra. A posse da skin já foi
// conferida em visuaisEquipadosPorUsuario.
func VisualParaRetrato(visual string, nivel int, estagios []EstagioRPG) string {
	if ehSkin(visual) {
		return visual
	}
	return ResolverVisual(visual, nivel, estagios).ID
}

// separarSkins lê user_items com o item da Loja embutido e fica só com as skins.
func separarSkins(dados []byte) []SkinPersonagem {
	var linhas []struct {
		Item *struct {
			ID     string `json:"id"`
			Nome   string `json:"nome"`
			Estilo string `json:"estilo"`
			Tipo   string `json:"tipo"`
		} `json:"store_items"`
	}
	if json.Unmarshal(dados, &linhas) != nil {
		return nil
	}
	skins := make([]SkinPersonagem, 0, len(linhas))
	for _, l := range linhas {
		if l.Item == nil || l.Item.Tipo != "skin" || !ehSkin(l.Item.ID) {
			continue
		}
		skins = append(skins, SkinPersonagem{ID: l.Item.ID, Nome: l.Item.Nome, Estilo: l.Item.Estilo})
	}
	return skins
}

// carregarSkinsDoJogador lê as skins possuídas. Falha devolve nenhuma: o personagem aparece
// com o visual do estágio.
func carregarSkinsDoJogador(dbClient *supabase.Client, userID string) []SkinPersonagem {
	dados, _, err := dbClient.From("user_items").
		Select("item_id,store_items(id,nome,estilo,tipo)", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return nil
	}
	return separarSkins(dados)
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

// ResolverVisual decide a aparência mostrada. O visual fixado só vale enquanto o nível o
// alcança: desmarcar episódios reduz o XP, e um visual que deixou de estar desbloqueado
// volta para o automático em vez de dar erro.
func ResolverVisual(equipado string, nivel int, estagios []EstagioRPG) VisualPersonagem {
	if equipado != "" {
		for _, e := range estagios {
			if e.ID == equipado && nivel >= e.NivelMinimo {
				return VisualPersonagem{ID: e.ID, Automatico: false}
			}
		}
	}
	atual, _ := CalcularEstagio(nivel, estagios)
	return VisualPersonagem{ID: atual.ID, Automatico: true}
}

// ValidarEscolhaDeVisual confere se o jogador pode fixar o visual pedido. Vazio é sempre
// aceito: significa voltar ao automático.
func ValidarEscolhaDeVisual(visual string, nivel int, estagios []EstagioRPG) error {
	if visual == "" {
		return nil
	}
	for _, e := range estagios {
		if e.ID != visual {
			continue
		}
		if nivel < e.NivelMinimo {
			return errors.New("Este visual ainda não foi desbloqueado.")
		}
		return nil
	}
	return errors.New("Visual desconhecido.")
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
	Nome           string  `json:"nome"`
	PersonagemBase string  `json:"personagem_base"`
	CriadoEm       string  `json:"criado_em"`
	VisualEquipado *string `json:"visual_equipado"`
}

// lerPersonagem busca a linha do usuário. Devolve nil, sem erro, para quem não despertou.
func lerPersonagem(dbClient *supabase.Client, userID string) (*linhaPersonagemBanco, error) {
	dados, _, err := dbClient.From("rpg_personagens").
		Select("nome,personagem_base,criado_em,visual_equipado", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		// A coluna visual_equipado vem do sql/068, aplicado à mão. Enquanto ele não roda, a
		// leitura cai nas colunas antigas e o visual fica no automático, em vez de a tela
		// inteira do personagem sair do ar.
		dados, _, err = dbClient.From("rpg_personagens").
			Select("nome,personagem_base,criado_em", "", false).
			Eq("user_id", userID).
			Execute()
	}
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

	equipado := ""
	if linha.VisualEquipado != nil {
		equipado = *linha.VisualEquipado
	}
	visual := ResolverVisual(equipado, status.Nivel, estagios)

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
		Visual:         &visual,
		Estagios:       jornada,
	}
}

// contextoPersonagem reúne o que as regras do personagem precisam ler do banco.
type contextoPersonagem struct {
	linha    *linhaPersonagemBanco
	xpTotal  int
	ranks    []FaixaRank
	estagios []EstagioRPG
	cenario  string
	aura     string
	skins    []SkinPersonagem
	// Vindos da leitura única (sql/076). inventarioLido diz se vieram: sem ela, ficam vazios
	// e o equipamento é lido à parte.
	inventario     []linhaInventarioRPG
	equipados      map[string]string
	bilhetes       int
	inventarioLido bool
	// Pontos distribuídos (sql/077). pontosLidos false: a leitura única não os trouxe.
	pontos      PrimariosRPG
	pontosLidos bool
}

// resposta monta o corpo da API a partir do que foi lido.
func (c contextoPersonagem) resposta() RespostaPersonagem {
	r := montarRespostaPersonagem(*c.linha, c.xpTotal, c.ranks, c.estagios)
	r.Cenario = c.cenario
	r.Aura = c.aura
	r.Skins = c.skins
	if c.linha.VisualEquipado != nil && r.Progressao != nil {
		visual := ResolverVisualComSkins(*c.linha.VisualEquipado, r.Progressao.Nivel, c.estagios, c.skins)
		r.Visual = &visual
	}
	return r
}

// carregarEquipadosDoPersonagem devolve o estilo do cenário e o da aura equipados, numa
// consulta só. Falha de leitura devolve os dois vazios: são enfeites, e a tela abre sem eles.
func carregarEquipadosDoPersonagem(dbClient *supabase.Client, userID string) (cenario, aura string) {
	dados, _, err := dbClient.From("user_equipped").
		Select("slot,store_items(estilo)", "", false).
		Eq("user_id", userID).
		In("slot", []string{slotCenario, slotAura}).
		Execute()
	if err != nil {
		return "", ""
	}
	return separarEquipadosDoPersonagem(dados)
}

// separarEquipadosDoPersonagem lê a resposta de user_equipped e separa cenário de aura.
func separarEquipadosDoPersonagem(dados []byte) (cenario, aura string) {
	var linhas []struct {
		Slot string `json:"slot"`
		Item struct {
			Estilo string `json:"estilo"`
		} `json:"store_items"`
	}
	if json.Unmarshal(dados, &linhas) != nil {
		return "", ""
	}
	for _, l := range linhas {
		switch l.Slot {
		case slotCenario:
			cenario = l.Item.Estilo
		case slotAura:
			aura = l.Item.Estilo
		}
	}
	return cenario, aura
}

// carregarRespostaPersonagem lê o que a tela precisa.
func carregarRespostaPersonagem(dbClient *supabase.Client, userID string) (RespostaPersonagem, error) {
	ctx, err := carregarContextoPersonagem(dbClient, userID)
	if err != nil {
		return RespostaPersonagem{}, err
	}
	if ctx.linha == nil {
		return RespostaPersonagem{Existe: false}, nil
	}
	return ctx.resposta(), nil
}

// visuaisEquipadosPorUsuario lê o visual fixado de vários usuários, para o retrato nas
// listas de membros. A tabela só deixa cada um ler a própria linha, então a leitura é pelo
// service role e devolve apenas o visual, que é público: aparece no avatar. Com falha, o
// mapa vem vazio e cada retrato segue o estágio do nível.
func visuaisEquipadosPorUsuario(userIDs []string) map[string]string {
	saida := map[string]string{}
	if len(userIDs) == 0 {
		return saida
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return saida
	}
	dados, _, err := client.From("rpg_personagens").
		Select("user_id,visual_equipado", "", false).
		In("user_id", userIDs).
		Execute()
	if err != nil {
		return saida
	}
	var linhas []struct {
		UserID         string  `json:"user_id"`
		VisualEquipado *string `json:"visual_equipado"`
	}
	if json.Unmarshal(dados, &linhas) != nil {
		return saida
	}
	skinsFixadas := map[string]bool{}
	for _, l := range linhas {
		if l.VisualEquipado != nil && *l.VisualEquipado != "" {
			saida[l.UserID] = *l.VisualEquipado
			if ehSkin(*l.VisualEquipado) {
				skinsFixadas[*l.VisualEquipado] = true
			}
		}
	}
	if len(skinsFixadas) > 0 {
		filtrarSkinsSemPosse(client, saida, skinsFixadas)
	}
	return saida
}

// filtrarSkinsSemPosse tira do mapa a skin que o membro já devolveu na Loja, para o retrato
// não mostrar um traje que ele não tem mais. Com falha na leitura, tira todas as skins.
func filtrarSkinsSemPosse(client *supabase.Client, visuais map[string]string, skins map[string]bool) {
	uids := make([]string, 0, len(visuais))
	ids := make([]string, 0, len(skins))
	for uid, v := range visuais {
		if ehSkin(v) {
			uids = append(uids, uid)
		}
	}
	for id := range skins {
		ids = append(ids, id)
	}
	possui := map[string]bool{}
	dados, _, err := client.From("user_items").
		Select("user_id,item_id", "", false).
		In("user_id", uids).
		In("item_id", ids).
		Execute()
	if err == nil {
		var linhas []struct {
			UserID string `json:"user_id"`
			ItemID string `json:"item_id"`
		}
		if json.Unmarshal(dados, &linhas) == nil {
			for _, l := range linhas {
				possui[l.UserID+"|"+l.ItemID] = true
			}
		}
	}
	for _, uid := range uids {
		if !possui[uid+"|"+visuais[uid]] {
			delete(visuais, uid)
		}
	}
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

	ctx, err := carregarContextoPersonagem(dbClient, userID)
	if err != nil {
		log.Printf("[PERSONAGEM] Falha ao ler personagem (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}
	if ctx.linha == nil {
		responderJSON(w, http.StatusOK, RespostaPersonagem{Existe: false})
		return
	}
	resposta := ctx.resposta()
	// ?completo=1 é a tela do personagem: leva o equipamento na mesma resposta, para a página
	// fazer uma chamada só. Falha no equipamento não derruba o resto.
	if r.URL.Query().Get("completo") == "1" {
		if equipamento, errEq := equipamentoDoContexto(dbClient, userID, ctx); errEq == nil {
			resposta.Equipamento = &equipamento
		} else {
			log.Printf("[PERSONAGEM] Falha ao ler equipamento (user=%s): %v", userID, errEq)
		}
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

// HandleEquiparVisual fixa um visual já desbloqueado, ou volta ao automático com `visual`
// vazio. A regra de desbloqueio é conferida aqui, com os dados lidos pelo token do usuário;
// só então a gravação é feita pelo service role, porque a tabela não aceita escrita direta.
func (h *PersonagemHandler) HandleEquiparVisual(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !ok || !tokenOk || userID == "" || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autenticado")
		return
	}

	var corpo struct {
		Visual string `json:"visual"`
	}
	if err := json.NewDecoder(r.Body).Decode(&corpo); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido.")
		return
	}
	visual := strings.TrimSpace(corpo.Visual)
	if utf8.RuneCountInString(visual) > 40 {
		responderErroJSON(w, http.StatusBadRequest, "Visual desconhecido.")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil || dbClient == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}

	ctx, err := carregarContextoPersonagem(dbClient, userID)
	if err != nil {
		log.Printf("[PERSONAGEM] Falha ao ler personagem (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}
	if ctx.linha == nil {
		responderErroJSON(w, http.StatusNotFound, "Desperte o seu personagem primeiro.")
		return
	}

	nivel := CalcularNivelERank(ctx.xpTotal, ctx.ranks).Nivel
	if err := ValidarEscolhaDeVisualComSkins(visual, nivel, ctx.estagios, ctx.skins); err != nil {
		responderErroJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível no momento.")
		return
	}
	// nil grava NULL, que é o automático.
	var valor interface{}
	if visual != "" {
		valor = visual
	}
	if _, _, err := servico.From("rpg_personagens").
		Update(map[string]interface{}{"visual_equipado": valor}, "minimal", "").
		Eq("user_id", userID).
		Execute(); err != nil {
		log.Printf("[PERSONAGEM] Falha ao gravar visual (user=%s): %v", userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível trocar o visual agora.")
		return
	}

	if visual == "" {
		ctx.linha.VisualEquipado = nil
	} else {
		ctx.linha.VisualEquipado = &visual
	}
	responderJSON(w, http.StatusOK, ctx.resposta())
}
