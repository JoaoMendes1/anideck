package handlers

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/supabase-community/supabase-go"
)

// BencaoRoguelite define um aprimoramento temporário sorteado entre os andares da masmorra.
type BencaoRoguelite struct {
	ID          string `json:"id"`
	Nome        string `json:"nome"`
	Descricao   string `json:"descricao"`
	Categoria   string `json:"categoria"`
	Raridade    string `json:"raridade"`
	AtaquePct   int    `json:"-"`
	DefesaPct   int    `json:"-"`
	MagiaPct    int    `json:"-"`
	EterExtra   int    `json:"-"`
	CriticoMil  int    `json:"-"`
	DanoCritPct int    `json:"-"`
	EsquivaMil  int    `json:"-"`
	VidaMaxPct  int    `json:"-"`
	CuraPct     int    `json:"-"`
	OuroPct     int    `json:"-"`
	SortePct    int    `json:"-"`
}

// AltarRoguelite descreve um evento opcional de risco/recompensa encontrado entre andares.
type AltarRoguelite struct {
	ID         string `json:"id"`
	Nome       string `json:"nome"`
	Descricao  string `json:"descricao"`
	Custo      string `json:"custo"`
	Recompensa string `json:"recompensa"`
	SacrifPct  int    `json:"-"`
	CuraPct    int    `json:"-"`
	OuroPct    int    `json:"-"`
	BencaoID   string `json:"-"`
}

// HeroiRogueliteHP guarda o estado de vida de cada herói do esquadrão ao longo da incursão.
type HeroiRogueliteHP struct {
	Base       string `json:"base"`
	Nome       string `json:"nome"`
	Nivel      int    `json:"nivel"`
	Elemento   string `json:"elemento"`
	VidaAtual  int    `json:"vida_atual"`
	VidaMaxima int    `json:"vida_maxima"`
}

// SessaoRoguelite representa a incursão persistida e exibida na tela de Masmorras.
type SessaoRoguelite struct {
	Masmorra       Masmorra           `json:"masmorra"`
	Monstros       []MonstroRPG       `json:"monstros"`
	Esquadrao      []string           `json:"esquadrao"`
	AndarAtual     int                `json:"andar_atual"`
	TotalAndares   int                `json:"total_andares"`
	Herois         []HeroiRogueliteHP `json:"herois"`
	BencaosAtivas  []BencaoRoguelite  `json:"bencaos_ativas"`
	EscolhasBencao []BencaoRoguelite  `json:"escolhas_bencao"`
	AltarAtivo     *AltarRoguelite    `json:"altar_ativo,omitempty"`
	Vencidos       []string           `json:"vencidos"`
	OuroBonusPct   int                `json:"ouro_bonus_pct"`
	PodeAvancar    bool               `json:"pode_avancar"`
	PodeRecuar     bool               `json:"pode_recuar"`
}

// RespostaRoguelite é devolvida pelas ações de iniciar, escolher bênção, decidir altar, avançar ou recuar.
type RespostaRoguelite struct {
	Ativo       bool               `json:"ativo"`
	Finalizada  bool               `json:"finalizada"`
	Status      string             `json:"status"`
	Sessao      *SessaoRoguelite   `json:"sessao,omitempty"`
	UltimoAndar *AndarDaMasmorra   `json:"ultimo_andar,omitempty"`
	GrupoAndar  *ResultadoDoGrupo  `json:"grupo_andar,omitempty"`
	Recompensa  *RecompensaBatalha `json:"recompensa,omitempty"`
	Vida        *VidaRPG           `json:"vida,omitempty"`
	EventoTexto string             `json:"evento_texto,omitempty"`
}

var catalogoBencaosRoguelite = []BencaoRoguelite{
	{
		ID: "furia_carmesim", Nome: "Fúria Carmesim", Categoria: "ofensiva", Raridade: "rara",
		Descricao: "+18% de Ataque para todo o esquadrão até o fim da incursão.", AtaquePct: 18,
	},
	{
		ID: "muralha_ferro", Nome: "Bastião de Ferro", Categoria: "defensiva", Raridade: "comum",
		Descricao: "+20% de Defesa em todos os próximos andares.", DefesaPct: 20,
	},
	{
		ID: "chama_arcana", Nome: "Fluxo Arcano", Categoria: "arcana", Raridade: "rara",
		Descricao: "+22% de Magia e +12 de Éter máximo para habilidades.", MagiaPct: 22, EterExtra: 12,
	},
	{
		ID: "olho_aguia", Nome: "Olho da Águia", Categoria: "ofensiva", Raridade: "epica",
		Descricao: "+10% de chance de Crítico e +25% de Dano Crítico.", CriticoMil: 100, DanoCritPct: 25,
	},
	{
		ID: "passo_fantasma", Nome: "Passo Fantasma", Categoria: "tatica", Raridade: "comum",
		Descricao: "+8% de Esquiva contra os golpes e habilidades dos monstros.", EsquivaMil: 80,
	},
	{
		ID: "vigor_ancestral", Nome: "Vigor Ancestral", Categoria: "suporte", Raridade: "rara",
		Descricao: "Restaura 25% da Vida dos heróis ativos e soma +10% de Vida máxima.", VidaMaxPct: 10, CuraPct: 25,
	},
	{
		ID: "eco_sinergia", Nome: "Selo Elemental", Categoria: "ofensiva", Raridade: "epica",
		Descricao: "+14% Ataque e +14% Magia para acelerar Reações Elementais.", AtaquePct: 14, MagiaPct: 14,
	},
	{
		ID: "olhar_fortunado", Nome: "Olhar da Fortuna", Categoria: "tesouro", Raridade: "rara",
		Descricao: "+18% de Ouro bônus ao concluir e +12% de chance de item raro.", OuroPct: 18, SortePct: 12,
	},
}

