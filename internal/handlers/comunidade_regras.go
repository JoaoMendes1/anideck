package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/supabase-community/supabase-go"
)

// RegrasComunidade são os números editáveis no Painel Admin, guardados em
// app_settings.comunidade_regras. O banco lê as mesmas chaves (sql/041), então o
// custo da Mana cobrado no INSERT e o mostrado na tela vêm da mesma fonte.
type RegrasComunidade struct {
	MPMax             int  `json:"mp_max"`
	MPRegenDia        int  `json:"mp_regen_dia"`
	MPCustoComentario int  `json:"mp_custo_comentario"`
	HPJanelaDias      int  `json:"hp_janela_dias"`
	HPDiasParaCheio   int  `json:"hp_dias_para_cheio"`
	HPPiso            int  `json:"hp_piso"`
	DescansoMaxDias   int  `json:"descanso_max_dias"`
	PrevisoesAtivas   bool `json:"previsoes_ativas"`
}

const chaveRegrasComunidade = "comunidade_regras"

// RegrasComunidadePadrao espelha o valor inicial gravado pelo sql/041 e sql/062.
func RegrasComunidadePadrao() RegrasComunidade {
	return RegrasComunidade{
		MPMax:             50,
		MPRegenDia:        20,
		MPCustoComentario: 5,
		HPJanelaDias:      14,
		HPDiasParaCheio:   10,
		HPPiso:            20,
		DescansoMaxDias:   14,
		PrevisoesAtivas:   false,
	}
}

// validarRegrasComunidade devolve a mensagem de recusa, ou vazio quando as regras valem.
func validarRegrasComunidade(r RegrasComunidade) string {
	switch {
	case r.MPMax < 5 || r.MPMax > 500:
		return "A Mana máxima vai de 5 a 500."
	case r.MPRegenDia < 1 || r.MPRegenDia > r.MPMax:
		return "A recarga diária vai de 1 até a Mana máxima."
	case r.MPCustoComentario < 0 || r.MPCustoComentario > r.MPMax:
		return "O custo do comentário vai de 0 até a Mana máxima."
	case r.HPJanelaDias < 7 || r.HPJanelaDias > 60:
		return "A janela da Vitalidade vai de 7 a 60 dias."
	case r.HPDiasParaCheio < 1 || r.HPDiasParaCheio > r.HPJanelaDias:
		return "Os dias para a Vitalidade cheia vão de 1 até o tamanho da janela."
	case r.HPPiso < 0 || r.HPPiso > 90:
		return "O piso da Vitalidade vai de 0 a 90."
	case r.DescansoMaxDias < 1 || r.DescansoMaxDias > 30:
		return "O Modo Descanso vai de 1 a 30 dias."
	}
	return ""
}

// lerRegrasComunidade cai no padrão quando a chave falta ou está inválida: a tela
// nunca fica sem número.
func lerRegrasComunidade(client *supabase.Client) RegrasComunidade {
	regras := RegrasComunidadePadrao()
	if client == nil {
		return regras
	}
	data, _, err := client.From("app_settings").Select("value", "", false).Eq("key", chaveRegrasComunidade).Execute()
	if err != nil {
		return regras
	}
	var linhas []struct {
		Value string `json:"value"`
	}
	if json.Unmarshal(data, &linhas) != nil || len(linhas) == 0 {
		return regras
	}
	lidas := RegrasComunidadePadrao()
	if json.Unmarshal([]byte(linhas[0].Value), &lidas) != nil || validarRegrasComunidade(lidas) != "" {
		return regras
	}
	return lidas
}

var formatoHandle = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

// handlesReservados só a equipe escolhe: confundem o usuário com a equipe ou colidem com
// rotas. O banco repete a lista (sql/042) para valer também fora deste servidor.
var handlesReservados = map[string]bool{
	"admin": true, "administrador": true, "anideck": true, "moderacao": true, "moderador": true,
	"suporte": true, "sistema": true, "curadoria": true, "ranking": true, "eu": true,
}

// formatoDeHandle aceita "@Nome_1" e devolve "nome_1", conferindo só o formato. Serve
// para achar um @ que já existe, inclusive os reservados da equipe.
func formatoDeHandle(bruto string) (string, string) {
	h := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(bruto), "@")))
	if !formatoHandle.MatchString(h) {
		return "", "O @ usa de 3 a 20 caracteres: letras minúsculas, números e _."
	}
	return h, ""
}

// normalizarHandle valida um @ que vai ser gravado: além do formato, recusa nome
// reservado para quem não é da equipe.
func normalizarHandle(bruto string, daEquipe bool) (string, string) {
	h, problema := formatoDeHandle(bruto)
	if problema != "" {
		return "", problema
	}
	if handlesReservados[h] && !daEquipe {
		return "", "Esse @ é reservado. Escolha outro."
	}
	return h, ""
}

// ehDaEquipe usa a mesma regra do RequireAdmin: o user_id do token igual ao
// ADMIN_USER_ID do servidor.
func ehDaEquipe(userID string) bool {
	admin := os.Getenv("ADMIN_USER_ID")
	return admin != "" && userID == admin
}

