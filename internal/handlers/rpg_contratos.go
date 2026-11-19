// internal/handlers/rpg_contratos.go
// Contratos semanais de caça: objetivos da semana em Brasília com resgate atômico de Ouro,
// bilhetes e materiais da Forja via rpg_resgatar_contrato (sql/125).
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

// ContratoSemanal descreve um contrato semanal exibido na Guilda e nas Expedições.
type ContratoSemanal struct {
	ID         string         `json:"id"`
	Titulo     string         `json:"titulo"`
	Descricao  string         `json:"descricao"`
	Regiao     string         `json:"regiao,omitempty"`
	RegiaoNome string         `json:"regiao_nome,omitempty"`
	Progresso  int            `json:"progresso"`
	Meta       int            `json:"meta"`
	Ouro       int            `json:"ouro"`
	Bilhetes   int            `json:"bilhetes"`
	Materiais  map[string]int `json:"materiais,omitempty"`
	Concluido  bool           `json:"concluido"`
	Resgatado  bool           `json:"resgatado"`
}

// RespostaContratosRPG é o corpo de GET /api/rpg/contratos.
type RespostaContratosRPG struct {
	Semana    string            `json:"semana"`
	ExpiraEm  string            `json:"expira_em"`
	Contratos []ContratoSemanal `json:"contratos"`
}

// RespostaResgatarContrato é o corpo de POST /api/rpg/contratos/resgatar.
type RespostaResgatarContrato struct {
	ContratoID string         `json:"contrato_id"`
	OuroGanho  int            `json:"ouro_ganho"`
	Bilhetes   int            `json:"bilhetes_ganhos"`
	Materiais  map[string]int `json:"materiais,omitempty"`
	OuroTotal  int            `json:"ouro"`
	BilhetesTotal int         `json:"bilhetes"`
	Estado     RespostaContratosRPG `json:"estado"`
}

var materialPorRegiao = map[string]string{
	"clareira_inicial": materialGarra,
	"bosque_sombrio":   materialSilvest,
	"forja_vulcanica":  materialFogo,
	"mares_e_geada":    materialGelo,
	"ruinas_do_vazio":  materialVazio,
	"santuario_astral": materialLuz,
	"cume_ancestral":   materialNucleo,
}

type batalhaContratoRow struct {
	MonstroID string `json:"monstro_id"`
}

type masmorraContratoRow struct {
	Completou bool `json:"completou"`
}

func regioesElegiveisParaNivel(nivel int) []RegiaoMapa {
	catalogo := CatalogoRegioes()
	elegiveis := make([]RegiaoMapa, 0, len(catalogo))
	for _, r := range catalogo {
		incluir := false
		switch r.ID {
		case "clareira_inicial":
			incluir = true
		case "bosque_sombrio":
			incluir = nivel >= 8
		case "forja_vulcanica", "mares_e_geada", "ruinas_do_vazio":
			incluir = nivel >= 12
		case "santuario_astral":
			incluir = nivel >= 35
		case "cume_ancestral":
			incluir = nivel >= 45
		}
		if incluir {
			elegiveis = append(elegiveis, r)
		}
	}
	if len(elegiveis) == 0 && len(catalogo) > 0 {
		elegiveis = append(elegiveis, catalogo[0])
	}
	return elegiveis
}

