package handlers

import (
	"encoding/json"
	"strings"
	"sync"
	"time"

	supabase "github.com/supabase-community/supabase-go"
)

// prazoConfigRPG é por quanto tempo as faixas de rank e de estágio ficam em memória. Elas só
// mudam pelo Painel Admin, e um minuto de atraso é aceitável; sem o cache, cada rota do RPG
// faria duas leituras de app_settings.
const prazoConfigRPG = 60 * time.Second

type configRPG struct {
	ranks    []FaixaRank
	estagios []EstagioRPG
}

var (
	cacheConfigRPG        configRPG
	cacheConfigRPGValeAte time.Time
	cacheConfigRPGTrava   sync.Mutex
)

// carregarConfigRPG devolve as faixas do cache, ou lê as duas em paralelo quando ele venceu.
func carregarConfigRPG(dbClient *supabase.Client) configRPG {
	cacheConfigRPGTrava.Lock()
	if time.Now().Before(cacheConfigRPGValeAte) {
		c := cacheConfigRPG
		cacheConfigRPGTrava.Unlock()
		return c
	}
	cacheConfigRPGTrava.Unlock()

	var c configRPG
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		_, c.ranks, _ = carregarConfigGuilda(dbClient)
	}()
	go func() {
		defer wg.Done()
		c.estagios = carregarEstagiosRPG(dbClient)
	}()
	wg.Wait()

	cacheConfigRPGTrava.Lock()
	cacheConfigRPG = c
	cacheConfigRPGValeAte = time.Now().Add(prazoConfigRPG)
	cacheConfigRPGTrava.Unlock()
	return c
}

// estadoJogadorBanco é o JSON de rpg_estado_jogador() (sql/076). As partes em RawMessage
// têm o mesmo formato das leituras antigas, e por isso passam pelos mesmos interpretadores.
type estadoJogadorBanco struct {
	Ok         bool                  `json:"ok"`
	Erro       string                `json:"erro"`
	Personagem *linhaPersonagemBanco `json:"personagem"`
	XPTotal    int                   `json:"xp_total"`
	Inventario json.RawMessage       `json:"inventario"`
	Equipados []struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
		Copia  int    `json:"copia"`
	} `json:"equipados"`
	EquipadosPorHeroi map[string][]struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
		Copia  int    `json:"copia"`
	} `json:"equipados_por_heroi"`
	Bilhetes int `json:"bilhetes"`
	// Ouro (sql/083); ausente antes dele, e então zero.
	Ouro int `json:"ouro"`
	// Usos de cada habilidade (sql/084); ausente antes dele.
	Maestria map[string]int `json:"maestria"`
	// Ausente com o sql/076 sem o 077; objeto vazio é quem nunca distribuiu.
	Pontos         *PrimariosRPG           `json:"pontos"`
	PontosPorHeroi map[string]PrimariosRPG `json:"pontos_por_heroi"`
	Cosmeticos     json.RawMessage         `json:"cosmeticos"`
	Skins          json.RawMessage         `json:"skins"`
}

// interpretarEstadoJogador lê a resposta da função. `ok` false é resposta fora do formato
// (função ausente, banco fora do ar), e quem chama cai no caminho antigo.
func interpretarEstadoJogador(bruto string) (estadoJogadorBanco, bool) {
	var e estadoJogadorBanco
	if strings.TrimSpace(bruto) == "" || json.Unmarshal([]byte(bruto), &e) != nil || !e.Ok {
		return estadoJogadorBanco{}, false
	}
	return e, true
}

