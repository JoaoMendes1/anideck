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
	Equipados  []struct {
		Slot   string `json:"slot"`
		ItemID string `json:"item_id"`
	} `json:"equipados"`
	Bilhetes   int             `json:"bilhetes"`
	Cosmeticos json.RawMessage `json:"cosmeticos"`
	Skins      json.RawMessage `json:"skins"`
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
		equipados:      map[string]string{},
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
	if ctx, ok, err := lerEstadoJogador(dbClient); ok {
		return ctx, err
	}
	return carregarContextoPersonagemAntigo(dbClient, userID)
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

// equipamentoDoContexto monta o estado de equipamento. Quando o contexto veio da leitura
// única, não há consulta nova, a não ser na primeira visita: inventário vazio é quem ainda
// não recebeu o kit, e só então o kit é entregue e lido de novo.
func equipamentoDoContexto(dbClient *supabase.Client, userID string, ctx contextoPersonagem) (EstadoEquipamento, error) {
	nivel := CalcularNivelERank(ctx.xpTotal, ctx.ranks).Nivel
	if ctx.inventarioLido && len(ctx.inventario) > 0 {
		return MontarEstadoEquipamento(nivel, ctx.inventario, ctx.equipados), nil
	}
	dbClient.Rpc("rpg_garantir_kit_inicial", "", map[string]interface{}{})
	return carregarEstadoEquipamento(dbClient, userID, nivel)
}