// Bênçãos internas de altar não aparecem na rolagem comum de 1-de-3.
var bencaosDeAltar = map[string]BencaoRoguelite{
	"altar_sangue": {
		ID: "altar_sangue", Nome: "Pacto de Sangue", Categoria: "altar", Raridade: "lendaria",
		Descricao: "+25% Ataque e +30% Ouro bônus concedidos pelo Altar do Sangue.", AtaquePct: 25, OuroPct: 30,
	},
	"altar_sobrecarga": {
		ID: "altar_sobrecarga", Nome: "Sobrecarga Etérea", Categoria: "altar", Raridade: "lendaria",
		Descricao: "+30% Magia e +15% Crítico concedidos pelo Altar da Sobrecarga.", MagiaPct: 30, CriticoMil: 150,
	},
}

var catalogoAltaresRoguelite = []AltarRoguelite{
	{
		ID: "altar_sangue", Nome: "Altar do Sangue",
		Descricao:  "Uma lâmina antiga pede parte da vitalidade do esquadrão em troca de poder bruto.",
		Custo:      "Consome 20% da Vida atual dos heróis ativos (sem derrubá-los).",
		Recompensa: "Concede +25% de Ataque e +30% de Ouro bônus até o fim da incursão.",
		SacrifPct:  20, OuroPct: 30, BencaoID: "altar_sangue",
	},
	{
		ID: "fonte_vida", Nome: "Fonte da Serenidade",
		Descricao:  "Águas luminosas brotam entre as ruínas, restaurando o fôlego dos combatentes.",
		Custo:      "Nenhum custo.",
		Recompensa: "Cura 35% da Vida máxima de todos os heróis que seguem de pé.",
		CuraPct:    35,
	},
	{
		ID: "altar_sobrecarga", Nome: "Altar da Sobrecarga",
		Descricao:  "Runas instáveis canalizam Éter concentrado para os golpes críticos.",
		Custo:      "Consome 15% da Vida atual dos heróis ativos.",
		Recompensa: "Concede +30% de Magia e +15% de Crítico até o fim da incursão.",
		SacrifPct:  15, BencaoID: "altar_sobrecarga",
	},
}

func bencaoRoguelitePorID(id string) (BencaoRoguelite, bool) {
	for _, b := range catalogoBencaosRoguelite {
		if b.ID == id {
			return b, true
		}
	}
	if b, ok := bencaosDeAltar[id]; ok {
		return b, true
	}
	return BencaoRoguelite{}, false
}

func altarRoguelitePorID(id string) (AltarRoguelite, bool) {
	for _, a := range catalogoAltaresRoguelite {
		if a.ID == id {
			return a, true
		}
	}
	return AltarRoguelite{}, false
}

// SortearBencoesRoguelite escolhe até 3 bênçãos distintas do catálogo.
func SortearBencoesRoguelite(rng *rand.Rand) []string {
	pool := make([]string, 0, len(catalogoBencaosRoguelite))
	for _, b := range catalogoBencaosRoguelite {
		pool = append(pool, b.ID)
	}
	rng.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	if len(pool) > 3 {
		pool = pool[:3]
	}
	return pool
}

func sortearAltarRoguelite(rng *rand.Rand) string {
	return catalogoAltaresRoguelite[rng.Intn(len(catalogoAltaresRoguelite))].ID
}

// aplicarBencaosNosHerois soma os modificadores percentuais acumulados em cada herói ativo.
func aplicarBencaosNosHerois(herois []CombatenteRPG, bencaosIDs []string) ([]CombatenteRPG, int, int) {
	var atkPct, defPct, magPct, eterExtra, critMil, danoCritPct, esqMil, vidaMaxPct, ouroPct, sortePct int
	for _, id := range bencaosIDs {
		b, ok := bencaoRoguelitePorID(id)
		if !ok {
			continue
		}
		atkPct += b.AtaquePct
		defPct += b.DefesaPct
		magPct += b.MagiaPct
		eterExtra += b.EterExtra
		critMil += b.CriticoMil
		danoCritPct += b.DanoCritPct
		esqMil += b.EsquivaMil
		vidaMaxPct += b.VidaMaxPct
		ouroPct += b.OuroPct
		sortePct += b.SortePct
	}
	ajustados := make([]CombatenteRPG, len(herois))
	for i, c := range herois {
		a := c.Atributos
		a.Vida = max(1, a.Vida*(100+vidaMaxPct)/100)
		a.Ataque = max(1, a.Ataque*(100+atkPct)/100)
		a.Defesa = a.Defesa * (100 + defPct) / 100
		a.Magia = a.Magia * (100 + magPct) / 100
		a.Eter = a.Eter + eterExtra
		a.CriticoPorMil = min(850, a.CriticoPorMil+critMil)
		a.DanoCritico = a.DanoCritico + danoCritPct
		a.EsquivaPorMil = min(650, a.EsquivaPorMil+esqMil)
		a.SorteItem = a.SorteItem + sortePct
		a.Poder = CalcularPoder(a)
		c.Atributos = a
		if c.VidaInicial > a.Vida {
			c.VidaInicial = a.Vida
		}
		ajustados[i] = c
	}
	return ajustados, ouroPct, sortePct
}

