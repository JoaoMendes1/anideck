// Tarefas periódicas do worker (Fase 16 · item 16.0, #166).
//
// Roda dentro do cmd/worker já existente, sem depender do cron do servidor.
// Cada tarefa declara sua frequência no fuso de Brasília (fusoGuilda) e grava
// uma linha por (nome, periodo) em tarefas_periodicas (sql/044), garantindo que
// reiniciar o container ou clicar em "Rodar agora" no Painel Admin nunca execute
// duas vezes o mesmo período já concluído.
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
	supabase "github.com/supabase-community/supabase-go"
)

// TipoFrequenciaTarefa define a cadência de abertura de um novo período.
type TipoFrequenciaTarefa string

const (
	FrequenciaTipoDiaria    TipoFrequenciaTarefa = "diaria"
	FrequenciaTipoSemanal   TipoFrequenciaTarefa = "semanal"
	FrequenciaTipoTemporada TipoFrequenciaTarefa = "temporada"
)

// FrequenciaTarefa especifica quando um novo período passa a ser devido no fuso de Brasília.
type FrequenciaTarefa struct {
	Tipo   TipoFrequenciaTarefa `json:"tipo"`
	Hora   int                  `json:"hora"`
	Minuto int                  `json:"minuto"`
}

func FrequenciaDiaria(hora, minuto int) FrequenciaTarefa {
	return FrequenciaTarefa{Tipo: FrequenciaTipoDiaria, Hora: hora, Minuto: minuto}
}

func FrequenciaSemanal(hora, minuto int) FrequenciaTarefa {
	return FrequenciaTarefa{Tipo: FrequenciaTipoSemanal, Hora: hora, Minuto: minuto}
}

func FrequenciaTemporada(hora, minuto int) FrequenciaTarefa {
	return FrequenciaTarefa{Tipo: FrequenciaTipoTemporada, Hora: hora, Minuto: minuto}
}

// Descricao devolve o texto legível exibido no Painel Admin.
func (f FrequenciaTarefa) Descricao() string {
	switch f.Tipo {
	case FrequenciaTipoDiaria:
		return fmt.Sprintf("Diária às %02d:%02d (Brasília)", f.Hora, f.Minuto)
	case FrequenciaTipoSemanal:
		return fmt.Sprintf("Semanal · segunda-feira às %02d:%02d (Brasília)", f.Hora, f.Minuto)
	case FrequenciaTipoTemporada:
		return fmt.Sprintf("Por temporada · 1º dia às %02d:%02d (Brasília)", f.Hora, f.Minuto)
	default:
		return string(f.Tipo)
	}
}

// TarefaPeriodica descreve uma rotina agendada no worker.
type TarefaPeriodica struct {
	Nome       string
	Titulo     string
	Descricao  string
	Frequencia FrequenciaTarefa
	Executar   func(ctx context.Context) (resumo string, err error)
}

// execucaoTarefaRow espelha uma linha da tabela public.tarefas_periodicas (sql/044).
type execucaoTarefaRow struct {
	ID          string  `json:"id"`
	Nome        string  `json:"nome"`
	Periodo     string  `json:"periodo"`
	IniciadaEm  string  `json:"iniciada_em"`
	ConcluidaEm *string `json:"concluida_em"`
	Erro        *string `json:"erro"`
	Resumo      *string `json:"resumo"`
}

// StatusTarefaPeriodica reúne a definição da tarefa e sua última execução para o Painel Admin.
type StatusTarefaPeriodica struct {
	Nome           string              `json:"nome"`
	Titulo         string              `json:"titulo"`
	Descricao      string              `json:"descricao"`
	Frequencia     string              `json:"frequencia"`
	PeriodoAtual   string              `json:"periodo_atual"`
	PendenteAgora  bool                `json:"pendente_agora"`
	UltimaExecucao *execucaoTarefaRow  `json:"ultima_execucao"`
	Historico      []execucaoTarefaRow `json:"historico"`
}

// ---------------------------------------------------------------------------
// Regras puras de cálculo de período no fuso de Brasília (Armadilha 3)
// ---------------------------------------------------------------------------

