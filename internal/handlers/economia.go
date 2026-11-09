package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	postgrest "github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func responderErroJSON(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// RegrasEconomia são os números editáveis no Painel Admin, guardados em
// app_settings.economia_cristais (Fase 16, #167).
type RegrasEconomia struct {
	Ativo                    bool `json:"ativo"`
	TetoDiarioCristais       int  `json:"teto_diario_cristais"`
	GanhoMissaoDiaria        int  `json:"ganho_missao_diaria"`
	CristaisPorMissaoDiaria  int  `json:"cristais_por_missao_diaria,omitempty"`
	GanhoDesafioSemanal      int  `json:"ganho_desafio_semanal"`
	GanhoVitoriaLiga         int  `json:"ganho_vitoria_liga"`
	GanhoSubidaDivisao       int  `json:"ganho_subida_divisao"`
	GanhoPrimeiraCartaDia    int  `json:"ganho_primeira_carta_dia"`
	CustoPadraoCarta         int  `json:"custo_padrao_carta"`
	CustoPadraoCosmetico     int  `json:"custo_padrao_cosmetico"`
	DevolucaoAtiva           bool `json:"devolucao_ativa"`
	TaxaRetencaoDevolucaoPct int  `json:"taxa_retencao_devolucao_pct"`
}

const ChaveEconomiaCristais = "economia_cristais"

// RegrasEconomiaPadrao espelha os valores iniciais da economia de Cristais/AniCoins.
func RegrasEconomiaPadrao() RegrasEconomia {
	return RegrasEconomia{
		Ativo:                    true,
		TetoDiarioCristais:       100,
		GanhoMissaoDiaria:        15,
		GanhoDesafioSemanal:      50,
		GanhoVitoriaLiga:         100,
		GanhoSubidaDivisao:       40,
		GanhoPrimeiraCartaDia:    10,
		CustoPadraoCarta:         100,
		CustoPadraoCosmetico:     500,
		DevolucaoAtiva:           true,
		TaxaRetencaoDevolucaoPct: 30,
	}
}

// ValidarRegrasEconomia confere os limites aceitáveis para a economia de Cristais.
func ValidarRegrasEconomia(r RegrasEconomia) string {
	switch {
	case r.TetoDiarioCristais < 10 || r.TetoDiarioCristais > 10000:
		return "O teto diário de Cristais deve ficar entre 10 e 10.000."
	case r.GanhoMissaoDiaria < 1 || r.GanhoMissaoDiaria > r.TetoDiarioCristais:
		return "O ganho por missão diária deve ficar entre 1 e o teto diário."
	case r.GanhoDesafioSemanal < 1 || r.GanhoDesafioSemanal > 5000:
		return "O ganho por desafio semanal deve ficar entre 1 e 5.000."
	case r.GanhoVitoriaLiga < 1 || r.GanhoVitoriaLiga > 5000:
		return "O ganho por vitória na liga deve ficar entre 1 e 5.000."
	case r.GanhoSubidaDivisao < 1 || r.GanhoSubidaDivisao > 5000:
		return "O ganho por subida de divisão deve ficar entre 1 e 5.000."
	case r.GanhoPrimeiraCartaDia < 1 || r.GanhoPrimeiraCartaDia > r.TetoDiarioCristais:
		return "O ganho pela primeira carta do dia deve ficar entre 1 e o teto diário."
	case r.CustoPadraoCarta < 1 || r.CustoPadraoCarta > 50000:
		return "O custo padrão de carta deve ficar entre 1 e 50.000."
	case r.CustoPadraoCosmetico < 1 || r.CustoPadraoCosmetico > 50000:
		return "O custo padrão de cosmético deve ficar entre 1 e 50.000."
	case r.TaxaRetencaoDevolucaoPct < 0 || r.TaxaRetencaoDevolucaoPct > 90:
		return "A taxa de retenção da devolução deve ficar entre 0% e 90%."
	}
	return ""
}

