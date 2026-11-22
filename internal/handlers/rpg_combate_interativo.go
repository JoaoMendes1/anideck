package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	mathrand "math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
)

const (
	acaoInterativaGolpe    = "golpe"
	acaoInterativaDefender = "defender"
	acaoInterativaRuptura  = "ruptura"
)

// IntencaoInimigo antecipa o que o oponente prepara para a próxima rodada no combate tático.
type IntencaoInimigo struct {
	Tipo         string `json:"tipo"`
	Titulo       string `json:"titulo"`
	Descricao    string `json:"descricao"`
	DanoEstimado int    `json:"dano_estimado"`
	Dica         string `json:"dica"`
}

// HeroiCombateInterativo expõe Vida, Éter e Elemento de cada integrante do esquadrão ao modal.
type HeroiCombateInterativo struct {
	Base       string `json:"base"`
	Nome       string `json:"nome"`
	Elemento   string `json:"elemento"`
	VidaAtual  int    `json:"vida_atual"`
	VidaMaxima int    `json:"vida_maxima"`
	EterAtual  int    `json:"eter_atual"`
	EterMaximo int    `json:"eter_maximo"`
}

// EstadoCombateInterativo é o snapshot seguro enviado ao frontend após iniciar ou agir numa rodada.
type EstadoCombateInterativo struct {
	SessaoID       string                   `json:"sessao_id"`
	Modo           string                   `json:"modo"`
	AlvoNome       string                   `json:"alvo_nome"`
	AlvoElemento   string                   `json:"alvo_elemento"`
	AlvoNivel      int                      `json:"alvo_nivel"`
	AndarAtual     int                      `json:"andar_atual,omitempty"`
	TotalAndares   int                      `json:"total_andares,omitempty"`
	Rodada         int                      `json:"rodada"`
	Herois         []HeroiCombateInterativo `json:"herois"`
	InimigoVida    int                      `json:"inimigo_vida"`
	InimigoVidaMax int                      `json:"inimigo_vida_max"`
	AuraElemental  string                   `json:"aura_elemental,omitempty"`
	Intencao       IntencaoInimigo          `json:"intencao"`
	UltimosTurnos  []TurnoBatalha           `json:"ultimos_turnos"`
	Encerrado      bool                     `json:"encerrado"`
	Venceu         bool                     `json:"venceu"`
	Caiu           bool                     `json:"caiu"`
	Evento         string                   `json:"evento,omitempty"`
	Recompensa     *RecompensaBatalha       `json:"recompensa,omitempty"`
	PontosDuelo    int                      `json:"pontos_duelo,omitempty"`
	OuroDuelo      int                      `json:"ouro_duelo,omitempty"`
	Vida           *VidaRPG                 `json:"vida,omitempty"`
	ATB            *EstadoATB               `json:"atb,omitempty"`
}

type sessaoCombateInterativo struct {
	mu             sync.Mutex
	ID             string
	UserID         string
	Modo           string
	AlvoID         string
	EsquadraoIDs   []string
	AlvoNome       string
	AlvoElemento   string
	AlvoNivel      int
	AlvoVidaBase   int
	AlvoAtaque     int
	AlvoDefesa     int
	AlvoMagia      int
	AlvoCritMil    int
	Herois         []CombatenteRPG
	HeroisInfo     []HeroiCombateInterativo
	MonstroAtual   MonstroRPG
	Andares        []MonstroRPG
	AndarIdx       int
	Vencidos       []string
	VitoriasAntes  int
	ContextoOpon   *contextoPersonagem
	AtribAdversar  *AtributosRPG
	InimigoVida    int
	InimigoVidaMax int
	AuraElemental  string
	Rodada         int
	Intencao       IntencaoInimigo
	Turnos         []TurnoBatalha
	Usos           map[string]int
	Encerrado      bool
	Finalizado     bool
	Venceu         bool
	Caiu           bool
	AtualizadoEm   time.Time
}

type cofreCombatesInterativos struct {
	mu      sync.Mutex
	sessoes map[string]*sessaoCombateInterativo
}

var cofreCombates = &cofreCombatesInterativos{
	sessoes: map[string]*sessaoCombateInterativo{},
}

func (c *cofreCombatesInterativos) salvar(s *sessaoCombateInterativo) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.limparExpiradosLocked()
	s.AtualizadoEm = time.Now()
	c.sessoes[s.ID] = s
}

func (c *cofreCombatesInterativos) obter(id, userID string) (*sessaoCombateInterativo, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.limparExpiradosLocked()
	s, ok := c.sessoes[id]
	if !ok || s.UserID != userID {
		return nil, false
	}
	return s, true
}

func (c *cofreCombatesInterativos) remover(id string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.sessoes, id)
}

func (c *cofreCombatesInterativos) limparExpiradosLocked() {
	limite := time.Now().Add(-30 * time.Minute)
	for id, s := range c.sessoes {
		if s.AtualizadoEm.Before(limite) {
			delete(c.sessoes, id)
		}
	}
}

func gerarIDSessaoInterativa() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return strings.ReplaceAll(time.Now().Format("20060102150405.000000"), ".", "")
	}
	return hex.EncodeToString(b)
}

