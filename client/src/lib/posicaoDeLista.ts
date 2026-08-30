// client/src/lib/posicaoDeLista.ts
// Guarda, por rota de lista, onde o usuário estava: a rolagem e — nas listas
// paginadas — o suficiente para a lista renascer inteira sem refazer requisição.
//
// Vive em memória de módulo, e não em sessionStorage, de propósito. O que precisa
// sobreviver é a navegação client-side (lista → Detalhes → voltar), que não
// recarrega o módulo. Um F5 descarta tudo, e esse é o comportamento certo: quem
// recarregou a página não está voltando de onde estava.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

interface Instantaneo {
    scrollY: number
    /** Estado necessário para a lista renascer. Só as listas paginadas usam;
        nas de carga única a rolagem basta, porque a lista se refaz sozinha. */
    dados?: unknown
}

const instantaneos = new Map<string, Instantaneo>()

/** Onde ficava a última lista visitada e em que ponto do histórico ela estava.
    O índice é o que permite à tela de Detalhes distinguir "vim direto de uma
    lista" de "vim de outro Detalhes", sem que os sete <Link> que levam a
    /anime/:id precisem marcar a origem. */
let ultimaLista: { chave: string; idx: number } | null = null

/** Índice que o React Router mantém em history.state (lib/router/history.js).
    Ausente ou 0 significa primeira entrada da sessão: link direto, aba nova
    ou refresh — não há para onde voltar dentro do app. */
function indiceNoHistorico(): number {
    return (window.history.state?.idx as number | undefined) ?? 0
}

export function temHistoriaNoApp(): boolean {
    return indiceNoHistorico() > 0
}

/** True quando a tela atual foi aberta diretamente a partir da última lista
    visitada — e portanto voltar devolve o usuário exatamente onde ele estava.
    Comparar o índice, e não só a existência da lista, é o que faz
    Detalhes → Detalhes cair no caminho da seta em vez de prometer um X. */
export function veioDeListaRestauravel(): boolean {
    return ultimaLista !== null && indiceNoHistorico() === ultimaLista.idx + 1
}

export function lerDados<D>(chave: string): D | undefined {
    return instantaneos.get(chave)?.dados as D | undefined
}

/**
 * Retrato guardado desta rota, e só quando a chegada foi um "voltar".
 *
 * Existe como hook para ser chamado no inicializador dos `useState` da lista: o
 * retrato precisa estar inteiro já no PRIMEIRO render. Ler depois, num efeito,
 * significaria um render com a lista vazia e os filtros zerados — e é justamente
 * esse render intermediário que faria os blocos de estado derivado das telas
 * concluírem "o filtro mudou" e jogarem a lista fora.
 */
export function useDadosRestaurados<D>(): D | undefined {
    const { pathname } = useLocation()
    const tipoNavegacao = useNavigationType()
    const [dados] = useState(() => (tipoNavegacao === 'POP' ? lerDados<D>(pathname) : undefined))
    return dados
}

export function guardarDados<D>(chave: string, dados: D): void {
    const atual = instantaneos.get(chave)
    if (atual) atual.dados = dados
    else instantaneos.set(chave, { scrollY: 0, dados })
}

/**
 * Liga uma rota de lista ao cache de posição.
 *
 * @param pronto Se a lista já tem conteúdo na tela. A rolagem só é devolvida
 *   depois disso: restaurar antes rolaria um documento que ainda não tem altura,
 *   e o navegador truncaria de volta para o topo.
 */
export function usePosicaoDeLista(pronto: boolean): void {
    const { pathname } = useLocation()
    const tipoNavegacao = useNavigationType()
    const jaRestaurou = useRef(false)

    useEffect(() => {
        // Chegar na lista por navegação nova (clique no menu) começa do topo: o
        // que ficou de uma visita anterior não vale mais. Só POP — voltar —
        // restaura.
        if (tipoNavegacao !== 'POP') instantaneos.delete(pathname)
        ultimaLista = { chave: pathname, idx: indiceNoHistorico() }
    }, [pathname, tipoNavegacao])

    useEffect(() => {
        const anotar = () => {
            const guardado = instantaneos.get(pathname)
            // Ao sair desta tela o documento encolhe e o navegador força scrollY
            // a caber, disparando um scroll que apagaria justamente a posição que
            // queremos guardar. A assinatura desse evento é a posição guardada
            // não caber mais no documento — e aí ele é ignorado.
            const alturaRolavel = document.documentElement.scrollHeight - window.innerHeight
            if (guardado && guardado.scrollY > alturaRolavel) return

            if (guardado) guardado.scrollY = window.scrollY
            else instantaneos.set(pathname, { scrollY: window.scrollY })
        }
        // Passivo e sem estado React no meio: isto roda a cada scroll e não pode
        // custar um render.
        window.addEventListener('scroll', anotar, { passive: true })
        return () => window.removeEventListener('scroll', anotar)
    }, [pathname])

    // useLayoutEffect e não useEffect: devolve a rolagem antes da pintura, então
    // o usuário não vê o topo da lista aparecer para só depois pular.
    useLayoutEffect(() => {
        if (!pronto || jaRestaurou.current || tipoNavegacao !== 'POP') return
        const alvo = instantaneos.get(pathname)?.scrollY
        if (!alvo) return
        jaRestaurou.current = true
        window.scrollTo(0, alvo)
    }, [pronto, pathname, tipoNavegacao])
}

/**
 * O mesmo, para um trilho de rolagem horizontal dentro da página — um carrossel,
 * cuja posição a rolagem da janela não cobre. A chave é do trilho, não da rota:
 * um trilho não é uma origem de navegação e por isso não mexe em `ultimaLista`.
 */
export function usePosicaoDeTrilho(
    chave: string,
    ref: RefObject<HTMLElement | null>,
    pronto: boolean,
): void {
    const tipoNavegacao = useNavigationType()
    const jaRestaurou = useRef(false)
    const id = `trilho:${chave}`

    useEffect(() => {
        if (tipoNavegacao !== 'POP') instantaneos.delete(id)
    }, [id, tipoNavegacao])

    useEffect(() => {
        const trilho = ref.current
        if (!trilho) return

        const anotar = () => {
            const guardado = instantaneos.get(id)
            // Mesmo cuidado com o clamp da versão vertical: quando o trilho
            // encolhe, o navegador força scrollLeft a caber.
            if (guardado && guardado.scrollY > trilho.scrollWidth - trilho.clientWidth) return

            if (guardado) guardado.scrollY = trilho.scrollLeft
            else instantaneos.set(id, { scrollY: trilho.scrollLeft })
        }
        trilho.addEventListener('scroll', anotar, { passive: true })
        return () => trilho.removeEventListener('scroll', anotar)
    }, [id, ref, pronto])

    useLayoutEffect(() => {
        if (!pronto || jaRestaurou.current || tipoNavegacao !== 'POP') return
        const alvo = instantaneos.get(id)?.scrollY
        if (!alvo || !ref.current) return
        jaRestaurou.current = true
        ref.current.scrollLeft = alvo
    }, [pronto, id, ref, tipoNavegacao])
}
