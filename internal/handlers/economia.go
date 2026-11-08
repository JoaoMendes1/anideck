package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	postgrest "github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// RegrasEconomia são os números editáveis no Painel Admin, guardados em
// app_settings.economia_cristais (Fase 16, #167).
type RegrasEconomia struct {
	TetoDiarioCristais    int `json:"teto_diario_cristais"`
	GanhoMissaoDiaria     int `json:"ganho_missao_diaria"`
	GanhoDesafioSemanal   int `json:"ganho_desafio_semanal"`
	GanhoVitoriaLiga      int `json:"ganho_vitoria_liga"`
	GanhoSubidaDivisao    int `json:"ganho_subida_divisao"`
	GanhoPrimeiraCartaDia int `json:"ganho_primeira_carta_dia"`
}

const ChaveEconomiaCristais = "economia_cristais"

// RegrasEconomiaPadrao espelha os valores iniciais da economia de Cristais.
func RegrasEconomiaPadrao() RegrasEconomia {
	return RegrasEconomia{
		TetoDiarioCristais:    100,
		GanhoMissaoDiaria:     15,
		GanhoDesafioSemanal:   50,
		GanhoVitoriaLiga:      100,
		GanhoSubidaDivisao:    40,
		GanhoPrimeiraCartaDia: 10,
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
	if json.Unmarshal([]byte(linhas[0].Value), &lidas) != nil || ValidarRegrasEconomia(lidas) != "" {
		return regras
	}
	return lidas
}

type EconomiaHandler struct{}

type MovimentoCristal struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id,omitempty"`
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
	Regras            RegrasEconomia     `json:"regras"`
	TotalCirculacao   int                `json:"total_circulacao"`
	TotalTransacoes   int                `json:"total_transacoes"`
	UltimosMovimentos []MovimentoCristal `json:"ultimos_movimentos"`
}

// HandleGetAdminEconomia devolve as configurações globais, volume em circulação e extrato auditável.
func (h *EconomiaHandler) HandleGetAdminEconomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	regras := LerRegrasEconomia(database.Client)

	totalCirculacao := 0
	if database.Client != nil {
		resTot := strings.TrimSpace(database.Client.Rpc("total_cristais_em_circulacao", "", nil))
		if resTot != "" {
			if tot, err := strconv.Atoi(resTot); err == nil {
				totalCirculacao = tot
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AdminEconomiaResponse{
		Regras:            regras,
		TotalCirculacao:   totalCirculacao,
		TotalTransacoes:   int(count),
		UltimosMovimentos: movimentos,
	})
}

// HandleSaveAdminEconomia salva novas regras de economia no app_settings.
func (h *EconomiaHandler) HandleSaveAdminEconomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var regras RegrasEconomia
	if err := json.NewDecoder(r.Body).Decode(&regras); err != nil {
		http.Error(w, "Corpo inválido", http.StatusBadRequest)
		return
	}

	if motivo := ValidarRegrasEconomia(regras); motivo != "" {
		http.Error(w, motivo, http.StatusBadRequest)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	jsonBytes, err := json.Marshal(regras)
	if err != nil {
		http.Error(w, "Erro ao serializar regras", http.StatusInternalServerError)
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
		http.Error(w, "Erro ao salvar configurações", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":     true,
		"regras": regras,
	})
}

type AjusteManualPayload struct {
	UserID          string `json:"user_id"`
	Quantidade      int    `json:"quantidade"`
	MotivoDetalhado string `json:"motivo_detalhado"`
}

// HandleAjusteManual credita ou debita Cristais de um usuário manualmente via suporte.
func (h *EconomiaHandler) HandleAjusteManual(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.UserIDKey).(string)

	var body AjusteManualPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	userID := strings.TrimSpace(body.UserID)
	if userID == "" {
		http.Error(w, "user_id é obrigatório", http.StatusBadRequest)
		return
	}
	if body.Quantidade == 0 {
		http.Error(w, "A quantidade de Cristais não pode ser zero", http.StatusBadRequest)
		return
	}
	motivo := strings.TrimSpace(body.MotivoDetalhado)
	if len(motivo) < 3 {
		http.Error(w, "O motivo detalhado do ajuste é obrigatório (mínimo 3 caracteres)", http.StatusBadRequest)
		return
	}

	if database.Client == nil {
		http.Error(w, "Cliente de banco indisponível", http.StatusInternalServerError)
		return
	}

	ref := fmt.Sprintf("ajuste_admin:%d:%s", time.Now().Unix(), motivo)
	if len(ref) > 120 {
		ref = ref[:120]
	}

	var resSaldo string
	if body.Quantidade > 0 {
		resSaldo = strings.TrimSpace(database.Client.Rpc("creditar_cristais", "", map[string]interface{}{
			"p_user_id":    userID,
			"p_quantidade": body.Quantidade,
			"p_motivo":     "ajuste_admin",
			"p_referencia": ref,
		}))
	} else {
		resSaldo = strings.TrimSpace(database.Client.Rpc("debitar_cristais", "", map[string]interface{}{
			"p_user_id":    userID,
			"p_quantidade": -body.Quantidade,
			"p_motivo":     "ajuste_admin",
			"p_referencia": ref,
		}))
	}

	novoSaldo, _ := strconv.Atoi(resSaldo)
	log.Printf("[ECONOMIA] Ajuste manual por admin=%s: user=%s, qtd=%d, novo_saldo=%d, ref=%s", adminID, userID, body.Quantidade, novoSaldo, ref)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":         true,
		"novo_saldo": novoSaldo,
		"mensagem":   fmt.Sprintf("Ajuste de %d Cristais realizado com sucesso.", body.Quantidade),
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
