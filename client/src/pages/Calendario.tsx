import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Play, Calendar as CalendarIcon } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'
import type { AnimeDaApi } from '../types/anime'

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
    // Instante de referência da contagem regressiva, em segundos.
    // Guardar o tempo em estado (em vez de um contador descartado que só forçava
    // re-render) é o que permite ler o relógio fora do render: chamar Date.now()
    // durante a renderização torna o resultado dependente de QUANDO o React decidiu
    // renderizar, e não do intervalo de 1 minuto que governa a atualização.
    const [agora, setAgora] = useState(() => Math.floor(Date.now() / 1000))

    const [abaAtiva, setAbaAtiva] = useState<'meus' | 'todos'>('meus')

    useEffect(() => {
        const carregarCalendario = async () => {
            setLoading(true)
            setError(null)

            let userEntries: Entrada[] = []
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                try {
                    const res = await fetch('/api/entries', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
                    if (res.ok) userEntries = await res.json()
                } catch {
                    // Sem as entradas do usuário o calendário ainda funciona: ele só perde
                    // a marcação de "está no seu deck". Falhar aqui não pode impedir a tela.
                }
            }

            try {
                let media = []

                if (abaAtiva === 'meus') {
                    const ativos = userEntries.filter(e => e.status === 'Assistindo' || e.status === 'Em Dia')
                    if (ativos.length === 0) {
                        setAnimes([])
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
                    // 🟢 AQUI: Forçando a ordenação por Popularidade (POPULARITY_DESC) para trazer os animes corretos
                    const response = await fetch('/api/ranking?status=RELEASING&perPage=50&sort=POPULARITY_DESC')
                    if (!response.ok) throw new Error('Falha ao buscar lançamentos globais.')
                    const json = await response.json()
                    media = json.data || []
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
                            nextAiringEpisode: m.nextAiringEpisode,
                            // `?? undefined` porque a struct Go manda `null` quando não há
                            // links; os consumidores só testam veracidade.
                            streaming: m.streaming ?? undefined,
                            is_favorite: entry?.is_favorite
                        })
                    }
                })

                setAnimes(animesComEpisodio)
            } catch {
                setError('Não foi possível carregar o calendário.')
            } finally {
                setLoading(false)
            }
        }

        carregarCalendario()
    }, [abaAtiva])

    useEffect(() => {
        const interval = setInterval(() => {
            setAgora(Math.floor(Date.now() / 1000))
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    const getDayLabel = (timestamp: number) => {
        const date = new Date(timestamp * 1000)

        // Data atual do usuário travada na meia-noite
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Data do episódio travada na meia-noite
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
            <div className="max-w-[900px] mx-auto px-5 pt-8 relative z-10">
                <div className="mb-8">
                    <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1 text-text select-none">
                        Calendário de Lançamentos
                    </h1>
                    <p className="text-muted text-sm select-none">
                        Próximos episódios da sua coleção ou do catálogo global — com contagem regressiva viva.
                    </p>
                </div>

                {/* 🟢 OPÇÃO C: Abas de controle no topo do calendário */}
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
                    groups.map((group) => {
                        let badgeColor = 'bg-panel border-line text-muted-2'
                        // Atualizando o Hoje para a cor coral para dar destaque de urgência
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

                                <div className="flex flex-col gap-3">
                                    {group.animes.map((anime, index) => {
                                        const gradClass = `card-g${(index % 5) + 1}`
                                        const streamUrl = anime.streaming ? anime.streaming.find(s => s.name.toLowerCase().includes('crunchyroll'))?.url || anime.streaming.find(s => s.name.toLowerCase().includes('netflix'))?.url || anime.streaming[0]?.url : null
                                        const remainingText = formatTimeRemaining(anime.nextAiringEpisode!.airingAt)
                                        const isLanchado = remainingText === 'Lançado!'

                                        return (
                                            <div key={anime.mal_id} className={`grid grid-cols-[44px_1fr_auto] md:grid-cols-[56px_1fr_auto_auto] gap-3 md:gap-5 items-center p-3 border rounded-xl transition-colors group ${anime.is_favorite ? 'bg-panel-2 border-gold/30 shadow-[0_0_10px_rgba(255,197,66,0.05)]' : 'bg-panel border-line hover:border-holo-2'}`}>

                                                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-lg flex-shrink-0 bg-cover bg-center border border-line ${gradClass}`} style={{ backgroundImage: `url(${anime.image_url})` }}></div>

                                                <div className="min-w-0">
                                                    <Link to={`/anime/${anime.mal_id}`} className="font-bold text-[13.5px] md:text-[14.5px] truncate block hover:text-holo-3 transition-colors">
                                                        {anime.title}
                                                    </Link>
                                                    <div className="flex items-center gap-2 font-mono text-[10px] md:text-[10.5px] text-muted-2 mt-1 select-none">
                                                        {anime.is_favorite && <span className="text-gold text-xs leading-none drop-shadow-md" title="Favorito">👑</span>}
                                                        {anime.genre && (
                                                            <span className={`px-1.5 py-0.5 rounded border font-bold font-manrope hidden md:inline-block ${getCategoryTheme(anime.genre)}`}>
                                                                {anime.genre}
                                                            </span>
                                                        )}
                                                        <span>EPISÓDIO {anime.nextAiringEpisode!.episode}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-5 text-right select-none">
                                                    <span className={`inline-flex items-center justify-center font-mono text-[10.5px] md:text-[11.5px] font-extrabold px-2.5 py-1 rounded-full border ${isLanchado ? 'bg-green/15 text-green border-green/30' : 'bg-holo-3/15 text-holo-3 border-holo-3/30'}`}>
                                                        {remainingText}
                                                    </span>
                                                    <span className="font-mono text-[12px] md:text-[13.5px] text-muted-2 hidden md:block">
                                                        {formatClock(anime.nextAiringEpisode!.airingAt)}
                                                    </span>
                                                </div>

                                                <div className="hidden md:flex ml-2">
                                                    {streamUrl ? (
                                                        <a href={streamUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border-[1.5px] border-line text-muted hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:text-white hover:border-transparent flex items-center justify-center transition-all cursor-pointer shadow-lg" title="Assistir Oficial">
                                                            <Play size={16} fill="currentColor" className="ml-0.5" />
                                                        </a>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full border-[1.5px] border-line/50 text-line flex items-center justify-center select-none" title="Sem streaming mapeado">
                                                            <Play size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}