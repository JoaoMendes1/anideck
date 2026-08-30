// client/src/lib/deckHelpers.ts
export interface AiringInfo {
    airingAt: number
    timeUntilAiring: number
    episode: number
}

export interface StatusTheme {
    bg: string
    text: string
    border: string
}

// Gradiente de fundo do card, usado como fallback quando o anime não tem capa.
//
// Os cinco nomes estão escritos por extenso de propósito: o Tailwind v4 só emite um
// utilitário quando o nome aparece LITERAL no código-fonte. Montar `card-g${n}` fazia a
// classe chegar ao DOM e a regra CSS nunca ser gerada — sem erro, sem aviso, sem nada no
// build. É a mesma armadilha que o StatCard já documentava para `border-t-${cor}`.
const GRADIENTES_CARD = ['card-g1', 'card-g2', 'card-g3', 'card-g4', 'card-g5'] as const

/** Escolhe um dos cinco gradientes ciclando pela posição do card na lista. */
export function gradienteDoCard(indice: number): string {
    return GRADIENTES_CARD[indice % GRADIENTES_CARD.length]
}

/** Defasa o brilho do foil pela posição do card, para os favoritos não brilharem
    em uníssono — o que denuncia o loop e faz a tela inteira piscar junto.

    Devolve atraso NEGATIVO de propósito: com atraso positivo o card ficaria os
    primeiros segundos sem brilho nenhum, esperando a vez. Negativo entra com a
    animação já em andamento.

    O passo de 2.3s contra o ciclo de 10s do `foilShine` só volta a repetir
    depois de 100 cards, então numa tela de favoritos dois nunca coincidem. O valor sai
    daqui e não de uma classe do Tailwind porque classe montada por interpolação
    não é gerada — ver armadilha 17 do PITFALLS.md. */
export function atrasoDoFoil(indice: number): string {
    return `-${((indice * 2.3) % 10).toFixed(2)}s`
}

// Extraído do MeuDeck.tsx pra ser reusado pelo DeckCard sem duplicar o switch.
export function getStatusTheme(status: string): StatusTheme {
    switch (status) {
        case 'Assistindo':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-3 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-3/50' }
        case 'Em Dia':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-green drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-green/50' }
        case 'Completo':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-gold/50' }
        case 'Quero Assistir':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-1 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-1/50' }
        case 'Dropado':
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-coral drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-coral/50' }
        default:
            return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-muted-2 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-muted-2/50' }
    }
}

// Selos "Novo EP / Hoje / Amanhã". Antes era recalculado inline dentro do
// .map() do JSX — virou função pura, mais fácil de ler (e de dar debug se
// um dia a gente decidir revisar a condição do "acabouDeLancar" citada no chat).
export function getAiringBadge(nextAiringEpisode?: AiringInfo) {
    if (!nextAiringEpisode) {
        return { acabouDeLancar: false, lancaHoje: false, lancaAmanha: false }
    }

    const acabouDeLancar = nextAiringEpisode.timeUntilAiring > 518400

    const dataEpisodio = new Date(nextAiringEpisode.airingAt * 1000)
    dataEpisodio.setHours(0, 0, 0, 0)

    const dataHoje = new Date()
    dataHoje.setHours(0, 0, 0, 0)

    const diffDays = Math.round((dataEpisodio.getTime() - dataHoje.getTime()) / (1000 * 60 * 60 * 24))

    return {
        acabouDeLancar,
        lancaHoje: diffDays === 0,
        lancaAmanha: diffDays === 1,
    }
}