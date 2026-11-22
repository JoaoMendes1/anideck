package handlers

import (
	crand "crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	supabase "github.com/supabase-community/supabase-go"
)

// maxTurnosBatalha é o limite de rodadas. Quem não derruba o monstro até lá perde: sem isso,
// uma luta entre dois lados muito defensivos não acabaria.
const maxTurnosBatalha = 20

// MonstroRPG é um monstro do catálogo rpg_monstros.
type MonstroRPG struct {
	ID           string `json:"id"`
	Nome         string `json:"nome"`
	Descricao    string `json:"descricao"`
	Tipo         string `json:"tipo"`
	Nivel        int    `json:"nivel"`
	Vida         int    `json:"vida"`
	Ataque       int    `json:"ataque"`
	Defesa       int    `json:"defesa"`
	Bilhetes     int    `json:"bilhetes"`
	ChanceItem   int    `json:"chance_item"`
	RaridadeItem string `json:"raridade_item"`
	Ordem        int    `json:"ordem"`
	// Os atributos e dados táticos abaixo vêm do código (rpg_combate_avancado.go) e completam
	// os 8 atributos de combate alinhados com o jogador.
	Magia         int            `json:"magia"`
	Eter          int            `json:"eter"`
	Velocidade    int            `json:"velocidade"`
	CriticoPorMil int            `json:"critico_por_mil"`
	DanoCritico   int            `json:"dano_critico"`
	EsquivaPorMil int            `json:"esquiva_por_mil"`
	Elemento      string         `json:"elemento"`
	Comportamento string         `json:"comportamento,omitempty"`
	Regiao        string         `json:"regiao,omitempty"`
	RegiaoNome    string         `json:"regiao_nome,omitempty"`
	Habitat       string         `json:"habitat,omitempty"`
	Familia       string         `json:"familia,omitempty"`
	Estagio       int            `json:"estagio,omitempty"`
	EvoluiDe      string         `json:"evolui_de,omitempty"`
	EvoluiPara    []string       `json:"evolui_para,omitempty"`
	Poderes       []PoderMonstro `json:"poderes,omitempty"`
	// Efeito de status que os golpes do monstro podem deixar (vem do elemento).
	Efeito *EfeitoDeElemento `json:"efeito,omitempty"`
	// Traços do corpo do monstro, que favorecem ou atrapalham classes (rpg_tracos.go).
	Tracos []TracoMonstro `json:"tracos,omitempty"`
}

// VelocidadeDoMonstro cresce um pouco abaixo da do jogador do mesmo nível: quem investe em
// Agilidade age primeiro; chefe e raro são mais rápidos.
func VelocidadeDoMonstro(m MonstroRPG) int {
	v := 3 + m.Nivel*4/5
	switch m.Tipo {
	case "raro":
		v += 2
	case "chefe":
		v += 4
	}
	return v
}

// PoderDoMonstro usa a mesma conta do jogador, para a comparação ser justa.
func PoderDoMonstro(m MonstroRPG) int {
	return CalcularPoder(AtributosRPG{Vida: m.Vida, Ataque: m.Ataque, Defesa: m.Defesa, Magia: m.Magia, Velocidade: VelocidadeDoMonstro(m)})
}

// TurnoBatalha é uma ação, para a tela reproduzir a luta.
type TurnoBatalha struct {
	Atacante    string `json:"atacante"`
	Dano        int    `json:"dano"`
	Critico     bool   `json:"critico"`
	VidaJogador int    `json:"vida_jogador"`
	VidaMonstro int    `json:"vida_monstro"`
	// Nome da habilidade usada; vazio é ataque comum.
	Habilidade string `json:"habilidade,omitempty"`
	// Esquiva: o golpe do monstro não acertou.
	Esquiva bool `json:"esquiva,omitempty"`
	// Cura: Vida recuperada nesta ação.
	Cura int `json:"cura,omitempty"`
	// Éter do jogador depois da ação.
	Eter int `json:"eter"`
	// Poder do monstro usado nesta ação; vazio é golpe comum.
	Poder string `json:"poder,omitempty"`
	// Alvo: nome do ajudante atingido pelo jogador, ou do ajudante que atacou.
	Alvo string `json:"alvo,omitempty"`
	// Invocado: nome do ajudante chamado nesta ação.
	Invocado string `json:"invocado,omitempty"`
	// Heroi: na luta em grupo, a posição (a partir de 1) do herói que agiu ou foi atingido;
	// VidaJogador e Eter são os dele. Ausente na luta solo.
	Heroi int `json:"heroi,omitempty"`
	// Efeito de status que o golpe deixou no alvo (rpg_efeitos.go).
	Efeito string `json:"efeito,omitempty"`
	// Tique: dano dos efeitos no fim da rodada, com os nomes; Atacante é quem os aplicou.
	Tique string `json:"tique,omitempty"`
	// PerdeuVez: o efeito que fez Atacante perder a ação.
	PerdeuVez string `json:"perdeu_vez,omitempty"`
	// Errou: o golpe de Atacante se perdeu por Ofuscamento.
	Errou bool `json:"errou,omitempty"`
	// Reacao: nome da reação elemental disparada neste golpe (rpg_reacoes.go).
	Reacao string `json:"reacao,omitempty"`
	// EterGasto: Éter consumido pela habilidade (incluindo sobrecarga, quando houver).
	EterGasto int `json:"eter_gasto,omitempty"`
	// Bloqueio: defensor aparou parcialmente o golpe graças à Defesa.
	Bloqueio bool `json:"bloqueio,omitempty"`
	// ContraAtaque: dano devolvido ao atacante em postura defensiva ou aparo.
	ContraAtaque int `json:"contra_ataque,omitempty"`
	// Furia: golpe potencializado por estar com Vida baixa.
	Furia bool `json:"furia,omitempty"`
}

// CombatenteRPG é o jogador na luta: os números e as habilidades já liberadas.
type CombatenteRPG struct {
	Atributos   AtributosRPG
	Habilidades []HabilidadeRPG
	// VidaInicial é a Vida com que o jogador entra, que persiste entre as batalhas (sql/081).
	// Zero ou acima da máxima é Vida cheia.
	VidaInicial int
	// Elemento do personagem do elenco; vazio é neutro.
	Elemento string
	// Passiva opcional derivada da Especialidade de Gênero do jogador.
	Passiva *PassivaEspecialidade
	// SemBioma desativa modificadores de bioma de mapa aberto (usado nas masmorras).
	SemBioma bool
	// Postura escolhida antes da luta (rpg_postura.go); vazia é a Equilibrada.
	Postura string
	// Classe do personagem do elenco, para os traços do monstro; vazia é neutra.
	Classe string
}

// CombatenteDoEstado separa do livro só as habilidades liberadas.
func CombatenteDoEstado(e EstadoEquipamento) CombatenteRPG {
	c := CombatenteRPG{Atributos: e.Atributos}
	for _, h := range e.Habilidades {
		if h.Desbloqueada {
			c.Habilidades = append(c.Habilidades, h)
		}
	}
	return c
}

// ResultadoSimulado é a luta inteira, antes de gravar.
type ResultadoSimulado struct {
	Venceu  bool           `json:"venceu"`
	Rodadas int            `json:"rodadas"`
	Turnos  []TurnoBatalha `json:"turnos"`
	// VidaInicial e VidaFinal são a Vida do jogador no começo e no fim; a final fica gravada
	// para a próxima batalha.
	VidaInicial int `json:"vida_inicial"`
	VidaFinal   int `json:"vida_final"`
	// Usos de cada habilidade comum nesta luta, para a maestria (sql/084).
	Usos map[string]int `json:"-"`
	// Relação do elemento do jogador com o do monstro: vantagem, desvantagem ou neutro.
	Elemental string `json:"elemental"`
	// Caiu: a Vida chegou a zero (derrota por tempo não é queda).
	Caiu bool `json:"caiu"`
}