// simularAndarRoguelite resolve exatamente um andar para 1 herói ou esquadrão de 2–3 heróis.
func simularAndarRoguelite(
	herois []CombatenteRPG,
	fora []bool,
	fichas []FichaDeGrupo,
	monstro MonstroRPG,
	rng *rand.Rand,
) (AndarDaMasmorra, *ResultadoDoGrupo, []int, map[string]int, bool) {
	usos := map[string]int{}
	vidasFinais := make([]int, len(herois))

	if len(herois) <= 1 {
		r := SimularBatalha(herois[0], monstro, rng)
		vidasFinais[0] = r.VidaFinal
		for id, n := range r.Usos {
			usos[id] += n
		}
		andar := AndarDaMasmorra{Monstro: monstro, Resultado: r}
		return andar, nil, vidasFinais, usos, r.Venceu
	}

	monstroGrupo := EquilibrarMonstroParaGrupo(monstro, herois)
	rg := simularGrupo(herois, fora, monstroGrupo, rng)
	heroisRes := make([]HeroiDoResultado, 0, len(fichas))
	for i, f := range fichas {
		heroisRes = append(heroisRes, HeroiDoResultado{Nome: f.Nome, Personagem: f.Personagem, Nivel: f.Nivel})
		vidasFinais[i] = rg.Herois[i].VidaFinal
		for id, n := range rg.Herois[i].Usos {
			usos[id] += n
		}
	}
	andar := AndarDaMasmorra{
		Monstro: monstroGrupo,
		Resultado: ResultadoSimulado{
			Venceu:      rg.Venceu,
			Rodadas:     rg.Rodadas,
			Turnos:      rg.Turnos,
			VidaInicial: rg.Herois[0].VidaInicial,
			VidaFinal:   rg.Herois[0].VidaFinal,
			Caiu:        rg.Herois[0].Caiu,
		},
	}
	grupoRes := &ResultadoDoGrupo{
		Modo: "na_hora", Herois: heroisRes, Monstro: &monstroGrupo, Luta: &rg, Venceu: rg.Venceu,
	}
	return andar, grupoRes, vidasFinais, usos, rg.Venceu
}

type linhaSessaoRoguelite struct {
	UserID         string             `json:"user_id"`
	MasmorraID     string             `json:"masmorra_id"`
	Esquadrao      []string           `json:"esquadrao"`
	AndarAtual     int                `json:"andar_atual"`
	TotalAndares   int                `json:"total_andares"`
	HeroisHP       []HeroiRogueliteHP `json:"herois_hp"`
	Bencaos        []string           `json:"bencaos"`
	EscolhasBencao []string           `json:"escolhas_bencao"`
	AltarAtivo     *string            `json:"altar_ativo"`
	Vencidos       []string           `json:"vencidos"`
	Usos           map[string]int     `json:"usos"`
	OuroBonusPct   int                `json:"ouro_bonus_pct"`
	Status         string             `json:"status"`
}

func lerSessaoRogueliteDB(dbClient *supabase.Client, userID string) (*linhaSessaoRoguelite, bool) {
	dados, _, err := dbClient.From("rpg_masmorra_sessoes").
		Select("*", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		return nil, false
	}
	var linhas []linhaSessaoRoguelite
	if json.Unmarshal(dados, &linhas) != nil || len(linhas) == 0 {
		return nil, false
	}
	return &linhas[0], true
}

func salvarSessaoRogueliteDB(servico *supabase.Client, s linhaSessaoRoguelite) error {
	altar := ""
	if s.AltarAtivo != nil {
		altar = *s.AltarAtivo
	}
	if s.Esquadrao == nil {
		s.Esquadrao = []string{}
	}
	if s.Bencaos == nil {
		s.Bencaos = []string{}
	}
	if s.EscolhasBencao == nil {
		s.EscolhasBencao = []string{}
	}
	if s.Vencidos == nil {
		s.Vencidos = []string{}
	}
	if s.Usos == nil {
		s.Usos = map[string]int{}
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_roguelite_salvar", "", map[string]interface{}{
		"p_user_id":         s.UserID,
		"p_masmorra_id":     s.MasmorraID,
		"p_esquadrao":       s.Esquadrao,
		"p_andar_atual":     s.AndarAtual,
		"p_total_andares":   s.TotalAndares,
		"p_herois_hp":       s.HeroisHP,
		"p_bencaos":         s.Bencaos,
		"p_escolhas_bencao": s.EscolhasBencao,
		"p_altar_ativo":     altar,
		"p_vencidos":        s.Vencidos,
		"p_usos":            s.Usos,
		"p_ouro_bonus_pct":  s.OuroBonusPct,
		"p_status":          s.Status,
	}))
	if !strings.Contains(bruto, `"ok"`) {
		return errRoguelitePersistencia(bruto)
	}
	return nil
}