// SortearIntencaoInimigo prevê a próxima ação do inimigo com estimativa de impacto para leitura tática.
func SortearIntencaoInimigo(rodada, ataque, magia, defesaHeroi int, rng *mathrand.Rand) IntencaoInimigo {
	opcoes := []string{"investida", "golpe_pesado", "postura_defensiva", "poder_arcano"}
	idx := (rodada + rng.Intn(len(opcoes))) % len(opcoes)
	tipo := opcoes[idx]

	baseDano := max(4, ataque-defesaHeroi/2)
	switch tipo {
	case "golpe_pesado":
		est := max(6, baseDano*145/100)
		return IntencaoInimigo{
			Tipo:         tipo,
			Titulo:       "Golpe Pesado",
			Descricao:    "Prepara um impacto brutal que atravessa posturas descuidadas.",
			DanoEstimado: est,
			Dica:         "Defender/Esquivar reduz o impacto pela metade e devolve contra-ataque.",
		}
	case "postura_defensiva":
		return IntencaoInimigo{
			Tipo:         tipo,
			Titulo:       "Postura Defensiva",
			Descricao:    "Ergue a guarda reduzindo o dano comum e buscando brecha.",
			DanoEstimado: max(3, baseDano*65/100),
			Dica:         "Golpe Direto ou Habilidade quebra a guarda (+25% dano bônus).",
		}
	case "poder_arcano":
		est := max(7, (ataque*90+magia*75)/100-defesaHeroi*3/8)
		return IntencaoInimigo{
			Tipo:         tipo,
			Titulo:       "Canalização Arcana",
			Descricao:    "Concentra Éter elementar para liberar descarga mágica.",
			DanoEstimado: est,
			Dica:         "Ruptura de Éter interrompe parte da canalização.",
		}
	default:
		return IntencaoInimigo{
			Tipo:         "investida",
			Titulo:       "Investida Rápida",
			Descricao:    "Avança em linha reta com ataque direto.",
			DanoEstimado: baseDano,
			Dica:         "Qualquer tática funciona bem; Ruptura acelera a luta.",
		}
	}
}