// contextoDoEstado monta o contexto a partir da resposta única do banco.
func contextoDoEstado(e estadoJogadorBanco, cfg configRPG) (contextoPersonagem, error) {
	if e.Personagem == nil {
		return contextoPersonagem{}, nil
	}
	ctx := contextoPersonagem{
		linha:          e.Personagem,
		xpTotal:        e.XPTotal,
		ranks:          cfg.ranks,
		estagios:       cfg.estagios,
		bilhetes:       e.Bilhetes,
		ouro:           e.Ouro,
		maestria:       e.Maestria,
		equipados:      map[string]string{},
		copias:         map[string]int{},
		inventarioLido: true,
	}
	if len(e.Cosmeticos) > 0 {
		ctx.cenario, ctx.aura = separarEquipadosDoPersonagem(e.Cosmeticos)
	}
	if len(e.Skins) > 0 {
		ctx.skins = separarSkins(e.Skins)
	}
	if len(e.Inventario) > 0 {
		inventario, err := interpretarInventarioRPG(e.Inventario)
		if err != nil {
			return contextoPersonagem{}, err
		}
		ctx.inventario = inventario
	}
	for _, eq := range e.Equipados {
		ctx.equipados[eq.Slot] = eq.ItemID
		if eq.Copia > 0 {
			ctx.copias[eq.Slot] = eq.Copia
		}
	}
	if e.EquipadosPorHeroi != nil {
		porHeroi := make(map[string]map[string]string, len(e.EquipadosPorHeroi))
		copiasPorHeroi := make(map[string]map[string]int, len(e.EquipadosPorHeroi))
		for base, lista := range e.EquipadosPorHeroi {
			slots := make(map[string]string, len(lista))
			copias := make(map[string]int, len(lista))
			for _, eq := range lista {
				if eq.Slot != "" && eq.ItemID != "" {
					slots[eq.Slot] = eq.ItemID
					if eq.Copia > 0 {
						copias[eq.Slot] = eq.Copia
					}
				}
			}
			porHeroi[base] = slots
			copiasPorHeroi[base] = copias
		}
		ctx.equipadosPorHeroi = porHeroi
		ctx.copiasPorHeroi = copiasPorHeroi
	}
	if e.Pontos != nil {
		ctx.pontos, ctx.pontosLidos = *e.Pontos, true
	}
	if e.PontosPorHeroi != nil {
		ctx.pontosPorHeroi = e.PontosPorHeroi
	}
	return ctx, nil
}

// lerEstadoJogador faz a leitura única e a da configuração em paralelo. Devolve ok false
// quando a função do banco não respondeu no formato esperado.
func lerEstadoJogador(dbClient *supabase.Client) (contextoPersonagem, bool, error) {
	var bruto string
	var cfg configRPG
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		bruto = dbClient.Rpc("rpg_estado_jogador", "", map[string]interface{}{})
	}()
	go func() {
		defer wg.Done()
		cfg = carregarConfigRPG(dbClient)
	}()
	wg.Wait()

	estado, ok := interpretarEstadoJogador(bruto)
	if !ok {
		return contextoPersonagem{}, false, nil
	}
	ctx, err := contextoDoEstado(estado, cfg)
	return ctx, true, err
}

// carregarContextoPersonagem lê o que as rotas do personagem precisam. O caminho normal é uma
// ida ao banco (rpg_estado_jogador, sql/076). Sem essa função aplicada, cai no caminho antigo,
// que lê tabela por tabela.
func carregarContextoPersonagem(dbClient *supabase.Client, userID string) (contextoPersonagem, error) {
	ctx, ok, err := lerEstadoJogador(dbClient)
	if !ok {
		ctx, err = carregarContextoPersonagemAntigo(dbClient, userID)
	}
	if err != nil || ctx.linha == nil {
		return ctx, err
	}
	// Sem o sql/077 na leitura única, os pontos vêm à parte; sem a tabela, ficam zerados.
	if !ctx.pontosLidos {
		ctx.pontos = lerPontos(dbClient, userID)
	}
	if ctx.pontosPorHeroi == nil {
		ctx.pontosPorHeroi = lerPontosPorHeroi(dbClient, userID)
	}
	if ctx.equipadosPorHeroi == nil {
		ctx.equipadosPorHeroi, ctx.copiasPorHeroi = lerEquipadosPorHeroi(dbClient, userID)
	}
	// As skins da Loja são trajes do Espadachim: com outro personagem, não valem.
	if !aceitaSkins(ctx.linha.PersonagemBase) {
		ctx.skins = nil
	}
	return ctx, nil
}

// lerPontos lê os pontos distribuídos. Falha ou tabela ausente dão zero em tudo: o
// personagem continua jogável com os atributos da base.
func lerPontos(dbClient *supabase.Client, userID string) PrimariosRPG {
	dados, _, err := dbClient.From("rpg_atributos").
		Select("forca,inteligencia,constituicao,agilidade,destreza,sorte", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return PrimariosRPG{}
	}
	var linhas []PrimariosRPG
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return PrimariosRPG{}
	}
	return linhas[0]
}

// lerPontosPorHeroi lê os pontos por personagem em rpg_atributos_herois (fallback sem RPC nova).
func lerPontosPorHeroi(dbClient *supabase.Client, userID string) map[string]PrimariosRPG {
	dados, _, err := dbClient.From("rpg_atributos_herois").
		Select("personagem_base,forca,inteligencia,constituicao,agilidade,destreza,sorte", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return nil
	}
	var linhas []struct {
		PersonagemBase string `json:"personagem_base"`
		PrimariosRPG
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return nil
	}
	mapa := make(map[string]PrimariosRPG, len(linhas))
	for _, l := range linhas {
		if l.PersonagemBase != "" {
			mapa[l.PersonagemBase] = l.PrimariosRPG
		}
	}
	return mapa
}