// LerRegrasEconomia busca a configuração em app_settings ou retorna os padrões.
func LerRegrasEconomia(client *supabase.Client) RegrasEconomia {
	regras := RegrasEconomiaPadrao()
	if client == nil {
		return regras
	}
	data, _, err := client.From("app_settings").Select("value", "", false).Eq("key", ChaveEconomiaCristais).Execute()
	if err != nil {
		return regras
	}
	var linhas []struct {
		Value string `json:"value"`
	}
	if json.Unmarshal(data, &linhas) != nil || len(linhas) == 0 {
		return regras
	}
	lidas := RegrasEconomiaPadrao()
	if json.Unmarshal([]byte(linhas[0].Value), &lidas) != nil {
		return regras
	}
	if lidas.TetoDiarioCristais == 0 {
		lidas.TetoDiarioCristais = 100
	}
	if lidas.GanhoMissaoDiaria == 0 {
		if lidas.CristaisPorMissaoDiaria > 0 {
			lidas.GanhoMissaoDiaria = lidas.CristaisPorMissaoDiaria
		} else {
			lidas.GanhoMissaoDiaria = 15
		}
	}
	if lidas.CustoPadraoCarta == 0 {
		lidas.CustoPadraoCarta = 100
	}
	if lidas.CustoPadraoCosmetico == 0 {
		lidas.CustoPadraoCosmetico = 500
	}
	if lidas.TaxaRetencaoDevolucaoPct == 0 {
		lidas.TaxaRetencaoDevolucaoPct = 30
	}
	return lidas
}

type EconomiaHandler struct{}

type MovimentoCristal struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id,omitempty"`
	UserHandle string    `json:"user_handle,omitempty"`
	Quantidade int       `json:"quantidade"`
	Motivo     string    `json:"motivo"`
	Referencia string    `json:"referencia"`
	CriadoEm   time.Time `json:"criado_em"`
}

type CarteiraResponse struct {
	Saldo           int                `json:"saldo"`
	Movimentos      []MovimentoCristal `json:"movimentos"`
	TotalMovimentos int                `json:"total_movimentos"`
	Limite          int                `json:"limite"`
	Offset          int                `json:"offset"`
}