// ResolverRodadaInterativa executa uma rodada completa (ação do esquadrão/herói + reação da intenção do adversário).
func ResolverRodadaInterativa(s *sessaoCombateInterativo, acao string, rng *mathrand.Rand) ([]TurnoBatalha, string) {
	if s.Encerrado {
		return nil, "Combate já encerrado."
	}
	s.Rodada++
	turnosRodada := make([]TurnoBatalha, 0, len(s.Herois)+2)
	evento := ""

	defendendo := acao == acaoInterativaDefender
	ruptura := acao == acaoInterativaRuptura
	quebrouGuarda := s.Intencao.Tipo == "postura_defensiva" && acao == acaoInterativaGolpe

	// Turnos de cada herói vivo do esquadrão (ou único duelista).
	for i := range s.Herois {
		if s.HeroisInfo[i].VidaAtual <= 0 {
			continue
		}
		h := s.Herois[i]
		atk := h.Atributos.Ataque
		nomeHab := ""
		fator := 1.0
		critExtra := 0

		switch {
		case defendendo:
			// Em postura defensiva, o líder se fecha no contra-golpe (70%); aliados seguem apoiando com 85%.
			if i == 0 {
				fator = 0.70
				s.HeroisInfo[i].EterAtual = min(s.HeroisInfo[i].EterMaximo, s.HeroisInfo[i].EterAtual+8)
				nomeHab = "Postura Defensiva"
			} else {
				fator = 0.85
			}
		case ruptura:
			if s.HeroisInfo[i].EterAtual >= 12 {
				s.HeroisInfo[i].EterAtual -= 12
				atk = atk + h.Atributos.Magia*60/100
				fator = 1.45
				critExtra = 180
				nomeHab = "Ruptura de Éter"
			} else {
				fator = 1.15
				critExtra = 80
				nomeHab = "Foco Concentrado"
			}
		default:
			// Golpe / Habilidade: usa melhor habilidade paga pelo Éter quando disponível.
			var escolhida *HabilidadeRPG
			for idx := range h.Habilidades {
				hb := &h.Habilidades[idx]
				if hb.Efeito == efeitoDespertar || hb.Efeito == efeitoCura {
					continue
				}
				if s.HeroisInfo[i].EterAtual >= hb.CustoEter {
					if escolhida == nil || hb.NivelMinimo > escolhida.NivelMinimo {
						escolhida = hb
					}
				}
			}
			if escolhida != nil {
				gasto, fatorSobrecarga := CustoEterComSobrecarga(s.HeroisInfo[i].EterAtual, escolhida.CustoEter, h.Atributos.Magia)
				s.HeroisInfo[i].EterAtual -= gasto
				nomeHab = escolhida.Nome
				if h.Atributos.Magia > 0 && escolhida.Efeito == efeitoArcano {
					atk = int((float64(atk)*escolhida.Fator+float64(h.Atributos.Magia)*escolhida.Fator2)*fatorSobrecarga + 0.5)
				} else if escolhida.Fator > 0 {
					fator = escolhida.Fator * fatorSobrecarga
				}
				if escolhida.Tipo == "comum" {
					if s.Usos == nil {
						s.Usos = map[string]int{}
					}
					s.Usos[escolhida.ID]++
				}
			}
		}

		defesaAlvo := s.AlvoDefesa
		if s.Intencao.Tipo == "postura_defensiva" && !quebrouGuarda {
			defesaAlvo = defesaAlvo * 125 / 100
		} else if quebrouGuarda {
			defesaAlvo = defesaAlvo * 75 / 100
		}

		furiaHeroi := BonusFuria(s.HeroisInfo[i].VidaAtual, s.HeroisInfo[i].VidaMaxima)
		atkEfetivo := max(1, int(float64(atk)*fator*furiaHeroi+0.5))
		critDinamico := ChanceCriticoDinamica(min(850, h.Atributos.CriticoPorMil+critExtra), atkEfetivo, defesaAlvo, h.Atributos.Velocidade, VelocidadeDoMonstro(s.MonstroAtual))
		dano, critico := golpe(rng, atkEfetivo, defesaAlvo, critDinamico, float64(max(120, h.Atributos.DanoCritico))/100)
		if m := MultiplicadorElemental(h.Elemento, s.AlvoElemento); m != 1 {
			dano = max(1, int(float64(dano)*m+0.5))
		}
		if quebrouGuarda {
			dano = max(1, dano*125/100)
		}

		// Reação Elemental se havia aura elementar distinta acumulada.
		reacaoNome := ""
		if h.Elemento != "" && h.Elemento != elementoNeutro {
			if s.AuraElemental != "" && s.AuraElemental != h.Elemento {
				if reacao, okR := BuscarReacaoElemental(s.AuraElemental, h.Elemento); okR {
					reacaoNome = reacao.Nome
					if reacao.BonusDanoPct > 0 {
						dano = max(1, dano*(100+reacao.BonusDanoPct)/100)
					}
					if reacao.CuraAliadoMaisFeridoPct > 0 && s.HeroisInfo[i].VidaAtual > 0 {
						cura := max(1, s.HeroisInfo[i].VidaMaxima*reacao.CuraAliadoMaisFeridoPct/100)
						s.HeroisInfo[i].VidaAtual = min(s.HeroisInfo[i].VidaMaxima, s.HeroisInfo[i].VidaAtual+cura)
					}
					if reacao.RecuperaEterGrupo > 0 {
						for j := range s.HeroisInfo {
							if s.HeroisInfo[j].VidaAtual > 0 {
								s.HeroisInfo[j].EterAtual = min(s.HeroisInfo[j].EterMaximo, s.HeroisInfo[j].EterAtual+reacao.RecuperaEterGrupo)
							}
						}
					}
					s.AuraElemental = ""
				} else {
					s.AuraElemental = h.Elemento
				}
			} else {
				s.AuraElemental = h.Elemento
			}
		}

		s.InimigoVida = max(0, s.InimigoVida-dano)
		t := TurnoBatalha{
			Atacante:    "jogador",
			Heroi:       i + 1,
			Habilidade:  nomeHab,
			Dano:        dano,
			Critico:     critico,
			Reacao:      reacaoNome,
			Furia:       furiaHeroi > 1,
			Eter:        s.HeroisInfo[i].EterAtual,
			VidaJogador: s.HeroisInfo[0].VidaAtual,
			VidaMonstro: s.InimigoVida,
		}
		turnosRodada = append(turnosRodada, t)
		s.Turnos = append(s.Turnos, t)
		if s.InimigoVida == 0 {
			break
		}
	}

	if quebrouGuarda {
		evento = "Guarda inimiga quebrada (+25% de dano)!"
	}

	// Se o inimigo caiu nesta rodada, verifica próximo andar (masmorra) ou vitória final.
	if s.InimigoVida == 0 {
		if s.Modo == "masmorra" {
			s.Vencidos = append(s.Vencidos, s.MonstroAtual.ID)
			if s.AndarIdx+1 < len(s.Andares) {
				s.AndarIdx++
				prox := s.Andares[s.AndarIdx]
				if len(s.Herois) > 1 {
					prox = EquilibrarMonstroParaGrupo(prox, s.Herois)
				}
				s.MonstroAtual = prox
				s.AlvoNome = prox.Nome
				s.AlvoElemento = prox.Elemento
				s.AlvoNivel = prox.Nivel
				s.AlvoAtaque = prox.Ataque
				s.AlvoDefesa = prox.Defesa
				s.AlvoMagia = prox.Magia
				s.AlvoCritMil = prox.CriticoPorMil
				s.InimigoVida = prox.Vida
				s.InimigoVidaMax = prox.Vida
				s.AuraElemental = ""
				for i := range s.HeroisInfo {
					if s.HeroisInfo[i].VidaAtual > 0 {
						cura := max(1, s.HeroisInfo[i].VidaMaxima*25/100)
						s.HeroisInfo[i].VidaAtual = min(s.HeroisInfo[i].VidaMaxima, s.HeroisInfo[i].VidaAtual+cura)
					}
				}
				s.Intencao = SortearIntencaoInimigo(s.Rodada+1, s.AlvoAtaque, s.AlvoMagia, s.Herois[0].Atributos.Defesa, rng)
				return turnosRodada, "Andar vencido! Esquadrão recuperou 25% de Vida ao encontrar " + prox.Nome + "."
			}
		}
		s.Encerrado = true
		s.Venceu = true
		return turnosRodada, "Vitória tática alcançada!"
	}

	// Turno do adversário baseado na intenção revelada.
	vivos := make([]int, 0, len(s.HeroisInfo))
	for i := range s.HeroisInfo {
		if s.HeroisInfo[i].VidaAtual > 0 {
			vivos = append(vivos, i)
		}
	}
	if len(vivos) > 0 {
		alvoIdx := vivos[rng.Intn(len(vivos))]
		alvoHeroi := s.Herois[alvoIdx]
		ataqueInimigo := s.AlvoAtaque
		arcano := false

		switch s.Intencao.Tipo {
		case "golpe_pesado":
			ataqueInimigo = s.AlvoAtaque * 140 / 100
		case "postura_defensiva":
			ataqueInimigo = s.AlvoAtaque * 75 / 100
		case "poder_arcano":
			arcano = true
			ataqueInimigo = (s.AlvoAtaque*90 + s.AlvoMagia*80) / 100
			if ruptura {
				ataqueInimigo = ataqueInimigo * 60 / 100
				evento = "Ruptura de Éter interrompeu 40% do poder arcano inimigo!"
			}
		}

		defesaAlvoHeroi := alvoHeroi.Atributos.Defesa
		if arcano {
			defesaAlvoHeroi = defesaAlvoHeroi * 3 / 4
		}
		esquivaExtra := 0
		if defendendo {
			esquivaExtra = 280
		}
		velAlvo := VelocidadeDoMonstro(s.MonstroAtual)
		chanceEsquiva := min(750, ChanceEsquivaDinamica(alvoHeroi.Atributos.EsquivaPorMil, alvoHeroi.Atributos.Velocidade, velAlvo)+esquivaExtra)

		if rng.Intn(1000) < chanceEsquiva {
			contraDano := 0
			if defendendo && s.InimigoVida > 0 {
				contraDano = DanoContraAtaque(alvoHeroi.Atributos.Ataque, s.AlvoDefesa)
				s.InimigoVida = max(0, s.InimigoVida-contraDano)
				evento = "Esquiva perfeita e contra-ataque!"
			}
			t := TurnoBatalha{
				Atacante:     "monstro",
				Heroi:        alvoIdx + 1,
				Poder:        s.Intencao.Titulo,
				Esquiva:      true,
				ContraAtaque: contraDano,
				VidaJogador:  s.HeroisInfo[0].VidaAtual,
				VidaMonstro:  s.InimigoVida,
			}
			turnosRodada = append(turnosRodada, t)
			s.Turnos = append(s.Turnos, t)
		} else {
			critAlvo := ChanceCriticoDinamica(max(50, s.AlvoCritMil), ataqueInimigo, defesaAlvoHeroi, velAlvo, alvoHeroi.Atributos.Velocidade)
			danoInimigo, critInimigo := golpe(rng, max(1, ataqueInimigo), defesaAlvoHeroi, critAlvo, 1.45)
			if m := MultiplicadorElemental(s.AlvoElemento, alvoHeroi.Elemento); m != 1 {
				danoInimigo = max(1, int(float64(danoInimigo)*m+0.5))
			}
			bloqueio := false
			if chanceBloq := ChanceBloqueioDinamica(defesaAlvoHeroi, ataqueInimigo); chanceBloq > 0 && rng.Intn(1000) < chanceBloq {
				bloqueio = true
				danoInimigo = max(1, danoInimigo*70/100)
			}
			contraDano := 0
			if defendendo {
				danoInimigo = max(1, danoInimigo*45/100)
				if s.InimigoVida > 0 {
					contraDano = DanoContraAtaque(alvoHeroi.Atributos.Ataque, s.AlvoDefesa)
					s.InimigoVida = max(0, s.InimigoVida-contraDano)
				}
			}
			s.HeroisInfo[alvoIdx].VidaAtual = max(0, s.HeroisInfo[alvoIdx].VidaAtual-danoInimigo)
			t := TurnoBatalha{
				Atacante:     "monstro",
				Heroi:        alvoIdx + 1,
				Poder:        s.Intencao.Titulo,
				Dano:         danoInimigo,
				Critico:      critInimigo,
				Bloqueio:     bloqueio,
				ContraAtaque: contraDano,
				VidaJogador:  s.HeroisInfo[0].VidaAtual,
				VidaMonstro:  s.InimigoVida,
			}
			turnosRodada = append(turnosRodada, t)
			s.Turnos = append(s.Turnos, t)
		}
	}

	if s.InimigoVida == 0 {
		s.Encerrado = true
		s.Venceu = true
		return turnosRodada, "Vitória por contra-ataque!"
	}

	// Regenera 3 de Éter por rodada para manter ritmo tático com habilidades de custo maior.
	for i := range s.HeroisInfo {
		if s.HeroisInfo[i].VidaAtual > 0 {
			s.HeroisInfo[i].EterAtual = min(s.HeroisInfo[i].EterMaximo, s.HeroisInfo[i].EterAtual+3)
		}
	}

	algumVivo := false
	for _, h := range s.HeroisInfo {
		if h.VidaAtual > 0 {
			algumVivo = true
			break
		}
	}
	if !algumVivo || s.Rodada >= maxTurnosBatalha {
		s.Encerrado = true
		s.Venceu = false
		s.Caiu = !algumVivo
		if !algumVivo {
			evento = "Todo o esquadrão caiu em combate."
		} else {
			evento = "O combate atingiu o limite de rodadas e você recuou."
		}
		return turnosRodada, evento
	}

	s.Intencao = SortearIntencaoInimigo(s.Rodada+1, s.AlvoAtaque, s.AlvoMagia, s.Herois[0].Atributos.Defesa, rng)
	return turnosRodada, evento
}