type erroPersistencia string

func (e erroPersistencia) Error() string { return string(e) }

func errRoguelitePersistencia(bruto string) error {
	if bruto == "" {
		return erroPersistencia("vazio")
	}
	return erroPersistencia(bruto)
}

func limparSessaoRogueliteDB(servico *supabase.Client, userID string) {
	servico.Rpc("rpg_roguelite_limpar", "", map[string]interface{}{"p_user_id": userID})
}

func montarSessaoPublica(s linhaSessaoRoguelite, masmorra Masmorra, monstros []MonstroRPG) *SessaoRoguelite {
	bencaosAtivas := make([]BencaoRoguelite, 0, len(s.Bencaos))
	for _, id := range s.Bencaos {
		if b, ok := bencaoRoguelitePorID(id); ok {
			bencaosAtivas = append(bencaosAtivas, b)
		}
	}
	escolhas := make([]BencaoRoguelite, 0, len(s.EscolhasBencao))
	for _, id := range s.EscolhasBencao {
		if b, ok := bencaoRoguelitePorID(id); ok {
			escolhas = append(escolhas, b)
		}
	}
	var altarPtr *AltarRoguelite
	if s.AltarAtivo != nil && *s.AltarAtivo != "" {
		if a, ok := altarRoguelitePorID(*s.AltarAtivo); ok {
			copia := a
			altarPtr = &copia
		}
	}
	pendencias := len(escolhas) > 0 || altarPtr != nil
	return &SessaoRoguelite{
		Masmorra:       masmorra,
		Monstros:       monstros,
		Esquadrao:      s.Esquadrao,
		AndarAtual:     s.AndarAtual,
		TotalAndares:   s.TotalAndares,
		Herois:         s.HeroisHP,
		BencaosAtivas:  bencaosAtivas,
		EscolhasBencao: escolhas,
		AltarAtivo:     altarPtr,
		Vencidos:       s.Vencidos,
		OuroBonusPct:   s.OuroBonusPct,
		PodeAvancar:    !pendencias && s.AndarAtual < len(monstros),
		PodeRecuar:     s.AndarAtual >= 1,
	}
}

// HandleGetRoguelite devolve a incursão Roguelite ativa do jogador, se existir.
func (h *RPGHandler) HandleGetRoguelite(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	linha, existe := lerSessaoRogueliteDB(sessao.dbClient, sessao.userID)
	if !existe || linha.Status != "ativa" {
		responderJSON(w, http.StatusOK, RespostaRoguelite{Ativo: false, Status: "nenhuma"})
		return
	}
	masmorra, okM := masmorraPorID(linha.MasmorraID)
	if !okM {
		responderJSON(w, http.StatusOK, RespostaRoguelite{Ativo: false, Status: "nenhuma"})
		return
	}
	catalogo, err := lerMonstros(sessao.dbClient)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	monstros, okMon := monstrosDosAndares(masmorra, catalogo)
	if !okMon {
		responderJSON(w, http.StatusOK, RespostaRoguelite{Ativo: false, Status: "nenhuma"})
		return
	}
	responderJSON(w, http.StatusOK, RespostaRoguelite{
		Ativo:  true,
		Status: "ativa",
		Sessao: montarSessaoPublica(*linha, masmorra, monstros),
	})
}

