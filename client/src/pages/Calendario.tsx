// client/src/pages/Calendario.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePosicaoDeLista } from '../lib/posicaoDeLista'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, lerDaMemoria, guardarNaMemoria } from '../lib/cacheDeTela'
import { supabase } from '../lib/supabase'
import { Play, Calendar as CalendarIcon } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'
import type { AnimeDaApi } from '../types/anime'
import { gradienteDoCard, getStatusTheme, obterTextoDiaLancamento } from '../lib/deckHelpers'
import { escolherLinkStreaming } from '../lib/inicio'
import { listarSalasAoVivo, type SalaEstreia } from '../lib/salasEstreia'

interface Entrada {
    mal_id: number
    status: string
    is_favorite?: boolean
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
    genres?: string[]
    status?: string
    is_favorite?: boolean
    nextAiringEpisode?: {
        airingAt: number
        timeUntilAiring: number
        episode: number
    }
    streaming?: {
        name: string
        url: string
    }[]
}

export default function Calendario() {
    const [animes, setAnimes] = useState<HydratedAnime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [agora, setAgora] = useState(() => Math.floor(Date.now() / 1000))
    const [abaAtiva, setAbaAtiva] = useState<'meus' | 'todos'>('meus')
    const [salasAoVivo, setSalasAoVivo] = useState<SalaEstreia[]>([])

    const { session } = useSessao()
    const userId = session?.user.id

    usePosicaoDeLista(!loading)

    useEffect(() => {
        // Cada aba guarda o que mostrou (ver cacheDeTela.ts): voltar ao Calendário, ou
        // trocar de aba e voltar, mostra a lista na hora e atualiza por trás.
        const chave = chaveDoUsuario(userId, `calendario:${abaAtiva}`)
        const emMemoria = lerDaMemoria<HydratedAnime[]>(chave)

        const buscarEntradas = async (): Promise<Entrada[]> => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return []
            try {
                const res = await fetch('/api/entries', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
                return res.ok ? await res.json() : []
            } catch {
                return [] // Falha silenciosa permitida: sem entradas, só não marca favoritos
            }
        }

        const buscarCuradosComEpisodio = async (): Promise<AnimeDaApi[]> => {
            try {
                const resCur = await fetch('/api/curation')
                if (!resCur.ok) return []
                const curados = await resCur.json()
                const idsCurados = curados.map((c: { mal_id: number }) => c.mal_id)
                if (idsCurados.length === 0) return []
                const resBulk = await fetch('/api/anime/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsCurados })
                })
                return resBulk.ok ? ((await resBulk.json()).data || []) : []
            } catch {
                return [] // A AniList (lançamentos) segura a aba se a curadoria falhar
            }
        }

        const buscarLancamentos = async (): Promise<AnimeDaApi[]> => {
            try {
                const response = await fetch('/api/ranking?status=RELEASING&perPage=50&sort=POPULARITY_DESC')
                return response.ok ? ((await response.json()).data || []) : []
            } catch {
                return [] // A curadoria segura a aba se a AniList cair
            }
        }

        const carregarCalendario = async () => {
            if (emMemoria) {
                setAnimes(emMemoria)
                setLoading(false)
            } else {
                setLoading(true)
            }
            setError(null)

            try {
                let media: AnimeDaApi[] = []
                let userEntries: Entrada[] = []

                if (abaAtiva === 'meus') {
                    // Aqui a ordem é obrigatória: os ids do bulk saem das entradas.
                    userEntries = await buscarEntradas()
                    const ativos = userEntries.filter(
                        e => e.status === 'Assistindo' || e.status === 'Em Dia' || e.status === 'Quero Assistir'
                    )
                    if (ativos.length === 0) {
                        setAnimes([])
                        guardarNaMemoria(chave, [])
                        setLoading(false)
                        return
                    }
                    const malIds = ativos.map(e => e.mal_id)
                    const apiResponse = await fetch('/api/anime/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds })
                    })
                    const apiJson = await apiResponse.json()
                    media = apiJson.data || []
                } else {
                    // As três buscas não dependem umas das outras. Antes corriam em fila
                    // (entradas → curadoria → bulk → AniList) e os tempos somavam; juntas,
                    // o total vira o tempo da mais lenta.
                    const [entradas, curadosComEp, anilistMedia] = await Promise.all([
                        buscarEntradas(),
                        buscarCuradosComEpisodio(),
                        buscarLancamentos(),
                    ])
                    userEntries = entradas

                    const mapaFinal = new Map<number, AnimeDaApi>()
                    curadosComEp.forEach(m => mapaFinal.set(m.mal_id, m))
                    anilistMedia.forEach(m => {
                        if (!mapaFinal.has(m.mal_id)) {
                            mapaFinal.set(m.mal_id, m)
                        }
                    })

                    media = Array.from(mapaFinal.values())
                }

                const animesComEpisodio: HydratedAnime[] = []
                media.forEach((m: AnimeDaApi) => {
                    if (m.nextAiringEpisode) {
                        const entry = userEntries.find(e => e.mal_id === m.mal_id)
                        animesComEpisodio.push({
                            mal_id: m.mal_id,
                            title: m.title || 'Título Desconhecido',
                            image_url: m.images?.jpg?.image_url || '',
                            genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined,
                            genres: m.genres && m.genres.length > 0 ? m.genres.slice(0, 3).map(g => g.name) : undefined,
                            status: entry?.status,
                            nextAiringEpisode: m.nextAiringEpisode,
                            streaming: m.streaming ?? undefined,
                            is_favorite: entry?.is_favorite
                        })
                    }
                })

                setAnimes(animesComEpisodio)
                guardarNaMemoria(chave, animesComEpisodio)
                listarSalasAoVivo().then(setSalasAoVivo).catch(() => {})
            } catch {
                // Com a lista em memória, a falha da atualização por trás não vira erro na tela.
                if (!emMemoria) setError('Não foi possível carregar o calendário.')
            } finally {
                setLoading(false)
            }
        }

        carregarCalendario()
    }, [abaAtiva, userId])

    useEffect(() => {
        const interval = setInterval(() => {
            setAgora(Math.floor(Date.now() / 1000))
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    const getDayLabel = (timestamp: number) => {
        const date = new Date(timestamp * 1000)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)

        const diffTime = targetDate.getTime() - today.getTime()
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Hoje'
        if (diffDays === 1) return 'Amanhã'

        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
        return diasSemana[date.getDay()]
    }

    const formatTimeRemaining = (targetEpoch: number) => {
        const diff = targetEpoch - agora
        if (diff <= 0) return 'Lançado!'

        const days = Math.floor(diff / 86400)
        const hours = Math.floor((diff % 86400) / 3600)
        const minutes = Math.floor((diff % 3600) / 60)

        if (days > 0) return `⏱ ${days}D ${hours}H`
        if (hours > 0) return `⏱ ${hours}H ${minutes}M`
        return `⏱ ${minutes}M`
    }

    const formatClock = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const sortedAnimes = [...animes].sort((a, b) => (a.nextAiringEpisode?.airingAt || 0) - (b.nextAiringEpisode?.airingAt || 0))
    const groups: { label: string; dateStr: string; animes: HydratedAnime[] }[] = []

    sortedAnimes.forEach(anime => {
        if (!anime.nextAiringEpisode) return
        const label = getDayLabel(anime.nextAiringEpisode.airingAt)
        const dateObj = new Date(anime.nextAiringEpisode.airingAt * 1000)
        const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}`

        let group = groups.find(g => g.label === label)
        if (!group) {
            group = { label, dateStr, animes: [] }
            groups.push(group)
        }
        group.animes.push(anime)
    })

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 relative z-10">
                <div className="mb-8">
                    <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1 text-text select-none">
                        Calendário de Lançamentos
                    </h1>
                    <p className="text-muted text-sm select-none">
                        Próximos episódios da sua coleção ou do catálogo global — com contagem regressiva viva.
                    </p>
                </div>

                <div className="flex gap-2 mb-8 select-none border-b border-line pb-4 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setAbaAtiva('meus')}
                        className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${abaAtiva === 'meus'
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        Meu Deck
                    </button>
                    <button
                        onClick={() => setAbaAtiva('todos')}
                        className={`shrink-0 whitespace-nowrap text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${abaAtiva === 'todos'
                                ? 'bg-holo-3/20 border-holo-3 text-holo-3 shadow-[0_0_15px_rgba(63,224,240,0.2)]'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        Lançamentos Global
                    </button>
                </div>

                {loading ? (
                    <div className="min-h-[40vh] flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-1 animate-spin mb-4"></div>
                        <p className="font-mono text-muted text-sm tracking-widest">// CALCULANDO TEMPORIZADORES...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl select-none">
                        <CalendarIcon className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Agenda Vazia</h3>
                        <p className="text-sm text-muted">Nenhum episódio previsto para a aba selecionada.</p>
                    </div>
                ) : (
                    // No monitor, dois dias lado a lado: um card por dia numa grade de três
                    // colunas deixava dois terços da tela vazios.
                    <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-x-10 items-start">
                    {groups.map((group) => {
                        let badgeColor = 'bg-panel border-line text-muted-2'
                        if (group.label === 'Hoje') badgeColor = 'bg-coral/15 border-coral/35 text-coral'
                        if (group.label === 'Amanhã') badgeColor = 'bg-gold/15 border-gold/35 text-gold'

                        return (
                            <div key={group.label} className="mb-10 animate-fade-in">
                                <div className="flex items-center gap-3 mb-4 select-none">
                                    <h2 className="font-anton text-text uppercase text-[17px] m-0 flex items-center gap-2">
                                        {group.label}
                                        {group.label === 'Hoje' && (
                                            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" title="Lançamento hoje!"></span>
                                        )}
                                    </h2>
                                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                        {group.dateStr}
                                    </span>
                                    <div className="flex-1 h-[1px] bg-line"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-5">
                                    {group.animes.map((anime, index) => {
                                        const gradClass = gradienteDoCard(index)
                                        const streamUrl = escolherLinkStreaming(anime.streaming)?.url ?? null
                                        const remainingText = formatTimeRemaining(anime.nextAiringEpisode!.airingAt)
                                        const isLancado = remainingText === 'Lançado!'
                                        const diaSemanal = obterTextoDiaLancamento({ nextAiringEpisode: anime.nextAiringEpisode })
                                        const temaStatus = anime.status ? getStatusTheme(anime.status) : null
                                        const listaGeneros = anime.genres && anime.genres.length > 0 
                                            ? anime.genres 
                                            : anime.genre 
                                                ? [anime.genre] 
                                                : []

                                        return (
                                            <div
                                                key={anime.mal_id}
                                                className={`relative flex items-stretch border rounded-2xl overflow-hidden transition-all duration-200 group ${
                                                    anime.is_favorite
                                                        ? 'bg-panel-2 border-gold/40 shadow-[0_0_15px_rgba(255,197,66,0.08)]'
                                                        : 'bg-panel border-line hover:border-holo-2/70'
                                                }`}
                                            >
                                                <Link
                                                    to={`/anime/${anime.mal_id}`}
                                                    className={`relative aspect-[2/3] w-28 sm:w-32 shrink-0 overflow-hidden border-r border-line bg-panel-2 ${gradClass}`}
                                                >
                                                    {anime.image_url ? (
                                                        <img
                                                            src={anime.image_url}
                                                            alt={anime.title}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-mono text-[9px] text-muted-2 uppercase text-center p-2">
                                                            S/ Capa
                                                        </div>
                                                    )}
                                                </Link>

                                                <div className="min-w-0 flex-1 flex flex-col justify-between p-3.5 sm:p-4">
                                                    <div>
                                                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5 select-none">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-void/70 border border-line text-holo-3">
                                                                    EPISÓDIO {anime.nextAiringEpisode!.episode}
                                                                </span>
                                                                {(() => {
                                                                    const sala = salasAoVivo.find(s => s.mal_id === anime.mal_id && s.ao_vivo)
                                                                    if (!sala) return null
                                                                    return (
                                                                        <Link
                                                                            to={`/sala-estreia/${sala.id}`}
                                                                            className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-coral/20 border border-coral/40 text-coral animate-pulse"
                                                                            title="Sala de Estreia Ao Vivo! Clique para entrar no chat"
                                                                        >
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-ping" />
                                                                            Ao Vivo
                                                                        </Link>
                                                                    )
                                                                })()}
                                                                {anime.status && temaStatus && (
                                                                    <span className={`font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${temaStatus.bg} ${temaStatus.text} ${temaStatus.border}`}>
                                                                        {anime.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {anime.is_favorite && (
                                                                <span className="text-gold text-xs leading-none drop-shadow-md" title="Favorito">👑</span>
                                                            )}
                                                        </div>

                                                        <Link
                                                            to={`/anime/${anime.mal_id}`}
                                                            className="font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-2 text-text hover:text-holo-3 transition-colors"
                                                        >
                                                            {anime.title}
                                                        </Link>

                                                        {diaSemanal && (
                                                            <div className="font-mono text-[10px] text-holo-3/90 font-semibold mt-1 select-none">
                                                                📅 {diaSemanal}
                                                            </div>
                                                        )}

                                                        {listaGeneros.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-2 select-none">
                                                                {listaGeneros.slice(0, 3).map((g) => (
                                                                    <span
                                                                        key={g}
                                                                        className={`max-w-[110px] truncate px-2 py-0.5 rounded-full border font-bold font-manrope text-[9.5px] ${getCategoryTheme(g)}`}
                                                                    >
                                                                        {g}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-line/60 select-none">
                                                        <span className={`inline-flex items-center justify-center font-mono text-[10.5px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${isLancado ? 'bg-green/15 text-green border-green/30' : 'bg-holo-3/15 text-holo-3 border-holo-3/30'}`}>
                                                            {remainingText}
                                                        </span>

                                                        <div className="flex items-center gap-2.5">
                                                            <span className="font-mono text-[12px] sm:text-[13px] font-bold text-muted tabular-nums">
                                                                {formatClock(anime.nextAiringEpisode!.airingAt)}
                                                            </span>
                                                            {streamUrl && (
                                                                <a
                                                                    href={streamUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-8 h-8 rounded-full bg-panel-2 border border-line text-muted hover:text-holo-3 hover:border-holo-3 flex items-center justify-center transition-colors"
                                                                    title="Assistir Oficial"
                                                                >
                                                                    <Play size={13} fill="currentColor" className="ml-0.5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                    </div>
                )}
            </div>
        </div>
    )
}
