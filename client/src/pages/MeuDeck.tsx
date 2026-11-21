// client/src/pages/MeuDeck.tsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EditarEntradaModal from '../components/EditarEntradaModal'
import DeckCard from '../components/DeckCard'
import type { AnimeDaApi } from '../types/anime'
import DeckSkeleton from '../components/DeckSkeleton'
import { Bookmark, AlertCircle, Search, X, ArrowUpDown, Plus } from 'lucide-react'
import type { AiringInfo } from '../lib/deckHelpers'
import { gradienteDoCard, reconciliarStatusDeck } from '../lib/deckHelpers'
import { usePosicaoDeLista } from '../lib/posicaoDeLista'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, lerDaMemoria, guardarNaMemoria } from '../lib/cacheDeTela'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
    genres?: string[]
    year?: number
    ranking?: number
    nextAiringEpisode?: AiringInfo
    streaming?: { name: string; url: string }[]
}

const FILTER_TABS = ['Todos', 'Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

type OrdenacaoDeck = 'favoritos' | 'nota' | 'titulo'

interface DeckEmMemoria {
    entradas: Entrada[]
    animesData: Record<number, HydratedAnime>
    userName: string
}

export default function MeuDeck() {
    // Com o deck já visitado nesta aba, a tela nasce pronta com o que tinha e busca a
    // versão nova por trás (ver cacheDeTela.ts). Lido no inicializador do useState, e
    // não num efeito, para o PRIMEIRO render já sair com os cards, sem skeleton.
    const { session } = useSessao()
    const chaveDoDeck = chaveDoUsuario(session?.user.id, 'deck')
    const [emMemoria] = useState(() => lerDaMemoria<DeckEmMemoria>(chaveDoDeck))

    const [entradas, setEntradas] = useState<Entrada[]>(emMemoria?.entradas ?? [])
    const [animesData, setAnimesData] = useState<Record<number, HydratedAnime>>(emMemoria?.animesData ?? {})
    const [loading, setLoading] = useState(!emMemoria)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState<Entrada | null>(null)
    const [totalEpisodiosEditando, setTotalEpisodiosEditando] = useState(0)
    const [filtroAtivo, setFiltroAtivo] = useState('Todos')
    const [buscaTitulo, setBuscaTitulo] = useState('')
    const [ordenacao, setOrdenacao] = useState<OrdenacaoDeck>('favoritos')
    const [userName, setUserName] = useState(emMemoria?.userName ?? 'Usuário')
    const { reportarFalha, reportarSucesso } = useCatalogoStatus()

    usePosicaoDeLista(!loading)

    useEffect(() => {
        if (!editando) {
            setTotalEpisodiosEditando(0)
            return
        }

        const buscarProgressoAnime = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return
            try {
                const res = await fetch(`/api/entries/${editando.mal_id}/episodes`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                if (res.ok) {
                    const eps: number[] = await res.json()
                    setTotalEpisodiosEditando(Array.isArray(eps) ? eps.length : 0)
                }
            } catch {
                setTotalEpisodiosEditando(0)
            }
        }

        buscarProgressoAnime()
    }, [editando])

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { setLoading(false); return }

            setUserName(session.user.user_metadata?.display_name || 'Usuário')

            try {
                const [response, resProgresso] = await Promise.all([
                    fetch('/api/entries', {
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                    }),
                    fetch('/api/entries/progresso', {
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                    }).catch(() => null),
                ])
                if (!response.ok) throw new Error('Não foi possível carregar seu deck.')
                const dadosDeck: Entrada[] = await response.json()
                const mapaProgresso: Record<number, number> = {}
                if (resProgresso && resProgresso.ok) {
                    try {
                        const listaProg = (await resProgresso.json()) as { mal_id: number; ultimo_episodio: number }[]
                        if (Array.isArray(listaProg)) {
                            listaProg.forEach(p => {
                                mapaProgresso[p.mal_id] = p.ultimo_episodio
                            })
                        }
                    } catch {
                        // Segue sem mapa se json falhar
                    }
                }

                // As entradas só vão para a tela junto com os dados dos animes. Com o deck
                // em memória, gravá-las antes faria um anime recém-adicionado aparecer por
                // um instante sem capa nem título, até o /api/anime/bulk responder.
                const novasEntradas = dadosDeck || []
                if (novasEntradas.length === 0) setEntradas([])

                if (dadosDeck && dadosDeck.length > 0) {
                    const malIds = dadosDeck.map(e => e.mal_id)
                    const apiResponse = await fetch('/api/anime/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds })
                    })

                    if (!apiResponse.ok) {
                        setEntradas(novasEntradas)
                        reportarFalha()
                    } else {
                        reportarSucesso()

                        const apiJson = await apiResponse.json()
                        const media = apiJson.data || []

                        const mapaAnimes: Record<number, HydratedAnime> = {}
                        media.forEach((m: AnimeDaApi) => {
                            mapaAnimes[m.mal_id] = {
                                mal_id: m.mal_id,
                                title: m.title || 'Título indisponível',
                                image_url: m.images?.jpg?.image_url || '',
                                genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined,
                                genres: m.genres && m.genres.length > 0 ? m.genres.slice(0, 2).map(g => g.name) : undefined,
                                year: m.season_year || m.startDate?.year || undefined,
                                ranking: m.ranking,
                                nextAiringEpisode: m.nextAiringEpisode,
                                streaming: m.streaming ?? undefined
                            }
                        })

                        // Reconciliação automática: animes 'Em Dia' que receberam novo episódio voltam para 'Assistindo'
                        const reconciliadas = novasEntradas.map(e => {
                            const animeLocal = mapaAnimes[e.mal_id]
                            const ultimoEp = mapaProgresso[e.mal_id] ?? 0
                            const statusReconciliado = reconciliarStatusDeck(e.status, {
                                ultimoEpisodioAssistido: ultimoEp,
                                nextAiringEpisode: animeLocal?.nextAiringEpisode,
                            })
                            if (statusReconciliado !== e.status) {
                                // Sincroniza em background com o Supabase
                                fetch(`/api/entries/${e.id}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${session.access_token}`,
                                    },
                                    body: JSON.stringify({
                                        mal_id: e.mal_id,
                                        tipo: e.tipo || 'anime',
                                        status: statusReconciliado,
                                        nota: e.nota ?? null,
                                        anotacao: e.anotacao ?? '',
                                        is_favorite: e.is_favorite ?? false,
                                    }),
                                }).catch(() => null)
                                return { ...e, status: statusReconciliado }
                            }
                            return e
                        })

                        setEntradas(reconciliadas)
                        setAnimesData(mapaAnimes)
                    }
                }
            } catch {
                // Com dados em memória, uma falha na atualização por trás não derruba a
                // tela: o usuário segue vendo o deck que já tinha.
                if (!emMemoria) setError('Não foi possível carregar seu deck. Tente novamente.')
            } finally {
                setLoading(false)
            }
        }

        carregarDeck()
    }, [reportarFalha, reportarSucesso, emMemoria])

    // Toda mudança do deck vai para a memória, inclusive as edições feitas no modal.
    // Assim, voltar à tela depois de editar mostra a versão editada, não a de antes.
    useEffect(() => {
        if (!loading) guardarNaMemoria<DeckEmMemoria>(chaveDoDeck, { entradas, animesData, userName })
    }, [loading, chaveDoDeck, entradas, animesData, userName])

    const stats = useMemo(() => {
        let assistindo = 0, emDia = 0, queroAssistir = 0, concluidos = 0, dropados = 0, somaNotas = 0, qtdNotas = 0;

        entradas.forEach(e => {
            if (e.status === 'Assistindo') assistindo++;
            if (e.status === 'Em Dia') emDia++;
            if (e.status === 'Quero Assistir') queroAssistir++;
            if (e.status === 'Completo' || e.status === 'Finalizado') concluidos++;
            if (e.status === 'Dropado') dropados++;
            if (e.nota !== null && e.nota !== undefined) {
                somaNotas += e.nota;
                qtdNotas++;
            }
        })

        return {
            assistindo,
            emDia,
            queroAssistir,
            concluidos,
            dropados,
            notaMedia: qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : 'N/A'
        }
    }, [entradas])

    // Mapa de contadores para exibir os totais dentro de cada aba
    const contadoresPorAba = useMemo(() => {
        const counts: Record<string, number> = {
            'Todos': entradas.length,
            'Assistindo': 0,
            'Em Dia': 0,
            'Completo': 0,
            'Quero Assistir': 0,
            'Dropado': 0,
        }
        entradas.forEach(e => {
            if (e.status in counts) counts[e.status]++
            if (e.status === 'Finalizado') counts['Completo']++
        })
        return counts
    }, [entradas])

    const entradasFiltradas = useMemo(() => {
        const termo = buscaTitulo.trim().toLowerCase()
        return entradas.filter(e => {
            if (filtroAtivo !== 'Todos' && e.status !== filtroAtivo) return false
            if (!termo) return true
            const titulo = (animesData[e.mal_id]?.title || '').toLowerCase()
            return titulo.includes(termo) || String(e.mal_id).includes(termo)
        })
    }, [entradas, filtroAtivo, buscaTitulo, animesData])

    const entradasOrdenadas = useMemo(() => {
        return [...entradasFiltradas].sort((a, b) => {
            if (ordenacao === 'nota') {
                const notaA = a.nota ?? -1
                const notaB = b.nota ?? -1
                if (notaB !== notaA) return notaB - notaA
            } else if (ordenacao === 'titulo') {
                const tituloA = animesData[a.mal_id]?.title || ''
                const tituloB = animesData[b.mal_id]?.title || ''
                const cmp = tituloA.localeCompare(tituloB, 'pt-BR', { sensitivity: 'base' })
                if (cmp !== 0) return cmp
            }
            if (a.is_favorite && !b.is_favorite) return -1
            if (!a.is_favorite && b.is_favorite) return 1
            return 0
        })
    }, [entradasFiltradas, ordenacao, animesData])

    if (loading) {
        return (
            <div className="pb-20">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-8">
                    <div className="mb-8 space-y-2">
                        <div className="h-7 w-64 max-w-full rounded-full shimmer" />
                        <div className="h-4 w-48 rounded-full shimmer" />
                    </div>
                    <div className="flex md:grid md:grid-cols-6 gap-3.5 mb-10 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="shrink-0 w-[132px] md:w-auto h-[92px] rounded-[14px] shimmer" />
                        ))}
                    </div>
                    <DeckSkeleton />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-20 text-center text-coral">
                <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                <p className="text-sm select-none">{error}</p>
            </div>
        )
    }

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 select-none">
                    {/* Os números de cada status ficam nas abas logo abaixo; aqui só o resumo. */}
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                        <div className="min-w-0">
                            <h1 className="font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight m-0 leading-tight text-text">Meu Deck</h1>
                            <p className="m-0 mt-1 font-mono text-xs text-muted tabular-nums">
                                {entradas.length} {entradas.length === 1 ? 'anime' : 'animes'}
                                {stats.notaMedia !== 'N/A' ? ` · sua nota média ${stats.notaMedia}` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                to="/calendario"
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3 text-xs font-bold text-muted hover:text-holo-3 hover:border-holo-3/50 transition-colors"
                            >
                                Agenda
                            </Link>
                            <Link
                                to="/descobrir?foco=1"
                                aria-label="Adicionar anime ao deck"
                                title="Adicionar anime"
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 px-3.5 text-xs font-extrabold text-void shadow-[0_6px_18px_-6px_rgba(255,79,216,0.45)] hover:brightness-110 transition-all"
                            >
                                <Plus size={14} aria-hidden="true" /> Adicionar
                            </Link>
                        </div>
                    </div>
                    {entradas.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2 pointer-events-none" />
                                <input
                                    type="search"
                                    value={buscaTitulo}
                                    onChange={(e) => setBuscaTitulo(e.target.value)}
                                    placeholder="Filtrar no deck..."
                                    aria-label="Filtrar animes do deck por título"
                                    className="w-full bg-panel border border-line rounded-full pl-8 pr-8 py-1.5 text-xs text-text placeholder:text-muted-2 outline-none focus:border-holo-3 transition-colors"
                                />
                                {buscaTitulo && (
                                    <button
                                        type="button"
                                        onClick={() => setBuscaTitulo('')}
                                        aria-label="Limpar busca"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-2 hover:text-text cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            <label className="inline-flex items-center gap-1.5 bg-panel border border-line rounded-full px-3 py-1.5 text-xs text-muted shrink-0 focus-within:border-holo-3 transition-colors">
                                <ArrowUpDown size={12} className="text-muted-2 shrink-0" />
                                <span className="sr-only">Ordenar deck</span>
                                <select
                                    value={ordenacao}
                                    onChange={(e) => setOrdenacao(e.target.value as OrdenacaoDeck)}
                                    aria-label="Ordenar deck"
                                    className="bg-transparent text-xs font-bold text-text outline-none cursor-pointer"
                                >
                                    <option value="favoritos" className="bg-panel text-text">Favoritos</option>
                                    <option value="nota" className="bg-panel text-text">Maior nota</option>
                                    <option value="titulo" className="bg-panel text-text">Título (A–Z)</option>
                                </select>
                            </label>
                        </div>
                    )}
                </div>

                {/* Abas com contadores numéricos integrados */}
                <div className="flex overflow-x-auto md:flex-wrap md:overflow-visible scrollbar-hide gap-1.5 mb-4 sm:mb-7 select-none -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                    {FILTER_TABS.map(tab => {
                        const totalAba = contadoresPorAba[tab] ?? 0
                        const ativa = filtroAtivo === tab

                        return (
                            <button
                                key={tab}
                                onClick={() => setFiltroAtivo(tab)}
                                className={`shrink-0 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${ativa
                                    ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                    : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                                    }`}
                            >
                                <span>{tab}</span>
                                <span className={`font-mono text-[11px] px-1.5 py-px rounded-full ${
                                    ativa
                                        ? 'bg-white/20 text-white'
                                        : 'bg-panel-2 text-muted-2 border border-line/60'
                                }`}>
                                    {totalAba}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {entradasOrdenadas.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl select-none">
                        <Bookmark className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Lista Vazia</h3>
                        <p className="text-sm text-muted">
                            {buscaTitulo.trim()
                                ? `Nenhum anime encontrado para "${buscaTitulo.trim()}".`
                                : 'Nenhum anime encontrado com este status.'}
                        </p>
                        {(buscaTitulo.trim() !== '' || filtroAtivo !== 'Todos') && (
                            <button
                                type="button"
                                onClick={() => { setBuscaTitulo(''); setFiltroAtivo('Todos') }}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-panel-2 text-xs font-bold text-text hover:border-holo-3 cursor-pointer transition-colors"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                        {entradasOrdenadas.map((entrada, index) => (
                            <DeckCard
                                key={entrada.id}
                                entrada={entrada}
                                animeLocal={animesData[entrada.mal_id]}
                                gradientClass={gradienteDoCard(index)}
                                onEdit={setEditando}
                            />
                        ))}
                    </div>
                )}

                <EditarEntradaModal
                    entrada={editando}
                    totalEpisodiosAssistidos={totalEpisodiosEditando}
                    onEpisodiosLimpos={() => setTotalEpisodiosEditando(0)}
                    onFechar={() => setEditando(null)}
                    onSalvar={(atualizada) => {
                        setEntradas((prev) => prev.map((e) => (e.id === atualizada.id ? atualizada : e)))
                    }}
                    onExcluir={(id) => {
                        setEntradas((prev) => prev.filter((e) => e.id !== id))
                    }}
                />
            </div>
        </div>
    )
}
