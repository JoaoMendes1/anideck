// Cálculos derivados das Estatísticas que não valem uma view no Postgres.
//
// O critério para ficar aqui em vez de virar SQL é o mesmo que levou o streak para Go:
// são regras de produto (o que conta como uma sessão, a partir de quando alguém é
// "especialista") que mudam com discussão, precisam de teste unitário e ficariam ilegíveis
// como cadeia de window functions.
package handlers

import (
	"sort"
	"time"
)

// gapDeSessaoPadrao é o intervalo a partir do qual duas marcações viram sessões diferentes.
//
// Por que 2 horas: uma maratona real tem episódios separados por ~20 a 45 minutos (a duração
// de cada um). Duas horas dá folga para uma pausa de jantar sem quebrar a maratona em duas,
// mas é curto o bastante para que "assisti de manhã e voltei à noite" conte como dois
// momentos distintos — que é exatamente o que o Padrão de Horário quer medir.
const gapDeSessaoPadrao = 2 * time.Hour

// AgruparSessoes reduz uma lista de marcações de episódio a uma lista de sessões, devolvendo
// o instante em que cada sessão começou.
//
// O problema que isso resolve: `watched_at` grava quando o episódio foi *marcado*, não
// quando foi assistido. Quem cadastra o backlog inteiro numa sentada às 23h gera 40 marcações
// no mesmo minuto, e o gráfico conclui que a pessoa é espectadora noturna. Contando sessões,
// aquela sentada vira um ponto só — o mesmo peso de qualquer outra noite.
func AgruparSessoes(marcacoes []time.Time, gap time.Duration) []time.Time {
	if len(marcacoes) == 0 {
		return nil
	}
	if gap <= 0 {
		gap = gapDeSessaoPadrao
	}

	// A view devolve ordenado, mas ordenar aqui torna a função independente de quem chama.
	ordenadas := make([]time.Time, len(marcacoes))
	copy(ordenadas, marcacoes)
	sort.Slice(ordenadas, func(i, j int) bool { return ordenadas[i].Before(ordenadas[j]) })

	sessoes := []time.Time{ordenadas[0]}
	anterior := ordenadas[0]

	for _, atual := range ordenadas[1:] {
		// Compara com a marcação anterior, não com o início da sessão: uma maratona de 6
		// horas é uma sessão só, desde que não haja buraco maior que o gap no meio dela.
		if atual.Sub(anterior) > gap {
			sessoes = append(sessoes, atual)
		}
		anterior = atual
	}

	return sessoes
}

// VariacaoSemanal compara os episódios das últimas 4 semanas com as 4 anteriores e devolve a
// variação percentual. O bool indica se há histórico suficiente para a comparação fazer
// sentido — sem isso, quem tem duas semanas de uso veria "↑ 400%", que não significa nada.
//
// Recebe a série semanal em ordem cronológica (a mais antiga primeiro).
func VariacaoSemanal(episodiosPorSemana []int) (float64, bool) {
	const janela = 4

	if len(episodiosPorSemana) < janela*2 {
		return 0, false
	}

	corte := len(episodiosPorSemana) - janela
	recente := somar(episodiosPorSemana[corte:])
	anterior := somar(episodiosPorSemana[corte-janela : corte])

	// Sem base de comparação não há percentual: dividir por zero daria infinito, e "subiu
	// infinito por cento" é pior do que não mostrar nada.
	if anterior == 0 {
		return 0, false
	}

	return (float64(recente) - float64(anterior)) / float64(anterior) * 100, true
}

func somar(valores []int) int {
	total := 0
	for _, v := range valores {
		total += v
	}
	return total
}

// PerfilDeGosto classifica o usuário entre concentrado e disperso a partir de quanto do seu
// consumo está nos dois rótulos mais assistidos.
//
// Sobre os limites: eles são heurística, não estatística — não existe verdade objetiva sobre
// onde começa "especialista". Escolhemos a fatia dos 2 primeiros porque é o que uma pessoa
// consegue verificar batendo o olho no próprio gráfico ("meus dois primeiros são metade do
// que eu assisto"), diferente de um índice de concentração que ninguém sabe conferir.
// A faixa do meio existe justamente para não forçar um rótulo em quem está no limite.
func PerfilDeGosto(totaisPorGenero []int) (perfil string, concentracao float64) {
	const minimoParaClassificar = 5

	total := somar(totaisPorGenero)
	if total == 0 || len(totaisPorGenero) < 3 || total < minimoParaClassificar {
		return "", 0
	}

	ordenados := make([]int, len(totaisPorGenero))
	copy(ordenados, totaisPorGenero)
	sort.Sort(sort.Reverse(sort.IntSlice(ordenados)))

	topo2 := ordenados[0] + ordenados[1]
	concentracao = float64(topo2) / float64(total) * 100

	switch {
	case concentracao >= 60:
		return "especialista", concentracao
	case concentracao <= 35:
		return "explorador", concentracao
	default:
		return "equilibrado", concentracao
	}
}

// TaxaDeConclusao devolve quantos animes, de cada 10 começados, chegam ao fim.
//
// "Começado" exclui de propósito quem está em andamento: um anime que você está assistindo
// agora ainda não foi nem concluído nem abandonado, e contá-lo como não-concluído faria a
// taxa cair só porque a pessoa tem coisas em dia.
func TaxaDeConclusao(completos, dropados int) (float64, bool) {
	decididos := completos + dropados
	if decididos < 3 {
		return 0, false
	}
	return float64(completos) / float64(decididos) * 10, true
}