// CalcularDano dá o dano de um golpe antes da variação. A fórmula ataque²/(ataque+defesa)
// nunca chega a zero e faz a defesa pesar menos quando o ataque é muito maior.
func CalcularDano(ataque, defesa int) float64 {
	if ataque < 1 {
		ataque = 1
	}
	if defesa < 0 {
		defesa = 0
	}
	return float64(ataque*ataque) / float64(ataque+defesa)
}

// golpe aplica a variação de 85% a 115% e o crítico. Todo golpe dá pelo menos 1 de dano.
// critPorMil é a chance em milésimos; multCrit, o multiplicador (1,5 = 50% a mais).
func golpe(rng *rand.Rand, ataque, defesa, critPorMil int, multCrit float64) (int, bool) {
	dano := CalcularDano(ataque, defesa) * (0.85 + rng.Float64()*0.30)
	critico := rng.Intn(1000) < critPorMil
	if critico {
		dano *= multCrit
	}
	if dano < 1 {
		dano = 1
	}
	return int(dano + 0.5), critico
}

// Regras fixas do monstro e do Éter.
const (
	critMonstroPorMil = 100 // 10% de crítico, como antes do sql/077
	multCritMonstro   = 1.5 // a 1,5x
	eterPorRodada     = 2   // Éter que volta a cada rodada
)

// estadoDoMonstro é o lado do monstro na luta. Fica num ponteiro à parte para a luta em
// grupo: cada herói tem a sua lutaEmAndamento, e todas apontam para o mesmo monstro.
type estadoDoMonstro struct {
	vida          int
	eter          int
	rodada        int
	usosPoder     map[string]int
	ajudantes     []AjudanteNaLuta
	furia         float64 // multiplica o ataque do monstro; 0 é nenhum
	escudo        float64 // fração do dano dos heróis que o monstro absorve
	rodadasEscudo int
	status        statusNaLuta
	auraElemental string
	grupo         []*lutaEmAndamento
}

// lutaEmAndamento guarda o que muda durante a luta, do lado de um herói.
type lutaEmAndamento struct {
	j           CombatenteRPG
	m           MonstroRPG
	mon         *estadoDoMonstro
	rng         *rand.Rand
	vidaJogador int
	eter        int
	recargas    map[string]int
	despertou   bool
	// Efeitos da habilidade única, depois que ela dispara.
	multProximo    float64 // multiplica o próximo golpe do jogador; 0 é nenhum
	ignorarDefesa  bool    // o próximo golpe do jogador atravessa a defesa
	esquivasCertas int     // golpes do monstro que erram com certeza
	reducao        float64 // fração do dano do monstro que é absorvida
	rodadasReducao int     // rodadas em que a redução ainda vale
	usos           map[string]int
	// diario é o registro da luta, compartilhado entre os heróis do grupo.
	diario *[]TurnoBatalha
	// heroi é a posição do herói no grupo, a partir de 1; 0 na luta solo.
	heroi int
	// status são os efeitos que o monstro deixou neste herói.
	status statusNaLuta
}

// ajudanteVivo devolve o primeiro ajudante de pé, que protege o monstro dos golpes.
func (l *lutaEmAndamento) ajudanteVivo() *AjudanteNaLuta {
	for i := range l.mon.ajudantes {
		if l.mon.ajudantes[i].Vida > 0 {
			return &l.mon.ajudantes[i]
		}
	}
	return nil
}

func (l *lutaEmAndamento) registrar(t TurnoBatalha) {
	t.VidaJogador, t.VidaMonstro, t.Eter, t.Heroi = l.vidaJogador, l.mon.vida, l.eter, l.heroi
	*l.diario = append(*l.diario, t)
}

// pronta diz se a habilidade pode ser usada agora.
func (l *lutaEmAndamento) pronta(h HabilidadeRPG) bool {
	return h.Efeito != efeitoDespertar && l.eter >= h.CustoEter && l.recargas[h.ID] == 0
}

// escolher decide a ação do jogador, sem pedir nada a ele: cura quando a Vida passa da
// metade para baixo; senão, a habilidade de ataque de nível mais alto que o Éter paga;
// senão, ataque comum (nil).
func (l *lutaEmAndamento) escolher() *HabilidadeRPG {
	if l.vidaJogador*100 < l.j.Atributos.Vida*limiarDeCuraPct(l.j.Postura) {
		for i := range l.j.Habilidades {
			if h := &l.j.Habilidades[i]; h.Efeito == efeitoCura && l.pronta(*h) {
				return h
			}
		}
	}
	var melhor *HabilidadeRPG
	for i := range l.j.Habilidades {
		h := &l.j.Habilidades[i]
		if h.Efeito == efeitoCura || !l.pronta(*h) {
			continue
		}
		if melhor == nil || h.NivelMinimo > melhor.NivelMinimo {
			melhor = h
		}
	}
	return melhor
}

// golpeDoJogador dá um golpe com o ataque indicado, aplicando crítico e o que a habilidade
// única deixou para o próximo golpe (multiplicador, defesa ignorada).
func (l *lutaEmAndamento) golpeDoJogador(ataque int) (int, bool) {
	a := l.j.Atributos
	defesa := l.m.Defesa
	aj := l.ajudanteVivo()
	if aj != nil {
		defesa = aj.Defesa
	}
	if aj == nil {
		defesa = l.mon.status.defesaEfetiva(defesa)
	}
	if l.ignorarDefesa {
		defesa = 0
		l.ignorarDefesa = false
	}
	crit := ChanceCriticoDinamica(a.CriticoPorMil, ataque, defesa, a.Velocidade, l.m.Velocidade)
	dano, critico := golpe(l.rng, ataque, defesa, crit, float64(a.DanoCritico)/100)
	dano = l.status.danoCausado(dano)
	if furia := BonusFuria(l.vidaJogador, a.Vida); furia > 1 {
		dano = max(1, int(float64(dano)*furia+0.5))
	}
	if m := MultiplicadorElemental(l.j.Elemento, l.m.Elemento); m != 1 {
		dano = max(1, int(float64(dano)*m+0.5))
	}
	if f := FatorDeClasse(l.j.Classe, l.m.Tracos); f != 1 {
		dano = max(1, int(float64(dano)*f+0.5))
	}
	if l.multProximo > 0 {
		dano = int(float64(dano)*l.multProximo + 0.5)
		l.multProximo = 0
	}
	return dano, critico
}