// HandleIniciarRoguelite inicia a incursão Roguelite resolvendo o 1º andar e oferecendo 1 de 3 bênçãos.
func (h *RPGHandler) HandleIniciarRoguelite(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		MasmorraID string   `json:"masmorra_id"`
		Esquadrao  []string `json:"esquadrao"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&corpo) != nil {
		corpo.MasmorraID = ""
	}
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	masmorra, existe := masmorraPorID(strings.TrimSpace(corpo.MasmorraID))
	if !existe {
		responderErroJSON(w, http.StatusBadRequest, "Escolha uma masmorra.")
		return
	}
	if sessao.nivel < masmorra.NivelMinimo {
		responderErroJSON(w, http.StatusForbidden, "Seu nível ainda não alcança esta masmorra.")
		return
	}
	if existente, achou := lerSessaoRogueliteDB(sessao.dbClient, sessao.userID); achou && existente.Status == "ativa" {
		responderErroJSON(w, http.StatusConflict, "Você já possui uma incursão Roguelite em andamento. Conclua ou recue antes de iniciar outra.")
		return
	}
	if masmorraFeitaHoje(sessao) != "" {
		responderErroJSON(w, http.StatusTooManyRequests, "Você já entrou numa masmorra hoje. Compre uma entrada extra ou volte amanhã.")
		return
	}

	var (
		equipamento       EstadoEquipamento
		catalogo          []MonstroRPG
		hoje              HojeRPG
		passiva           *PassivaEspecialidade
		errEq, errM, errH error
		wg                sync.WaitGroup
	)
	wg.Add(4)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
	go func() { defer wg.Done(); _, passiva = carregarEspecialidadeDoUsuario(sessao.dbClient) }()
	wg.Wait()
	if errEq != nil || errM != nil || errH != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	monstros, okMon := monstrosDosAndares(masmorra, catalogo)
	if !okMon || len(monstros) == 0 {
		responderErroJSON(w, http.StatusConflict, "Esta masmorra está fechada no momento.")
		return
	}
	vida := MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida)
	if !PodeLutar(vida.PerdidaPorMil, hoje.Regras) {
		responderErroJSON(w, http.StatusConflict, "Seu personagem precisa de pelo menos 30% de Vida para entrar. Descanse, assista a um episódio ou use a Pousada.")
		return
	}

	combatentes, fichas, errEsq := MontarEsquadraoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx, hoje.VidaPerdida, passiva, "", corpo.Esquadrao)
	if errEsq != nil {
		responderErroJSON(w, http.StatusBadRequest, errEsq.Error())
		return
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}

	custoMana := CustoDeMana(LutaMasmorra, sessao.nivel, lerRegrasComunidade(sessao.dbClient))
	cobrou, okMana := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
	if !okMana {
		return
	}

	rng := novoGeradorDeBatalha()
	andarRes, grupoRes, vidasFinais, usos, venceu := simularAndarRoguelite(combatentes, nil, fichas, monstros[0], rng)

	heroisHP := make([]HeroiRogueliteHP, 0, len(fichas))
	esquadraoSalvo := make([]string, 0, len(fichas))
	for i, f := range fichas {
		heroisHP = append(heroisHP, HeroiRogueliteHP{
			Base:       f.Personagem,
			Nome:       f.Nome,
			Nivel:      f.Nivel,
			Elemento:   f.Elemento,
			VidaAtual:  vidasFinais[i],
			VidaMaxima: combatentes[i].Atributos.Vida,
		})
		if i > 0 {
			esquadraoSalvo = append(esquadraoSalvo, f.Personagem)
		}
	}

	vencidos := []string{}
	if venceu {
		vencidos = []string{monstros[0].ID}
	}

	// Derrota no 1º andar ou masmorra de 1 andar só finaliza imediatamente.
	if !venceu || len(monstros) == 1 {
		resp, errFim := h.finalizarRoguelite(w, servico, sessao, rng, equipamento, masmorra, monstros, esquadraoSalvo, heroisHP, nil, vencidos, usos, 0, venceu, !venceu, &andarRes, grupoRes)
		if errFim != nil {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			return
		}
		responderJSON(w, http.StatusOK, resp)
		return
	}

	escolhas := SortearBencoesRoguelite(rng)
	linha := linhaSessaoRoguelite{
		UserID:         sessao.userID,
		MasmorraID:     masmorra.ID,
		Esquadrao:      esquadraoSalvo,
		AndarAtual:     1,
		TotalAndares:   len(monstros),
		HeroisHP:       heroisHP,
		Bencaos:        []string{},
		EscolhasBencao: escolhas,
		Vencidos:       vencidos,
		Usos:           usos,
		OuroBonusPct:   0,
		Status:         "ativa",
	}
	if errSal := salvarSessaoRogueliteDB(servico, linha); errSal != nil {
		log.Printf("[RPG] Falha ao salvar sessao roguelite (user=%s): %v", sessao.userID, errSal)
		devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
		responderErroJSON(w, http.StatusServiceUnavailable, "Incursão Roguelite indisponível no momento.")
		return
	}

	responderJSON(w, http.StatusOK, RespostaRoguelite{
		Ativo:       true,
		Finalizada:  false,
		Status:      "ativa",
		Sessao:      montarSessaoPublica(linha, masmorra, monstros),
		UltimoAndar: &andarRes,
		GrupoAndar:  grupoRes,
		EventoTexto: "1º andar vencido! Escolha 1 bênção antes de decidir o próximo passo.",
	})
}

// HandleAgirRoguelite executa a decisão do jogador: escolher bênção, decidir altar, avançar ou recuar.
func (h *RPGHandler) HandleAgirRoguelite(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Acao    string `json:"acao"`
		Escolha string `json:"escolha"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Informe a ação desejada na incursão.")
		return
	}
	corpo.Acao = strings.TrimSpace(corpo.Acao)
	corpo.Escolha = strings.TrimSpace(corpo.Escolha)

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	linha, existe := lerSessaoRogueliteDB(sessao.dbClient, sessao.userID)
	if !existe || linha.Status != "ativa" {
		responderErroJSON(w, http.StatusNotFound, "Nenhuma incursão Roguelite ativa no momento.")
		return
	}
	masmorra, okM := masmorraPorID(linha.MasmorraID)
	if !okM {
		responderErroJSON(w, http.StatusBadRequest, "Masmorra da incursão não encontrada.")
		return
	}

	var (
		equipamento EstadoEquipamento
		catalogo    []MonstroRPG
		passiva     *PassivaEspecialidade
		errEq, errM error
		wg          sync.WaitGroup
	)
	wg.Add(3)
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); _, passiva = carregarEspecialidadeDoUsuario(sessao.dbClient) }()
	wg.Wait()
	if errEq != nil || errM != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	monstros, okMon := monstrosDosAndares(masmorra, catalogo)
	if !okMon || len(monstros) == 0 {
		responderErroJSON(w, http.StatusConflict, "Esta masmorra está fechada no momento.")
		return
	}
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Masmorras indisponíveis no momento.")
		return
	}
	rng := novoGeradorDeBatalha()

	switch corpo.Acao {
	case "bencao":
		if len(linha.EscolhasBencao) == 0 {
			responderErroJSON(w, http.StatusBadRequest, "Nenhuma bênção disponível para escolher agora.")
			return
		}
		escolhida := ""
		for _, op := range linha.EscolhasBencao {
			if op == corpo.Escolha {
				escolhida = op
				break
			}
		}
		if escolhida == "" {
			responderErroJSON(w, http.StatusBadRequest, "Escolha uma das bênçãos oferecidas.")
			return
		}
		linha.Bencaos = append(linha.Bencaos, escolhida)
		linha.EscolhasBencao = []string{}
		msg := "Bênção ativada para o restante da masmorra."
		if b, okB := bencaoRoguelitePorID(escolhida); okB {
			msg = "Bênção " + b.Nome + " ativada!"
			if b.OuroPct > 0 {
				linha.OuroBonusPct = min(100, linha.OuroBonusPct+b.OuroPct)
			}
			if b.CuraPct > 0 || b.VidaMaxPct > 0 {
				for i := range linha.HeroisHP {
					if b.VidaMaxPct > 0 {
						linha.HeroisHP[i].VidaMaxima = max(1, linha.HeroisHP[i].VidaMaxima*(100+b.VidaMaxPct)/100)
					}
					if linha.HeroisHP[i].VidaAtual > 0 && b.CuraPct > 0 {
						cura := max(1, linha.HeroisHP[i].VidaMaxima*b.CuraPct/100)
						linha.HeroisHP[i].VidaAtual = min(linha.HeroisHP[i].VidaMaxima, linha.HeroisHP[i].VidaAtual+cura)
					}
				}
			}
		}
		// Altares aparecem após o 2º andar (e a cada 2 andares vencidos) quando ainda restam combates.
		if linha.AndarAtual >= 2 && linha.AndarAtual%2 == 0 && linha.AndarAtual < len(monstros) {
			altarID := sortearAltarRoguelite(rng)
			linha.AltarAtivo = &altarID
			msg += " Um altar antigo surgiu à frente."
		}
		if err := salvarSessaoRogueliteDB(servico, *linha); err != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível salvar a bênção agora.")
			return
		}
		responderJSON(w, http.StatusOK, RespostaRoguelite{
			Ativo:       true,
			Status:      "ativa",
			Sessao:      montarSessaoPublica(*linha, masmorra, monstros),
			EventoTexto: msg,
		})

	case "altar":
		if linha.AltarAtivo == nil || *linha.AltarAtivo == "" {
			responderErroJSON(w, http.StatusBadRequest, "Nenhum altar ativo neste andar.")
			return
		}
		altar, okA := altarRoguelitePorID(*linha.AltarAtivo)
		if !okA {
			linha.AltarAtivo = nil
		}
		msg := "Você ignorou o altar e manteve o esquadrão intacto."
		if corpo.Escolha == "aceitar" && okA {
			if altar.SacrifPct > 0 {
				for i := range linha.HeroisHP {
					if linha.HeroisHP[i].VidaAtual > 1 {
						custo := max(1, linha.HeroisHP[i].VidaAtual*altar.SacrifPct/100)
						linha.HeroisHP[i].VidaAtual = max(1, linha.HeroisHP[i].VidaAtual-custo)
					}
				}
			}
			if altar.CuraPct > 0 {
				for i := range linha.HeroisHP {
					if linha.HeroisHP[i].VidaAtual > 0 {
						cura := max(1, linha.HeroisHP[i].VidaMaxima*altar.CuraPct/100)
						linha.HeroisHP[i].VidaAtual = min(linha.HeroisHP[i].VidaMaxima, linha.HeroisHP[i].VidaAtual+cura)
					}
				}
			}
			if altar.OuroPct > 0 {
				linha.OuroBonusPct = min(100, linha.OuroBonusPct+altar.OuroPct)
			}
			if altar.BencaoID != "" {
				linha.Bencaos = append(linha.Bencaos, altar.BencaoID)
			}
			msg = altar.Nome + " consagrado! Os efeitos foram aplicados ao esquadrão."
		} else if corpo.Escolha != "ignorar" {
			responderErroJSON(w, http.StatusBadRequest, "Escolha aceitar ou ignorar o altar.")
			return
		}
		linha.AltarAtivo = nil
		if err := salvarSessaoRogueliteDB(servico, *linha); err != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível atualizar o altar agora.")
			return
		}
		responderJSON(w, http.StatusOK, RespostaRoguelite{
			Ativo:       true,
			Status:      "ativa",
			Sessao:      montarSessaoPublica(*linha, masmorra, monstros),
			EventoTexto: msg,
		})

	case "recuar":
		if linha.AndarAtual < 1 {
			responderErroJSON(w, http.StatusBadRequest, "Vença ao menos um andar antes de recuar com os espólios.")
			return
		}
		resp, errFim := h.finalizarRoguelite(
			w, servico, sessao, rng, equipamento, masmorra, monstros,
			linha.Esquadrao, linha.HeroisHP, linha.Bencaos, linha.Vencidos, linha.Usos,
			0, false, false, nil, nil,
		)
		if errFim != nil {
			return
		}
		resp.Status = "recuou"
		resp.EventoTexto = "Você recuou estrategicamente com todo o Ouro, Bilhetes e Materiais conquistados até aqui."
		responderJSON(w, http.StatusOK, resp)

	case "avancar":
		if len(linha.EscolhasBencao) > 0 {
			responderErroJSON(w, http.StatusBadRequest, "Escolha uma das bênçãos antes de avançar para o próximo andar.")
			return
		}
		if linha.AltarAtivo != nil && *linha.AltarAtivo != "" {
			responderErroJSON(w, http.StatusBadRequest, "Decida o altar antes de avançar para o próximo andar.")
			return
		}
		if linha.AndarAtual >= len(monstros) {
			responderErroJSON(w, http.StatusBadRequest, "Todos os andares desta masmorra já foram superados.")
			return
		}

		// Reconstrói combatentes com equipamento atual, vidas persistidas e bênçãos acumuladas.
		combatentesBase, fichas, errEsq := MontarEsquadraoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx, 0, passiva, "", linha.Esquadrao)
		if errEsq != nil {
			responderErroJSON(w, http.StatusBadRequest, errEsq.Error())
			return
		}
		fora := make([]bool, len(combatentesBase))
		for i := range combatentesBase {
			if i < len(linha.HeroisHP) {
				if linha.HeroisHP[i].VidaAtual <= 0 {
					fora[i] = true
					combatentesBase[i].VidaInicial = 0
				} else {
					combatentesBase[i].VidaInicial = linha.HeroisHP[i].VidaAtual
				}
			}
		}
		combatentes, bonusOuroBencaos, sorteExtra := aplicarBencaosNosHerois(combatentesBase, linha.Bencaos)
		if bonusOuroBencaos > linha.OuroBonusPct {
			linha.OuroBonusPct = min(100, bonusOuroBencaos)
		}

		monstroAndar := monstros[linha.AndarAtual]
		andarRes, grupoRes, vidasFinais, usosAndar, venceu := simularAndarRoguelite(combatentes, fora, fichas, monstroAndar, rng)
		for i := range combatentes {
			if i < len(linha.HeroisHP) {
				linha.HeroisHP[i].VidaAtual = vidasFinais[i]
				linha.HeroisHP[i].VidaMaxima = combatentes[i].Atributos.Vida
			}
		}
		if linha.Usos == nil {
			linha.Usos = map[string]int{}
		}
		for id, n := range usosAndar {
			linha.Usos[id] += n
		}
		if venceu {
			linha.Vencidos = append(linha.Vencidos, monstroAndar.ID)
			linha.AndarAtual++
		}

		completou := venceu && linha.AndarAtual >= len(monstros)
		if !venceu || completou {
			resp, errFim := h.finalizarRoguelite(
				w, servico, sessao, rng, equipamento, masmorra, monstros,
				linha.Esquadrao, linha.HeroisHP, linha.Bencaos, linha.Vencidos, linha.Usos,
				sorteExtra, completou, !venceu, &andarRes, grupoRes,
			)
			if errFim != nil {
				return
			}
			responderJSON(w, http.StatusOK, resp)
			return
		}

		linha.EscolhasBencao = SortearBencoesRoguelite(rng)
		if err := salvarSessaoRogueliteDB(servico, *linha); err != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível salvar o progresso do andar.")
			return
		}
		responderJSON(w, http.StatusOK, RespostaRoguelite{
			Ativo:       true,
			Finalizada:  false,
			Status:      "ativa",
			Sessao:      montarSessaoPublica(*linha, masmorra, monstros),
			UltimoAndar: &andarRes,
			GrupoAndar:  grupoRes,
			EventoTexto: "Andar concluído! Escolha sua próxima bênção ou recue quando estiver pronto.",
		})

	default:
		responderErroJSON(w, http.StatusBadRequest, "Ação inválida na incursão Roguelite.")
	}
}