// Reações aceitas pelo banco (CHECK do sql/043), na ordem em que a tela mostra. A mesma
// lista está em REACOES (client/src/lib/comunidade.ts).
var reacoesValidas = []string{
	"chorei", "hype", "plot_twist", "luta", "animacao", "trilha", "engracado", "fofo",
	"shippo", "tenso", "medo", "raiva", "genial", "gancho", "vergonha", "enrolacao",
}

func reacaoValida(r string) bool {
	for _, v := range reacoesValidas {
		if v == r {
			return true
		}
	}
	return false
}

var motivosDenuncia = map[string]bool{"spoiler": true, "ofensa": true, "spam": true, "outro": true}

const (
	maxTextoComentario = 1000
	maxMomentoSeg      = 3 * 60 * 60
)

// validarComentario confere o que o banco também confere, para devolver 400 com
// mensagem clara em vez de um erro de CHECK.
func validarComentario(texto string, momento *int) (string, string) {
	t := strings.TrimSpace(texto)
	if t == "" {
		return "", "Escreva alguma coisa antes de enviar."
	}
	if len([]rune(t)) > maxTextoComentario {
		return "", fmt.Sprintf("O comentário vai até %d caracteres.", maxTextoComentario)
	}
	if momento != nil && (*momento < 0 || *momento > maxMomentoSeg) {
		return "", "O minuto marcado precisa estar dentro do episódio."
	}
	return t, ""
}

// CalcularHP mede a constância recente: quantos dias com episódio marcado houve nos
// últimos HPJanelaDias dias. Dias de Modo Descanso não contam nem contra nem a favor:
// a janela anda para trás até juntar dias fora do descanso. O resultado vai de HPPiso
// a 100 e nunca toca o XP.
func CalcularHP(diasAtivos []string, descansoInicio, descansoFim string, hoje time.Time, r RegrasComunidade) int {
	if r.HPJanelaDias <= 0 || r.HPDiasParaCheio <= 0 {
		r = RegrasComunidadePadrao()
	}
	ativos := make(map[string]bool, len(diasAtivos))
	for _, d := range diasAtivos {
		if len(d) >= 10 {
			ativos[d[:10]] = true
		}
	}

	emDescanso := func(dia string) bool {
		return descansoInicio != "" && descansoFim != "" && dia >= descansoInicio && dia <= descansoFim
	}

	dia := time.Date(hoje.Year(), hoje.Month(), hoje.Day(), 0, 0, 0, 0, time.UTC)
	contados, comAtividade := 0, 0
	// O limite de passos impede laço longo com um descanso mal gravado.
	for passos := 0; contados < r.HPJanelaDias && passos < r.HPJanelaDias+60; passos++ {
		chave := dia.Format("2006-01-02")
		if !emDescanso(chave) {
			contados++
			if ativos[chave] {
				comAtividade++
			}
		}
		dia = dia.AddDate(0, 0, -1)
	}

	if comAtividade > r.HPDiasParaCheio {
		comAtividade = r.HPDiasParaCheio
	}
	return r.HPPiso + (100-r.HPPiso)*comAtividade/r.HPDiasParaCheio
}

// limitadorDeTaxa protege a escrita de comentários além da Mana: a Mana é regra de
// jogo, o limite é proteção contra rajada (script, clique repetido).
type limitadorDeTaxa struct {
	mu      sync.Mutex
	eventos map[string][]time.Time
}

func novoLimitadorDeTaxa() *limitadorDeTaxa {
	return &limitadorDeTaxa{eventos: make(map[string][]time.Time)}
}

// permitir registra o evento e diz se ele cabe em `max` eventos por `janela`.
func (l *limitadorDeTaxa) permitir(chave string, max int, janela time.Duration, agora time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	corte := agora.Add(-janela)
	recentes := l.eventos[chave][:0]
	for _, t := range l.eventos[chave] {
		if t.After(corte) {
			recentes = append(recentes, t)
		}
	}
	if len(recentes) >= max {
		l.eventos[chave] = recentes
		return false
	}
	l.eventos[chave] = append(recentes, agora)
	return true
}

// erroDoBanco traduz a falha de escrita do PostgREST para status e mensagem da tela.
// O texto vem como "(CÓDIGO) mensagem" (postgrest-go, execute.go).
func erroDoBanco(err error) (int, string) {
	texto := err.Error()
	switch {
	case strings.Contains(texto, "mana_insuficiente"):
		return 422, "Sua Mana acabou por agora. Ela recarrega sozinha ao longo do dia."
	case strings.Contains(texto, "perfil_necessario"):
		return 422, "Crie seu perfil público (um @) para participar da conversa."
	case strings.Contains(texto, "descanso_recente"):
		return 422, "O Modo Descanso pode ser usado uma vez a cada 30 dias."
	case strings.Contains(texto, "handle_reservado"):
		return 400, "Esse @ é reservado. Escolha outro."
	case strings.Contains(texto, "descanso_fora_do_limite"):
		return 400, "Escolha uma quantidade de dias dentro do limite."
	case strings.Contains(texto, "(42501)") || strings.Contains(texto, "row-level security"):
		return 403, "Marque o episódio como visto para participar da conversa dele."
	case strings.Contains(texto, "(23505)"):
		return 409, "Isso já foi registrado."
	case strings.Contains(texto, "(23503)"):
		return 404, "Não encontrado."
	}
	return 500, "Não foi possível salvar agora."
}