// vezDoJogador faz a ação do jogador. Devolve true quando o monstro cai.
func (l *lutaEmAndamento) vezDoJogador() bool {
	a := l.j.Atributos
	if l.status.perderVez() {
		l.registrar(TurnoBatalha{Atacante: "jogador", PerdeuVez: efeitosDosElementos["raio"].Nome})
		return false
	}
	h := l.escolher()
	t := TurnoBatalha{Atacante: "jogador"}
	fatorSobrecarga := 1.0
	if h != nil {
		gasto := h.CustoEter
		if h.Efeito != efeitoCura {
			gasto, fatorSobrecarga = CustoEterComSobrecarga(l.eter, h.CustoEter, a.Magia)
		}
		l.eter -= gasto
		l.recargas[h.ID] = h.Recarga
		t.Habilidade = h.Nome
		t.EterGasto = gasto
		if h.Tipo == "comum" {
			l.usos[h.ID]++
		}
	}

	ofensiva := h == nil || h.Efeito != efeitoCura
	if ofensiva && l.ajudanteVivo() == nil && !l.ignorarDefesa {
		esquiva := ChanceEsquivaDinamica(l.m.EsquivaPorMil, l.m.Velocidade, a.Velocidade)
		if esquiva > 0 && l.rng.Intn(1000) < esquiva {
			t.Esquiva = true
			l.registrar(t)
			return false
		}
	}
	if ofensiva && l.status.errou(l.rng) {
		t.Errou = true
		l.registrar(t)
		return false
	}

	if ofensiva && BonusFuria(l.vidaJogador, a.Vida) > 1 {
		t.Furia = true
	}

	switch {
	case h == nil:
		t.Dano, t.Critico = l.golpeDoJogador(a.Ataque)
	case h.Efeito == efeitoCura:
		cura := int(float64(a.Vida)*h.Fator + 0.5)
		cura = min(cura, a.Vida-l.vidaJogador)
		l.vidaJogador += cura
		t.Cura = cura
	case h.Efeito == efeitoGolpeDuplo:
		for range 2 {
			dano, critico := l.golpeDoJogador(int(float64(a.Ataque)*h.Fator*fatorSobrecarga + 0.5))
			t.Dano += dano
			t.Critico = t.Critico || critico
		}
	case h.Efeito == efeitoArcano:
		t.Dano, t.Critico = l.golpeDoJogador(int((float64(a.Ataque)*h.Fator+float64(a.Magia)*h.Fator2)*fatorSobrecarga + 0.5))
	default:
		t.Dano, t.Critico = l.golpeDoJogador(int(float64(a.Ataque)*h.Fator*fatorSobrecarga + 0.5))
	}

	// O ajudante de pé recebe o golpe no lugar do monstro; o escudo só protege o monstro.
	if aj := l.ajudanteVivo(); aj != nil && t.Dano > 0 {
		aj.Vida = max(0, aj.Vida-t.Dano)
		t.Alvo = aj.Nome
	} else if t.Dano > 0 {
		if reacao, reagiu := BuscarReacaoElemental(l.mon.auraElemental, l.j.Elemento); reagiu {
			l.mon.auraElemental = ""
			t.Reacao = reacao.Nome
			if reacao.QuebraEscudo {
				l.mon.rodadasEscudo = 0
			}
			extra := max(1, t.Dano*reacao.BonusDanoPct/100)
			t.Dano += extra
			l.aplicarReacaoElemental(reacao, a)
		} else if l.j.Elemento != "" && l.j.Elemento != elementoNeutro {
			l.mon.auraElemental = l.j.Elemento
		}

		if l.mon.rodadasEscudo > 0 {
			t.Dano = max(1, int(float64(t.Dano)*(1-escudoContraPostura(l.mon.escudo, l.j.Postura))+0.5))
		}
		if !l.ignorarDefesa {
			ataqueEfetivo := a.Ataque
			if h != nil {
				if h.Efeito == efeitoArcano {
					ataqueEfetivo = int(float64(a.Ataque)*h.Fator + float64(a.Magia)*h.Fator2 + 0.5)
				} else if h.Fator > 0 {
					ataqueEfetivo = int(float64(a.Ataque)*h.Fator + 0.5)
				}
			}
			if chanceBloq := ChanceBloqueioDinamica(l.m.Defesa, ataqueEfetivo); chanceBloq > 0 && l.rng.Intn(1000) < chanceBloq {
				t.Bloqueio = true
				t.Dano = max(1, t.Dano*75/100)
			}
		}
		l.mon.vida = max(0, l.mon.vida-t.Dano)
		if l.mon.vida > 0 {
			if ef, ok := l.mon.status.tentarAplicar(l.rng, l.j.Elemento, a.Ataque, h != nil, false); ok {
				t.Efeito = ef.Nome
				if ef.ID == efeitoDrenoDeEter {
					l.mon.eter = max(0, l.mon.eter-eterDrenado)
					l.eter = min(a.Eter, l.eter+eterDrenado)
				}
			}
		}
	}
	l.registrar(t)
	return l.mon.vida == 0
}

func (l *lutaEmAndamento) aplicarReacaoElemental(reacao ReacaoElemental, a AtributosRPG) {
	if reacao.FragilizaDefesa {
		l.mon.status.rachadura = max(l.mon.status.rachadura, 2)
	}
	if reacao.DobrarQueimadura {
		l.mon.status.queimadura = max(l.mon.status.queimadura, 3)
		l.mon.status.danoQueimadura = max(l.mon.status.danoQueimadura, max(1, a.Ataque*35/100))
	}
	if reacao.CongelaAlvo {
		l.mon.status.congelamento = max(l.mon.status.congelamento, 2)
	}
	if reacao.OfuscaAlvo {
		l.mon.status.ofuscamento = max(l.mon.status.ofuscamento, 2)
	}
	if reacao.DosesVeneno > 0 {
		l.mon.status.venenoDoses = min(3, l.mon.status.venenoDoses+reacao.DosesVeneno)
		l.mon.status.venenoRodadas = 3
		l.mon.status.danoVenenoPorDose = max(l.mon.status.danoVenenoPorDose, max(1, a.Ataque/10))
	}
	if reacao.ChanceAtordoarPorMil > 0 && !l.mon.status.atordoado && l.mon.status.semAtordoar == 0 {
		if l.rng.Intn(1000) < reacao.ChanceAtordoarPorMil {
			l.mon.status.atordoado = true
		}
	}
	if reacao.ReducaoDanoHeroiPct > 0 {
		fracao := float64(reacao.ReducaoDanoHeroiPct) / 100.0
		if fracao > l.reducao {
			l.reducao = fracao
		}
		l.rodadasReducao = max(l.rodadasReducao, 2)
	}
	alvos := l.mon.grupo
	if len(alvos) == 0 {
		alvos = []*lutaEmAndamento{l}
	}
	if reacao.CuraAliadoMaisFeridoPct > 0 {
		var ferido *lutaEmAndamento
		for _, al := range alvos {
			if al.vidaJogador <= 0 || al.j.Atributos.Vida <= 0 {
				continue
			}
			if ferido == nil || al.vidaJogador*ferido.j.Atributos.Vida < ferido.vidaJogador*al.j.Atributos.Vida {
				ferido = al
			}
		}
		if ferido != nil {
			cura := max(1, ferido.j.Atributos.Vida*reacao.CuraAliadoMaisFeridoPct/100)
			ferido.vidaJogador = min(ferido.j.Atributos.Vida, ferido.vidaJogador+cura)
		}
	}
	if reacao.RecuperaEterGrupo > 0 {
		for _, al := range alvos {
			if al.vidaJogador > 0 {
				al.eter = min(al.j.Atributos.Eter, al.eter+reacao.RecuperaEterGrupo)
			}
		}
	}
}

// efeitosNoMonstro aplica no fim da rodada o dano dos efeitos que os heróis deixaram no
// monstro. Devolve true quando ele cai.
func (l *lutaEmAndamento) efeitosNoMonstro() bool {
	if dano, nomes := l.mon.status.fimDaRodada(); dano > 0 {
		l.mon.vida = max(0, l.mon.vida-dano)
		l.registrar(TurnoBatalha{Atacante: "jogador", Dano: dano, Tique: nomes})
	}
	return l.mon.vida == 0
}