func snapshotCombateInterativo(s *sessaoCombateInterativo, ultimos []TurnoBatalha, evento string) EstadoCombateInterativo {
	heroisCopy := make([]HeroiCombateInterativo, len(s.HeroisInfo))
	copy(heroisCopy, s.HeroisInfo)
	andar := 0
	total := 0
	if s.Modo == "masmorra" {
		andar = s.AndarIdx + 1
		total = len(s.Andares)
	}
	var atb *EstadoATB
	if len(s.Herois) > 0 {
		velAlvo := VelocidadeDoMonstro(s.MonstroAtual)
		if s.AtribAdversar != nil {
			velAlvo = s.AtribAdversar.Velocidade
		}
		calc := CalcularIniciativaATB(s.Herois[0].Atributos.Velocidade, velAlvo)
		atb = &calc
	}
	return EstadoCombateInterativo{
		SessaoID:       s.ID,
		Modo:           s.Modo,
		AlvoNome:       s.AlvoNome,
		AlvoElemento:   s.AlvoElemento,
		AlvoNivel:      s.AlvoNivel,
		AndarAtual:     andar,
		TotalAndares:   total,
		Rodada:         s.Rodada,
		Herois:         heroisCopy,
		InimigoVida:    s.InimigoVida,
		InimigoVidaMax: s.InimigoVidaMax,
		AuraElemental:  s.AuraElemental,
		Intencao:       s.Intencao,
		UltimosTurnos:  ultimos,
		Encerrado:      s.Encerrado,
		Venceu:         s.Venceu,
		Caiu:           s.Caiu,
		Evento:         evento,
		ATB:            atb,
	}
}

