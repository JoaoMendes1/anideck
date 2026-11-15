package handlers

import (
	crand "crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	supabase "github.com/supabase-community/supabase-go"
)

// maxTurnosBatalha é o limite de rodadas. Quem não derruba o monstro até lá perde: sem isso,
// uma luta entre dois lados muito defensivos não acabaria.
const maxTurnosBatalha = 20

// MonstroRPG é um monstro do catálogo rpg_monstros.
type MonstroRPG struct {
	ID           string `json:"id"`
	Nome         string `json:"nome"`
	Descricao    string `json:"descricao"`
	Tipo         string `json:"tipo"`
	Nivel        int    `json:"nivel"`
	Vida         int    `json:"vida"`
	Ataque       int    `json:"ataque"`
	Defesa       int    `json:"defesa"`
	Bilhetes     int    `json:"bilhetes"`
	ChanceItem   int    `json:"chance_item"`
	RaridadeItem string `json:"raridade_item"`
	Ordem        int    `json:"ordem"`
}

// TurnoBatalha é um golpe, para a tela reproduzir a luta.
type TurnoBatalha struct {
	Atacante    string `json:"atacante"`
	Dano        int    `json:"dano"`
	Critico     bool   `json:"critico"`
	VidaJogador int    `json:"vida_jogador"`
	VidaMonstro int    `json:"vida_monstro"`
}

// ResultadoSimulado é a luta inteira, antes de gravar.
type ResultadoSimulado struct {
	Venceu  bool           `json:"venceu"`
	Rodadas int            `json:"rodadas"`
	Turnos  []TurnoBatalha `json:"turnos"`
}

// CalcularDano dá o dano de um golpe antes da variação. A fórmula ataque²/(ataque+defesa)
// nunca chega a zero e faz a defesa pesar menos quando o ataque é muito maior.
func CalcularDano(ataque, defesa int) float64 {
	if ataque < 1 {
		ataque = 1
	}
	if defesa < 0 {
		defesa = 0
	}
	return float64(ataque*ataque) / float64(ataque+defesa)
}

// golpe aplica a variação de 85% a 115% e o crítico (10% de chance, 1,5x). Todo golpe dá
// pelo menos 1 de dano.
func golpe(rng *rand.Rand, ataque, defesa int) (int, bool) {
	dano := CalcularDano(ataque, defesa) * (0.85 + rng.Float64()*0.30)
	critico := rng.Float64() < 0.10
	if critico {
		dano *= 1.5
	}
	if dano < 1 {
		dano = 1
	}
	return int(dano + 0.5), critico
}

// SimularBatalha resolve a luta. O jogador ataca primeiro em cada rodada. É uma função pura:
// o mesmo gerador dá sempre a mesma luta, o que permite testar e auditar.
func SimularBatalha(jogador AtributosRPG, monstro MonstroRPG, rng *rand.Rand) ResultadoSimulado {
	vidaJogador := jogador.Vida
	vidaMonstro := monstro.Vida
	turnos := make([]TurnoBatalha, 0, maxTurnosBatalha*2)

	for rodada := 1; rodada <= maxTurnosBatalha; rodada++ {
		dano, critico := golpe(rng, jogador.Ataque, monstro.Defesa)
		vidaMonstro -= dano
		if vidaMonstro < 0 {
			vidaMonstro = 0
		}
		turnos = append(turnos, TurnoBatalha{Atacante: "jogador", Dano: dano, Critico: critico, VidaJogador: vidaJogador, VidaMonstro: vidaMonstro})
		if vidaMonstro == 0 {
			return ResultadoSimulado{Venceu: true, Rodadas: rodada, Turnos: turnos}
		}

		dano, critico = golpe(rng, monstro.Ataque, jogador.Defesa)
		vidaJogador -= dano
		if vidaJogador < 0 {
			vidaJogador = 0
		}
		turnos = append(turnos, TurnoBatalha{Atacante: "monstro", Dano: dano, Critico: critico, VidaJogador: vidaJogador, VidaMonstro: vidaMonstro})
		if vidaJogador == 0 {
			return ResultadoSimulado{Venceu: false, Rodadas: rodada, Turnos: turnos}
		}
	}
	return ResultadoSimulado{Venceu: false, Rodadas: maxTurnosBatalha, Turnos: turnos}
}

// DificuldadeContra compara o Poder do jogador com o do monstro, para a tela avisar antes.
func DificuldadeContra(jogador AtributosRPG, monstro MonstroRPG) string {
	poderMonstro := CalcularPoder(AtributosRPG{Vida: monstro.Vida, Ataque: monstro.Ataque, Defesa: monstro.Defesa})
	if poderMonstro <= 0 {
		return "facil"
	}
	razao := float64(jogador.Poder) / float64(poderMonstro)
	switch {
	case razao >= 1.3:
		return "facil"
	case razao >= 0.95:
		return "equilibrada"
	case razao >= 0.75:
		return "dificil"
	default:
		return "perigosa"
	}
}