// efeitosNoHeroi aplica no fim da rodada o dano dos efeitos que o monstro deixou no herói.
// Devolve true quando o herói cai.
func (l *lutaEmAndamento) efeitosNoHeroi() bool {
	if dano, nomes := l.status.fimDaRodada(); dano > 0 {
		l.vidaJogador = max(0, l.vidaJogador-dano)
		l.registrar(TurnoBatalha{Atacante: "monstro", Dano: dano, Tique: nomes})
	}
	return l.vidaJogador == 0
}

// vezDoMonstro faz o golpe do monstro, com a chance de esquiva, e dispara o despertar.
// Devolve true quando o jogador cai.
func (l *lutaEmAndamento) vezDoMonstro() bool {
	if l.mon.status.perderVez() {
		l.registrar(TurnoBatalha{Atacante: "monstro", PerdeuVez: efeitosDosElementos["raio"].Nome})
		return false
	}
	t := TurnoBatalha{Atacante: "monstro"}
	poder := l.escolherPoder()
	fator := 1.0
	if poder != nil {
		l.mon.usosPoder[poder.ID]++
		if l.m.Eter > 0 && poder.CustoEter > 0 {
			l.mon.eter = max(0, l.mon.eter-poder.CustoEter)
		}
		t.Poder = poder.Nome
	}
	switch {
	case poder != nil && poder.Tipo == poderEscudo:
		l.mon.escudo, l.mon.rodadasEscudo = poder.Fator, poder.Rodadas+1
	case poder != nil && poder.Tipo == poderFuria:
		l.mon.furia = poder.Fator
	case poder != nil && poder.Tipo == poderInvocar:
		aj := AjudanteNaLuta{
			Nome:   poder.Ajudante,
			Vida:   max(1, l.m.Vida*poder.AjudanteVidaPct/100),
			Ataque: max(1, l.m.Ataque*poder.AjudanteAtqPct/100),
			Defesa: l.m.Defesa / 2,
		}
		l.mon.ajudantes = append(l.mon.ajudantes, aj)
		t.Invocado = aj.Nome
	default:
		if poder != nil {
			fator = poder.Fator
		}
		ataque := int(float64(l.m.Ataque)*fator + 0.5)
		arcano := false
		if poder != nil && poder.Arcano {
			ataque = int(float64(l.m.Ataque)*fator + float64(l.m.Magia)*poder.FatorMagia + 0.5)
			arcano = true
		}
		if l.mon.status.errou(l.rng) {
			t.Errou = true
			break
		}
		dano, esquivou := l.golpeNoJogadorComTipo(ataque, arcano)
		t.Dano, t.Critico, t.Esquiva, t.Bloqueio = dano.valor, dano.critico, esquivou, dano.bloqueio
		if poder != nil && poder.Tipo == poderDrenar && t.Dano > 0 {
			t.Cura = min(t.Dano/2, l.m.Vida-l.mon.vida)
			l.mon.vida += t.Cura
		}
		resistencia := ResistenciaElementalPorMil(l.j.Atributos.Defesa, l.j.Atributos.Magia)
		resistiu := resistencia > 0 && l.rng.Intn(1000) < resistencia
		if t.Dano > 0 && l.vidaJogador > 0 && !resistiu && !resisteAEfeito(l.j.Postura, l.rng) {
			if ef, ok := l.status.tentarAplicar(l.rng, l.m.Elemento, l.m.Ataque, poder != nil, true); ok {
				t.Efeito = ef.Nome
				if ef.ID == efeitoDrenoDeEter {
					l.eter = max(0, l.eter-eterDrenado)
					l.mon.eter = min(l.m.Eter, l.mon.eter+eterDrenado)
				}
			}
		}
	}
	l.registrar(t)
	if l.vidaJogador == 0 {
		return true
	}

	// Os ajudantes de pé atacam logo depois do monstro.
	for i := range l.mon.ajudantes {
		aj := &l.mon.ajudantes[i]
		if aj.Vida == 0 {
			continue
		}
		dano, esquivou := l.golpeNoJogador(aj.Ataque)
		l.registrar(TurnoBatalha{Atacante: "ajudante", Alvo: aj.Nome, Dano: dano.valor, Critico: dano.critico, Esquiva: esquivou})
		if l.vidaJogador == 0 {
			return true
		}
	}

	// A habilidade única reage ao golpe: abaixo de metade da Vida, uma vez por luta.
	if !l.despertou && l.vidaJogador*2 < l.j.Atributos.Vida {
		for _, h := range l.j.Habilidades {
			if h.Efeito != efeitoDespertar {
				continue
			}
			cura := min(int(float64(l.j.Atributos.Vida)*h.Fator+0.5), l.j.Atributos.Vida-l.vidaJogador)
			l.vidaJogador += cura
			l.despertou = true
			l.multProximo = h.Fator2
			l.ignorarDefesa = h.IgnoraDefesa
			l.esquivasCertas = h.Esquivas
			l.reducao, l.rodadasReducao = h.Reducao, h.Rodadas
			l.registrar(TurnoBatalha{Atacante: "jogador", Habilidade: h.Nome, Cura: cura})
			break
		}
	}
	return false
}

// SimularBatalha resolve a luta. Quem tem mais Velocidade age primeiro em cada rodada
// (empate favorece o jogador). As habilidades são usadas sozinhas. É uma função pura: o
// mesmo gerador dá sempre a mesma luta, o que permite testar e auditar.
func SimularBatalha(jogador CombatenteRPG, monstro MonstroRPG, rng *rand.Rand) ResultadoSimulado {
	EnriquecerMonstro(&monstro)
	vidaBase := jogador.Atributos.Vida
	aplicarPassivaEspecialidade(&jogador)
	aplicarPostura(&jogador)
	if !jogador.SemBioma && monstro.Regiao != "" {
		aplicarEfeitoBioma(&jogador, &monstro)
	}
	vidaInicial := jogador.Atributos.Vida
	if jogador.VidaInicial > 0 && jogador.VidaInicial < vidaBase {
		if vidaBase > 0 {
			vidaInicial = min(jogador.Atributos.Vida, jogador.VidaInicial*jogador.Atributos.Vida/vidaBase)
		} else {
			vidaInicial = jogador.VidaInicial
		}
	}
	diario := make([]TurnoBatalha, 0, maxTurnosBatalha*2)
	l := &lutaEmAndamento{
		j: jogador, m: monstro, rng: rng,
		mon:         &estadoDoMonstro{vida: monstro.Vida, eter: monstro.Eter, usosPoder: map[string]int{}},
		vidaJogador: vidaInicial,
		eter:        jogador.Atributos.Eter,
		recargas:    map[string]int{},
		usos:        map[string]int{},
		diario:      &diario,
	}
	jogadorPrimeiro := jogador.Atributos.Velocidade >= monstro.Velocidade
	fim := func(venceu bool, rodadas int) ResultadoSimulado {
		return ResultadoSimulado{
			Venceu: venceu, Rodadas: rodadas, Turnos: *l.diario, VidaInicial: vidaInicial, VidaFinal: l.vidaJogador, Usos: l.usos,
			Elemental: RelacaoElemental(jogador.Elemento, monstro.Elemento), Caiu: !venceu && l.vidaJogador == 0,
		}
	}

	for rodada := 1; rodada <= maxTurnosBatalha; rodada++ {
		l.mon.rodada = rodada
		if jogadorPrimeiro {
			if l.vezDoJogador() {
				return fim(true, rodada)
			}
			if l.vezDoMonstro() {
				return fim(false, rodada)
			}
		} else {
			if l.vezDoMonstro() {
				return fim(false, rodada)
			}
			if l.vezDoJogador() {
				return fim(true, rodada)
			}
		}
		if l.efeitosNoMonstro() {
			return fim(true, rodada)
		}
		if l.efeitosNoHeroi() {
			return fim(false, rodada)
		}
		l.eter = min(jogador.Atributos.Eter, l.eter+eterPorRodada)
		if monstro.Eter > 0 {
			l.mon.eter = min(monstro.Eter, l.mon.eter+eterPorRodada)
		}
		if l.rodadasReducao > 0 {
			l.rodadasReducao--
		}
		if l.mon.rodadasEscudo > 0 {
			l.mon.rodadasEscudo--
		}
		for id, r := range l.recargas {
			if r > 0 {
				l.recargas[id] = r - 1
			}
		}
	}
	return fim(false, maxTurnosBatalha)
}