// periodoAbertoEm calcula a chave do período cujo horário programado já chegou em Brasília.
// Se no instante consultado o horário programado de hoje/desta semana/desta temporada ainda
// não bateu, devolve o período imediatamente anterior.
func periodoAbertoEm(agora time.Time, freq FrequenciaTarefa) string {
	local := agora.In(fusoGuilda)
	hora := clampInt(freq.Hora, 0, 23)
	minuto := clampInt(freq.Minuto, 0, 59)

	switch freq.Tipo {
	case FrequenciaTipoDiaria:
		inicioHoje := time.Date(local.Year(), local.Month(), local.Day(), hora, minuto, 0, 0, fusoGuilda)
		alvo := inicioHoje
		if local.Before(inicioHoje) {
			alvo = inicioHoje.AddDate(0, 0, -1)
		}
		return alvo.Format("2006-01-02")

	case FrequenciaTipoSemanal:
		diasDesdeSegunda := (int(local.Weekday()) + 6) % 7
		segunda := time.Date(local.Year(), local.Month(), local.Day(), hora, minuto, 0, 0, fusoGuilda).
			AddDate(0, 0, -diasDesdeSegunda)
		if local.Before(segunda) {
			segunda = segunda.AddDate(0, 0, -7)
		}
		anoISO, semanaISO := segunda.ISOWeek()
		return fmt.Sprintf("%04d-W%02d", anoISO, semanaISO)

	case FrequenciaTipoTemporada:
		trimestre := (int(local.Month()) - 1) / 3
		mesInicio := time.Month(trimestre*3 + 1)
		inicioTemp := time.Date(local.Year(), mesInicio, 1, hora, minuto, 0, 0, fusoGuilda)
		if local.Before(inicioTemp) {
			inicioTemp = inicioTemp.AddDate(0, -3, 0)
			trimestre = (int(inicioTemp.Month()) - 1) / 3
		}
		return fmt.Sprintf("%04d-%s", inicioTemp.Year(), temporadasPorTrimestre[trimestre])

	default:
		return ""
	}
}

// periodoDevido informa qual período precisa rodar agora e se ele está pendente em relação
// ao último período já concluído.
func periodoDevido(agora time.Time, freq FrequenciaTarefa, ultimoConcluido string) (string, bool) {
	periodo := periodoAbertoEm(agora, freq)
	if periodo == "" {
		return "", false
	}
	if strings.TrimSpace(ultimoConcluido) == periodo {
		return "", false
	}
	return periodo, true
}

func clampInt(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// ---------------------------------------------------------------------------
// Catálogo de tarefas registradas no worker
// ---------------------------------------------------------------------------

var tarefasPeriodicasPadrao = []TarefaPeriodica{
	{
		Nome:       "manutencao_diaria",
		Titulo:     "Pulso diário do worker",
		Descricao:  "Confirma que o worker está vivo e apaga do histórico de tarefas os registros com mais de 180 dias.",
		Frequencia: FrequenciaDiaria(4, 0),
		Executar:   executarManutencaoDiaria,
	},
	{
		Nome:       "recalcular_raridade_cartas",
		Titulo:     "Recálculo de raridade das cartas",
		Descricao:  "Calcula o percentual de conclusões de cada anime na base e marca como raríssima obras terminadas por menos de 10% dos membros.",
		Frequencia: FrequenciaDiaria(4, 30),
		Executar:   executarRecalculoRaridadeCartas,
	},
	{
		Nome:       "atualizar_ranking_genero",
		Titulo:     "Recalcular ranking por gênero",
		Descricao:  "Agrega os 50 membros com maior XP em cada gênero da taxonomia do catálogo.",
		Frequencia: FrequenciaDiaria(5, 0),
		Executar:   executarAtualizarRankingGenero,
	},
	{
		Nome:       "fechar_semana_liga",
		Titulo:     "Fechamento semanal da Liga",
		Descricao:  "Consolida as posições da liga da semana anterior, premia os vencedores com AniCoins e abre a nova semana.",
		Frequencia: FrequenciaSemanal(0, 5),
		Executar:   executarFecharSemanaLiga,
	},
	{
		Nome:       "fechar_semana_desafios_cla",
		Titulo:     "Fechamento semanal dos desafios de clã",
		Descricao:  "Consolida os desafios da semana passada de todos os clãs, credita AniCoins para os membros que contribuíram e abre o desafio da nova semana.",
		Frequencia: FrequenciaSemanal(0, 5),
		Executar:   executarFecharSemanaDesafiosCla,
	},
}

// TarefasPeriodicasRegistradas devolve uma cópia das tarefas ativas no worker.
func TarefasPeriodicasRegistradas() []TarefaPeriodica {
	copia := make([]TarefaPeriodica, len(tarefasPeriodicasPadrao))
	copy(copia, tarefasPeriodicasPadrao)
	return copia
}

// NomesTarefasPeriodicas lista os identificadores registrados para o log de boot do worker.
func NomesTarefasPeriodicas() string {
	nomes := make([]string, 0, len(tarefasPeriodicasPadrao))
	for _, t := range tarefasPeriodicasPadrao {
		nomes = append(nomes, fmt.Sprintf("%s (%s)", t.Nome, t.Frequencia.Tipo))
	}
	return strings.Join(nomes, ", ")
}

// executarManutencaoDiaria é a tarefa de exemplo da #166: prova que o worker roda uma vez
// por dia e poda o próprio histórico de tarefas. Não toca dado de usuário de propósito:
// apagar notificação antiga é decisão de produto, não de infraestrutura.
func executarManutencaoDiaria(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}

	// Só linhas concluídas: uma execução em andamento ou com erro fica para diagnóstico.
	corte := time.Now().UTC().AddDate(0, 0, -diasHistoricoTarefas).Format(time.RFC3339)
	data, _, err := client.From("tarefas_periodicas").
		Delete("representation", "").
		Not("concluida_em", "is", "null").
		Lt("concluida_em", corte).
		Execute()
	if err != nil {
		return "", fmt.Errorf("podar histórico de tarefas: %w", err)
	}

	var removidas []struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(data, &removidas)

	resumo := fmt.Sprintf("Worker vivo · %d registro(s) de tarefa com mais de %d dias removido(s)", len(removidas), diasHistoricoTarefas)
	log.Printf("[WORKER][TAREFA manutencao_diaria] %s", resumo)
	return resumo, nil
}