// EscolherItemDaRecompensa sorteia se a vitória dá item e qual, entre os candidatos da
// raridade do monstro. Vazio é sem item.
func EscolherItemDaRecompensa(rng *rand.Rand, chance int, candidatos []string) string {
	if chance <= 0 || len(candidatos) == 0 {
		return ""
	}
	if rng.Intn(100) >= chance {
		return ""
	}
	return candidatos[rng.Intn(len(candidatos))]
}

// novoGeradorDeBatalha usa uma semente do sistema operacional, imprevisível para o jogador.
func novoGeradorDeBatalha() *rand.Rand {
	var b [8]byte
	if _, err := crand.Read(b[:]); err != nil {
		return rand.New(rand.NewSource(int64(len(b))))
	}
	return rand.New(rand.NewSource(int64(binary.LittleEndian.Uint64(b[:]))))
}

// MonstroNaLista é o monstro como a tela de expedições o mostra.
type MonstroNaLista struct {
	MonstroRPG
	Poder       int    `json:"poder"`
	Dificuldade string `json:"dificuldade"`
}

// HojeRPG é o limite de batalhas e o saldo de bilhetes.
type HojeRPG struct {
	Feitas   int `json:"feitas"`
	Limite   int `json:"limite"`
	Bilhetes int `json:"bilhetes"`
}

// EstadoExpedicoes é o corpo de GET /api/rpg/batalhas.
type EstadoExpedicoes struct {
	Atributos AtributosRPG     `json:"atributos"`
	Hoje      HojeRPG          `json:"hoje"`
	Monstros  []MonstroNaLista `json:"monstros"`
}

// RecompensaBatalha é o que a vitória deu.
type RecompensaBatalha struct {
	Bilhetes int      `json:"bilhetes"`
	Item     *ItemRPG `json:"item,omitempty"`
}

// RespostaBatalha é o corpo de POST /api/rpg/batalhas.
type RespostaBatalha struct {
	Monstro    MonstroRPG        `json:"monstro"`
	Jogador    AtributosRPG      `json:"jogador"`
	Resultado  ResultadoSimulado `json:"resultado"`
	Recompensa RecompensaBatalha `json:"recompensa"`
	Hoje       HojeRPG           `json:"hoje"`
}

func lerMonstros(dbClient *supabase.Client) ([]MonstroRPG, error) {
	dados, _, err := dbClient.From("rpg_monstros").
		Select("id,nome,descricao,tipo,nivel,vida,ataque,defesa,bilhetes,chance_item,raridade_item,ordem", "", false).
		Eq("ativo", "true").
		Execute()
	if err != nil {
		return nil, err
	}
	var monstros []MonstroRPG
	if err := json.Unmarshal(dados, &monstros); err != nil {
		return nil, err
	}
	sort.SliceStable(monstros, func(i, j int) bool { return monstros[i].Ordem < monstros[j].Ordem })
	return monstros, nil
}