// HandleIniciarCombateInterativo prepara combate tático por rodada para expedição, masmorra ou duelo.
func (h *RPGHandler) HandleIniciarCombateInterativo(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		Modo      string   `json:"modo"`
		AlvoID    string   `json:"alvo_id"`
		Esquadrao []string `json:"esquadrao"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Dados inválidos para iniciar combate tático.")
		return
	}
	corpo.Modo = strings.TrimSpace(corpo.Modo)
	corpo.AlvoID = strings.TrimSpace(corpo.AlvoID)

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	rng := novoGeradorDeBatalha()

	switch corpo.Modo {
	case "expedicao", "masmorra":
		var (
			equipamento       EstadoEquipamento
			catalogo          []MonstroRPG
			hoje              HojeRPG
			passiva           *PassivaEspecialidade
			errEq, errM, errH error
			wg                sync.WaitGroup
		)
		wg.Add(4)
		go func() {
			defer wg.Done()
			equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
		}()
		go func() { defer wg.Done(); catalogo, errM = lerMonstros(sessao.dbClient) }()
		go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
		go func() { defer wg.Done(); _, passiva = carregarEspecialidadeDoUsuario(sessao.dbClient) }()
		wg.Wait()
		if errEq != nil || errM != nil || errH != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Combate indisponível no momento.")
			return
		}
		vida := MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida)
		if !PodeLutar(vida.PerdidaPorMil, hoje.Regras) {
			responderErroJSON(w, http.StatusConflict, "Seu personagem precisa de pelo menos 30% de Vida para lutar.")
			return
		}
		combatentes, fichas, errEsq := MontarEsquadraoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx, hoje.VidaPerdida, passiva, "", corpo.Esquadrao)
		if errEsq != nil {
			responderErroJSON(w, http.StatusBadRequest, errEsq.Error())
			return
		}
		heroisInfo := make([]HeroiCombateInterativo, len(combatentes))
		esqSalvo := make([]string, 0, len(fichas))
		for i, c := range combatentes {
			vi := c.VidaInicial
			if vi <= 0 || vi > c.Atributos.Vida {
				vi = c.Atributos.Vida
			}
			heroisInfo[i] = HeroiCombateInterativo{
				Base:       fichas[i].Personagem,
				Nome:       fichas[i].Nome,
				Elemento:   c.Elemento,
				VidaAtual:  vi,
				VidaMaxima: c.Atributos.Vida,
				EterAtual:  c.Atributos.Eter,
				EterMaximo: c.Atributos.Eter,
			}
			if i > 0 {
				esqSalvo = append(esqSalvo, fichas[i].Personagem)
			}
		}

		if corpo.Modo == "expedicao" {
			if hoje.Feitas >= hoje.Limite {
				responderErroJSON(w, http.StatusTooManyRequests, "Suas batalhas de hoje acabaram.")
				return
			}
			var monstro MonstroRPG
			achou := false
			for _, cand := range catalogo {
				if cand.ID == corpo.AlvoID {
					monstro = cand
					achou = true
					break
				}
			}
			if !achou {
				responderErroJSON(w, http.StatusBadRequest, "Monstro não encontrado.")
				return
			}
			EnriquecerMonstro(&monstro)
			if len(combatentes) > 1 {
				monstro = EquilibrarMonstroParaGrupo(monstro, combatentes)
			}
			s := &sessaoCombateInterativo{
				ID:             gerarIDSessaoInterativa(),
				UserID:         sessao.userID,
				Modo:           "expedicao",
				AlvoID:         monstro.ID,
				EsquadraoIDs:   esqSalvo,
				AlvoNome:       monstro.Nome,
				AlvoElemento:   monstro.Elemento,
				AlvoNivel:      monstro.Nivel,
				AlvoVidaBase:   monstro.Vida,
				AlvoAtaque:     monstro.Ataque,
				AlvoDefesa:     monstro.Defesa,
				AlvoMagia:      monstro.Magia,
				AlvoCritMil:    monstro.CriticoPorMil,
				Herois:         combatentes,
				HeroisInfo:     heroisInfo,
				MonstroAtual:   monstro,
				InimigoVida:    monstro.Vida,
				InimigoVidaMax: monstro.Vida,
				Usos:           map[string]int{},
				Intencao:       SortearIntencaoInimigo(1, monstro.Ataque, monstro.Magia, combatentes[0].Atributos.Defesa, rng),
			}
			cofreCombates.salvar(s)
			responderJSON(w, http.StatusOK, snapshotCombateInterativo(s, nil, "Combate tático iniciado! Observe a intenção do oponente."))
			return
		}

		// Modo "masmorra".
		if masmorraFeitaHoje(sessao) != "" {
			responderErroJSON(w, http.StatusTooManyRequests, "Você já entrou numa masmorra hoje.")
			return
		}
		masmorra, existe := masmorraPorID(corpo.AlvoID)
		if !existe {
			responderErroJSON(w, http.StatusBadRequest, "Masmorra não encontrada.")
			return
		}
		if sessao.nivel < masmorra.NivelMinimo {
			responderErroJSON(w, http.StatusForbidden, "Seu nível ainda não alcança esta masmorra.")
			return
		}
		andares, okAnd := monstrosDosAndares(masmorra, catalogo)
		if !okAnd || len(andares) == 0 {
			responderErroJSON(w, http.StatusConflict, "Esta masmorra está fechada no momento.")
			return
		}
		primeiro := andares[0]
		EnriquecerMonstro(&primeiro)
		if len(combatentes) > 1 {
			primeiro = EquilibrarMonstroParaGrupo(primeiro, combatentes)
		}
		s := &sessaoCombateInterativo{
			ID:             gerarIDSessaoInterativa(),
			UserID:         sessao.userID,
			Modo:           "masmorra",
			AlvoID:         masmorra.ID,
			EsquadraoIDs:   esqSalvo,
			AlvoNome:       primeiro.Nome,
			AlvoElemento:   primeiro.Elemento,
			AlvoNivel:      primeiro.Nivel,
			AlvoVidaBase:   primeiro.Vida,
			AlvoAtaque:     primeiro.Ataque,
			AlvoDefesa:     primeiro.Defesa,
			AlvoMagia:      primeiro.Magia,
			AlvoCritMil:    primeiro.CriticoPorMil,
			Herois:         combatentes,
			HeroisInfo:     heroisInfo,
			MonstroAtual:   primeiro,
			Andares:        andares,
			AndarIdx:       0,
			InimigoVida:    primeiro.Vida,
			InimigoVidaMax: primeiro.Vida,
			Usos:           map[string]int{},
			Intencao:       SortearIntencaoInimigo(1, primeiro.Ataque, primeiro.Magia, combatentes[0].Atributos.Defesa, rng),
		}
		cofreCombates.salvar(s)
		responderJSON(w, http.StatusOK, snapshotCombateInterativo(s, nil, "1º andar da masmorra! Escolha sua primeira ação tática."))

	case "duelo":
		handle, problema := formatoDeHandle(corpo.AlvoID)
		if problema != "" {
			responderErroJSON(w, http.StatusBadRequest, "Escolha um oponente.")
			return
		}
		servico, err := database.ServiceRoleClient()
		if err != nil || servico == nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
			return
		}
		var (
			equipamento EstadoEquipamento
			errEq       error
			brutoFicha  string
			wg          sync.WaitGroup
		)
		wg.Add(2)
		go func() {
			defer wg.Done()
			equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
		}()
		go func() {
			defer wg.Done()
			brutoFicha = servico.Rpc("rpg_ficha_de_duelo", "", map[string]interface{}{"p_desafiante": sessao.userID, "p_handle": handle})
		}()
		wg.Wait()
		if errEq != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
			return
		}
		var ficha struct {
			estadoJogadorBanco
			Nome string `json:"nome_perfil"`
		}
		if json.Unmarshal([]byte(strings.TrimSpace(brutoFicha)), &ficha) != nil || ficha.Erro != "" || !ficha.Ok || ficha.Personagem == nil {
			responderErroJSON(w, http.StatusNotFound, "Oponente não encontrado.")
			return
		}
		cfg := carregarConfigRPG(sessao.dbClient)
		ctxOponente, errCtx := contextoDoEstado(ficha.estadoJogadorBanco, cfg)
		if errCtx != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Duelos indisponíveis no momento.")
			return
		}
		oponente := fichaDeDuelo(ctxOponente)
		nivelOp := CalcularNivelERank(ctxOponente.xpTotal, ctxOponente.ranks).Nivel
		desafiante := CombatenteDoEstado(equipamento)
		desafiante.Elemento = elementoDoJogador(sessao.ctx)
		desafiante.Classe = classeDoJogador(sessao.ctx)

		s := &sessaoCombateInterativo{
			ID:           gerarIDSessaoInterativa(),
			UserID:       sessao.userID,
			Modo:         "duelo",
			AlvoID:       handle,
			AlvoNome:     ficha.Nome,
			AlvoElemento: oponente.Elemento,
			AlvoNivel:    nivelOp,
			AlvoVidaBase: oponente.Atributos.Vida,
			AlvoAtaque:   oponente.Atributos.Ataque,
			AlvoDefesa:   oponente.Atributos.Defesa,
			AlvoMagia:    oponente.Atributos.Magia,
			AlvoCritMil:  oponente.Atributos.CriticoPorMil,
			Herois:       []CombatenteRPG{desafiante},
			HeroisInfo: []HeroiCombateInterativo{{
				Base:       sessao.ctx.linha.PersonagemBase,
				Nome:       sessao.ctx.linha.Nome,
				Elemento:   desafiante.Elemento,
				VidaAtual:  equipamento.Atributos.Vida,
				VidaMaxima: equipamento.Atributos.Vida,
				EterAtual:  equipamento.Atributos.Eter,
				EterMaximo: equipamento.Atributos.Eter,
			}},
			InimigoVida:    oponente.Atributos.Vida,
			InimigoVidaMax: oponente.Atributos.Vida,
			ContextoOpon:   &ctxOponente,
			AtribAdversar:  &oponente.Atributos,
			Usos:           map[string]int{},
			Intencao:       SortearIntencaoInimigo(1, oponente.Atributos.Ataque, oponente.Atributos.Magia, desafiante.Atributos.Defesa, rng),
		}
		cofreCombates.salvar(s)
		responderJSON(w, http.StatusOK, snapshotCombateInterativo(s, nil, "Duelo tático iniciado contra "+ficha.Nome+"!"))

	default:
		responderErroJSON(w, http.StatusBadRequest, "Modo de combate inválido.")
	}
}

// HandleAgirCombateInterativo resolve uma rodada escolhida pelo jogador e registra prêmios ao concluir.
func (h *RPGHandler) HandleAgirCombateInterativo(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	var corpo struct {
		SessaoID string `json:"sessao_id"`
		Acao     string `json:"acao"`
	}
	if r.Body == nil || json.NewDecoder(http.MaxBytesReader(w, r.Body, 512)).Decode(&corpo) != nil {
		responderErroJSON(w, http.StatusBadRequest, "Ação de combate inválida.")
		return
	}
	corpo.Acao = strings.TrimSpace(corpo.Acao)
	if corpo.Acao != acaoInterativaGolpe && corpo.Acao != acaoInterativaDefender && corpo.Acao != acaoInterativaRuptura {
		responderErroJSON(w, http.StatusBadRequest, "Escolha golpe, defender ou ruptura.")
		return
	}
	s, existe := cofreCombates.obter(strings.TrimSpace(corpo.SessaoID), sessao.userID)
	if !existe {
		responderErroJSON(w, http.StatusNotFound, "Sessão de combate não encontrada ou expirada.")
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.Finalizado {
		responderErroJSON(w, http.StatusConflict, "Este combate já foi finalizado.")
		return
	}

	rng := novoGeradorDeBatalha()
	turnosRodada, evento := ResolverRodadaInterativa(s, corpo.Acao, rng)
	s.AtualizadoEm = time.Now()
	snap := snapshotCombateInterativo(s, turnosRodada, evento)

	if !s.Encerrado {
		responderJSON(w, http.StatusOK, snap)
		return
	}

	// Ao encerrar, grava recompensas e vida usando os RPCs atômicos do projeto.
	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar o combate agora.")
		return
	}
	regras := lerRegrasComunidade(sessao.dbClient)

	switch s.Modo {
	case "expedicao":
		equipamento, errEq := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
		if errEq != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a batalha.")
			return
		}
		var itemSorteado *ItemRPG
		if s.Venceu {
			candidatos := lerItensDaRaridade(sessao.dbClient, s.MonstroAtual.RaridadeItem)
			ids := make([]string, 0, len(candidatos))
			for _, c := range candidatos {
				ids = append(ids, c.ID)
			}
			if id := EscolherItemDaRecompensa(rng, s.MonstroAtual.ChanceItem+equipamento.Atributos.SorteItem, ids); id != "" {
				for i := range candidatos {
					if candidatos[i].ID == id {
						itemSorteado = &candidatos[i]
					}
				}
			}
		}
		itemID := ""
		if itemSorteado != nil {
			itemID = itemSorteado.ID
		}
		custoMana := CustoDeMana(LutaExpedicao, sessao.nivel, regras)
		cobrou, okMana := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
		if !okMana {
			return
		}
		perdaFinal := PerdaPorMil(s.HeroisInfo[0].VidaMaxima, s.HeroisInfo[0].VidaAtual)
		bruto := strings.TrimSpace(servico.Rpc("rpg_concluir_batalha", "", map[string]interface{}{
			"p_user_id":      sessao.userID,
			"p_monstro_id":   s.AlvoID,
			"p_venceu":       s.Venceu,
			"p_turnos":       len(s.Turnos),
			"p_item_id":      itemID,
			"p_vida_perdida": perdaFinal,
		}))
		var registro struct {
			Ok             bool    `json:"ok"`
			Erro           string  `json:"erro"`
			LimiteAtingido bool    `json:"limite_atingido"`
			SemVida        bool    `json:"sem_vida"`
			BilhetesGanhos int     `json:"bilhetes_ganhos"`
			OuroGanho      int     `json:"ouro_ganho"`
			OuroPerdido    int     `json:"ouro_perdido"`
			ItemID         *string `json:"item_id"`
			VidaPerdida    int     `json:"vida_perdida"`
		}
		if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a batalha agora.")
			return
		}
		if registro.Erro != "" {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusConflict, registro.Erro)
			return
		}
		if len(s.Usos) > 0 {
			servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{"p_user_id": sessao.userID, "p_usos": s.Usos})
		}
		rec := RecompensaBatalha{Bilhetes: registro.BilhetesGanhos, Ouro: registro.OuroGanho, OuroPerdido: registro.OuroPerdido}
		if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
			rec.Item = itemSorteado
		}
		emDestaque := s.MonstroAtual.Regiao != "" && s.MonstroAtual.Regiao == RegiaoEmDestaqueEm(time.Now())
		rec.Materiais = entregarMateriais(servico, sessao.userID, SortearMateriaisDaExpedicaoEmDestaque(rng, s.Venceu, emDestaque))
		v := MontarVida(equipamento.Atributos.Vida, registro.VidaPerdida)
		snap.Recompensa = &rec
		snap.Vida = &v

	case "masmorra":
		equipamento, errEq := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
		if errEq != nil {
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a masmorra.")
			return
		}
		var itemSorteado *ItemRPG
		if s.Venceu && len(s.Andares) > 0 {
			ultimo := s.Andares[len(s.Andares)-1]
			candidatos := lerItensDaRaridade(sessao.dbClient, ultimo.RaridadeItem)
			ids := make([]string, 0, len(candidatos))
			for _, c := range candidatos {
				ids = append(ids, c.ID)
			}
			chance := ultimo.ChanceItem + chanceExtraBauMasmorra + equipamento.Atributos.SorteItem
			if id := EscolherItemDaRecompensa(rng, chance, ids); id != "" {
				for i := range candidatos {
					if candidatos[i].ID == id {
						itemSorteado = &candidatos[i]
					}
				}
			}
		}
		itemID := ""
		if itemSorteado != nil {
			itemID = itemSorteado.ID
		}
		custoMana := CustoDeMana(LutaMasmorra, sessao.nivel, regras)
		cobrou, okMana := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
		if !okMana {
			return
		}
		vencidos := s.Vencidos
		if vencidos == nil {
			vencidos = []string{}
		}
		bruto := strings.TrimSpace(servico.Rpc("rpg_concluir_masmorra", "", map[string]interface{}{
			"p_user_id":      sessao.userID,
			"p_masmorra_id":  s.AlvoID,
			"p_vencidos":     vencidos,
			"p_completou":    s.Venceu,
			"p_caiu":         s.Caiu,
			"p_bonus_pct":    bonusOuroMasmorraCompleta,
			"p_item_id":      itemID,
			"p_vida_perdida": PerdaPorMil(s.HeroisInfo[0].VidaMaxima, s.HeroisInfo[0].VidaAtual),
		}))
		var registro struct {
			Ok          bool    `json:"ok"`
			Erro        string  `json:"erro"`
			Ouro        int     `json:"ouro_ganho"`
			OuroPerdido int     `json:"ouro_perdido"`
			Bilhetes    int     `json:"bilhetes_ganhos"`
			ItemID      *string `json:"item_id"`
			VidaPerdida int     `json:"vida_perdida"`
		}
		if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a masmorra agora.")
			return
		}
		if registro.Erro != "" {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusConflict, registro.Erro)
			return
		}
		if len(s.Usos) > 0 {
			servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{"p_user_id": sessao.userID, "p_usos": s.Usos})
		}
		rec := RecompensaBatalha{Bilhetes: registro.Bilhetes, Ouro: registro.Ouro, OuroPerdido: registro.OuroPerdido}
		if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
			rec.Item = itemSorteado
		}
		rec.Materiais = entregarMateriais(servico, sessao.userID, SortearMateriaisDaMasmorra(rng, s.Venceu))
		v := MontarVida(equipamento.Atributos.Vida, registro.VidaPerdida)
		snap.Recompensa = &rec
		snap.Vida = &v

	case "duelo":
		custoMana := CustoDeMana(LutaDuelo, sessao.nivel, regras)
		cobrou, okMana := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
		if !okMana {
			return
		}
		bruto := strings.TrimSpace(servico.Rpc("rpg_registrar_duelo", "", map[string]interface{}{
			"p_user_id": sessao.userID,
			"p_handle":  s.AlvoID,
			"p_venceu":  s.Venceu,
			"p_turnos":  len(s.Turnos),
			"p_pontos":  pontosPorVitoria,
			"p_ouro":    OuroComRegra(ouroPorVitoriaDuelo, regras),
			"p_por_dia": duelosPorDia,
		}))
		var registro struct {
			Ok     bool   `json:"ok"`
			Erro   string `json:"erro"`
			Pontos int    `json:"pontos_ganhos"`
			Ouro   int    `json:"ouro_ganho"`
		}
		if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar o duelo agora.")
			return
		}
		if registro.Erro != "" {
			devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
			responderErroJSON(w, http.StatusConflict, registro.Erro)
			return
		}
		snap.PontosDuelo = registro.Pontos
		snap.OuroDuelo = registro.Ouro
	}

	s.Finalizado = true
	cofreCombates.remover(s.ID)
	log.Printf("[RPG] Combate interativo concluído (modo=%s, venceu=%v, rodadas=%d)", s.Modo, s.Venceu, s.Rodada)
	responderJSON(w, http.StatusOK, snap)
}
