package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

var regrasInsigniaValidas = map[string]bool{
	"madrugadas":     true,
	"curados_vistos": true,
	"maior_streak":   true,
	"cedo_marcados":  true,
	"genero_n3":      true,
	"rank_s":         true,
}

// ValidarEconomiaGuilda garante que os parâmetros da economia estejam dentro de faixas seguras.
func ValidarEconomiaGuilda(ec EconomiaGuilda) (EconomiaGuilda, string) {
	if ec.XPBaseEpisodio < 1 || ec.XPBaseEpisodio > 500 {
		return ec, "O XP base por episódio deve ficar entre 1 e 500."
	}
	if ec.BonusCedo < 0 || ec.BonusCedo > 500 {
		return ec, "O bônus por assistir cedo deve ficar entre 0 e 500."
	}
	if ec.Fator3a5 <= 0 || ec.Fator3a5 > 1.0 {
		return ec, "O fator do 3º ao 5º episódio deve ficar entre 0.05 e 1.0."
	}
	if ec.Fator6Mais <= 0 || ec.Fator6Mais > ec.Fator3a5 {
		return ec, "O fator do 6º+ episódio deve ser positivo e não pode superar o fator do 3º ao 5º."
	}
	if ec.TetoDiario < ec.XPBaseEpisodio || ec.TetoDiario > 5000 {
		return ec, "O teto diário deve ser maior ou igual ao XP base e no máximo 5000."
	}

	ec.EventoInicio = strings.TrimSpace(ec.EventoInicio)
	ec.EventoFim = strings.TrimSpace(ec.EventoFim)
	if ec.EventoMultiplicador <= 0 {
		ec.EventoMultiplicador = 2.0
	}
	if ec.EventoMultiplicador < 1.0 || ec.EventoMultiplicador > 5.0 {
		return ec, "O multiplicador de evento deve ficar entre 1.0 e 5.0."
	}

	if ec.EventoInicio != "" || ec.EventoFim != "" {
		if ec.EventoInicio == "" || ec.EventoFim == "" {
			return ec, "Evento de XP exige data de início e data de término."
		}
		ini, errIni := time.Parse(time.RFC3339, ec.EventoInicio)
		fim, errFim := time.Parse(time.RFC3339, ec.EventoFim)
		if errIni != nil || errFim != nil {
			return ec, "Datas do evento devem estar em formato ISO/RFC3339."
		}
		if !fim.After(ini) {
			return ec, "A data de término do evento deve ser posterior ao início."
		}
	}

	return ec, ""
}

// ValidarRanksGuilda confere que a escada de classes começa no nível 1 e cresce sem colisão.
func ValidarRanksGuilda(ranks []FaixaRank) ([]FaixaRank, string) {
	if len(ranks) < 3 || len(ranks) > 12 {
		return nil, "Configure entre 3 e 12 faixas de Rank."
	}
	limpos := make([]FaixaRank, 0, len(ranks))
	vistos := make(map[string]bool, len(ranks))

	for i, r := range ranks {
		r.Rank = strings.ToUpper(strings.TrimSpace(r.Rank))
		r.Titulo = strings.TrimSpace(r.Titulo)
		if r.Rank == "" || utf8.RuneCountInString(r.Rank) > 4 {
			return nil, fmt.Sprintf("Faixa %d precisa de sigla entre 1 e 4 caracteres.", i+1)
		}
		if vistos[r.Rank] {
			return nil, fmt.Sprintf("Rank duplicado: %s.", r.Rank)
		}
		vistos[r.Rank] = true
		if r.Titulo == "" || utf8.RuneCountInString(r.Titulo) > 40 {
			return nil, fmt.Sprintf("Título da faixa %s deve ter entre 1 e 40 caracteres.", r.Rank)
		}
		if r.NivelMinimo < 1 || r.NivelMinimo > 500 {
			return nil, fmt.Sprintf("Nível mínimo da faixa %s deve ficar entre 1 e 500.", r.Rank)
		}
		limpos = append(limpos, r)
	}

	sort.Slice(limpos, func(i, j int) bool {
		return limpos[i].NivelMinimo < limpos[j].NivelMinimo
	})
	if limpos[0].NivelMinimo != 1 {
		return nil, "A primeira faixa de Rank deve começar no nível 1."
	}
	for i := 1; i < len(limpos); i++ {
		if limpos[i].NivelMinimo <= limpos[i-1].NivelMinimo {
			return nil, "Os níveis mínimos das faixas de Rank precisam ser estritamente crescentes."
		}
	}
	return limpos, ""
}

