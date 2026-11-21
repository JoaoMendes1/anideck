package handlers

import (
	"math/rand"
	"testing"
)

func TestEquilibrarMonstroParaGrupo_EscalaComTamanhoEForcaDoMundo(t *testing.T) {
	base := monstroDoNivel(20, "comum", 1000, 100, 50)
	fraco := combatente(20, AtributosBase(20))
	forte := combatente(60, AtributosBase(60))

	solo := EquilibrarMonstroParaGrupo(base, []CombatenteRPG{fraco})
	if solo.Vida != 1000 || solo.Ataque != 100 {
		t.Fatalf("solo não deveria alterar o monstro: %+v", solo)
	}

	duplaEquilibrada := EquilibrarMonstroParaGrupo(base, []CombatenteRPG{fraco, fraco})
	if duplaEquilibrada.Vida < 1750 || duplaEquilibrada.Ataque < 115 || duplaEquilibrada.Defesa < 56 {
		t.Errorf("dupla deveria escalar vida/atq/def: %+v", duplaEquilibrada)
	}

	trioForte := EquilibrarMonstroParaGrupo(base, []CombatenteRPG{forte, forte, forte})
	trioBase := EquilibrarMonstroParaGrupo(base, []CombatenteRPG{fraco, fraco, fraco})
	if trioForte.Vida <= trioBase.Vida || trioForte.Ataque <= trioBase.Ataque {
		t.Errorf("esquadrão muito mais forte que o monstro deveria ativar escala de força do mundo: forte=%+v base=%+v", trioForte, trioBase)
	}
}

func TestSimularBatalhaEmGrupo_DisparaReacaoElemental(t *testing.T) {
	h1 := combatente(30, AtributosBase(30))
	h1.Elemento = "fogo"
	h1.Classe = "lanceiro"
	h1.Atributos.Velocidade = 100

	h2 := combatente(30, AtributosBase(30))
	h2.Elemento = "agua"
	h2.Classe = "maga"
	h2.Atributos.Velocidade = 95

	monstro := monstroDoNivel(30, "chefe", 5000, 80, 40)
	monstro.Elemento = "terra"
	monstro.Velocidade = 10

	res := SimularBatalhaEmGrupo([]CombatenteRPG{h1, h2}, monstro, rand.New(rand.NewSource(7)))
	reagiu := false
	for _, tr := range res.Turnos {
		if tr.Reacao == "Vaporização" {
			reagiu = true
			break
		}
	}
	if !reagiu {
		t.Fatalf("esperava reação elemental Vaporização entre fogo e água, turnos: %+v", res.Turnos)
	}
}

func TestValidarAliadosPedidos_RejeitaTrancadosEExtraiAteDois(t *testing.T) {
	desb := []string{"espadachim_eter", "lanceiro_fogo", "maga_agua", "assassina_raio"}
	if _, err := validarAliadosPedidos([]string{"paladina_luz"}, "espadachim_eter", desb); err == nil {
		t.Error("deveria recusar personagem não desbloqueado")
	}
	if _, err := validarAliadosPedidos([]string{"inexistente"}, "espadachim_eter", desb); err == nil {
		t.Error("deveria recusar personagem inexistente")
	}
	ok, err := validarAliadosPedidos([]string{"espadachim_eter", "lanceiro_fogo", "maga_agua", "assassina_raio"}, "espadachim_eter", desb)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(ok) != 2 || ok[0] != "lanceiro_fogo" || ok[1] != "maga_agua" {
		t.Errorf("aliados inesperados: %v", ok)
	}
}

func TestMelhoresEquipadosParaBase_UsaItemCompativelDoInventario(t *testing.T) {
	espada := ItemRPG{ID: "espada_1", Slot: "arma", Nome: "Espada", Ataque: 20, NivelMinimo: 1, Classes: []string{"espadachim"}}
	cajado := ItemRPG{ID: "cajado_1", Slot: "arma", Nome: "Cajado", Magia: 30, NivelMinimo: 1, Classes: []string{"maga"}}
	bota := ItemRPG{ID: "bota_comum", Slot: "botas", Nome: "Botas", Velocidade: 5, NivelMinimo: 1, Classes: nil}

	inv := []linhaInventarioRPG{
		{Quantidade: 1, Item: &espada},
		{Quantidade: 1, Item: &cajado},
		{Quantidade: 1, Item: &bota},
	}
	eqAtual := map[string]string{"arma": "espada_1", "botas": "bota_comum"}
	magaSlots := melhoresEquipadosParaBase(10, "maga_agua", inv, eqAtual, PrimariosRPG{})
	if magaSlots["arma"] != "cajado_1" {
		t.Errorf("deveria escolher cajado compatível com maga, veio: %v", magaSlots["arma"])
	}
	if magaSlots["botas"] != "bota_comum" {
		t.Errorf("deveria aproveitar bota universal equipada, veio: %v", magaSlots["botas"])
	}
}

func TestMontarEsquadraoDoContexto_SemBancoComInventarioLido(t *testing.T) {
	cajado := ItemRPG{ID: "cajado_1", Slot: "arma", Nome: "Cajado", Magia: 25, NivelMinimo: 1, Classes: []string{"maga"}}
	ctx := contextoPersonagem{
		linha: &linhaPersonagemBanco{
			Nome:           "Kael",
			PersonagemBase: "espadachim_eter",
			Desbloqueados:  []string{"espadachim_eter", "maga_agua"},
			Esquadrao:      []string{"maga_agua"},
		},
		xpTotal:        1000,
		ranks:          RanksPadrao(),
		estagios:       EstagiosPadrao(),
		inventario:     []linhaInventarioRPG{{Quantidade: 1, Item: &cajado}},
		equipados:      map[string]string{},
		inventarioLido: true,
	}
	combatentes, fichas, err := MontarEsquadraoDoContexto(nil, "u1", ctx, 0, nil, "", nil)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(combatentes) != 2 || len(fichas) != 2 {
		t.Fatalf("esperava 2 heróis, obtido %d / %d", len(combatentes), len(fichas))
	}
	if fichas[0].Nome != "Kael" || fichas[1].Nome != "Mizuki" || fichas[1].Elemento != "agua" {
		t.Errorf("fichas incorretas: %+v", fichas)
	}
	if len(fichas[0].Acompanhantes) != 0 {
		t.Error("fichas individuais não deveriam aninhar acompanhantes")
	}
	fComAcomp := fichas[0]
	fComAcomp.Acompanhantes = []FichaDeGrupo{fichas[1]}
	if len(fComAcomp.TodosHerois()) != 2 {
		t.Errorf("TodosHerois deveria devolver 2, obtido %d", len(fComAcomp.TodosHerois()))
	}
}
