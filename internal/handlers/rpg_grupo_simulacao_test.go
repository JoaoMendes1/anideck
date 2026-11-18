package handlers

import (
	"math/rand"
	"testing"
)

func TestMonstroParaGrupo_VidaCresceComOGrupo(t *testing.T) {
	m := monstroDoNivel(20, "comum", 1000, 60, 40)
	if MonstroParaGrupo(m, 1).Vida != 1000 || MonstroParaGrupo(m, 2).Vida != 1600 || MonstroParaGrupo(m, 3).Vida != 2200 {
		t.Errorf("vidas: %d %d %d", MonstroParaGrupo(m, 1).Vida, MonstroParaGrupo(m, 2).Vida, MonstroParaGrupo(m, 3).Vida)
	}
}

func TestSimularBatalhaEmGrupo_TodosAgemEOMonstroDivideOsGolpes(t *testing.T) {
	herois := []CombatenteRPG{combatente(30, AtributosBase(30)), combatente(30, AtributosBase(30)), combatente(30, AtributosBase(30))}
	monstro := MonstroParaGrupo(monstroDoNivel(30, "comum", 1200, 95, 55), 3)
	res := SimularBatalhaEmGrupo(herois, monstro, rand.New(rand.NewSource(11)))

	agiu := map[int]bool{}
	atingido := map[int]bool{}
	for _, tr := range res.Turnos {
		if tr.Heroi < 1 || tr.Heroi > 3 {
			t.Fatalf("turno sem herói válido: %+v", tr)
		}
		if tr.Atacante == "jogador" {
			agiu[tr.Heroi] = true
		} else {
			atingido[tr.Heroi] = true
		}
		if tr.VidaJogador > herois[tr.Heroi-1].Atributos.Vida {
			t.Fatalf("Vida acima da máxima: %+v", tr)
		}
	}
	if len(agiu) != 3 {
		t.Errorf("os três heróis deveriam agir: %v", agiu)
	}
	if len(atingido) < 2 && len(res.Turnos) > 12 {
		t.Errorf("o monstro deveria variar o alvo: %v", atingido)
	}
	if len(res.Herois) != 3 {
		t.Fatalf("resultado de cada herói: %d", len(res.Herois))
	}
	for i, h := range res.Herois {
		if h.VidaMaxima != herois[i].Atributos.Vida || h.VidaFinal > h.VidaMaxima {
			t.Errorf("herói %d: %+v", i+1, h)
		}
	}
}

func TestSimularBatalhaEmGrupo_GrupoVenceOQueSozinhoPerde(t *testing.T) {
	heroi := combatente(15, AtributosBase(15))
	forte := monstroDoNivel(18, "elite", 1000, 50, 25)
	vitoriasSozinho, vitoriasGrupo := 0, 0
	for semente := int64(1); semente <= 40; semente++ {
		if SimularBatalha(heroi, forte, rand.New(rand.NewSource(semente))).Venceu {
			vitoriasSozinho++
		}
		grupo := SimularBatalhaEmGrupo([]CombatenteRPG{heroi, heroi, heroi}, MonstroParaGrupo(forte, 3), rand.New(rand.NewSource(semente)))
		if grupo.Venceu {
			vitoriasGrupo++
		}
	}
	if vitoriasGrupo <= vitoriasSozinho {
		t.Errorf("grupo deveria vencer mais: sozinho %d, grupo %d de 40", vitoriasSozinho, vitoriasGrupo)
	}
}

func TestSimularBatalhaEmGrupo_MesmaSementeMesmaLuta(t *testing.T) {
	herois := []CombatenteRPG{combatente(20, AtributosBase(20)), combatente(25, AtributosBase(25))}
	m := MonstroParaGrupo(monstroDoNivel(22, "comum", 900, 60, 40), 2)
	a := SimularBatalhaEmGrupo(herois, m, rand.New(rand.NewSource(3)))
	b := SimularBatalhaEmGrupo(herois, m, rand.New(rand.NewSource(3)))
	if a.Venceu != b.Venceu || len(a.Turnos) != len(b.Turnos) || a.Herois[0].VidaFinal != b.Herois[0].VidaFinal {
		t.Error("a mesma semente deveria dar a mesma luta")
	}
}

func TestSimularMasmorraEmGrupo_QuemCaiFicaFora(t *testing.T) {
	fraco := combatente(5, AtributosBase(5))
	forte := combatente(40, AtributosBase(40))
	andares := []MonstroRPG{monstroDoNivel(18, "comum", 700, 55, 30), monstroDoNivel(19, "comum", 700, 55, 30), monstroDoNivel(20, "chefe", 1100, 60, 35)}
	for semente := int64(1); semente <= 20; semente++ {
		r := SimularMasmorraEmGrupo([]CombatenteRPG{forte, fraco}, andares, rand.New(rand.NewSource(semente)))
		if !r.Herois[1].Caiu {
			continue
		}
		caiuNo := -1
		for i, a := range r.Andares {
			if caiuNo >= 0 {
				for _, tr := range a.Resultado.Turnos {
					if tr.Heroi == 2 && tr.Atacante == "jogador" {
						t.Fatalf("herói caído no andar %d agiu no andar %d", caiuNo+1, i+1)
					}
				}
			}
			if a.Resultado.Herois[1].Caiu {
				caiuNo = i
			}
		}
		return
	}
	t.Skip("o herói fraco não caiu em nenhuma semente")
}

func TestFichaDeGrupo_ReconstroiAsHabilidades(t *testing.T) {
	f := FichaDeGrupo{Personagem: "espadachim_eter", Nivel: 20, Atributos: AtributosBase(20), Elemento: "eter", VidaInicial: 100}
	c := f.Combatente()
	if len(c.Habilidades) == 0 {
		t.Fatal("deveria ter habilidades liberadas no nível 20")
	}
	for _, h := range c.Habilidades {
		if h.Efeito == "" && h.Tipo == "comum" && h.Fator == 0 {
			t.Errorf("habilidade sem efeito depois do JSON: %+v", h)
		}
	}
	if c.VidaInicial != 100 || c.Elemento != "eter" {
		t.Errorf("vida e elemento: %d %s", c.VidaInicial, c.Elemento)
	}
}

func TestUUIDValido(t *testing.T) {
	if !uuidValido("1b4e28ba-2fa1-11d2-883f-0016d3cca427") || uuidValido("1; drop table") || uuidValido("") {
		t.Error("validação de UUID")
	}
}

func TestLerRetornoGrupo(t *testing.T) {
	var d struct {
		GrupoID string `json:"grupo_id"`
	}
	if erro, falhou := lerRetornoGrupo(`{"ok":true,"grupo_id":"x"}`, &d); erro != "" || falhou || d.GrupoID != "x" {
		t.Errorf("ok: %q %v %q", erro, falhou, d.GrupoID)
	}
	if erro, falhou := lerRetornoGrupo(`{"erro":"cheio"}`, nil); erro != "cheio" || falhou {
		t.Errorf("erro: %q %v", erro, falhou)
	}
	if _, falhou := lerRetornoGrupo(`{"code":"42883"}`, nil); !falhou {
		t.Error("fora do formato deveria falhar")
	}
}