// DificuldadeContra compara o Poder do jogador com o do monstro, para a tela avisar antes.
func DificuldadeContra(jogador AtributosRPG, monstro MonstroRPG) string {
	poderMonstro := PoderDoMonstro(monstro)
	if poderMonstro <= 0 {
		return "facil"
	}
	razao := float64(jogador.Poder) / float64(poderMonstro)
	switch {
	case razao >= 1.3:
		return "facil"
	case razao >= 0.95:
		return "equilibrada"
	case razao >= 0.75:
		return "dificil"
	default:
		return "perigosa"
	}
}

// EscolherItemDaRecompensa sorteia se a vitória dá item e qual, entre os candidatos da
// raridade do monstro. Vazio é sem item.
func EscolherItemDaRecompensa(rng *rand.Rand, chance int, candidatos []string) string {
	if chance <= 0 || len(candidatos) == 0 {
		return ""
	}
	if rng.Intn(100) >= chance {
		return ""
	}
	return candidatos[rng.Intn(len(candidatos))]
}

// novoGeradorDeBatalha usa uma semente do sistema operacional, imprevisível para o jogador.
func novoGeradorDeBatalha() *rand.Rand {
	var b [8]byte
	if _, err := crand.Read(b[:]); err != nil {
		return rand.New(rand.NewSource(int64(len(b))))
	}
	return rand.New(rand.NewSource(int64(binary.LittleEndian.Uint64(b[:]))))
}

// MonstroNaLista é o monstro como a tela de expedições o mostra.
type MonstroNaLista struct {
	MonstroRPG
	Poder       int                `json:"poder"`
	Dificuldade string             `json:"dificuldade"`
	Bestiario   BestiarioDoMonstro `json:"bestiario"`
	// Elemental: relação do elemento do jogador com o do monstro.
	Elemental string `json:"elemental"`
	// DicaTatica libera após a primeira vitória registrada no bestiário.
	DicaTatica string `json:"dica_tatica,omitempty"`
	EmDestaque bool   `json:"em_destaque,omitempty"`
}

// HojeRPG é o limite de batalhas, os saldos e a Vida guardada (sql/081).
type HojeRPG struct {
	Feitas   int `json:"feitas"`
	Limite   int `json:"limite"`
	Bilhetes int `json:"bilhetes"`
	Ouro     int `json:"ouro"`
	// VidaPerdida já vem com a regeneração descontada, em por mil da Vida máxima.
	VidaPerdida int `json:"vida_perdida"`
	// PousadaLivreEm é quando a Pousada volta a valer; nulo é agora.
	PousadaLivreEm *string    `json:"pousada_livre_em"`
	EpisodiosHoje  int        `json:"episodios_hoje"`
	Regras         RegrasVida `json:"regras"`
	// Vitorias por monstro, para o bestiário (sql/085). Fica fora da resposta: a lista de
	// monstros já traz o bestiário de cada um.
	Vitorias map[string]int `json:"-"`
}

// EstadoExpedicoes é o corpo de GET /api/rpg/batalhas.
type EstadoExpedicoes struct {
	Atributos AtributosRPG `json:"atributos"`
	Elemento  string       `json:"elemento"`
	// Classe do personagem, para a ficha dizer o efeito dos traços do monstro nele.
	Classe string `json:"classe,omitempty"`
	// EfeitoDoElemento é o efeito de status que os golpes do herói podem deixar.
	EfeitoDoElemento *EfeitoDeElemento `json:"efeito_do_elemento,omitempty"`
	Vida             VidaRPG           `json:"vida"`
	Custos           CustosRecuperacao `json:"custos"`
	Hoje             HojeRPG           `json:"hoje"`
	Monstros         []MonstroNaLista  `json:"monstros"`
	// Regioes e RegiaoDestaque montam o mapa 2D de exploração.
	Regioes        []RegiaoMapa `json:"regioes,omitempty"`
	RegiaoDestaque string       `json:"regiao_destaque,omitempty"`
	// Mana de cada tipo de luta (sql/118).
	CustosMana    CustosManaRPG          `json:"custos_mana"`
	Passiva       *PassivaEspecialidade  `json:"passiva,omitempty"`
	Elenco        []HeroiResumoEsquadrao `json:"elenco,omitempty"`
	PortalVivo    *PortalMapaVivo        `json:"portal_vivo,omitempty"`
	SelosCatalogo []SeloDesafio          `json:"selos_catalogo,omitempty"`
}

// RecompensaBatalha é o que a vitória deu.
type RecompensaBatalha struct {
	Bilhetes int      `json:"bilhetes"`
	Ouro     int      `json:"ouro"`
	Item     *ItemRPG `json:"item,omitempty"`
	// OuroPerdido: o que a queda custou (sql/090).
	OuroPerdido int `json:"ouro_perdido,omitempty"`
	// Materiais da Forja ganhos na luta (sql/122).
	Materiais map[string]int `json:"materiais,omitempty"`
}

// RespostaBatalha é o corpo de POST /api/rpg/batalhas.
type RespostaBatalha struct {
	Monstro        MonstroRPG            `json:"monstro"`
	Jogador        AtributosRPG          `json:"jogador"`
	Resultado      ResultadoSimulado     `json:"resultado"`
	Recompensa     RecompensaBatalha     `json:"recompensa"`
	Vida           VidaRPG               `json:"vida"`
	Bestiario      BestiarioDoMonstro    `json:"bestiario"`
	Hoje           HojeRPG               `json:"hoje"`
	Passiva        *PassivaEspecialidade `json:"passiva,omitempty"`
	GrupoResultado *ResultadoDoGrupo     `json:"grupo_resultado,omitempty"`
	SelosAtivos    []string              `json:"selos_ativos,omitempty"`
	PortalAtivo    bool                  `json:"portal_ativo,omitempty"`
	ATB            *EstadoATB            `json:"atb,omitempty"`
}

func lerMonstros(dbClient *supabase.Client) ([]MonstroRPG, error) {
	dados, _, err := dbClient.From("rpg_monstros").
		Select("id,nome,descricao,tipo,nivel,vida,ataque,defesa,bilhetes,chance_item,raridade_item,ordem", "", false).
		Eq("ativo", "true").
		Execute()
	if err != nil {
		return nil, err
	}
	var monstros []MonstroRPG
	if err := json.Unmarshal(dados, &monstros); err != nil {
		return nil, err
	}
	sort.SliceStable(monstros, func(i, j int) bool { return monstros[i].Ordem < monstros[j].Ordem })
	for i := range monstros {
		EnriquecerMonstro(&monstros[i])
	}
	return monstros, nil
}

func lerHojeRPG(dbClient *supabase.Client) (HojeRPG, error) {
	return interpretarHojeRPG(strings.TrimSpace(dbClient.Rpc("rpg_batalhas_hoje", "", map[string]interface{}{})))
}