// lerEquipadosPorHeroi lê os equipamentos e cópias por personagem em rpg_equipados_herois (fallback sem RPC nova).
func lerEquipadosPorHeroi(dbClient *supabase.Client, userID string) (map[string]map[string]string, map[string]map[string]int) {
	dados, _, err := dbClient.From("rpg_equipados_herois").
		Select("personagem_base,slot,item_id,copia", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		dados, _, err = dbClient.From("rpg_equipados_herois").
			Select("personagem_base,slot,item_id", "", false).
			Eq("user_id", userID).
			Execute()
	}
	if err != nil {
		return nil, nil
	}
	var linhas []struct {
		PersonagemBase string `json:"personagem_base"`
		Slot           string `json:"slot"`
		ItemID         string `json:"item_id"`
		Copia          int    `json:"copia"`
	}
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return nil, nil
	}
	mapa := make(map[string]map[string]string)
	copias := make(map[string]map[string]int)
	for _, l := range linhas {
		if l.PersonagemBase == "" || l.Slot == "" || l.ItemID == "" {
			continue
		}
		if mapa[l.PersonagemBase] == nil {
			mapa[l.PersonagemBase] = make(map[string]string)
			copias[l.PersonagemBase] = make(map[string]int)
		}
		mapa[l.PersonagemBase][l.Slot] = l.ItemID
		if l.Copia > 0 {
			copias[l.PersonagemBase][l.Slot] = l.Copia
		}
	}
	return mapa, copias
}

// carregarContextoPersonagemAntigo é a leitura de antes do sql/076, mantida como reserva.
func carregarContextoPersonagemAntigo(dbClient *supabase.Client, userID string) (contextoPersonagem, error) {
	linha, err := lerPersonagem(dbClient, userID)
	if err != nil || linha == nil {
		return contextoPersonagem{}, err
	}

	cfg := carregarConfigRPG(dbClient)
	xpTotal := 0
	for _, l := range carregarLedgerUsuario(dbClient, userID) {
		xpTotal += l.XPEarned
	}
	cenario, aura := carregarEquipadosDoPersonagem(dbClient, userID)
	return contextoPersonagem{
		linha:    linha,
		xpTotal:  xpTotal,
		ranks:    cfg.ranks,
		estagios: cfg.estagios,
		cenario:  cenario,
		aura:     aura,
		skins:    carregarSkinsDoJogador(dbClient, userID),
	}, nil
}

// equipamentoDoContexto monta o estado de equipamento a partir da leitura única do banco.
// Quem começa não recebe kit inicial gratuito: inventário vazio segue vazio até o jogador
// conquistar equipamentos jogando.
func equipamentoDoContexto(dbClient *supabase.Client, userID string, ctx contextoPersonagem) (EstadoEquipamento, error) {
	nivel := CalcularNivelERank(ctx.xpTotal, ctx.ranks).Nivel
	base := ""
	if ctx.linha != nil {
		base = ctx.linha.PersonagemBase
	}
	if base == "" {
		base = personagemBasePadrao
	}
	pontosHeroi := ctx.PontosDoHeroi(base)

	var estado EstadoEquipamento
	if ctx.inventarioLido {
		estado = MontarEstadoEquipamentoCompleto(nivel, base, ctx.inventario, ctx.EquipadosDoHeroi(base), pontosHeroi, ctx.equipadosPorHeroi, ctx.copiasPorHeroi)
	} else {
		var err error
		if estado, err = carregarEstadoEquipamento(dbClient, userID, base, nivel, pontosHeroi); err != nil {
			return EstadoEquipamento{}, err
		}
	}
	estado.PersonagemBase = base
	estado.Classe = ClasseDoPersonagem(base)
	desbloqueados := desbloqueadosNormalizados(ctx.linha)
	porHeroi := make(map[string]PrimariosRPG, len(desbloqueados))
	for _, id := range desbloqueados {
		porHeroi[id] = ctx.PontosDoHeroi(id)
	}
	estado.PontosPorHeroi = porHeroi
	estado.Habilidades = AplicarMaestria(LivroDeHabilidades(base, nivel), ctx.maestria)
	estado.Ouro = ctx.ouro
	if ctx.linha != nil && ctx.linha.EcoMalID != nil && *ctx.linha.EcoMalID > 0 {
		if eco := carregarEcoEquipado(dbClient, userID, ctx.linha.EcoMalID, nivel); eco != nil {
			AplicarEcoNoEstado(&estado, eco)
		}
	}
	return estado, nil
}
