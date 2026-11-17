package handlers

import (
	"testing"
	"time"
)

func TestRegraDeOuro_AplicarLimiteEstorno(t *testing.T) {
	// Sem estorno recente: mantém o valor calculado.
	xp, motivo := AplicarLimiteEstorno(35, "antes do próximo sair · +10", nil)
	if xp != 35 || motivo != "antes do próximo sair · +10" {
		t.Fatalf("sem estorno deveria manter 35 XP, recebeu %d (%q)", xp, motivo)
	}

	// Estorno recente de 12 XP trava tentativa de ganhar 35 XP.
	orig12 := 12
	xp, motivo = AplicarLimiteEstorno(35, "antes do próximo sair · +10", &orig12)
	if xp != 12 || motivo != "remarcação · limite original" {
		t.Fatalf("com estorno de 12 XP deveria travar em 12, recebeu %d (%q)", xp, motivo)
	}

	// Se o cálculo atual deu menor (ex.: teto diário restando 4 XP), fica com o menor (4).
	xp, motivo = AplicarLimiteEstorno(4, "teto diário atingido", &orig12)
	if xp != 4 || motivo != "teto diário atingido" {
		t.Fatalf("com teto restante de 4 XP deveria ficar em 4, recebeu %d (%q)", xp, motivo)
	}

	// Estorno de 0 XP impede ganhar XP ao remarcar dentro da janela.
	orig0 := 0
	xp, motivo = AplicarLimiteEstorno(25, "episódio base · 100%", &orig0)
	if xp != 0 || motivo != "remarcação · limite original" {
		t.Fatalf("com estorno 0 XP deveria travar em 0, recebeu %d (%q)", xp, motivo)
	}
}

func TestRegraDeOuro_SimulacaoCicloMarcarDesmarcarEFaixas(t *testing.T) {
	cfg := EconomiaPadrao()
	agora := time.Date(2026, 11, 17, 15, 0, 0, 0, time.UTC)

	// Episódio marcado originalmente na 6ª posição do dia rende 12 XP.
	xpInicial, _ := CalcularXPEpisodioComFaixa(6, 104, false, false, false, 0, cfg, agora)
	if xpInicial != 12 {
		t.Fatalf("6º ep deveria valer 12 XP, recebeu %d", xpInicial)
	}

	// Usuário desmarca e remarca no dia seguinte como 1º episódio com bônus cedo (tentaria 35 XP).
	xpTentado, _ := CalcularXPEpisodioComFaixa(1, 0, true, false, false, 0, cfg, agora.Add(24*time.Hour))
	if xpTentado != 35 {
		t.Fatalf("sem estorno 1º ep cedo valeria 35 XP, recebeu %d", xpTentado)
	}

	xpFinal, _ := AplicarLimiteEstorno(xpTentado, "antes do próximo sair · +10", &xpInicial)
	if xpFinal != xpInicial {
		t.Fatalf("remarcação em até 7 dias não pode passar do original (%d), recebeu %d", xpInicial, xpFinal)
	}
}