func (h *RPGHandler) finalizarRoguelite(
	w http.ResponseWriter,
	servico *supabase.Client,
	sessao sessaoRPG,
	rng *rand.Rand,
	equipamento EstadoEquipamento,
	masmorra Masmorra,
	monstros []MonstroRPG,
	esquadrao []string,
	heroisHP []HeroiRogueliteHP,
	bencaos []string,
	vencidos []string,
	usos map[string]int,
	sorteExtra int,
	completou bool,
	caiu bool,
	ultimoAndar *AndarDaMasmorra,
	grupoAndar *ResultadoDoGrupo,
) (RespostaRoguelite, error) {
	var itemSorteado *ItemRPG
	if completou && len(monstros) > 0 {
		ultimo := monstros[len(monstros)-1]
		candidatos := lerItensDaRaridade(sessao.dbClient, ultimo.RaridadeItem)
		ids := make([]string, 0, len(candidatos))
		for _, c := range candidatos {
			ids = append(ids, c.ID)
		}
		chance := ultimo.ChanceItem + chanceExtraBauMasmorra + equipamento.Atributos.SorteItem + sorteExtra
		if id := EscolherItemDaRecompensa(rng, chance, ids); id != "" {
			for i := range candidatos {
				if candidatos[i].ID == id {
					itemSorteado = &candidatos[i]
				}
			}
		}
	}
	itemID := ""
	if itemSorteado != nil {
		itemID = itemSorteado.ID
	}

	vidaFinalLider := 0
	vidaMaxLider := equipamento.Atributos.Vida
	if len(heroisHP) > 0 {
		vidaFinalLider = heroisHP[0].VidaAtual
		if heroisHP[0].VidaMaxima > 0 {
			vidaMaxLider = heroisHP[0].VidaMaxima
		}
	}

	ouroBonusTotal := 0
	if completou {
		ouroBonusTotal = bonusOuroMasmorraCompleta
		for _, id := range bencaos {
			if b, ok := bencaoRoguelitePorID(id); ok {
				ouroBonusTotal += b.OuroPct
			}
		}
		ouroBonusTotal = min(100, ouroBonusTotal)
	}

	if vencidos == nil {
		vencidos = []string{}
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_concluir_masmorra", "", map[string]interface{}{
		"p_user_id":      sessao.userID,
		"p_masmorra_id":  masmorra.ID,
		"p_vencidos":     vencidos,
		"p_completou":    completou,
		"p_caiu":         caiu,
		"p_bonus_pct":    ouroBonusTotal,
		"p_item_id":      itemID,
		"p_vida_perdida": PerdaPorMil(vidaMaxLider, vidaFinalLider),
	}))
	var registro struct {
		Ok          bool    `json:"ok"`
		Erro        string  `json:"erro"`
		JaFeita     bool    `json:"ja_feita"`
		SemVida     bool    `json:"sem_vida"`
		Ouro        int     `json:"ouro_ganho"`
		OuroPerdido int     `json:"ouro_perdido"`
		Bilhetes    int     `json:"bilhetes_ganhos"`
		ItemID      *string `json:"item_id"`
		VidaPerdida int     `json:"vida_perdida"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao concluir roguelite (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível concluir a incursão agora.")
		return RespostaRoguelite{}, erroPersistencia("rpc_falhou")
	}
	if registro.Erro != "" {
		status := http.StatusBadRequest
		switch {
		case registro.JaFeita:
			status = http.StatusTooManyRequests
		case registro.SemVida:
			status = http.StatusConflict
		}
		limparSessaoRogueliteDB(servico, sessao.userID)
		responderErroJSON(w, status, registro.Erro)
		return RespostaRoguelite{}, erroPersistencia(registro.Erro)
	}

	if len(usos) > 0 {
		if b := strings.TrimSpace(servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{
			"p_user_id": sessao.userID, "p_usos": usos,
		})); !strings.Contains(b, `"ok"`) {
			log.Printf("[RPG] Falha ao registrar maestria no roguelite (user=%s): %s", sessao.userID, b)
		}
	}

	limparSessaoRogueliteDB(servico, sessao.userID)

	recompensa := RecompensaBatalha{Bilhetes: registro.Bilhetes, Ouro: registro.Ouro, OuroPerdido: registro.OuroPerdido}
	if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
		recompensa.Item = itemSorteado
	}
	recompensa.Materiais = entregarMateriais(servico, sessao.userID, SortearMateriaisDaMasmorra(rng, completou))

	statusFinal := "vitoria"
	evento := "Masmorra concluída! Todos os espólios e bênçãos renderam recompensa máxima."
	if caiu {
		statusFinal = "derrota"
		evento = "O esquadrão caiu antes de sair. Parte do Ouro carregado ficou para trás."
	} else if !completou {
		statusFinal = "recuou"
	}

	vidaFinal := MontarVida(equipamento.Atributos.Vida, registro.VidaPerdida)
	sessaoResumo := &SessaoRoguelite{
		Masmorra:     masmorra,
		Monstros:     monstros,
		Esquadrao:    esquadrao,
		AndarAtual:   len(vencidos),
		TotalAndares: len(monstros),
		Herois:       heroisHP,
		Vencidos:     vencidos,
		OuroBonusPct: ouroBonusTotal,
	}
	return RespostaRoguelite{
		Ativo:       false,
		Finalizada:  true,
		Status:      statusFinal,
		Sessao:      sessaoResumo,
		UltimoAndar: ultimoAndar,
		GrupoAndar:  grupoAndar,
		Recompensa:  &recompensa,
		Vida:        &vidaFinal,
		EventoTexto: evento,
	}, nil
}
