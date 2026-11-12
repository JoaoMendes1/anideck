// internal/handlers/missoes.go
// Fase 16 · Item 16.1b (#168): Missões diárias com recompensa em AniCoins.
// Sorteio determinístico no fuso de Brasília, progresso em tempo real e resgate
// atômico e idempotente via crystal_ledger.
package handlers

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/supabase-go"
)

const ChaveMissoesCatalogo = "missoes_catalogo"

type TipoMissao string

const (
	MissaoMarcarEpisodios  TipoMissao = "marcar_episodios"
	MissaoMarcarLancamento TipoMissao = "marcar_lancamento"
	MissaoReagirEpisodio   TipoMissao = "reagir_episodio"
	MissaoComentarEpisodio TipoMissao = "comentar_episodio"
	MissaoCompletarObra    TipoMissao = "completar_obra"
)

type ItemCatalogoMissao struct {
	ID         string     `json:"id"`
	Tipo       TipoMissao `json:"tipo"`
	Titulo     string     `json:"titulo"`
	Descricao  string     `json:"descricao"`
	Meta       int        `json:"meta"`
	Recompensa int        `json:"recompensa"`
	Icone      string     `json:"icone,omitempty"`
}

type MissaoUsuario struct {
	ID                 string     `json:"id"`
	Tipo               TipoMissao `json:"tipo"`
	Titulo             string     `json:"titulo"`
	Descricao          string     `json:"descricao"`
	Meta               int        `json:"meta"`
	Progresso          int        `json:"progresso"`
	ProgressoAtual     int        `json:"progresso_atual"`
	RecompensaCristais int        `json:"recompensa_cristais"`
	RecompensaAniCoins int        `json:"recompensa_anicoins"`
	Concluida          bool       `json:"concluida"`
	Resgatada          bool       `json:"resgatada"`
	Icone              string     `json:"icone"`
}

type RespostaMissoesHoje struct {
	Data            string          `json:"data"`
	Missoes         []MissaoUsuario `json:"missoes"`
	Total           int             `json:"total"`
	Concluidas      int             `json:"concluidas"`
	Resgatadas      int             `json:"resgatadas"`
	TodasResgatadas bool            `json:"todas_resgatadas"`
}

type MissoesHandler struct{}

// CatalogoPadraoMissoes fornece as missões essenciais do AniDeck.
func CatalogoPadraoMissoes() []ItemCatalogoMissao {
	return []ItemCatalogoMissao{
		{
			ID:         "ep_hoje",
			Tipo:       MissaoMarcarEpisodios,
			Titulo:     "Episódio do Dia",
			Descricao:  "Marque pelo menos 1 episódio como visto hoje",
			Meta:       1,
			Recompensa: 15,
			Icone:      "Play",
		},
		{
			ID:         "maratona",
			Tipo:       MissaoMarcarEpisodios,
			Titulo:     "Ritmo de Maratona",
			Descricao:  "Assista a 3 episódios de qualquer anime hoje",
			Meta:       3,
			Recompensa: 30,
			Icone:      "Flame",
		},
		{
			ID:         "lancamento",
			Tipo:       MissaoMarcarLancamento,
			Titulo:     "Na Crista da Onda",
			Descricao:  "Assista a 1 episódio de um anime em lançamento",
			Meta:       1,
			Recompensa: 20,
			Icone:      "Sparkles",
		},
		{
			ID:         "reacao",
			Tipo:       MissaoReagirEpisodio,
			Titulo:     "Reator Emocional",
			Descricao:  "Deixe sua reação com emoji em 2 episódios",
			Meta:       2,
			Recompensa: 15,
			Icone:      "Smile",
		},
		{
			ID:         "comentario",
			Tipo:       MissaoComentarEpisodio,
			Titulo:     "Voz na Comunidade",
			Descricao:  "Escreva um comentário em qualquer episódio",
			Meta:       1,
			Recompensa: 20,
			Icone:      "MessageSquare",
		},
		{
			ID:         "obra_concluida",
			Tipo:       MissaoCompletarObra,
			Titulo:     "Missão Cumprida",
			Descricao:  "Marque 1 anime como completo no seu deck",
			Meta:       1,
			Recompensa: 40,
			Icone:      "CheckCircle2",
		},
	}
}