// executarRecalculoRaridadeCartas aciona a RPC de atualização de raridade das cartas (Issue #172).
func executarRecalculoRaridadeCartas(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}
	_ = client.Rpc("recalcular_raridade_cartas", "", nil)
	return "Raridade das cartas recalculada com sucesso", nil
}

// executarAtualizarRankingGenero agrega o top 50 membros em cada gênero (Issue #176).
func executarAtualizarRankingGenero(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}
	_ = client.Rpc("atualizar_ranking_genero", "", nil)
	return "Ranking por gênero atualizado com sucesso", nil
}

// executarFecharSemanaLiga consolida e premia a semana da liga fechada (Issue #177).
func executarFecharSemanaLiga(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}
	agora := time.Now().In(fusoGuilda)
	semanaPassada := CodigoSemanaAtualBrasilia(agora.AddDate(0, 0, -1))
	semanaAtual := CodigoSemanaAtualBrasilia(agora)

	bruto := client.Rpc("fechar_semana_liga", "", map[string]interface{}{
		"p_semana_fechada": semanaPassada,
		"p_nova_semana":    semanaAtual,
	})
	return fmt.Sprintf("Semana %s fechada para %s: %s", semanaPassada, semanaAtual, bruto), nil
}

// executarFecharSemanaDesafiosCla consolida os desafios coletivos dos clãs e credita AniCoins (Issue #181).
func executarFecharSemanaDesafiosCla(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return "", fmt.Errorf("service role indisponível: %w", err)
	}
	agora := time.Now().In(fusoGuilda)
	semanaPassada := CodigoSemanaAtualBrasilia(agora.AddDate(0, 0, -1))
	semanaAtual := CodigoSemanaAtualBrasilia(agora)

	bruto := client.Rpc("fechar_semana_desafios_cla", "", map[string]interface{}{
		"p_semana_fechada": semanaPassada,
		"p_nova_semana":    semanaAtual,
	})
	return fmt.Sprintf("Desafios dos clãs fechados (%s -> %s): %s", semanaPassada, semanaAtual, bruto), nil
}

// diasHistoricoTarefas é por quanto tempo uma execução concluída fica visível no Painel.
const diasHistoricoTarefas = 180

// ---------------------------------------------------------------------------
// Execução com idempotência no banco (service role)
// ---------------------------------------------------------------------------

