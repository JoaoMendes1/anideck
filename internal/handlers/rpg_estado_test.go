package handlers

import "testing"

func TestInterpretarEstadoJogador_ForaDoFormatoCaiNoAntigo(t *testing.T) {
	casos := map[string]string{
		"vazio":           "",
		"funcao ausente":  `{"code":"PGRST202","message":"Could not find the function"}`,
		"nao autenticado": `{"erro":"Não autenticado"}`,
		"lixo":            `<html>`,
	}
	for nome, bruto := range casos {
		if _, ok := interpretarEstadoJogador(bruto); ok {
			t.Errorf("%s: esperava cair no caminho antigo", nome)
		}
	}
}

func TestContextoDoEstado_SemPersonagem(t *testing.T) {
	e, ok := interpretarEstadoJogador(`{"ok":true,"personagem":null}`)
	if !ok {
		t.Fatal("resposta válida rejeitada")
	}
	ctx, err := contextoDoEstado(e, configRPG{})
	if err != nil || ctx.linha != nil {
		t.Fatalf("quem não despertou deve vir sem linha: %+v, %v", ctx, err)
	}
}

func TestContextoDoEstado_Completo(t *testing.T) {
	bruto := `{"ok":true,
	  "personagem":{"nome":"Kai","personagem_base":"espadachim","criado_em":"2026-11-01T00:00:00Z","visual_equipado":"aventureiro"},
	  "xp_total":1234,
	  "inventario":[{"quantidade":2,"rpg_itens":{"id":"espada_treino","slot":"arma","nome":"Espada","descricao":"","raridade":"comum","vida":0,"ataque":3,"defesa":0,"nivel_minimo":1}}],
	  "equipados":[{"slot":"arma","item_id":"espada_treino"}],
	  "bilhetes":4,
	  "cosmeticos":[{"slot":"cenario","store_items":{"estilo":"floresta"}},{"slot":"aura","store_items":{"estilo":"brasa"}}],
	  "skins":[]}`
	e, ok := interpretarEstadoJogador(bruto)
	if !ok {
		t.Fatal("resposta válida rejeitada")
	}
	ctx, err := contextoDoEstado(e, configRPG{})
	if err != nil {
		t.Fatal(err)
	}
	if ctx.linha == nil || ctx.linha.Nome != "Kai" {
		t.Fatalf("personagem errado: %+v", ctx.linha)
	}
	if ctx.xpTotal != 1234 || ctx.bilhetes != 4 {
		t.Errorf("xp=%d bilhetes=%d", ctx.xpTotal, ctx.bilhetes)
	}
	if ctx.cenario != "floresta" || ctx.aura != "brasa" {
		t.Errorf("cenario=%q aura=%q", ctx.cenario, ctx.aura)
	}
	if !ctx.inventarioLido || len(ctx.inventario) != 1 || ctx.equipados["arma"] != "espada_treino" {
		t.Errorf("inventário/slots errados: %+v %+v", ctx.inventario, ctx.equipados)
	}
}

func TestContextoDoEstado_InventarioQuebradoEhErro(t *testing.T) {
	e, ok := interpretarEstadoJogador(`{"ok":true,"personagem":{"nome":"Kai"},"inventario":{"x":1}}`)
	if !ok {
		t.Fatal("resposta válida rejeitada")
	}
	if _, err := contextoDoEstado(e, configRPG{}); err == nil {
		t.Fatal("inventário fora do formato deveria ser erro")
	}
}

func TestContextoDoEstado_ComElencoETroca(t *testing.T) {
	bruto := `{"ok":true,
	  "personagem":{"nome":"Celestia","personagem_base":"paladina_luz","criado_em":"2026-11-01T00:00:00Z","desbloqueados":["paladina_luz","maga_agua"],"ultima_troca_em":"2026-11-18T10:00:00Z"},
	  "xp_total":500,
	  "inventario":[],
	  "equipados":[],
	  "ouro":450}`
	e, ok := interpretarEstadoJogador(bruto)
	if !ok {
		t.Fatal("resposta válida rejeitada")
	}
	ctx, err := contextoDoEstado(e, configRPG{})
	if err != nil {
		t.Fatal(err)
	}
	resp := ctx.resposta()
	if resp.Elenco == nil {
		t.Fatal("elenco ausente na resposta")
	}
	if len(resp.Elenco.Desbloqueados) != 2 || resp.Elenco.Desbloqueados[1] != "maga_agua" {
		t.Errorf("desbloqueados inesperados: %+v", resp.Elenco.Desbloqueados)
	}
	if resp.Elenco.UltimaTrocaEm != "2026-11-18T10:00:00Z" {
		t.Errorf("ultima_troca_em errada: %q", resp.Elenco.UltimaTrocaEm)
	}
	if resp.Elenco.PrecoDesbloquearOuro != 400 || resp.Elenco.TrocaCooldownHoras != 0 || resp.Elenco.PrecoTrocaAntecipadaOuro != 0 {
		t.Errorf("preços inesperados: %+v", resp.Elenco)
	}
	if resp.Elenco.ProximaTrocaEm != "" {
		t.Errorf("proxima_troca_em deveria sair vazia: %q", resp.Elenco.ProximaTrocaEm)
	}
}