// HandleGetCarteira devolve o saldo e os últimos lançamentos do usuário logado.
func (h *EconomiaHandler) HandleGetCarteira(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	userID, userOk := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || !userOk {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	limite := 20
	if l := r.URL.Query().Get("limite"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limite = parsed
		}
	}
	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	// Consulta o saldo via RPC ou SUM
	saldo := 0
	if database.Client != nil {
		resSaldo := strings.TrimSpace(dbClient.Rpc("meu_saldo_cristais", "", nil))
		if resSaldo != "" {
			if s, err := strconv.Atoi(resSaldo); err == nil {
				saldo = s
			}
		}
	}

	// Busca movimentações recentes paginadas
	data, count, err := dbClient.From("crystal_ledger").
		Select("id,quantidade,motivo,referencia,criado_em", "exact", false).
		Eq("user_id", userID).
		Order("criado_em", &postgrest.OrderOpts{Ascending: false, NullsFirst: false}).
		Range(offset, offset+limite-1, "").
		Execute()

	if err != nil {
		log.Printf("[ECONOMIA] Erro ao buscar movimentos (user=%s): %v", userID, err)
		// Em caso de tabela ainda não criada, responde com saldo 0
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(CarteiraResponse{
			Saldo:           0,
			Movimentos:      []MovimentoCristal{},
			TotalMovimentos: 0,
			Limite:          limite,
			Offset:          offset,
		})
		return
	}

	var movimentos []MovimentoCristal
	if err := json.Unmarshal(data, &movimentos); err != nil {
		movimentos = []MovimentoCristal{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CarteiraResponse{
		Saldo:           saldo,
		Movimentos:      movimentos,
		TotalMovimentos: int(count),
		Limite:          limite,
		Offset:          offset,
	})
}

type AdminEconomiaResponse struct {
	Regras              RegrasEconomia     `json:"regras"`
	TotalCirculacao     int                `json:"total_circulacao"`
	SaldoCaixaLoja      int                `json:"saldo_caixa_loja"`
	TotalTransacoes     int                `json:"total_transacoes"`
	UltimosMovimentos   []MovimentoCristal `json:"ultimos_movimentos"`
	MovimentosAuditoria []MovimentoCristal `json:"movimentos_auditoria"`
}

// HandleGetAdminEconomia devolve as configurações globais, volume em circulação e extrato auditável.
func (h *EconomiaHandler) HandleGetAdminEconomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	regras := LerRegrasEconomia(database.Client)

	totalCirculacao := 0
	saldoCaixa := 0
	if database.Client != nil {
		resTot := strings.TrimSpace(database.Client.Rpc("total_cristais_em_circulacao", "", nil))
		if resTot != "" {
			if tot, err := strconv.Atoi(resTot); err == nil {
				totalCirculacao = tot
			}
		}
		resCaixa := strings.TrimSpace(database.Client.Rpc("saldo_caixa_loja", "", nil))
		if resCaixa != "" {
			if sc, err := strconv.Atoi(resCaixa); err == nil {
				saldoCaixa = sc
			}
		}
	}

	// Busca os últimos 50 movimentos do sistema inteiro para auditoria
	data, count, err := dbClient.From("crystal_ledger").
		Select("id,user_id,quantidade,motivo,referencia,criado_em", "exact", false).
		Order("criado_em", &postgrest.OrderOpts{Ascending: false, NullsFirst: false}).
		Limit(50, "").
		Execute()

	var movimentos []MovimentoCristal
	if err == nil {
		json.Unmarshal(data, &movimentos)
	}

	// Enriquece movimentos com user_handle para exibir @handle em vez de UUID cru
	if len(movimentos) > 0 && database.Client != nil {
		userIDsMap := make(map[string]bool)
		for _, m := range movimentos {
			if m.UserID != "" {
				userIDsMap[m.UserID] = true
			}
		}
		var userIDs []string
		for id := range userIDsMap {
			userIDs = append(userIDs, id)
		}
		if len(userIDs) > 0 {
			profData, _, pErr := database.Client.From("profiles").
				Select("user_id,handle", "", false).
				In("user_id", userIDs).
				Execute()
			if pErr == nil {
				var profs []struct {
					UserID string `json:"user_id"`
					Handle string `json:"handle"`
				}
				if json.Unmarshal(profData, &profs) == nil {
					hMap := make(map[string]string)
					for _, p := range profs {
						hMap[p.UserID] = p.Handle
					}
					for i := range movimentos {
						if h, ok := hMap[movimentos[i].UserID]; ok {
							movimentos[i].UserHandle = h
						}
					}
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AdminEconomiaResponse{
		Regras:              regras,
		TotalCirculacao:     totalCirculacao,
		SaldoCaixaLoja:      saldoCaixa,
		TotalTransacoes:     int(count),
		UltimosMovimentos:   movimentos,
		MovimentosAuditoria: movimentos,
	})
}

// HandleSaveAdminEconomia salva novas regras de economia no app_settings.
func (h *EconomiaHandler) HandleSaveAdminEconomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	var payload struct {
		Ativo                    bool `json:"ativo"`
		TetoDiarioCristais       int  `json:"teto_diario_cristais"`
		GanhoMissaoDiaria        int  `json:"ganho_missao_diaria"`
		CristaisPorMissaoDiaria  int  `json:"cristais_por_missao_diaria"`
		CustoPadraoCarta         int  `json:"custo_padrao_carta"`
		CustoPadraoCosmetico     int  `json:"custo_padrao_cosmetico"`
		DevolucaoAtiva           bool `json:"devolucao_ativa"`
		TaxaRetencaoDevolucaoPct int  `json:"taxa_retencao_devolucao_pct"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}

	existentes := LerRegrasEconomia(database.Client)
	existentes.Ativo = payload.Ativo
	existentes.DevolucaoAtiva = payload.DevolucaoAtiva
	if payload.TaxaRetencaoDevolucaoPct >= 0 && payload.TaxaRetencaoDevolucaoPct <= 90 {
		existentes.TaxaRetencaoDevolucaoPct = payload.TaxaRetencaoDevolucaoPct
	}
	if payload.TetoDiarioCristais > 0 {
		existentes.TetoDiarioCristais = payload.TetoDiarioCristais
	}
	if payload.GanhoMissaoDiaria > 0 {
		existentes.GanhoMissaoDiaria = payload.GanhoMissaoDiaria
	} else if payload.CristaisPorMissaoDiaria > 0 {
		existentes.GanhoMissaoDiaria = payload.CristaisPorMissaoDiaria
	}
	if payload.CustoPadraoCarta > 0 {
		existentes.CustoPadraoCarta = payload.CustoPadraoCarta
	}
	if payload.CustoPadraoCosmetico > 0 {
		existentes.CustoPadraoCosmetico = payload.CustoPadraoCosmetico
	}

	if motivo := ValidarRegrasEconomia(existentes); motivo != "" {
		responderErroJSON(w, http.StatusBadRequest, motivo)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	jsonBytes, err := json.Marshal(existentes)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao serializar regras")
		return
	}

	linha := map[string]interface{}{
		"key":        ChaveEconomiaCristais,
		"value":      string(jsonBytes),
		"updated_at": time.Now().Format(time.RFC3339),
	}

	_, _, err = dbClient.From("app_settings").Upsert(linha, "key", "minimal", "").Execute()
	if err != nil {
		log.Printf("[ECONOMIA] Erro ao gravar regras em app_settings: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao salvar configurações")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":     true,
		"regras": existentes,
	})
}

type AjusteManualPayload struct {
	UserID          string `json:"user_id"`
	Quantidade      int    `json:"quantidade"`
	Motivo          string `json:"motivo"`
	MotivoDetalhado string `json:"motivo_detalhado"`
}

// HandleAjusteManual credita ou debita AniCoins de um usuário manualmente via suporte.
// Aceita tanto UUID direto quanto @handle (resolvendo automaticamente o perfil).
func (h *EconomiaHandler) HandleAjusteManual(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)

	var body AjusteManualPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	rawUser := strings.TrimSpace(body.UserID)
	if rawUser == "" {
		responderErroJSON(w, http.StatusBadRequest, "Informe o @handle ou UUID do usuário.")
		return
	}
	if body.Quantidade == 0 {
		responderErroJSON(w, http.StatusBadRequest, "A quantidade de AniCoins não pode ser zero.")
		return
	}

	motivo := strings.TrimSpace(body.Motivo)
	if motivo == "" {
		motivo = strings.TrimSpace(body.MotivoDetalhado)
	}
	if len(motivo) < 3 {
		responderErroJSON(w, http.StatusBadRequest, "O motivo do ajuste é obrigatório (mínimo 3 caracteres).")
		return
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco de dados indisponível")
		return
	}

	var finalUserID string
	var userHandle string

	if uuidRegex.MatchString(rawUser) {
		finalUserID = rawUser
	} else {
		handleLimpo := strings.ToLower(strings.TrimPrefix(rawUser, "@"))
		data, _, err := database.Client.From("profiles").
			Select("user_id,handle,nome", "", false).
			Eq("handle", handleLimpo).
			Execute()
		if err != nil {
			log.Printf("[ECONOMIA] Erro ao buscar perfil por handle (%s): %v", handleLimpo, err)
			responderErroJSON(w, http.StatusInternalServerError, "Erro ao buscar usuário de destino")
			return
		}

		var perfis []struct {
			UserID string `json:"user_id"`
			Handle string `json:"handle"`
		}
		if err := json.Unmarshal(data, &perfis); err != nil || len(perfis) == 0 {
			responderErroJSON(w, http.StatusNotFound, fmt.Sprintf("Usuário '@%s' não foi encontrado.", handleLimpo))
			return
		}
		finalUserID = perfis[0].UserID
		userHandle = perfis[0].Handle
	}

	ref := fmt.Sprintf("ajuste_admin:%d:%s", time.Now().Unix(), motivo)
	if len(ref) > 120 {
		ref = ref[:120]
	}

	var resSaldo string
	if body.Quantidade > 0 {
		resSaldo = strings.TrimSpace(database.Client.Rpc("creditar_cristais", "", map[string]interface{}{
			"p_user_id":    finalUserID,
			"p_quantidade": body.Quantidade,
			"p_motivo":     "ajuste_admin",
			"p_referencia": ref,
		}))
	} else {
		resSaldo = strings.TrimSpace(database.Client.Rpc("debitar_cristais", "", map[string]interface{}{
			"p_user_id":    finalUserID,
			"p_quantidade": -body.Quantidade,
			"p_motivo":     "ajuste_admin",
			"p_referencia": ref,
		}))
	}

	if strings.Contains(resSaldo, "error") || strings.Contains(resSaldo, "code") || strings.Contains(resSaldo, "Exception") || strings.Contains(resSaldo, "P000") {
		log.Printf("[ECONOMIA] Erro na RPC de ajuste manual (user=%s, qtd=%d): %s", finalUserID, body.Quantidade, resSaldo)
		if strings.Contains(resSaldo, "Saldo insuficiente") || strings.Contains(resSaldo, "P0002") {
			responderErroJSON(w, http.StatusBadRequest, "Saldo insuficiente para debitar essa quantidade de AniCoins.")
			return
		}
		responderErroJSON(w, http.StatusBadRequest, "Falha ao registrar ajuste manual no banco de dados.")
		return
	}

	novoSaldo, _ := strconv.Atoi(resSaldo)
	log.Printf("[ECONOMIA] Ajuste manual por admin=%s: user=%s (@%s), qtd=%d, novo_saldo=%d, ref=%s", adminID, finalUserID, userHandle, body.Quantidade, novoSaldo, ref)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":                  true,
		"novo_saldo":          novoSaldo,
		"user_id":             finalUserID,
		"destinatario_handle": userHandle,
		"mensagem":            fmt.Sprintf("Ajuste de %d AniCoins realizado com sucesso.", body.Quantidade),
	})
}

type TransferirPayload struct {
	DestinatarioHandle string `json:"destinatario_handle"`
	Quantidade         int    `json:"quantidade"`
}

// HandleTransferirAniCoins transfere AniCoins do usuário logado para outro usuário via handle.
func (h *EconomiaHandler) HandleTransferirAniCoins(w http.ResponseWriter, r *http.Request) {
	remetenteID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || remetenteID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var body TransferirPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Corpo inválido", http.StatusBadRequest)
		return
	}

	handle := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(body.DestinatarioHandle), "@"))
	if handle == "" {
		http.Error(w, "Informe o @handle do usuário que vai receber as AniCoins.", http.StatusBadRequest)
		return
	}

	if body.Quantidade <= 0 {
		http.Error(w, "A quantidade de AniCoins a transferir deve ser maior que zero.", http.StatusBadRequest)
		return
	}

	if body.Quantidade > 50000 {
		http.Error(w, "O limite máximo por transferência é de 50.000 AniCoins.", http.StatusBadRequest)
		return
	}

	if database.Client == nil {
		http.Error(w, "Serviço de banco indisponível", http.StatusServiceUnavailable)
		return
	}

	// Busca o destinatário pelo handle em profiles usando service role
	data, _, err := database.Client.From("profiles").
		Select("user_id,handle,nome,publico", "", false).
		Eq("handle", handle).
		Execute()

	if err != nil {
		log.Printf("[ECONOMIA] Erro ao buscar perfil de destino (@%s): %v", handle, err)
		http.Error(w, "Erro ao buscar usuário de destino", http.StatusInternalServerError)
		return
	}

	var perfis []struct {
		UserID  string `json:"user_id"`
		Handle  string `json:"handle"`
		Nome    string `json:"nome"`
		Publico bool   `json:"publico"`
	}
	if err := json.Unmarshal(data, &perfis); err != nil || len(perfis) == 0 {
		http.Error(w, fmt.Sprintf("Usuário @%s não foi encontrado.", handle), http.StatusNotFound)
		return
	}

	destinatario := perfis[0]
	if destinatario.UserID == remetenteID {
		http.Error(w, "Você não pode transferir AniCoins para você mesmo.", http.StatusBadRequest)
		return
	}

	// Executa a RPC atômica transferir_cristais no Postgres com service role
	res := database.Client.Rpc("transferir_cristais", "", map[string]interface{}{
		"p_remetente_id":    remetenteID,
		"p_destinatario_id": destinatario.UserID,
		"p_quantidade":      body.Quantidade,
	})

	resTrim := strings.TrimSpace(res)
	if strings.Contains(resTrim, "Saldo insuficiente") || strings.Contains(resTrim, "P0002") {
		http.Error(w, "Saldo insuficiente de AniCoins para realizar a transferência.", http.StatusBadRequest)
		return
	}
	if strings.Contains(resTrim, "error") || strings.Contains(resTrim, "Exception") {
		log.Printf("[ECONOMIA] Erro na RPC transferir_cristais: %s", resTrim)
		http.Error(w, "Não foi possível concluir a transferência de AniCoins.", http.StatusBadRequest)
		return
	}

	var resultadoRPC map[string]interface{}
	json.Unmarshal([]byte(resTrim), &resultadoRPC)

	log.Printf("[ECONOMIA] Transferência de AniCoins concluída: remetente=%s -> destinatario=%s (@%s), qtd=%d",
		remetenteID, destinatario.UserID, destinatario.Handle, body.Quantidade)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sucesso":             true,
		"destinatario_handle": destinatario.Handle,
		"destinatario_nome":   destinatario.Nome,
		"quantidade":          body.Quantidade,
		"resultado":           resultadoRPC,
	})
}

type DestinatarioSugestao struct {
	UserID string `json:"user_id"`
	Handle string `json:"handle"`
	Nome   string `json:"nome"`
}

// HandleBuscarDestinatario busca usuários por prefixo de handle para facilitar a transferência.
func (h *EconomiaHandler) HandleBuscarDestinatario(w http.ResponseWriter, r *http.Request) {
	termo := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(r.URL.Query().Get("q")), "@"))
	if len(termo) < 2 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]DestinatarioSugestao{})
		return
	}

	if database.Client == nil {
		http.Error(w, "Serviço indisponível", http.StatusServiceUnavailable)
		return
	}

	data, _, err := database.Client.From("profiles").
		Select("user_id,handle,nome", "", false).
		Ilike("handle", termo+"%").
		Eq("publico", "true").
		Limit(5, "").
		Execute()

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]DestinatarioSugestao{})
		return
	}

	var lista []DestinatarioSugestao
	if err := json.Unmarshal(data, &lista); err != nil {
		lista = []DestinatarioSugestao{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lista)
}

type SacarCaixaPayload struct {
	Destinatario string `json:"destinatario"` // @handle, UUID ou vazio para o próprio admin
	Quantidade   int    `json:"quantidade"`
	Motivo       string `json:"motivo"`
}

// HandleSacarCaixaLoja transfere AniCoins do cofre/caixa da plataforma para qualquer usuário.
func (h *EconomiaHandler) HandleSacarCaixaLoja(w http.ResponseWriter, r *http.Request) {
	adminID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || adminID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	var body SacarCaixaPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}

	if body.Quantidade <= 0 {
		responderErroJSON(w, http.StatusBadRequest, "A quantidade de AniCoins a transferir do Caixa deve ser maior que zero.")
		return
	}

	motivo := strings.TrimSpace(body.Motivo)
	if motivo == "" {
		motivo = "Saque do Caixa da Loja pela administração"
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco indisponível")
		return
	}

	finalUserID := adminID
	dest := strings.TrimSpace(body.Destinatario)
	if dest != "" && strings.ToLower(dest) != "eu" && strings.ToLower(dest) != "admin" {
		if uuidRegex.MatchString(dest) {
			finalUserID = dest
		} else {
			handleLimpo := strings.ToLower(strings.TrimPrefix(dest, "@"))
			data, _, err := database.Client.From("profiles").
				Select("user_id,handle", "", false).
				Eq("handle", handleLimpo).
				Execute()
			if err != nil {
				responderErroJSON(w, http.StatusInternalServerError, "Erro ao buscar destinatário")
				return
			}
			var profs []struct {
				UserID string `json:"user_id"`
				Handle string `json:"handle"`
			}
			if json.Unmarshal(data, &profs) != nil || len(profs) == 0 {
				responderErroJSON(w, http.StatusNotFound, fmt.Sprintf("Destinatário '@%s' não encontrado.", handleLimpo))
				return
			}
			finalUserID = profs[0].UserID
		}
	}

	resRaw := strings.TrimSpace(database.Client.Rpc("sacar_caixa_loja", "", map[string]interface{}{
		"p_destinatario_id": finalUserID,
		"p_quantidade":      body.Quantidade,
		"p_motivo":          motivo,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") || strings.Contains(resRaw, "P000") {
		log.Printf("[ECONOMIA] Erro na RPC sacar_caixa_loja: %s", resRaw)
		if strings.Contains(resRaw, "P0002") || strings.Contains(resRaw, "Saldo insuficiente") {
			responderErroJSON(w, http.StatusUnprocessableEntity, "Saldo insuficiente no Caixa da Loja para este saque.")
			return
		}
		responderErroJSON(w, http.StatusBadRequest, "Falha ao registrar saque do Caixa da Loja.")
		return
	}

	var resultado map[string]interface{}
	json.Unmarshal([]byte(resRaw), &resultado)
	if resultado == nil {
		resultado = map[string]interface{}{
			"sucesso":    true,
			"mensagem":   fmt.Sprintf("%d AniCoins transferidas do Caixa com sucesso!", body.Quantidade),
			"quantidade": body.Quantidade,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleSetApoiador permite ao administrador conceder ou revogar o status de Apoiador de um usuário.
func (h *EconomiaHandler) HandleSetApoiador(w http.ResponseWriter, r *http.Request) {
	alvoID := strings.TrimSpace(chi.URLParam(r, "id"))
	if alvoID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do usuário obrigatório")
		return
	}

	var body struct {
		Apoiador bool `json:"apoiador"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}

	if database.Client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Serviço de banco indisponível")
		return
	}

	_, _, err := database.Client.From("profiles").
		Update(map[string]interface{}{
			"apoiador": body.Apoiador,
		}, "", "").
		Eq("user_id", alvoID).
		Execute()

	if err != nil {
		log.Printf("[ECONOMIA] Erro ao atualizar status de apoiador (user=%s): %v", alvoID, err)
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao atualizar status de apoiador")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":       true,
		"user_id":  alvoID,
		"apoiador": body.Apoiador,
	})
}