// LerCatalogoMissoes lê de app_settings ou retorna o catálogo padrão.
func LerCatalogoMissoes(client *supabase.Client) []ItemCatalogoMissao {
	padrao := CatalogoPadraoMissoes()
	if client == nil {
		return padrao
	}

	data, _, err := client.From("app_settings").Select("value", "", false).Eq("key", ChaveMissoesCatalogo).Execute()
	if err != nil {
		return padrao
	}

	var linhas []struct {
		Value string `json:"value"`
	}
	if json.Unmarshal(data, &linhas) != nil || len(linhas) == 0 {
		return padrao
	}

	var lidas []ItemCatalogoMissao
	if json.Unmarshal([]byte(linhas[0].Value), &lidas) != nil || len(lidas) == 0 {
		return padrao
	}

	return lidas
}

// SortearMissoesDoDia sorteia deterministicamente 3 missões para o usuário no dia especificado.
func SortearMissoesDoDia(catalogo []ItemCatalogoMissao, userID, dataStr string) []ItemCatalogoMissao {
	if len(catalogo) <= 3 {
		return catalogo
	}

	pool := make([]ItemCatalogoMissao, len(catalogo))
	copy(pool, catalogo)

	h := sha256.New()
	h.Write([]byte(userID + ":" + dataStr))
	hashBytes := h.Sum(nil)

	for i := len(pool) - 1; i > 0; i-- {
		offset := (len(pool) - 1 - i) * 4
		if offset+4 > len(hashBytes) {
			offset = 0
		}
		val := binary.BigEndian.Uint32(hashBytes[offset : offset+4])
		j := int(val % uint32(i+1))
		pool[i], pool[j] = pool[j], pool[i]
	}

	return pool[:3]
}

