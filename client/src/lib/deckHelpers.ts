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