// interpretarHojeRPG lê a resposta de rpg_batalhas_hoje(). As vitórias por monstro vêm à
// parte porque não voltam na resposta da API.
func interpretarHojeRPG(bruto string) (HojeRPG, error) {
	var hoje struct {
		HojeRPG
		Ok       bool           `json:"ok"`
		Vitorias map[string]int `json:"vitorias"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &hoje) != nil || !hoje.Ok {
		return HojeRPG{}, errFalhaRPG
	}
	hoje.HojeRPG.Vitorias = hoje.Vitorias
	return hoje.HojeRPG, nil
}

// errFalhaRPG marca resposta do banco fora do formato esperado.
var errFalhaRPG = errors.New("resposta inesperada do banco")

// HandleGetExpedicoes lista os monstros com a dificuldade para o jogador e o limite do dia.
func (h *RPGHandler) HandleGetExpedicoes(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}

	// As leituras não dependem uma da outra: vão em paralelo.
	var (
		equipamento       EstadoEquipamento
		monstros          []MonstroRPG
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
	go func() { defer wg.Done(); monstros, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
	go func() { defer wg.Done(); _, passiva = carregarEspecialidadeDoUsuario(sessao.dbClient) }()
	wg.Wait()
	if errEq != nil || errM != nil {
		log.Printf("[RPG] Falha ao ler expedições (user=%s): equipamento=%v monstros=%v", sessao.userID, errEq, errM)
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	if errH != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}

	elemento := elementoDoJogador(sessao.ctx)
	classe := classeDoJogador(sessao.ctx)
	regiaoDestaque := RegiaoEmDestaqueEm(time.Now())
	regioes := CatalogoRegioes()
	for i := range regioes {
		if regioes[i].ID == regiaoDestaque {
			regioes[i].EmDestaque = true
			regioes[i].BonusDestaque = "+1 material da Forja garantido na vitória"
		}
	}

	lista := make([]MonstroNaLista, 0, len(monstros))
	for _, m := range monstros {
		vitorias := hoje.Vitorias[m.ID]
		// Cópia dos traços com o fator da classe do jogador, para a ficha dizer o efeito nele.
		if len(m.Tracos) > 0 {
			tracos := make([]TracoMonstro, len(m.Tracos))
			for i, t := range m.Tracos {
				t.FatorClasse = FatorDeClasse(classe, []TracoMonstro{t})
				tracos[i] = t
			}
			m.Tracos = tracos
		}
		lista = append(lista, MonstroNaLista{
			MonstroRPG:  m,
			Poder:       PoderDoMonstro(m),
			Dificuldade: DificuldadeContra(equipamento.Atributos, m),
			Bestiario:   MontarBestiario(vitorias),
			Elemental:   RelacaoElemental(elemento, m.Elemento),
			DicaTatica:  DicaTaticaDoMonstro(m.ID, vitorias),
			EmDestaque:  m.Regiao != "" && m.Regiao == regiaoDestaque,
		})
	}
	hoje.Regras = hoje.Regras.ComPadroes()
	portal := PortalDimensionalAtivoEm(time.Now())
	responderJSON(w, http.StatusOK, EstadoExpedicoes{
		Atributos:        equipamento.Atributos,
		Elemento:         elemento,
		EfeitoDoElemento: efeitoDoHeroi(elemento),
		Classe:           classe,
		Vida:             MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida),
		Custos:           CustosPara(sessao.nivel),
		Hoje:             hoje,
		Monstros:         lista,
		Regioes:          regioes,
		RegiaoDestaque:   regiaoDestaque,
		CustosMana:       CustosDeMana(sessao.nivel, lerRegrasComunidade(sessao.dbClient)),
		Passiva:          passiva,
		Elenco:           ResumoElencoEsquadrao(sessao.dbClient, sessao.userID, sessao.ctx, equipamento),
		PortalVivo:       &portal,
		SelosCatalogo:    CatalogoSelosDesafio(),
	})
}

// HandleBatalhar simula a luta com os atributos calculados aqui, a partir da Vida guardada,
// e grava pelo service role a batalha, a Vida que sobrou e o Ouro. O corpo traz só o monstro.
func (h *RPGHandler) HandleBatalhar(w http.ResponseWriter, r *http.Request) {
	var corpo struct {
		MonstroID string   `json:"monstro_id"`
		Postura   string   `json:"postura"`
		Esquadrao []string `json:"esquadrao"`
		Selos     []string `json:"selos"`
	}
	if r.Body == nil || json.NewDecoder(r.Body).Decode(&corpo) != nil {
		corpo.MonstroID = ""
	}
	monstroID := strings.TrimSpace(corpo.MonstroID)

	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	if monstroID == "" || len(monstroID) > 40 {
		responderErroJSON(w, http.StatusBadRequest, "Escolha um monstro.")
		return
	}

	var (
		monstros          []MonstroRPG
		hoje              HojeRPG
		equipamento       EstadoEquipamento
		passiva           *PassivaEspecialidade
		errM, errH, errEq error
		wg                sync.WaitGroup
	)
	wg.Add(4)
	go func() { defer wg.Done(); monstros, errM = lerMonstros(sessao.dbClient) }()
	go func() { defer wg.Done(); hoje, errH = lerHojeRPG(sessao.dbClient) }()
	go func() {
		defer wg.Done()
		equipamento, errEq = equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	}()
	go func() { defer wg.Done(); _, passiva = carregarEspecialidadeDoUsuario(sessao.dbClient) }()
	wg.Wait()
	// Sem o dia lido não há a Vida guardada, e a batalha começaria com a Vida cheia.
	if errM != nil || errEq != nil || errH != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	var monstro *MonstroRPG
	for i := range monstros {
		if monstros[i].ID == monstroID {
			monstro = &monstros[i]
			break
		}
	}
	if monstro == nil {
		responderErroJSON(w, http.StatusBadRequest, "Monstro desconhecido.")
		return
	}

	// Conferência antecipada do limite, só para não simular à toa; quem decide é a função
	// de registro, que trava por usuário.
	if hoje.Feitas >= hoje.Limite {
		responderErroJSON(w, http.StatusTooManyRequests, "Você já fez todas as batalhas de hoje. Volte amanhã.")
		return
	}
	vida := MontarVida(equipamento.Atributos.Vida, hoje.VidaPerdida)
	if !PodeLutar(vida.PerdidaPorMil, hoje.Regras) {
		responderErroJSON(w, http.StatusConflict, "Seu personagem precisa de pelo menos 30% de Vida para lutar. Descanse, assista a um episódio ou use a Pousada.")
		return
	}

	rng := novoGeradorDeBatalha()
	vitoriasAntes := hoje.Vitorias[monstro.ID]
	monstroExibido := *monstro
	var (
		resultado      ResultadoSimulado
		grupoResultado *ResultadoDoGrupo
	)

	selosAtivos := NormalizarSelosDesafio(corpo.Selos)
	if len(corpo.Esquadrao) > 0 {
		combatentes, fichas, errEsq := MontarEsquadraoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx, hoje.VidaPerdida, passiva, corpo.Postura, corpo.Esquadrao)
		if errEsq != nil {
			responderErroJSON(w, http.StatusBadRequest, errEsq.Error())
			return
		}
		if len(combatentes) > 1 {
			monstroExibido = EquilibrarMonstroParaGrupo(*monstro, combatentes)
			AplicarSelosNoCombate(combatentes, &monstroExibido, selosAtivos)
			sim := SimularBatalhaEmGrupo(combatentes, monstroExibido, rng)
			usosTotal := map[string]int{}
			heroisRes := make([]HeroiDoResultado, 0, len(fichas))
			for i, f := range fichas {
				heroisRes = append(heroisRes, HeroiDoResultado{Nome: f.Nome, Personagem: f.Personagem, Nivel: f.Nivel})
				for id, n := range sim.Herois[i].Usos {
					usosTotal[id] += n
				}
			}
			grupoResultado = &ResultadoDoGrupo{
				Modo: "na_hora", Herois: heroisRes, Monstro: &monstroExibido, Luta: &sim, Venceu: sim.Venceu,
			}
			resultado = ResultadoSimulado{
				Venceu:      sim.Venceu,
				Rodadas:     sim.Rodadas,
				Turnos:      sim.Turnos,
				VidaInicial: sim.Herois[0].VidaInicial,
				VidaFinal:   sim.Herois[0].VidaFinal,
				Usos:        usosTotal,
				Elemental:   RelacaoElemental(elementoDoJogador(sessao.ctx), monstro.Elemento),
				Caiu:        sim.Herois[0].Caiu,
			}
		}
	}
	if grupoResultado == nil {
		combatente := CombatenteDoEstado(equipamento)
		combatente.VidaInicial = vida.Atual
		combatente.Elemento = elementoDoJogador(sessao.ctx)
		combatente.Classe = classeDoJogador(sessao.ctx)
		combatente.Passiva = passiva
		combatente.Postura = PosturaValida(corpo.Postura)
		listaHerois := []CombatenteRPG{combatente}
		AplicarSelosNoCombate(listaHerois, &monstroExibido, selosAtivos)
		resultado = SimularBatalha(listaHerois[0], monstroExibido, rng)
	}
	perdaFinal := PerdaPorMil(equipamento.Atributos.Vida, resultado.VidaFinal)

	var itemSorteado *ItemRPG
	if resultado.Venceu {
		candidatos := lerItensDaRaridade(sessao.dbClient, monstro.RaridadeItem)
		ids := make([]string, 0, len(candidatos))
		for _, c := range candidatos {
			ids = append(ids, c.ID)
		}
		if id := EscolherItemDaRecompensa(rng, monstro.ChanceItem+equipamento.Atributos.SorteItem, ids); id != "" {
			for i := range candidatos {
				if candidatos[i].ID == id {
					itemSorteado = &candidatos[i]
				}
			}
		}
	}

	servico, err := database.ServiceRoleClient()
	if err != nil || servico == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Expedições indisponíveis no momento.")
		return
	}
	itemID := ""
	if itemSorteado != nil {
		itemID = itemSorteado.ID
	}
	custoMana := CustoDeMana(LutaExpedicao, sessao.nivel, lerRegrasComunidade(sessao.dbClient))
	cobrou, ok := cobrarManaDaLuta(w, servico, sessao.userID, custoMana)
	if !ok {
		return
	}
	bruto := strings.TrimSpace(servico.Rpc("rpg_concluir_batalha", "", map[string]interface{}{
		"p_user_id":      sessao.userID,
		"p_monstro_id":   monstro.ID,
		"p_venceu":       resultado.Venceu,
		"p_turnos":       len(resultado.Turnos),
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
		Bilhetes       int     `json:"bilhetes"`
		Ouro           int     `json:"ouro"`
		VidaPerdida    int     `json:"vida_perdida"`
		Feitas         int     `json:"feitas"`
		Limite         int     `json:"limite"`
	}
	if bruto == "" || json.Unmarshal([]byte(bruto), &registro) != nil || (!registro.Ok && registro.Erro == "") {
		log.Printf("[RPG] Falha ao registrar batalha (user=%s): %s", sessao.userID, bruto)
		devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
		responderErroJSON(w, http.StatusServiceUnavailable, "Não foi possível registrar a batalha agora.")
		return
	}
	if registro.Erro != "" {
		status := http.StatusBadRequest
		switch {
		case registro.LimiteAtingido:
			status = http.StatusTooManyRequests
		case registro.SemVida:
			status = http.StatusConflict
		}
		devolverManaDaLuta(servico, sessao.userID, custoMana, cobrou)
		responderErroJSON(w, status, registro.Erro)
		return
	}

	// O banco pode recusar o item (desativado entre a leitura e a gravação): vale o que ele gravou.
	// A maestria é gravada à parte: a batalha já está registrada, e perder esta chamada só
	// deixa de contar alguns usos.
	if len(resultado.Usos) > 0 {
		if bruto := strings.TrimSpace(servico.Rpc("rpg_registrar_maestria", "", map[string]interface{}{
			"p_user_id": sessao.userID,
			"p_usos":    resultado.Usos,
		})); !strings.Contains(bruto, `"ok"`) {
			log.Printf("[RPG] Falha ao registrar maestria (user=%s): %s", sessao.userID, bruto)
		}
	}

	recompensa := RecompensaBatalha{Bilhetes: registro.BilhetesGanhos, Ouro: registro.OuroGanho, OuroPerdido: registro.OuroPerdido}
	bestiario := MontarBestiario(vitoriasAntes)
	if resultado.Venceu {
		bestiario = MontarBestiario(vitoriasAntes + 1)
		bestiario.NovoMarco = bestiario.Marco > MarcoDoBestiario(vitoriasAntes)
	}
	if registro.ItemID != nil && itemSorteado != nil && *registro.ItemID == itemSorteado.ID {
		recompensa.Item = itemSorteado
	}
	agora := time.Now()
	emDestaque := monstro.Regiao != "" && monstro.Regiao == RegiaoEmDestaqueEm(agora)
	portal := PortalDimensionalAtivoEm(agora)
	emPortal := monstro.Regiao != "" && monstro.Regiao == portal.RegiaoID
	materiais := SortearMateriaisDaExpedicaoEmDestaque(rng, resultado.Venceu, emDestaque)
	if extras := SortearMateriaisMapaVivo(rng, resultado.Venceu, emPortal, len(selosAtivos)); len(extras) > 0 {
		if materiais == nil {
			materiais = map[string]int{}
		}
		for k, v := range extras {
			materiais[k] += v
		}
	}
	recompensa.Materiais = entregarMateriais(servico, sessao.userID, materiais)

	atb := CalcularIniciativaATB(equipamento.Atributos.Velocidade, VelocidadeDoMonstro(monstroExibido))
	responderJSON(w, http.StatusOK, RespostaBatalha{
		Monstro:        monstroExibido,
		Jogador:        equipamento.Atributos,
		Resultado:      resultado,
		Recompensa:     recompensa,
		Vida:           MontarVida(equipamento.Atributos.Vida, registro.VidaPerdida),
		Bestiario:      bestiario,
		Hoje:           HojeRPG{Feitas: registro.Feitas, Limite: registro.Limite, Bilhetes: registro.Bilhetes, Ouro: registro.Ouro, VidaPerdida: registro.VidaPerdida, PousadaLivreEm: hoje.PousadaLivreEm, EpisodiosHoje: hoje.EpisodiosHoje, Regras: hoje.Regras.ComPadroes()},
		Passiva:        passiva,
		GrupoResultado: grupoResultado,
		SelosAtivos:    selosAtivos,
		PortalAtivo:    emPortal,
		ATB:            &atb,
	})
}

// HandleGetATB devolve a leitura de iniciativa ATB pela Velocidade do jogador contra um alvo.
func (h *RPGHandler) HandleGetATB(w http.ResponseWriter, r *http.Request) {
	sessao, ok := abrirSessaoRPG(w, r)
	if !ok {
		return
	}
	equipamento, err := equipamentoDoContexto(sessao.dbClient, sessao.userID, sessao.ctx)
	if err != nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Atributos indisponíveis no momento.")
		return
	}
	velMonstro := equipamento.Atributos.Velocidade
	if raw := strings.TrimSpace(r.URL.Query().Get("velocidade_alvo")); raw != "" {
		var v int
		for _, ch := range raw {
			if ch < '0' || ch > '9' {
				v = -1
				break
			}
			v = v*10 + int(ch-'0')
		}
		if v >= 0 && v <= 9999 {
			velMonstro = v
		}
	}
	responderJSON(w, http.StatusOK, CalcularIniciativaATB(equipamento.Atributos.Velocidade, velMonstro))
}

// lerItensDaRaridade lista os itens que a batalha pode dar: ativos, fora do kit inicial.
func lerItensDaRaridade(dbClient *supabase.Client, raridade string) []ItemRPG {
	dados, _, err := dbClient.From("rpg_itens").
		Select("id,slot,nome,descricao,raridade,vida,ataque,defesa,nivel_minimo", "", false).
		Eq("raridade", raridade).
		Eq("inicial", "false").
		Eq("ativo", "true").
		Execute()
	if err != nil {
		return nil
	}
	var itens []ItemRPG
	if json.Unmarshal(dados, &itens) != nil {
		return nil
	}
	return itens
}

type danoDeGolpe struct {
	valor    int
	critico  bool
	bloqueio bool
}

// golpeNoJogador resolve um golpe físico do lado do monstro (dele ou de um ajudante).
func (l *lutaEmAndamento) golpeNoJogador(ataque int) (danoDeGolpe, bool) {
	return l.golpeNoJogadorComTipo(ataque, false)
}

// golpeNoJogadorComTipo resolve um golpe físico ou arcano do monstro: esquiva dinâmica,
// bloqueio por Defesa, fúria, crítico dinâmico, elemento e redução da habilidade única.
func (l *lutaEmAndamento) golpeNoJogadorComTipo(ataque int, arcano bool) (danoDeGolpe, bool) {
	esquiva := ChanceEsquivaDinamica(l.j.Atributos.EsquivaPorMil, l.j.Atributos.Velocidade, l.m.Velocidade)
	switch {
	case l.esquivasCertas > 0:
		l.esquivasCertas--
		return danoDeGolpe{}, true
	case esquiva > 0 && l.rng.Intn(1000) < esquiva:
		return danoDeGolpe{}, true
	}
	if l.mon.furia > 0 {
		ataque = int(float64(ataque)*l.mon.furia + 0.5)
	}
	defesa := l.status.defesaEfetiva(l.j.Atributos.Defesa)
	if arcano {
		defesa = defesa * 3 / 4
	}
	critPorMil := l.m.CriticoPorMil
	if critPorMil <= 0 {
		critPorMil = critMonstroPorMil
	}
	critPorMil = ChanceCriticoDinamica(critPorMil, ataque, defesa, l.m.Velocidade, l.j.Atributos.Velocidade)
	multCrit := float64(l.m.DanoCritico) / 100
	if multCrit < 1 {
		multCrit = multCritMonstro
	}
	multCrit = multCriticoContraPostura(multCrit, l.j.Postura)
	valor, critico := golpe(l.rng, ataque, defesa, critPorMil, multCrit)
	valor = l.mon.status.danoCausado(valor)
	if m := MultiplicadorElemental(l.m.Elemento, l.j.Elemento); m != 1 {
		valor = max(1, int(float64(valor)*m+0.5))
	}
	bloqueio := false
	if chanceBloq := ChanceBloqueioDinamica(defesa, ataque); chanceBloq > 0 && l.rng.Intn(1000) < chanceBloq {
		bloqueio = true
		valor = max(1, valor*70/100)
	}
	if l.rodadasReducao > 0 {
		valor = max(1, int(float64(valor)*(1-l.reducao)+0.5))
	}
	l.vidaJogador = max(0, l.vidaJogador-valor)
	return danoDeGolpe{valor: valor, critico: critico, bloqueio: bloqueio}, false
}

// escolherPoder decide a ação tática do monstro pelo contexto da rodada: evita desperdício
// (escudo com escudo ativo, fúria repetida, invocação com ajudante vivo), respeita Éter e
// prioriza conforme Vida restante e ameaça do oponente.
func (l *lutaEmAndamento) escolherPoder() *PoderMonstro {
	type candidato struct {
		poder  *PoderMonstro
		prio   int
		chance int
		ordem  int
	}
	var cands []candidato
	jogadorVidaBaixa := l.j.Atributos.Vida > 0 && l.vidaJogador*100 < l.j.Atributos.Vida*35
	jogadorDefesaAlta := l.j.Atributos.Defesa > l.m.Ataque/2
	monstroFerido := l.m.Vida > 0 && l.mon.vida*100 < l.m.Vida*70

	for i := range l.m.Poderes {
		p := &l.m.Poderes[i]
		if p.MaxUsos > 0 && l.mon.usosPoder[p.ID] >= p.MaxUsos {
			continue
		}
		if p.APartirDaRodada > 0 && l.mon.rodada < p.APartirDaRodada {
			continue
		}
		if p.AbaixoDePct > 0 && l.mon.vida*100 >= l.m.Vida*p.AbaixoDePct {
			continue
		}
		if l.m.Eter > 0 && p.CustoEter > 0 && l.mon.eter < p.CustoEter {
			continue
		}
		// Travas táticas para não desperdiçar turno nem usos.
		if p.Tipo == poderEscudo && l.mon.rodadasEscudo > 0 {
			continue
		}
		if p.Tipo == poderFuria && l.mon.furia > 0 {
			continue
		}
		if p.Tipo == poderInvocar && l.ajudanteVivo() != nil {
			continue
		}

		prio := 50
		chance := p.ChancePorMil
		switch p.Tipo {
		case poderFuria:
			prio = 100
		case poderInvocar:
			prio = 90
		case poderEscudo:
			if jogadorVidaBaixa {
				prio = 20
			} else {
				prio = 80
				if monstroFerido {
					chance = min(1000, chance+60)
				}
			}
		case poderDrenar:
			prio = 70
			if monstroFerido {
				prio = 85
				chance = min(1000, chance+50)
			}
		case poderGolpe:
			prio = 60
			if jogadorVidaBaixa {
				prio = 95
				chance = min(1000, chance+70)
			} else if p.Arcano && jogadorDefesaAlta {
				prio = 75
				chance = min(1000, chance+50)
			}
		}
		cands = append(cands, candidato{poder: p, prio: prio, chance: chance, ordem: i})
	}
	if len(cands) == 0 {
		return nil
	}
	sort.Slice(cands, func(i, j int) bool {
		if cands[i].prio != cands[j].prio {
			return cands[i].prio > cands[j].prio
		}
		return cands[i].ordem < cands[j].ordem
	})
	for _, c := range cands {
		if l.rng.Intn(1000) < c.chance {
			return c.poder
		}
	}
	return nil
}

// elementoDoJogador é o elemento do personagem do elenco; sem personagem, neutro.
func elementoDoJogador(ctx contextoPersonagem) string {
	if ctx.linha == nil {
		return elementoNeutro
	}
	if pb, ok := PersonagensBase()[ctx.linha.PersonagemBase]; ok {
		return pb.Elemento
	}
	return PersonagensBase()[personagemBasePadrao].Elemento
}
