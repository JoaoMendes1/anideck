package handlers

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestNormalizarHandle(t *testing.T) {
	casos := map[string]string{"@Joao_Dev": "joao_dev", "  maria99 ": "maria99"}
	for entrada, esperado := range casos {
		if h, msg := normalizarHandle(entrada, false); h != esperado || msg != "" {
			t.Errorf("%q: esperado %q, recebido %q (%s)", entrada, esperado, h, msg)
		}
	}
	for _, ruim := range []string{"ab", "nome com espaço", "çedilha", strings.Repeat("a", 21), "admin", "@anideck"} {
		if h, msg := normalizarHandle(ruim, false); msg == "" {
			t.Errorf("%q deveria ser recusado, virou %q", ruim, h)
		}
	}
}

func TestHandleReservadoSoParaEquipe(t *testing.T) {
	if _, msg := normalizarHandle("@Administrador", false); msg == "" {
		t.Error("membro comum não pode gravar @ reservado")
	}
	if h, msg := normalizarHandle("@Administrador", true); h != "administrador" || msg != "" {
		t.Errorf("a equipe grava @ reservado: recebido %q (%s)", h, msg)
	}
	if _, msg := normalizarHandle("ab", true); msg == "" {
		t.Error("a equipe também respeita o formato")
	}
	// Achar um @ que já existe não passa pela reserva: o perfil da equipe abre e pode ser bloqueado.
	if h, msg := formatoDeHandle("administrador"); h != "administrador" || msg != "" {
		t.Errorf("busca por @ reservado: recebido %q (%s)", h, msg)
	}
}

func TestEhDaEquipe(t *testing.T) {
	t.Setenv("ADMIN_USER_ID", "u-admin")
	if !ehDaEquipe("u-admin") || ehDaEquipe("u-outro") {
		t.Error("só o ADMIN_USER_ID é da equipe")
	}
	t.Setenv("ADMIN_USER_ID", "")
	if ehDaEquipe("") {
		t.Error("sem ADMIN_USER_ID ninguém é da equipe, nem o id vazio")
	}
}

func TestValidarComentario(t *testing.T) {
	if txt, msg := validarComentario("  Que episódio!  ", nil); txt != "Que episódio!" || msg != "" {
		t.Errorf("texto válido recusado: %q %q", txt, msg)
	}
	if _, msg := validarComentario("   ", nil); msg == "" {
		t.Error("comentário vazio deveria ser recusado")
	}
	if _, msg := validarComentario(strings.Repeat("é", maxTextoComentario+1), nil); msg == "" {
		t.Error("comentário longo deveria ser recusado (conta caracteres, não bytes)")
	}
	if _, msg := validarComentario(strings.Repeat("é", maxTextoComentario), nil); msg != "" {
		t.Errorf("1000 caracteres acentuados devem passar: %s", msg)
	}
	negativo := -1
	if _, msg := validarComentario("ok", &negativo); msg == "" {
		t.Error("minuto negativo deveria ser recusado")
	}
}

func TestValidarRegrasComunidade(t *testing.T) {
	if msg := validarRegrasComunidade(RegrasComunidadePadrao()); msg != "" {
		t.Fatalf("o padrão deveria valer: %s", msg)
	}
	ruins := map[string]func(r *RegrasComunidade){
		"mana máxima":     func(r *RegrasComunidade) { r.MPMax = 0 },
		"recarga":         func(r *RegrasComunidade) { r.MPRegenDia = 999 },
		"custo":           func(r *RegrasComunidade) { r.MPCustoComentario = -1 },
		"janela":          func(r *RegrasComunidade) { r.HPJanelaDias = 3 },
		"dias para cheio": func(r *RegrasComunidade) { r.HPDiasParaCheio = r.HPJanelaDias + 1 },
		"piso":            func(r *RegrasComunidade) { r.HPPiso = 95 },
		"descanso":        func(r *RegrasComunidade) { r.DescansoMaxDias = 0 },
	}
	for nome, estragar := range ruins {
		r := RegrasComunidadePadrao()
		estragar(&r)
		if validarRegrasComunidade(r) == "" {
			t.Errorf("%s: deveria recusar", nome)
		}
	}
}

func diasSeguidos(fim time.Time, n int) []string {
	var dias []string
	for i := 0; i < n; i++ {
		dias = append(dias, fim.AddDate(0, 0, -i).Format("2006-01-02"))
	}
	return dias
}

func TestCalcularHP(t *testing.T) {
	r := RegrasComunidadePadrao()
	hoje := time.Date(2026, 11, 20, 15, 0, 0, 0, time.UTC)

	if hp := CalcularHP(nil, "", "", hoje, r); hp != r.HPPiso {
		t.Errorf("sem atividade, o HP fica no piso (%d), recebido %d", r.HPPiso, hp)
	}
	if hp := CalcularHP(diasSeguidos(hoje, 14), "", "", hoje, r); hp != 100 {
		t.Errorf("ativo todo dia, HP cheio, recebido %d", hp)
	}
	// Ativo nos 14 dias até 4 dias atrás: na janela de hoje sobram 10 dias ativos, ainda cheio.
	if hp := CalcularHP(diasSeguidos(hoje.AddDate(0, 0, -4), 14), "", "", hoje, r); hp != 100 {
		t.Errorf("4 dias parado depois de duas semanas ativas ainda é HP cheio, recebido %d", hp)
	}
	// Com 5 dias parado, sobram 9 dias ativos: 20 + 80*9/10 = 92.
	if hp := CalcularHP(diasSeguidos(hoje.AddDate(0, 0, -5), 14), "", "", hoje, r); hp != 92 {
		t.Errorf("queda leve esperada (92), recebido %d", hp)
	}
	// Descanso cobrindo os 10 dias parados: a janela pula esses dias e o HP fica cheio.
	inicio := hoje.AddDate(0, 0, -9).Format("2006-01-02")
	fim := hoje.Format("2006-01-02")
	if hp := CalcularHP(diasSeguidos(hoje.AddDate(0, 0, -10), 14), inicio, fim, hoje, r); hp != 100 {
		t.Errorf("descanso deveria congelar o HP, recebido %d", hp)
	}
}

func TestLimitadorDeTaxa(t *testing.T) {
	l := novoLimitadorDeTaxa()
	agora := time.Date(2026, 11, 20, 12, 0, 0, 0, time.UTC)
	for i := 0; i < 3; i++ {
		if !l.permitir("u1", 3, time.Minute, agora) {
			t.Fatalf("evento %d deveria passar", i+1)
		}
	}
	if l.permitir("u1", 3, time.Minute, agora) {
		t.Error("o quarto evento na mesma janela deveria ser barrado")
	}
	if !l.permitir("u2", 3, time.Minute, agora) {
		t.Error("outro usuário não divide o limite")
	}
	if !l.permitir("u1", 3, time.Minute, agora.Add(61*time.Second)) {
		t.Error("passada a janela, volta a permitir")
	}
}

func TestErroDoBanco(t *testing.T) {
	casos := map[string]int{
		"(P0001) mana_insuficiente": 422,
		"(P0001) perfil_necessario": 422,
		"(42501) new row violates row-level security policy for table \"episode_comments\"": 403,
		"(23505) duplicate key value violates unique constraint \"profiles_handle_key\"":    409,
		"(P0001) handle_reservado": 400,
		"(XX000) algo inesperado":  500,
	}
	for texto, esperado := range casos {
		if status, _ := erroDoBanco(errors.New(texto)); status != esperado {
			t.Errorf("%q: esperado %d, recebido %d", texto, esperado, status)
		}
	}
}
