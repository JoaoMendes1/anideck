import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EditarEntradaModal from '../components/EditarEntradaModal'
import { Play, CheckCircle2, Bookmark, MonitorPlay, Star, XCircle } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'

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

export default function MeuDeck() {
    const [entradas, setEntradas] = useState<Entrada[]>([])
    const [animesData, setAnimesData] = useState<Record<number, HydratedAnime>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editando, setEditando] = useState<Entrada | null>(null)
    const [filtroAtivo, setFiltroAtivo] = useState('Todos')
    const [userName, setUserName] = useState('Usuário')

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

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
                        headers: {  'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: malIds})
                    })

                    const apiJson = await apiResponse.json()
                    const media = apiJson.data || []

                    const mapaAnimes: Record<number, HydratedAnime> = {}
                    media.forEach((m: any) => {
                        mapaAnimes[m.mal_id] = {
                            mal_id: m.mal_id,
                            title: m.title || 'Título Desconhecido',
                            image_url: m.images?.jpg?.image_url || '',
                            genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined,
                            ranking: m.ranking, 
                            nextAiringEpisode: m.nextAiringEpisode, 
                            streaming: m.streaming 
                        }
                    })
                    setAnimesData(mapaAnimes)
                }
            } catch (err) {
                setError('Não foi possível carregar seu deck. Tente novamente.')
            } finally {
                setLoading(false)
            }
        }

        carregarDeck()
    }, [])

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

    const getStatusTheme = (status: string) => {
        switch(status) {
            case 'Assistindo': return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-3 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-3/50' }
            case 'Em Dia': return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-green drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-green/50' }
            case 'Completo': return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-gold/50' }
            case 'Quero Assistir': return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-holo-1 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-holo-1/50' }
            case 'Dropado': return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-coral drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-coral/50' }
            default: return { bg: 'bg-void/50 backdrop-blur-sm', text: 'text-muted-2 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]', border: 'border-muted-2/50' }
        }
    }

    if (loading) return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-2 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">CARREGANDO DECK...</p>
      </div>
    )

    if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

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
                    <Link to="/descobrir" className="font-extrabold text-[13.5px] px-6 py-3 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform select-none">
                        <Play size={14} fill="currentColor" />
                        Buscar Anime
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-10 select-none">
                    <div className="bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] border-t-holo-3 relative overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-holo-3/20 text-holo-3 flex items-center justify-center mb-2"><MonitorPlay size={14} /></div>
                        <b className="block font-anton text-2xl mb-0.5">{stats.assistindo}</b>
                        <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider">Assistindo</span>
                    </div>
                    <div className="bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] border-t-green relative overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-green/20 text-green flex items-center justify-center mb-2"><Bookmark size={14} /></div>
                        <b className="block font-anton text-2xl mb-0.5">{stats.emDia}</b>
                        <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider">Em Dia</span>
                    </div>
                    <div className="bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] border-t-gold relative overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center mb-2"><CheckCircle2 size={14} /></div>
                        <b className="block font-anton text-2xl mb-0.5">{stats.concluidos}</b>
                        <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider">Completos</span>
                    </div>
                    <div className="bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] border-t-coral relative overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-coral/20 text-coral flex items-center justify-center mb-2"><XCircle size={14} /></div>
                        <b className="block font-anton text-2xl mb-0.5">{stats.dropados}</b>
                        <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider">Dropados</span>
                    </div>
                    <div className="bg-panel border border-line rounded-[14px] p-4 md:p-[18px] border-t-[3px] border-t-holo-1 relative overflow-hidden md:col-span-1 col-span-2">
                        <div className="w-7 h-7 rounded-lg bg-holo-1/20 text-holo-1 flex items-center justify-center mb-2"><Star size={14} /></div>
                        <b className="block font-anton text-2xl mb-0.5">{stats.notaMedia}</b>
                        <span className="text-[11px] text-muted-2 font-bold uppercase tracking-wider">Sua Nota Média</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-5 select-none">
                    <h2 className="font-anton text-[17px] uppercase m-0">Meu Deck</h2>
                </div>

                <div className="flex gap-2 flex-wrap mb-7 select-none">
                    {['Todos', 'Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFiltroAtivo(tab)}
                            className={`text-[13px] font-bold px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                                filtroAtivo === tab
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
                        {entradasOrdenadas.map((entrada, index) => {
                            const animeLocal = animesData[entrada.mal_id]
                            const gradClass = `card-g${(index % 5) + 1}`
                            const temaStatus = getStatusTheme(entrada.status)
                            
                            const isFoil = entrada.is_favorite

                            const acabouDeLancar = animeLocal?.nextAiringEpisode && animeLocal.nextAiringEpisode.timeUntilAiring > 518400 
                            
                            let lancaHoje = false
                            let lancaAmanha = false
                            
                            if (animeLocal?.nextAiringEpisode) {
                                const dataEpisodio = new Date(animeLocal.nextAiringEpisode.airingAt * 1000)
                                const dataHoje = new Date()
                                
                                dataHoje.setHours(0, 0, 0, 0)
                                const dataEpisodioMeiaNoite = new Date(dataEpisodio)
                                dataEpisodioMeiaNoite.setHours(0, 0, 0, 0)
                                
                                const diffTime = dataEpisodioMeiaNoite.getTime() - dataHoje.getTime()
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

                                if (diffDays === 0) lancaHoje = true
                                if (diffDays === 1) lancaAmanha = true
                            }

                            return (
                                <div
                                    key={entrada.id}
                                    className={`relative aspect-[3/4.2] rounded-[14px] overflow-hidden p-3 flex flex-col justify-end border transition-transform hover:-translate-y-1 group ${
                                        isFoil ? 'foil-card border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' : `border-line bg-panel ${gradClass}`
                                    }`}
                                >
                                    <Link to={`/anime/${entrada.mal_id}`} className="absolute inset-0 z-10"></Link>

                                    {animeLocal?.image_url && (
                                        <img src={animeLocal.image_url} alt={animeLocal.title} className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent z-0 opacity-90" />
                                    
                                    <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 items-start pointer-events-none">
                                        <span className={`select-none text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider border backdrop-blur-md ${temaStatus.bg} ${temaStatus.text} ${temaStatus.border}`}>
                                            {entrada.status}
                                        </span>
                                        {(entrada.status === 'Assistindo' || entrada.status === 'Em Dia') && (
                                            <>
                                                {acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-coral text-white shadow-[0_0_10px_rgba(255,92,108,0.5)] uppercase tracking-widest">Novo EP</span>}
                                                {lancaHoje && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-holo-3 text-void shadow-[0_0_10px_rgba(63,224,240,0.5)] uppercase tracking-widest">Hoje</span>}
                                                {lancaAmanha && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-gold text-void shadow-[0_0_10px_rgba(255,197,66,0.5)] uppercase tracking-widest">Amanhã</span>}
                                            </>
                                        )}
                                    </div>

                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditando(entrada); }}
                                        className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-void/80 border border-line text-muted hover:text-holo-3 hover:border-holo-3 flex items-center justify-center backdrop-blur-md cursor-pointer transition-all shadow-lg opacity-70 md:opacity-0 group-hover:opacity-100"
                                        title="Editar entrada"
                                    >
                                        ✎
                                    </button>
                                    
                                    <div className="relative z-20 mt-auto flex flex-col pointer-events-none select-none w-full justify-end">
                                        {/* CORREÇÃO AQUI: Remoção do min-h-[36px] para assentar o texto */}
                                        <h3 className="font-anton text-[13px] md:text-[14px] uppercase leading-tight mb-2 text-white drop-shadow-md line-clamp-2 break-words" title={animeLocal?.title || `ID: ${entrada.mal_id}`}>
                                            {isFoil && <span className="text-gold mr-1 inline-block -translate-y-[1px]" title="Favorito">👑</span>}
                                            {animeLocal?.title || `ID: ${entrada.mal_id}`}
                                        </h3>
                                        
                                        <div className="flex justify-between items-end gap-2">
                                            <div className="flex-1 min-w-0">
                                                {animeLocal?.genre && (
                                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm truncate max-w-full ${getCategoryTheme(animeLocal.genre)}`}>
                                                        {animeLocal.genre}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {animeLocal?.ranking && (
                                                    <div className="font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border bg-panel-2/90 text-holo-3 border-holo-3/40 shadow-[0_0_8px_rgba(63,224,240,0.15)] flex items-center gap-1" title={`#${animeLocal.ranking} no mundo`}>
                                                        🏆 #{animeLocal.ranking}
                                                    </div>
                                                )}
                                                <div className={`font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border ${entrada.nota !== null && entrada.nota !== undefined ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                                                    {entrada.nota !== null && entrada.nota !== undefined ? `★ ${entrada.nota}` : 'S/N'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {editando && (
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
                )}
            </div>
        </div>
    )
}