func lerHojeRPG(dbClient *supabase.Client) (HojeRPG, error) {
	bruto := strings.TrimSpace(dbClient.Rpc("rpg_batalhas_hoje", "", map[string]interface{}{}))
	var hoje struct {
		HojeRPG
		Ok bool `json:"ok"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &hoje) != nil || !hoje.Ok {
		return HojeRPG{}, errFalhaRPG
	}
	return hoje.HojeRPG, nil
}

// errFalhaRPG marca resposta do banco fora do formato esperado.
var errFalhaRPG = errors.New("resposta inesperada do banco")

// HandleGetExpedicoes lista os monstros com a dificuldade para o jogador e o limite do dia.
func (h *RPGHandler) HandleGetExpedicoes(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	sessao.dbClient.Rpc("rpg_garantir_kit_inicial", "", map[string]interface{}{})
	equipamento, err := carregarEstadoEquipamento(sessao.dbClient, sessao.userID, sessao.nivel)
	if err != nil {
		log.Printf("[RPG] Falha ao ler equipamentos (user=%s): %v", sessao.userID, err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	monstros, err := lerMonstros(sessao.dbClient)
	if err != nil {
		log.Printf("[RPG] Falha ao ler monstros: %v", err)
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	hoje, err := lerHojeRPG(sessao.dbClient)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}

	lista := make([]MonstroNaLista, 0, len(monstros))
	for _, m := range monstros {
		lista = append(lista, MonstroNaLista{
			MonstroRPG:  m,
			Poder:       CalcularPoder(AtributosRPG{Vida: m.Vida, Ataque: m.Ataque, Defesa: m.Defesa}),
			Dificuldade: DificuldadeContra(equipamento.Atributos, m),
		})
	}
	responderJSON(w, http.StatusOK, EstadoExpedicoes{Atributos: equipamento.Atributos, Hoje: hoje, Monstros: lista})
}

// HandleBatalhar simula a luta com os atributos calculados aqui e grava pelo service role.
// O corpo traz só o monstro escolhido.
func (h *RPGHandler) HandleBatalhar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		MonstroID string `json:"monstro_id"`
	}
	if r.Body == nil || json.NewDecoder(r.Body).Decode(&corpo) != nil {
		corpo.MonstroID = ""
	}
	monstroID := strings.TrimSpace(corpo.MonstroID)

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	if monstroID == "" || len(monstroID) > 40 {
		responderErroJSON(w, http.StatusBadRequest, "Escolha um monstro.")
		return
	}

	monstros, err := lerMonstros(sessao.dbClient)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	var monstro *MonstroRPG
	for i := range monstros {
		if monstros[i].ID == monstroID {
			monstro = &monstros[i]
			break
		}
	}
	if monstro == nil {
		responderErroJSON(w, http.StatusBadRequest, "Monstro desconhecido.")
		return
	}

	// Conferência antecipada do limite, só para não simular à toa; quem decide é a função
	// de registro, que trava por usuário.
	if hoje, err := lerHojeRPG(sessao.dbClient); err == nil && hoje.Feitas >= hoje.Limite {
		responderErroJSON(w, http.StatusTooManyRequests, "Você já fez todas as batalhas de hoje. Volte amanhã.")
		return
	}

	sessao.dbClient.Rpc("rpg_garantir_kit_inicial", "", map[string]interface{}{})
	equipamento, err := carregarEstadoEquipamento(sessao.dbClient, sessao.userID, sessao.nivel)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}

	rng := novoGeradorDeBatalha()
	resultado := SimularBatalha(equipamento.Atributos, *monstro, rng)

	var itemSorteado *ItemRPG
	if resultado.Venceu {
		candidatos := lerItensDaRaridade(sessao.dbClient, monstro.RaridadeItem)
		ids := make([]string, 0, len(candidatos))
		for _, c := range candidatos {
			ids = append(ids, c.ID)
		}
		if id := EscolherItemDaRecompensa(rng, monstro.ChanceItem, ids); id != "" {
			for i := range candidatos {
				if candidatos[i].ID == id {
					itemSorteado = &candidatos[i]
				}
			}
		}
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	itemID := ""
	if itemSorteado != nil {
		itemID = itemSorteado.ID
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_registrar_batalha", "", map[string]interface{}{
		"p_user_id":    sessao.userID,
		"p_monstro_id": monstro.ID,
		"p_venceu":     resultado.Venceu,
		"p_turnos":     len(resultado.Turnos),
		"p_item_id":    itemID,
	}))
	var registro struct {
		Ok             bool    `json:"ok"`
		Erro           string  `json:"erro"`
		LimiteAtingido bool    `json:"limite_atingido"`
		BilhetesGanhos int     `json:"bilhetes_ganhos"`
		ItemID         *string `json:"item_id"`
		Bilhetes       int     `json:"bilhetes"`
		Feitas         int     `json:"feitas"`
		Limite         int     `json:"limite"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar batalha (user=%s): %s", sessao.userID, bruto)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a batalha agora.")
		return
	}
	if registro.Erro != "" {
		status := http.StatusBadRequest
		if registro.LimiteAtingido {
			status = http.StatusTooManyRequests
		}
		responderErroJSON(w, status, registro.Erro)
		return
	}

	// O banco pode recusar o item (desativado entre a leitura e a gravação): vale o que ele gravou.
	recompensa := RecompensaBatalha{Bilhetes: registro.BilhetesGanhos}
	if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
		recompensa.Item = itemSorteado
	}

	responderJSON(w, http.StatusOK, RespostaBatalha{
		Monstro:    *monstro,
		Jogador:    equipamento.Atributos,
		Resultado:  resultado,
		Recompensa: recompensa,
		Hoje:       HojeRPG{Feitas: registro.Feitas, Limite: registro.Limite, Bilhetes: registro.Bilhetes},
	})
}

// lerItensDaRaridade lista os itens que a batalha pode dar: ativos, fora do kit inicial.
func lerItensDaRaridade(dbClient *supabase.Client, raridade string) []ItemRPG {
	dados, _, err := dbClient.From("rpg_itens").
		Select("id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo", "", false).
		Eq("raridade", raridade).
		Eq("inicial", "false").
		Eq("ativo", "true").
		Execute()
	if err != nil {
		return nil
	}
	var itens []ItemRPG
	if json.Unmarshal(dados, &itens) != nil {
		return nil
	}
	return itens
}