// montarContratosSemanais calcula os 3 contratos semanais de forma pura e determinística.
func montarContratosSemanais(
	nivel int,
	agora time.Time,
	batalhas []batalhaContratoRow,
	masmorras []masmorraContratoRow,
	resgatados map[string]bool,
) RespostaContratosRPG {
	nv := max(1, nivel)
	inicio := inicioDaSemanaBrasilia(agora)
	inicioLocal := inicio.In(fusoGuilda)
	semanaChave := inicioLocal.Format("2006-01-02")
	expiraEm := inicioLocal.AddDate(0, 0, 6).Format("2006-01-02")

	idx := indiceDaSemana(agora)
	if idx < 0 {
		idx = -idx
	}
	elegiveis := regioesElegiveisParaNivel(nv)
	regiaoAlvo := elegiveis[idx%len(elegiveis)]

	vitoriasTotais := len(batalhas)
	vitoriasNaRegiao := 0
	for _, b := range batalhas {
		regID, _ := RegiaoDoMonstroID(b.MonstroID)
		if regID == regiaoAlvo.ID {
			vitoriasNaRegiao++
		}
	}
	masmorrasCompletas := 0
	for _, m := range masmorras {
		if m.Completou {
			masmorrasCompletas++
		}
	}

	matRegiao := materialPorRegiao[regiaoAlvo.ID]
	if matRegiao == "" {
		matRegiao = materialGarra
	}

	contratoRegiaoID := "caca_regiao_" + regiaoAlvo.ID
	ouroRegiao := min(2000, 60+nv*2)
	ouroMasmorra := min(2000, 80+nv*3)
	ouroVitorias := min(2000, 100+nv*3)

	c1 := ContratoSemanal{
		ID:         contratoRegiaoID,
		Titulo:     "Caçada em " + regiaoAlvo.Nome,
		Descricao:  "Vença 5 batalhas contra monstros de " + regiaoAlvo.Nome + " nesta semana.",
		Regiao:     regiaoAlvo.ID,
		RegiaoNome: regiaoAlvo.Nome,
		Progresso:  min(5, vitoriasNaRegiao),
		Meta:       5,
		Ouro:       ouroRegiao,
		Bilhetes:   1,
		Materiais:  map[string]int{matRegiao: 2},
		Concluido:  vitoriasNaRegiao >= 5,
		Resgatado:  resgatados[contratoRegiaoID],
	}
	c2 := ContratoSemanal{
		ID:        "masmorras_semana",
		Titulo:    "Incursões em Masmorras",
		Descricao: "Complete 2 masmorras até o último andar nesta semana.",
		Progresso: min(2, masmorrasCompletas),
		Meta:      2,
		Ouro:      ouroMasmorra,
		Bilhetes:  1,
		Materiais: map[string]int{materialCranio: 1},
		Concluido: masmorrasCompletas >= 2,
		Resgatado: resgatados["masmorras_semana"],
	}
	c3 := ContratoSemanal{
		ID:        "vitorias_semana",
		Titulo:    "Maratona da Fronteira",
		Descricao: "Alcance 10 vitórias em expedições nesta semana.",
		Progresso: min(10, vitoriasTotais),
		Meta:      10,
		Ouro:      ouroVitorias,
		Bilhetes:  2,
		Materiais: map[string]int{materialChifre: 2},
		Concluido: vitoriasTotais >= 10,
		Resgatado: resgatados["vitorias_semana"],
	}

	return RespostaContratosRPG{
		Semana:    semanaChave,
		ExpiraEm:  expiraEm,
		Contratos: []ContratoSemanal{c1, c2, c3},
	}
}

func lerBatalhasSemanaContratos(dbClient *supabase.Client, userID string, inicioUTC string) ([]batalhaContratoRow, error) {
	const passo = 1000
	var saida []batalhaContratoRow
	for offset := 0; ; offset += passo {
		dados, _, err := dbClient.From("rpg_batalhas").
			Select("monstro_id", "", false).
			Eq("user_id", userID).
			Eq("venceu", "true").
			Gte("criado_em", inicioUTC).
			Order("id", &postgrest.OrderOpts{Ascending: true}).
			Range(offset, offset+passo-1, "").
			Execute()
		if err != nil {
			return nil, err
		}
		var lote []batalhaContratoRow
		if err := json.Unmarshal(dados, &lote); err != nil {
			return nil, err
		}
		saida = append(saida, lote...)
		if len(lote) < passo {
			break
		}
	}
	return saida, nil
}

func lerMasmorrasSemanaContratos(dbClient *supabase.Client, userID string, semanaChave string) ([]masmorraContratoRow, error) {
	const passo = 1000
	var saida []masmorraContratoRow
	for offset := 0; ; offset += passo {
		dados, _, err := dbClient.From("rpg_masmorras_execucoes").
			Select("completou", "", false).
			Eq("user_id", userID).
			Gte("dia", semanaChave).
			Order("id", &postgrest.OrderOpts{Ascending: true}).
			Range(offset, offset+passo-1, "").
			Execute()
		if err != nil {
			return nil, err
		}
		var lote []masmorraContratoRow
		if err := json.Unmarshal(dados, &lote); err != nil {
			return nil, err
		}
		saida = append(saida, lote...)
		if len(lote) < passo {
			break
		}
	}
	return saida, nil
}

func lerResgatadosSemanaContratos(dbClient *supabase.Client, userID string, semanaChave string) (map[string]bool, error) {
	dados, _, err := dbClient.From("rpg_contratos_resgatados").
		Select("contrato_id", "", false).
		Eq("user_id", userID).
		Eq("semana", semanaChave).
		Execute()
	if err != nil {
		return nil, err
	}
	var linhas []struct {
		ContratoID string `json:"contrato_id"`
	}
	if err := json.Unmarshal(dados, &linhas); err != nil {
		return nil, err
	}
	res := make(map[string]bool, len(linhas))
	for _, l := range linhas {
		res[l.ContratoID] = true
	}
	return res, nil
}

