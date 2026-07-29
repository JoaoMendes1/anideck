import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
}

export default function Rankings() {
    const navigate = useNavigate()
    const [animes, setAnimes] = useState<Anime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1) // Controle de paginação 

    // Busca os dados sempre que a 'page' mudar
    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await fetch(`/api/ranking?page=${page}`)
                if (!response.ok) throw new Error('Ranking indisponível no momento.')
                const data = await response.json()

                // Se for a página 1, substitui a lista. Se não, concatena (junta) os animes novos com os antigos.
                if (page === 1) {
                    setAnimes(data.data || [])
                } else {
                    setAnimes(prev => [...prev, ...(data.data || [])])
                }
            } catch (err: any) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchRanking()
    }, [page])

    const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            navigate('/login')
            return
        }

        try {
            const response = await fetch('/api/entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
            })
            if (!response.ok) throw new Error('Falha ao salvar')
            alert('Salvo na sua lista!!')
        } catch (err) {
            console.error(err)
            alert('Erro ao salvar. Tente novamente!!')
        }
    }

    return (
        <div className="pb-20">
            {/* Navbar Minimalista */}
            <nav className="sticky top-0 z-50 bg-void/90 backdrop-blur-md border-b border-line px-5 py-3">
                <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-text transition-colors text-sm font-bold">
                    <ChevronLeft size={18} /> Voltar para Busca
                </Link>
            </nav>

            <div className="max-w-[900px] mx-auto px-5 pt-10">
                <div className="mb-8">
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-2">// RANKING GLOBAL</p>
                    <h1 className="font-anton text-3xl md:text-4xl uppercase text-text mb-2">Mais assistidos agora</h1>
                    <p className="text-muted text-sm">Direto da base pública da AniList — sem enfeite, só o que a comunidade mundial está aclamando.</p>
                </div>

                {/* Abas (Mockadas por enquanto, daremos vida a elas nas próximas tarefas da Issue #10) */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    <button className="flex-shrink-0 text-[13px] font-bold px-4 py-2 rounded-full border border-transparent bg-gradient-to-r from-holo-1 to-holo-2 text-void">
                        Melhor Nota
                    </button>
                    <button className="flex-shrink-0 text-[13px] font-bold px-4 py-2 rounded-full border border-line bg-panel text-muted opacity-50 cursor-not-allowed">
                        Filtros de Streaming e Gênero (Em breve)
                    </button>
                </div>

                {/* Lista do Ranking */}
                <div className="flex flex-col gap-3">
                    {animes.map((anime, index) => {
                        const rank = index + 1

                        // Cores especiais para o Top 3 baseadas no DESIGN_TOKENS.md
                        let rankColor = "text-muted-2"
                        if (rank === 1) rankColor = "bg-gradient-to-b from-gold to-[#e08a1a] text-transparent bg-clip-text"
                        else if (rank === 2) rankColor = "text-[#D9DDE6]" // Prata
                        else if (rank === 3) rankColor = "text-[#C77B3E]" // Bronze

                        return (
                            <Link
                                to={`/anime/${anime.mal_id}`}
                                key={`${anime.mal_id}-${index}`}
                                className="grid grid-cols-[28px_44px_1fr_auto] md:grid-cols-[36px_56px_1fr_auto_auto] gap-3 md:gap-4 items-center p-3 bg-panel border border-line rounded-xl hover:border-holo-2 transition-colors group"
                            >
                                <span className={`font-anton text-lg md:text-xl text-center ${rankColor}`}>
                                    {rank < 10 ? `0${rank}` : rank}
                                </span>

                                <img
                                    src={anime.images?.jpg?.image_url}
                                    alt={anime.title}
                                    className="w-11 h-11 md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line"
                                />

                                <div className="min-w-0">
                                    <div className="font-bold text-sm md:text-[14.5px] truncate">{anime.title}</div>
                                    <div className="font-mono text-[10px] md:text-[10.5px] text-muted-2 mt-1 truncate">
                                        {anime.status} • {anime.episodes || '?'} EP
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-anton text-sm md:text-base text-gold leading-tight">★ {anime.score || 'N/A'}</div>
                                    <span className="font-mono text-[9px] text-muted-2 hidden md:block">NOTA</span>
                                </div>

                                <button
                                    onClick={(e) => handleSalvar(e, anime.mal_id)}
                                    className="hidden md:flex w-8 h-8 rounded-full border-[1.5px] border-line bg-transparent text-muted items-center justify-center font-bold text-lg group-hover:border-holo-3 group-hover:text-holo-3 transition-colors z-10"
                                >
                                    +
                                </button>
                            </Link>
                        )
                    })}
                </div>

                {loading && (
                    <div className="py-10 text-center">
                        <div className="inline-block w-8 h-8 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-2"></div>
                        <p className="font-mono text-muted text-xs tracking-widest">// CARREGANDO...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-10 text-coral">
                        <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && animes.length > 0 && (
                    <button
                        onClick={() => setPage(p => p + 1)}
                        className="block mx-auto mt-8 mb-10 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer"
                    >
                        Carregar mais
                    </button>
                )}
            </div>
        </div>
    )
}



