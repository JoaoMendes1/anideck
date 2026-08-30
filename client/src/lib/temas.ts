// client/src/lib/temas.ts
// Mecânica de troca de tema. As paletas de verdade vivem no index.css, nos blocos
// `html[data-tema=...]`; aqui ficam só o rótulo, a amostra e a troca em si.
//
// ATENÇÃO: a lista de ids e de fundos está DUPLICADA no <script> do index.html.
// Ela precisa estar lá porque o tema tem que ser aplicado antes do React montar —
// um módulo importado já roda tarde demais e a tela pisca na paleta padrão. Ao
// acrescentar um tema, mexa nos dois lugares.
import { useSyncExternalStore } from 'react'

export interface Tema {
    id: string
    nome: string
    desc: string
    /** Amostra [fundo, acento, acento, acento] exibida no seletor. As cores aqui
        são literais de propósito: precisam aparecer iguais qualquer que seja o
        tema ativo. Não confundir com cor cravada em componente. */
    cores: string[]
}

export const TEMAS: Tema[] = [
    { id: 'holo', nome: 'Holo', desc: 'O visual atual', cores: ['#0A0714', '#FF4FD8', '#7B5CFF', '#3FE0F0'] },
    { id: 'terminal', nome: 'Terminal', desc: 'Verde de console antigo', cores: ['#050A08', '#A0FF78', '#3FE0F0', '#1F6B4A'] },
    { id: 'arquivo', nome: 'Arquivo', desc: 'Âmbar e papel envelhecido', cores: ['#120C08', '#FFC542', '#FF8A5C', '#8A5A2B'] },
    { id: 'estudio', nome: 'Estúdio', desc: 'Sóbrio, sem gradiente', cores: ['#12141A', '#4A7DFF', '#8C96AD', '#2A3040'] },
]

export const TEMA_PADRAO = 'holo'
export const CHAVE_TEMA = 'anideck:tema'

const ouvintes = new Set<() => void>()

/** Lê do próprio <html>, e não de um estado paralelo: o atributo é o que está de
    fato pintado na tela, escrito pelo script do index.html antes do React existir. */
function ler(): string {
    return document.documentElement.getAttribute('data-tema') ?? TEMA_PADRAO
}

function inscrever(aoMudar: () => void) {
    ouvintes.add(aoMudar)
    return () => { ouvintes.delete(aoMudar) }
}

export function aplicarTema(id: string) {
    const tema = TEMAS.find((t) => t.id === id)
    if (!tema) return

    // O padrão não escreve atributo nenhum: assim a paleta Holo continua sendo o
    // que o @theme já define, sem um bloco de tema que só repetiria os mesmos hex.
    if (id === TEMA_PADRAO) document.documentElement.removeAttribute('data-tema')
    else document.documentElement.setAttribute('data-tema', id)

    // A barra do navegador no mobile não lê CSS: a cor dela é esta meta, e sem
    // isto o topo da tela fica roxo enquanto o resto fica verde.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema.cores[0])

    try {
        localStorage.setItem(CHAVE_TEMA, id)
    } catch {
        // Modo privado ou armazenamento bloqueado: o tema vale só nesta aba.
    }

    ouvintes.forEach((aoMudar) => aoMudar())
}

/** Id do tema ativo, reativo à troca vinda de qualquer seletor da tela. */
export function useTema(): string {
    return useSyncExternalStore(inscrever, ler)
}