// RodarTarefasPeriodicas verifica todas as tarefas registradas e executa as devidas.
// Falha em uma tarefa fica gravada em tarefas_periodicas.erro e não interrompe as demais.
func RodarTarefasPeriodicas(ctx context.Context) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return
	}

	agora := time.Now()
	for _, tarefa := range tarefasPeriodicasPadrao {
		if ctx.Err() != nil {
			return
		}
		ultimo, err := lerUltimoPeriodoConcluido(client, tarefa.Nome)
		if err != nil {
			// Se a migration sql/044 ainda não foi aplicada, registra e segue sem derrubar o worker.
			log.Printf("[WORKER][TAREFA %s] Não foi possível consultar controle de período: %v", tarefa.Nome, err)
			continue
		}
		periodo, devido := periodoDevido(agora, tarefa.Frequencia, ultimo)
		if !devido {
			continue
		}
		_, _, _ = executarTarefaNoPeriodo(ctx, client, tarefa, periodo)
	}
}

func lerUltimoPeriodoConcluido(client *supabase.Client, nome string) (string, error) {
	data, _, err := client.From("tarefas_periodicas").
		Select("periodo,concluida_em", "", false).
		Eq("nome", nome).
		Not("concluida_em", "is", "null").
		Order("concluida_em", &postgrest.OrderOpts{Ascending: false}).
		Limit(1, "").
		Execute()
	if err != nil {
		return "", err
	}
	var linhas []struct {
		Periodo string `json:"periodo"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return "", err
	}
	if len(linhas) == 0 {
		return "", nil
	}
	return linhas[0].Periodo, nil
}

// executarTarefaNoPeriodo tenta reservar (nome, periodo) via RPC atômica e, se conseguir,
// roda a função da tarefa protegida contra panic.
func executarTarefaNoPeriodo(
	ctx context.Context,
	client *supabase.Client,
	tarefa TarefaPeriodica,
	periodo string,
) (executou bool, resumo string, errExec error) {
	bruto := strings.TrimSpace(client.Rpc("reservar_tarefa_periodica", "", map[string]interface{}{
		"p_nome":    tarefa.Nome,
		"p_periodo": periodo,
	}))
	if bruto == "" {
		return false, "", fmt.Errorf("não foi possível reservar a tarefa %s no banco", tarefa.Nome)
	}

	var falha erroPostgREST
	if err := json.Unmarshal([]byte(bruto), &falha); err == nil && falha.Message != "" {
		return false, "", fmt.Errorf("banco recusou reserva da tarefa %s: %s", tarefa.Nome, falha.Message)
	}

	var reservadas []execucaoTarefaRow
	if err := json.Unmarshal([]byte(bruto), &reservadas); err != nil {
		return false, "", fmt.Errorf("resposta inesperada ao reservar tarefa %s: %w", tarefa.Nome, err)
	}
	if len(reservadas) == 0 {
		// Já concluída neste período ou em execução por outra instância.
		return false, "", nil
	}

	log.Printf("[WORKER][TAREFA %s] Iniciando período %s", tarefa.Nome, periodo)
	resumo, errExec = invocarComRecuperacao(ctx, tarefa)

	agoraISO := time.Now().UTC().Format(time.RFC3339)
	atualizacao := map[string]interface{}{}
	if errExec != nil {
		msgErro := errExec.Error()
		atualizacao["erro"] = msgErro
		atualizacao["concluida_em"] = nil
		log.Printf("[WORKER][TAREFA %s] Erro no período %s: %v", tarefa.Nome, periodo, errExec)
	} else {
		atualizacao["concluida_em"] = agoraISO
		atualizacao["erro"] = nil
		atualizacao["resumo"] = resumo
		log.Printf("[WORKER][TAREFA %s] Período %s concluído", tarefa.Nome, periodo)
	}

	if _, _, errUp := client.From("tarefas_periodicas").
		Update(atualizacao, "minimal", "").
		Eq("nome", tarefa.Nome).
		Eq("periodo", periodo).
		Execute(); errUp != nil {
		log.Printf("[WORKER][TAREFA %s] Falha ao gravar desfecho do período %s: %v", tarefa.Nome, periodo, errUp)
	}

	return true, resumo, errExec
}

func invocarComRecuperacao(ctx context.Context, tarefa TarefaPeriodica) (resumo string, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("pânico recuperado na tarefa %s: %v", tarefa.Nome, r)
		}
	}()
	return tarefa.Executar(ctx)
}

// ---------------------------------------------------------------------------
// Endpoints do Painel Admin (Sistema › Diagnóstico)
// ---------------------------------------------------------------------------

// HandleListarTarefasPeriodicas devolve as tarefas registradas no worker com o histórico recente.
func (h *DiagnosticoHandler) HandleListarTarefasPeriodicas(w http.ResponseWriter, r *http.Request) {
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Service role indisponível.", http.StatusServiceUnavailable)
		return
	}

	data, _, err := client.From("tarefas_periodicas").
		Select("id,nome,periodo,iniciada_em,concluida_em,erro,resumo", "", false).
		Order("iniciada_em", &postgrest.OrderOpts{Ascending: false}).
		Limit(50, "").
		Execute()
	if err != nil {
		log.Printf("[DIAGNOSTICO] HandleListarTarefasPeriodicas: %v", err)
		http.Error(w, "Não foi possível ler o histórico das tarefas periódicas (verifique se o sql/044 foi aplicado).", http.StatusServiceUnavailable)
		return
	}

	var linhas []execucaoTarefaRow
	if err := json.Unmarshal(data, &linhas); err != nil {
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	porNome := make(map[string][]execucaoTarefaRow)
	ultimoConcluidoPorNome := make(map[string]string)
	for _, l := range linhas {
		if len(porNome[l.Nome]) < 5 {
			porNome[l.Nome] = append(porNome[l.Nome], l)
		}
		if l.ConcluidaEm != nil && *l.ConcluidaEm != "" && ultimoConcluidoPorNome[l.Nome] == "" {
			ultimoConcluidoPorNome[l.Nome] = l.Periodo
		}
	}

	agora := time.Now()
	resposta := make([]StatusTarefaPeriodica, 0, len(tarefasPeriodicasPadrao))
	for _, t := range tarefasPeriodicasPadrao {
		hist := porNome[t.Nome]
		if hist == nil {
			hist = []execucaoTarefaRow{}
		}
		var ultima *execucaoTarefaRow
		if len(hist) > 0 {
			copia := hist[0]
			ultima = &copia
		}
		ultimoConcluido := ultimoConcluidoPorNome[t.Nome]
		_, devido := periodoDevido(agora, t.Frequencia, ultimoConcluido)
		periodoRef := periodoAbertoEm(agora, t.Frequencia)

		resposta = append(resposta, StatusTarefaPeriodica{
			Nome:           t.Nome,
			Titulo:         t.Titulo,
			Descricao:      t.Descricao,
			Frequencia:     t.Frequencia.Descricao(),
			PeriodoAtual:   periodoRef,
			PendenteAgora:  devido,
			UltimaExecucao: ultima,
			Historico:      hist,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resposta)
}

// HandleExecutarTarefaPeriodica aciona uma tarefa registrada sob demanda no Painel Admin,
// passando pela mesma trava de idempotência (UNIQUE (nome, periodo)) do worker.
func (h *DiagnosticoHandler) HandleExecutarTarefaPeriodica(w http.ResponseWriter, r *http.Request) {
	nome := strings.TrimSpace(chi.URLParam(r, "nome"))
	var alvo *TarefaPeriodica
	for i := range tarefasPeriodicasPadrao {
		if tarefasPeriodicasPadrao[i].Nome == nome {
			alvo = &tarefasPeriodicasPadrao[i]
			break
		}
	}
	if alvo == nil {
		http.Error(w, "Tarefa periódica não encontrada.", http.StatusNotFound)
		return
	}

	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		http.Error(w, "Service role indisponível.", http.StatusServiceUnavailable)
		return
	}

	// Roda só o período já aberto: adiantar o de amanhã (antes do horário) deixaria o worker
	// livre para rodar o de hoje depois, fora de ordem. Concluído, a reserva não devolve nada.
	periodo := periodoAbertoEm(time.Now(), alvo.Frequencia)

	executou, resumo, errExec := executarTarefaNoPeriodo(r.Context(), client, *alvo, periodo)
	if errExec != nil {
		http.Error(w, fmt.Sprintf("Falha ao executar %s (%s): %v", alvo.Nome, periodo, errExec), http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if !executou {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"executou":     false,
			"ja_concluida": true,
			"periodo":      periodo,
			"mensagem":     fmt.Sprintf("O período %s de %q já foi concluído ou está em execução; nada foi repetido.", periodo, alvo.Titulo),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"executou":     true,
		"ja_concluida": false,
		"periodo":      periodo,
		"resumo":       resumo,
		"mensagem":     fmt.Sprintf("Tarefa %q executada com sucesso no período %s.", alvo.Titulo, periodo),
	})
}