// HandleGetMissoesHoje lista as missões sorteadas para hoje com o progresso real e status de resgate.
func (h *MissoesHandler) HandleGetMissoesHoje(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	agora := time.Now().In(fusoGuilda)
	dataStr := agora.Format("2006-01-02")
	inicioDia := inicioDoDiaBrasilia(agora).Format(time.RFC3339)

	catalogo := LerCatalogoMissoes(database.Client)
	sorteadas := SortearMissoesDoDia(catalogo, userID, dataStr)

	// Consulta o progresso de cada tipo no banco
	progressoEpisodios := 0
	progressoLancamentos := 0
	progressoReacoes := 0
	progressoComentarios := 0
	progressoCompletos := 0

	// 1. Episódios vistos hoje
	dataEp, countEp, errEp := dbClient.From("episode_progress").
		Select("mal_id", "exact", false).
		Eq("user_id", userID).
		Gte("watched_at", inicioDia).
		Execute()

	if errEp == nil {
		progressoEpisodios = int(countEp)

		// Checa se algum pertence a anime em lançamento para missões de lançamento
		var epsMarcados []struct {
			MalID int `json:"mal_id"`
		}
		if json.Unmarshal(dataEp, &epsMarcados) == nil && len(epsMarcados) > 0 {
			malIDsStr := make([]string, 0, len(epsMarcados))
			for _, ep := range epsMarcados {
				malIDsStr = append(malIDsStr, strconv.Itoa(ep.MalID))
			}
			// Verifica na tabela curated_animes ou anime_metadata_cache
			dataCache, _, errC := dbClient.From("curated_animes").
				Select("mal_id,is_destaque", "", false).
				In("mal_id", malIDsStr).
				Execute()
			if errC == nil {
				var curados []struct {
					MalID int `json:"mal_id"`
				}
				if json.Unmarshal(dataCache, &curados) == nil && len(curados) > 0 {
					progressoLancamentos = len(curados)
				}
			}
			if progressoLancamentos == 0 {
				progressoLancamentos = progressoEpisodios // fallback
			}
		}
	}

	// 2. Reações feitas hoje
	_, countReacoes, errReac := dbClient.From("episode_reactions").
		Select("user_id", "exact", false).
		Eq("user_id", userID).
		Gte("created_at", inicioDia).
		Execute()
	if errReac == nil {
		progressoReacoes = int(countReacoes)
	}

	// 3. Comentários feitos hoje
	_, countComentarios, errCom := dbClient.From("episode_comments").
		Select("id", "exact", false).
		Eq("user_id", userID).
		Gte("created_at", inicioDia).
		Execute()
	if errCom == nil {
		progressoComentarios = int(countComentarios)
	}

	// 4. Obras marcadas como completas hoje
	_, countCompletos, errComp := dbClient.From("media_entries").
		Select("mal_id", "exact", false).
		Eq("user_id", userID).
		Eq("status", "COMPLETED").
		Gte("updated_at", inicioDia).
		Execute()
	if errComp == nil {
		progressoCompletos = int(countCompletos)
	}

	// 5. Verifica resgates de hoje no crystal_ledger
	prefixoRef := fmt.Sprintf("missao:%s:", dataStr)
	dataLedger, _, _ := dbClient.From("crystal_ledger").
		Select("referencia", "", false).
		Eq("user_id", userID).
		Eq("motivo", "missao_diaria").
		Like("referencia", prefixoRef+"%").
		Execute()

	resgatadasMap := make(map[string]bool)
	var movimentos []struct {
		Referencia string `json:"referencia"`
	}
	if json.Unmarshal(dataLedger, &movimentos) == nil {
		for _, m := range movimentos {
			idMissao := strings.TrimPrefix(m.Referencia, prefixoRef)
			resgatadasMap[idMissao] = true
		}
	}

	missoesRetorno := make([]MissaoUsuario, 0, len(sorteadas))
	concluidas := 0
	resgatadas := 0

	for _, m := range sorteadas {
		progresso := 0
		switch m.Tipo {
		case MissaoMarcarEpisodios:
			progresso = progressoEpisodios
		case MissaoMarcarLancamento:
			progresso = progressoLancamentos
		case MissaoReagirEpisodio:
			progresso = progressoReacoes
		case MissaoComentarEpisodio:
			progresso = progressoComentarios
		case MissaoCompletarObra:
			progresso = progressoCompletos
		default:
			progresso = progressoEpisodios
		}

		jaResgatou := resgatadasMap[m.ID]
		atingiuMeta := progresso >= m.Meta

		if atingiuMeta {
			concluidas++
		}
		if jaResgatou {
			resgatadas++
		}

		icone := m.Icone
		if icone == "" {
			switch m.Tipo {
			case MissaoMarcarLancamento:
				icone = "Sparkles"
			case MissaoReagirEpisodio:
				icone = "Smile"
			case MissaoComentarEpisodio:
				icone = "MessageSquare"
			case MissaoCompletarObra:
				icone = "CheckCircle2"
			default:
				if m.Meta > 1 {
					icone = "Flame"
				} else {
					icone = "Play"
				}
			}
		}

		missoesRetorno = append(missoesRetorno, MissaoUsuario{
			ID:                 m.ID,
			Tipo:               m.Tipo,
			Titulo:             m.Titulo,
			Descricao:          m.Descricao,
			Meta:               m.Meta,
			Progresso:          progresso,
			ProgressoAtual:     progresso,
			RecompensaCristais: m.Recompensa,
			RecompensaAniCoins: m.Recompensa,
			Concluida:          atingiuMeta,
			Resgatada:          jaResgatou,
			Icone:              icone,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RespostaMissoesHoje{
		Data:            dataStr,
		Missoes:         missoesRetorno,
		Total:           len(sorteadas),
		Concluidas:      concluidas,
		Resgatadas:      resgatadas,
		TodasResgatadas: resgatadas >= len(sorteadas) && len(sorteadas) > 0,
	})
}

// HandleResgatarMissao credita AniCoins de uma missão diária concluída e marca como resgatada no ledger.
func (h *MissoesHandler) HandleResgatarMissao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	missaoID := chi.URLParam(r, "id")
	if missaoID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID da missão é obrigatório")
		return
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco indisponível")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	agora := time.Now().In(fusoGuilda)
	dataStr := agora.Format("2006-01-02")
	inicioDia := inicioDoDiaBrasilia(agora).Format(time.RFC3339)

	catalogo := LerCatalogoMissoes(database.Client)
	sorteadas := SortearMissoesDoDia(catalogo, userID, dataStr)

	var missaoAlvo *ItemCatalogoMissao
	for i := range sorteadas {
		if sorteadas[i].ID == missaoID {
			missaoAlvo = &sorteadas[i]
			break
		}
	}

	if missaoAlvo == nil {
		responderErroJSON(w, http.StatusBadRequest, "Esta missão não pertence às suas missões sorteadas para hoje.")
		return
	}

	// Confere se já foi resgatada
	referencia := fmt.Sprintf("missao:%s:%s", dataStr, missaoID)
	dataLedger, _, _ := dbClient.From("crystal_ledger").
		Select("id", "", false).
		Eq("user_id", userID).
		Eq("motivo", "missao_diaria").
		Eq("referencia", referencia).
		Execute()

	var linhas []struct {
		ID string `json:"id"`
	}
	if json.Unmarshal(dataLedger, &linhas) == nil && len(linhas) > 0 {
		responderErroJSON(w, http.StatusBadRequest, "Você já resgatou a recompensa desta missão hoje.")
		return
	}

	// Confere se a meta foi realmente atingida no banco
	progresso := 0
	switch missaoAlvo.Tipo {
	case MissaoMarcarEpisodios, MissaoMarcarLancamento:
		_, count, errEp := dbClient.From("episode_progress").
			Select("id", "exact", false).
			Eq("user_id", userID).
			Gte("watched_at", inicioDia).
			Execute()
		if errEp == nil {
			progresso = int(count)
		}
	case MissaoReagirEpisodio:
		_, count, errReac := dbClient.From("episode_reactions").
			Select("user_id", "exact", false).
			Eq("user_id", userID).
			Gte("created_at", inicioDia).
			Execute()
		if errReac == nil {
			progresso = int(count)
		}
	case MissaoComentarEpisodio:
		_, count, errCom := dbClient.From("episode_comments").
			Select("id", "exact", false).
			Eq("user_id", userID).
			Gte("created_at", inicioDia).
			Execute()
		if errCom == nil {
			progresso = int(count)
		}
	case MissaoCompletarObra:
		_, count, errComp := dbClient.From("media_entries").
			Select("mal_id", "exact", false).
			Eq("user_id", userID).
			Eq("status", "COMPLETED").
			Gte("updated_at", inicioDia).
			Execute()
		if errComp == nil {
			progresso = int(count)
		}
	default:
		_, count, errEp := dbClient.From("episode_progress").
			Select("id", "exact", false).
			Eq("user_id", userID).
			Gte("watched_at", inicioDia).
			Execute()
		if errEp == nil {
			progresso = int(count)
		}
	}

	if progresso < missaoAlvo.Meta {
		responderErroJSON(w, http.StatusBadRequest, fmt.Sprintf("Missão não concluída ainda (%d de %d).", progresso, missaoAlvo.Meta))
		return
	}

	// Executa a RPC creditar_cristais atômica com service_role
	resSaldo := strings.TrimSpace(database.Client.Rpc("creditar_cristais", "", map[string]interface{}{
		"p_user_id":    userID,
		"p_quantidade": missaoAlvo.Recompensa,
		"p_motivo":     "missao_diaria",
		"p_referencia": referencia,
	}))

	if strings.Contains(resSaldo, "23505") || strings.Contains(resSaldo, "unique_violation") {
		responderErroJSON(w, http.StatusBadRequest, "Você já resgatou a recompensa desta missão hoje.")
		return
	}

	if strings.Contains(resSaldo, "error") || strings.Contains(resSaldo, "Exception") {
		log.Printf("[MISSOES] Erro ao creditar AniCoins da missão (%s): %s", missaoID, resSaldo)
		responderErroJSON(w, http.StatusBadRequest, "Falha ao registrar resgate de recompensa.")
		return
	}

	novoSaldo, _ := strconv.Atoi(resSaldo)
	log.Printf("[MISSOES] Recompensa resgatada: user=%s, missao=%s, recompensa=%d, novo_saldo=%d", userID, missaoID, missaoAlvo.Recompensa, novoSaldo)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":         true,
		"novo_saldo": novoSaldo,
		"recompensa": missaoAlvo.Recompensa,
		"mensagem":   fmt.Sprintf("+%d AniCoins adicionadas à sua carteira!", missaoAlvo.Recompensa),
	})
}