// ApoiadorConfig define as opções de apoio comunitário externo (Fase 16 · Issue #178).
type ApoiadorConfig struct {
	Ativo    bool   `json:"ativo"`
	Link     string `json:"link"`
	ChavePIX string `json:"chave_pix"`
	Mensagem string `json:"mensagem"`
}

const ChaveApoiadorConfig = "apoiador_config"

// ApoiadorConfigPadrao devolve a configuração padrão de apoio externo.
func ApoiadorConfigPadrao() ApoiadorConfig {
	return ApoiadorConfig{
		Ativo:    true,
		Link:     "https://apoia.se/anideck",
		ChavePIX: "",
		Mensagem: "Ajude a manter os servidores e a IA do AniDeck funcionando com curadoria própria e sem anúncios invasivos.",
	}
}

// HandleGetApoiador é uma rota pública que devolve o link e dados de apoio configurados.
func (h *EconomiaHandler) HandleGetApoiador(w http.ResponseWriter, r *http.Request) {
	padrao := ApoiadorConfigPadrao()
	if database.Client == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(padrao)
		return
	}

	data, _, err := database.Client.From("app_settings").
		Select("value", "", false).
		Eq("key", ChaveApoiadorConfig).
		Execute()

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(padrao)
		return
	}

	var rows []struct {
		Value json.RawMessage `json:"value"`
	}
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(padrao)
		return
	}

	var config ApoiadorConfig
	if err := json.Unmarshal(rows[0].Value, &config); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(padrao)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// HandleSalvarApoiador atualiza a configuração de apoio comunitário (apenas admin).
func (h *EconomiaHandler) HandleSalvarApoiador(w http.ResponseWriter, r *http.Request) {
	token, _ := r.Context().Value(middleware.TokenKey).(string)
	client := database.Client
	if token != "" {
		if c, err := database.ClientWithToken(token); err == nil {
			client = c
		}
	}

	if client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco indisponível")
		return
	}

	var config ApoiadorConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}

	config.Link = strings.TrimSpace(config.Link)
	config.ChavePIX = strings.TrimSpace(config.ChavePIX)
	config.Mensagem = strings.TrimSpace(config.Mensagem)

	payload := map[string]interface{}{
		"key":   ChaveApoiadorConfig,
		"value": config,
	}

	_, _, err := client.From("app_settings").
		Upsert(payload, "", "key", "").
		Execute()

	if err != nil {
		log.Printf("[APOIADOR] Erro ao salvar apoiador_config: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Não foi possível salvar as configurações de apoio.")
		return
	}

	log.Printf("[APOIADOR] Configurações de apoiador atualizadas com sucesso: link=%s, pix=%s", config.Link, config.ChavePIX)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sucesso": true,
		"config":  config,
	})
}