func carregarEstadoContratos(dbClient *supabase.Client, userID string, nivel int, agora time.Time) (RespostaContratosRPG, error) {
	inicio := inicioDaSemanaBrasilia(agora)
	inicioUTC := inicio.UTC().Format(time.RFC3339)
	semanaChave := inicio.In(fusoGuilda).Format("2006-01-02")

	var (
		batalhas          []batalhaContratoRow
		masmorras         []masmorraContratoRow
		resgatados        map[string]bool
		errB, errM, errR  error
		wg                sync.WaitGroup
	)
	wg.Add(3)
	go func() { defer wg.Done(); batalhas, errB = lerBatalhasSemanaContratos(dbClient, userID, inicioUTC) }()
	go func() { defer wg.Done(); masmorras, errM = lerMasmorrasSemanaContratos(dbClient, userID, semanaChave) }()
	go func() { defer wg.Done(); resgatados, errR = lerResgatadosSemanaContratos(dbClient, userID, semanaChave) }()
	wg.Wait()

	if errB != nil || errM != nil {
		return RespostaContratosRPG{}, errFalhaRPG
	}
	// Tolerância se o sql/125 ainda não tiver sido aplicado em algum ambiente local.
	if errR != nil {
		resgatados = map[string]bool{}
	}
	return montarContratosSemanais(nivel, agora, batalhas, masmorras, resgatados), nil
}

// HandleGetContratos lista os contratos semanais de caça e o progresso atual do jogador.
func (h *RPGHandler) HandleGetContratos(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	estado, err := carregarEstadoContratos(sessao.dbClient, sessao.userID, sessao.nivel, time.Now())
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Contratos semanais indisponíveis no momento.")
		return
	}
	responderJSON(w, http.StatusOK, estado)
}

// HandleResgatarContrato valida conclusão do contrato na semana e credita Ouro, bilhetes e materiais.
func (h *RPGHandler) HandleResgatarContrato(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		ContratoID string `json:"contrato_id"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 512)).Decode(&corpo) != nil {
		corpo.ContratoID = ""
	}
	contratoID := strings.TrimSpace(corpo.ContratoID)
	if contratoID == "" || len(contratoID) > 60 {
		responderErroJSON(w, http.StatusBadRequest, "Contrato inválido.")
		return
	}

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	agora := time.Now()
	estado, err := carregarEstadoContratos(sessao.dbClient, sessao.userID, sessao.nivel, agora)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Contratos semanais indisponíveis no momento.")
		return
	}

	var alvo *ContratoSemanal
	for i := range estado.Contratos {
		if estado.Contratos[i].ID == contratoID {
			alvo = &estado.Contratos[i]
			break
		}
	}
	if alvo == nil {
		responderErroJSON(w, http.StatusNotFound, "Contrato não encontrado nesta semana.")
		return
	}
	if alvo.Resgatado {
		responderErroJSON(w, http.StatusConflict, "Contrato já resgatado nesta semana.")
		return
	}
	if !alvo.Concluido {
		responderErroJSON(w, http.StatusBadRequest, "Contrato ainda não foi concluído.")
		return
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Contratos semanais indisponíveis no momento.")
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_resgatar_contrato", "", map[string]interface{}{
		"p_user_id":     sessao.userID,
		"p_semana":      estado.Semana,
		"p_contrato_id": alvo.ID,
		"p_ouro":        alvo.Ouro,
		"p_bilhetes":    alvo.Bilhetes,
		"p_materiais":   alvo.Materiais,
	}))
	var retorno struct {
		Ok          bool   `json:"ok"`
		Erro        string `json:"erro"`
		JaResgatado bool   `json:"ja_resgatado"`
		OuroTotal   int    `json:"ouro"`
		Bilhetes    int    `json:"bilhetes"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &retorno) != nil || (!retorno.Ok && retorno.Erro == "") {
		log.Printf("[RPG] Falha ao resgatar contrato (user=%s, contrato=%s): %s", sessao.userID, alvo.ID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível resgatar o contrato agora.")
		return
	}
	if retorno.Erro != "" {
		status := http.StatusBadRequest
		if retorno.JaResgatado {
			status = http.StatusConflict
		}
		responderErroJSON(w, status, retorno.Erro)
		return
	}

	alvo.Resgatado = true
	responderJSON(w, http.StatusOK, RespostaResgatarContrato{
		ContratoID:    alvo.ID,
		OuroGanho:     alvo.Ouro,
		Bilhetes:      alvo.Bilhetes,
		Materiais:     alvo.Materiais,
		OuroTotal:     retorno.OuroTotal,
		BilhetesTotal: retorno.Bilhetes,
		Estado:        estado,
	})
}
