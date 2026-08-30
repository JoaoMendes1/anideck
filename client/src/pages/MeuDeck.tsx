// client/src/pages/MeuDeck.tsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EditarEntradaModal from '../components/EditarEntradaModal'
import DeckCard from '../components/DeckCard'
import VitrineDestaques from '../components/VitrineDestaques'
import DeckSkeleton from '../components/DeckSkeleton'
import StatCard from '../components/StatCard'
import { Play, CheckCircle2, Bookmark, MonitorPlay, Star, XCircle, AlertCircle } from 'lucide-react'
import type { AiringInfo } from '../lib/deckHelpers'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'

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
    ranking?: number
    nextAiringEpisode?: AiringInfo
    streaming?: { name: string; url: string }[]
}

// Formato de cada item devolvido por POST /api/anime/bulk.
// Derivado de `anilist.Anime` (internal/anilist/models.go), e não dos campos que esta
// tela consome — só os usados aqui estão declarados.
//
// `genres` e `streaming` não têm `omitempty` na struct Go: quando a lista é nula, o JSON
// traz `null` e não `[]`. Por isso os dois aceitam null explicitamente.
interface AnimeDaApi {
    mal_id: number
    title: string
    ranking?: number
    images: { jpg: { image_url: string } }
    genres: { name: string }[] | null
    streaming: { name: string; url: string }[] | null
    nextAiringEpisode?: AiringInfo
}

const FILTER_TABS = ['Todos', 'Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function MeuDeck() {
    const [entradas, setEntradas] = useState<Entrada[]>([])
    const [animesData, setAnimesData] = useState<Record<number, HydratedAnime>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState<Entrada | null>(null)
    const [filtroAtivo, setFiltroAtivo] = useState('Todos')
    const [userName, setUserName] = useState('Usuário')
    const { reportarFalha, reportarSucesso } = useCatalogoStatus()

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { setLoading(false); return }

            setUserName(session.user.user_metadata?.display_name || 'Usuário')

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (!response.ok) throw new Error('Não foi possível carregar seu deck.')
                const dadosDeck: Entrada[] = await response.json()
                setEntradas(dadosDeck || [])

                if (dadosDeck && dadosDeck.length > 0) {
                    const malIds = dadosDeck.map(e => e.mal_id)
                    const apiResponse = await fetch('/api/anime/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds })
                    })

                    if (!apiResponse.ok) {
                        // O deck é seu e já veio do Supabase — ele fica na tela.
                        // Só a camada de catálogo (capa, título, gênero) não veio.
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
                                ranking: m.ranking,
                                nextAiringEpisode: m.nextAiringEpisode,
                                // `?? undefined` porque a struct Go manda `null` quando não há
                                // links; os consumidores só testam veracidade, então os dois são
                                // equivalentes na tela.
                                streaming: m.streaming ?? undefined
                            }
                        })
                        setAnimesData(mapaAnimes)
                    }
                }
            } catch {
                setError('Não foi possível carregar seu deck. Tente novamente.')
            } finally {
                setLoading(false)
            }
        }

        carregarDeck()
        // reportarFalha/reportarSucesso vêm de useCallback(..., []) no CatalogoStatusContext:
        // a identidade nunca muda, então entram na lista sem alterar quando o efeito roda.
    }, [reportarFalha, reportarSucesso])

    const stats = useMemo(() => {
        let assistindo = 0, emDia = 0, concluidos = 0, dropados = 0, somaNotas = 0, qtdNotas = 0;

        entradas.forEach(e => {
            if (e.status === 'Assistindo') assistindo++;
            if (e.status === 'Em Dia') emDia++;
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
            concluidos,
            dropados,
            notaMedia: qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : 'N/A'
        }
    }, [entradas])

    const entradasFiltradas = entradas.filter(e => filtroAtivo === 'Todos' || e.status === filtroAtivo)

    const entradasOrdenadas = useMemo(() => {
        return [...entradasFiltradas].sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return 0;
        })
    }, [entradasFiltradas])

    if (loading) {
        return (
            <div className="pb-20">
                <div className="max-w-[1180px] mx-auto px-5 pt-8">
                    <div className="mb-8 space-y-2">
                        <div className="h-7 w-64 max-w-full rounded-full shimmer" />
                        <div className="h-4 w-48 rounded-full shimmer" />
                    </div>
                    <div className="flex md:grid md:grid-cols-5 gap-3.5 mb-10 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="max-w-[1180px] mx-auto px-5 pt-16 pb-20 text-center text-coral">
                <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                <p className="text-sm select-none">{error}</p>
            </div>
        )
    }

    return (
        <div className="pb-20">
            <div className="max-w-[1180px] mx-auto px-5 pt-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
                    <div>
                        <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1 select-none">
                            Bem-vindo de volta, <span className="bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text">{userName}</span>
                        </h1>
                        <p className="text-muted text-sm select-none">Aqui está o que está rolando na sua coleção.</p>
                    </div>
                    <Link
                        to="/descobrir"
                        className="w-full md:w-auto justify-center font-extrabold text-[13.5px] px-6 py-3 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-transform select-none"
                    >
                        <Play size={14} fill="currentColor" />
                        Buscar Anime
                    </Link>
                </div>

                {/*
                  No mobile isso vira uma fileira com scroll horizontal (bleed até a
                  borda da tela via -mx-5/px-5) em vez do grid 2-colunas que sobrava
                  um card solto em col-span-2. No md+ volta a ser grid normal.
                */}
                <div className="flex md:grid md:grid-cols-5 gap-3.5 mb-10 select-none overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0">
                    <StatCard icon={<MonitorPlay size={14} />} value={stats.assistindo} label="Assistindo" accentColor="holo-3" />
                    <StatCard icon={<Bookmark size={14} />} value={stats.emDia} label="Em Dia" accentColor="green" />
                    <StatCard icon={<CheckCircle2 size={14} />} value={stats.concluidos} label="Completos" accentColor="gold" />
                    <StatCard icon={<XCircle size={14} />} value={stats.dropados} label="Dropados" accentColor="coral" />
                    <StatCard icon={<Star size={14} />} value={stats.notaMedia} label="Sua Nota Média" accentColor="holo-1" />
                </div>

                <VitrineDestaques />

                <div className="flex items-center justify-between mb-5 select-none">
                    <h2 className="font-anton text-[17px] uppercase m-0">Meu Deck</h2>
                </div>

                {/* Mesma lógica de scroll horizontal pras abas — evita quebrar em
                    2-3 linhas e empurrar a grade de cards pra baixo no mobile. */}
                <div className="flex overflow-x-auto md:flex-wrap md:overflow-visible scrollbar-hide gap-2 mb-7 select-none -mx-5 px-5 md:mx-0 md:px-0">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFiltroAtivo(tab)}
                            className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-4 py-2 rounded-full border transition-colors cursor-pointer ${filtroAtivo === tab
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {entradasOrdenadas.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl select-none">
                        <Bookmark className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Lista Vazia</h3>
                        <p className="text-sm text-muted">Nenhum anime encontrado com este status.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {entradasOrdenadas.map((entrada, index) => (
                            <DeckCard
                                key={entrada.id}
                                entrada={entrada}
                                animeLocal={animesData[entrada.mal_id]}
                                gradientClass={`card-g${(index % 5) + 1}`}
                                onEdit={setEditando}
                            />
                        ))}
                    </div>
                )}

                <EditarEntradaModal
                    entrada={editando}
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