// ValidarInsigniasGuilda sanitiza e confere os campos do catálogo de insígnias.
func ValidarInsigniasGuilda(insignias []InsigniaConfig) ([]InsigniaConfig, string) {
	if len(insignias) < 1 || len(insignias) > 24 {
		return nil, "O catálogo deve ter entre 1 e 24 insígnias."
	}
	limpas := make([]InsigniaConfig, 0, len(insignias))
	ids := make(map[string]bool, len(insignias))

	for i, ins := range insignias {
		ins.ID = strings.ToLower(strings.TrimSpace(ins.ID))
		ins.Icone = strings.TrimSpace(ins.Icone)
		ins.Nome = strings.TrimSpace(ins.Nome)
		ins.Descricao = strings.TrimSpace(ins.Descricao)
		ins.Regra = strings.TrimSpace(ins.Regra)
		ins.Estilo = strings.TrimSpace(ins.Estilo)
		if ins.Estilo != "foil2" {
			ins.Estilo = "foil"
		}

		pos := i + 1
		if ins.ID == "" || ids[ins.ID] {
			return nil, fmt.Sprintf("Insígnia %d sem identificador único.", pos)
		}
		ids[ins.ID] = true
		if ins.Icone == "" || utf8.RuneCountInString(ins.Icone) > 4 {
			return nil, fmt.Sprintf("Insígnia %d precisa de um ícone curto.", pos)
		}
		if ins.Nome == "" || utf8.RuneCountInString(ins.Nome) > 40 {
			return nil, fmt.Sprintf("Nome da insígnia %d deve ter até 40 caracteres.", pos)
		}
		if ins.Descricao == "" || utf8.RuneCountInString(ins.Descricao) > 80 {
			return nil, fmt.Sprintf("Descrição da insígnia %d deve ter até 80 caracteres.", pos)
		}
		if !regrasInsigniaValidas[ins.Regra] {
			return nil, fmt.Sprintf("Insígnia %d usa regra desconhecida (%s).", pos, ins.Regra)
		}
		if ins.Meta < 1 || ins.Meta > 10000 {
			return nil, fmt.Sprintf("Meta da insígnia %d deve ficar entre 1 e 10000.", pos)
		}
		limpas = append(limpas, ins)
	}
	return limpas, ""
}

// ItemAuditoriaGuilda resume uma conta que bateu o teto diário ou marcou em rajada.
type ItemAuditoriaGuilda struct {
	UsuarioCurto  string `json:"usuario_curto"`
	XPHoje        int    `json:"xp_hoje"`
	EpisodiosHoje int    `json:"episodios_hoje"`
	XPTotal       int    `json:"xp_total"`
	Nivel         int    `json:"nivel"`
	Rank          string `json:"rank"`
	Alerta        string `json:"alerta"`
}

type payloadAdminGuilda struct {
	Economia  EconomiaGuilda   `json:"economia"`
	Ranks     []FaixaRank      `json:"ranks"`
	Insignias []InsigniaConfig `json:"insignias"`
}

// HandleGetAdminGuilda devolve a configuração atual da Guilda, a distribuição de usuários
// por faixa e a lista de auditoria de XP para o Painel Admin.
func (h *GuildaHandler) HandleGetAdminGuilda(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	economia, ranks, insignias := carregarConfigGuilda(dbClient)

	// Lê o xp_ledger inteiro pela policy xp_ledger_admin_select (sql/039) para calcular
	// quantos usuários caem em cada faixa e quem bateu o teto hoje.
	var linhas []struct {
		UserID   string `json:"user_id"`
		XPEarned int    `json:"xp_earned"`
		EarnedAt string `json:"earned_at"`
	}
	if data, _, errL := dbClient.From("xp_ledger").
		Select("user_id,xp_earned,earned_at", "", false).
		Limit(10000, "").
		Execute(); errL == nil {
		_ = json.Unmarshal(data, &linhas)
	}

	agora := time.Now().UTC()
	inicioDia := inicioDoDiaBrasilia(agora)

	porUsuarioTotal := make(map[string]int)
	porUsuarioHoje := make(map[string]int)
	epsUsuarioHoje := make(map[string]int)

	for _, l := range linhas {
		if l.UserID == "" {
			continue
		}
		porUsuarioTotal[l.UserID] += l.XPEarned
		if t, errT := time.Parse(time.RFC3339, l.EarnedAt); errT == nil && !t.Before(inicioDia) {
			porUsuarioHoje[l.UserID] += l.XPEarned
			epsUsuarioHoje[l.UserID]++
		}
	}

	distribuicao := make(map[string]int, len(ranks))
	for _, rk := range ranks {
		distribuicao[rk.Rank] = 0
	}

	auditoria := make([]ItemAuditoriaGuilda, 0)
	for uid, xpTotal := range porUsuarioTotal {
		st := CalcularNivelERank(xpTotal, ranks)
		distribuicao[st.Rank]++

		xpHoje := porUsuarioHoje[uid]
		epsHoje := epsUsuarioHoje[uid]
		alerta := ""
		if economia.TetoDiario > 0 && xpHoje >= economia.TetoDiario {
			alerta = "teto batido hoje"
		} else if epsHoje >= 12 {
			alerta = fmt.Sprintf("%d eps marcados hoje", epsHoje)
		} else if xpHoje > 0 {
			alerta = "ativo hoje"
		}

		curto := uid
		if len(curto) > 8 {
			curto = curto[:8]
		}
		auditoria = append(auditoria, ItemAuditoriaGuilda{
			UsuarioCurto:  curto,
			XPHoje:        xpHoje,
			EpisodiosHoje: epsHoje,
			XPTotal:       xpTotal,
			Nivel:         st.Nivel,
			Rank:          st.Rank,
			Alerta:        alerta,
		})
	}

	sort.Slice(auditoria, func(i, j int) bool {
		if auditoria[i].XPHoje != auditoria[j].XPHoje {
			return auditoria[i].XPHoje > auditoria[j].XPHoje
		}
		return auditoria[i].XPTotal > auditoria[j].XPTotal
	})
	if len(auditoria) > 20 {
		auditoria = auditoria[:20]
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"economia":           economia,
		"ranks":              ranks,
		"insignias":          insignias,
		"distribuicao_ranks": distribuicao,
		"auditoria":          auditoria,
	})
}

// HandleSaveAdminGuilda valida e grava economia, faixas e insígnias em app_settings.
func (h *GuildaHandler) HandleSaveAdminGuilda(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var body payloadAdminGuilda
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256*1024)).Decode(&body); err != nil {
		http.Error(w, "Payload inválido.", http.StatusBadRequest)
		return
	}

	ecLimpa, erroEc := ValidarEconomiaGuilda(body.Economia)
	if erroEc != "" {
		http.Error(w, erroEc, http.StatusBadRequest)
		return
	}

	ranksLimpos, erroRk := ValidarRanksGuilda(body.Ranks)
	if erroRk != "" {
		http.Error(w, erroRk, http.StatusBadRequest)
		return
	}

	insLimpas, erroIns := ValidarInsigniasGuilda(body.Insignias)
	if erroIns != "" {
		http.Error(w, erroIns, http.StatusBadRequest)
		return
	}

	ecJSON, _ := json.Marshal(ecLimpa)
	rkJSON, _ := json.Marshal(ranksLimpos)
	insJSON, _ := json.Marshal(insLimpas)

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Falha ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	agora := time.Now().UTC().Format(time.RFC3339)
	linhas := []map[string]string{
		{"key": chaveGuildaEconomia, "value": string(ecJSON), "updated_at": agora},
		{"key": chaveGuildaRanks, "value": string(rkJSON), "updated_at": agora},
		{"key": chaveGuildaInsignias, "value": string(insJSON), "updated_at": agora},
	}

	if _, _, err := dbClient.From("app_settings").Upsert(linhas, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[GUILDA ADMIN] Falha ao salvar configurações: %v", err)
		http.Error(w, "Não foi possível salvar as configurações da Guilda.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payloadAdminGuilda{
		Economia:  ecLimpa,
		Ranks:     ranksLimpos,
		Insignias: insLimpas,
	})
}
