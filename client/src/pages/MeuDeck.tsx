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
    nota?: number
    anotacao?: string
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
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
                // 1. Pega os IDs e status salvos no nosso banco
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (!response.ok) throw new Error('Não foi possível carregar seu deck.')
                const dadosDeck: Entrada[] = await response.json()
                setEntradas(dadosDeck || [])

                if (dadosDeck && dadosDeck.length > 0) {
                    
                    // 2. Busca a lista de nomes customizados (Curadoria Admin) para aplicar por cima
                    let curadoria: any[] = []
                    try {
                        const resCur = await fetch('/api/curation')
                        if (resCur.ok) curadoria = await resCur.json()
                    } catch (e) {
                        console.warn('Aviso: falha ao buscar curadoria', e)
                    }
                    const mapaCuradoria: Record<number, string> = {}
                    curadoria.forEach(c => { mapaCuradoria[c.mal_id] = c.custom_title })

                    // 3. Hidratação Ligeira: Busca todos os pôsteres da AniList de uma vez só
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
                            title: mapaCuradoria[m.mal_id] || m.title || 'Título Desconhecido',
                            image_url: m.images?.jpg?.image_url || '',
                            // Salva a primeira categoria do array
                            genre: m.genres && m.genres.length > 0 ? m.genres[0].name : undefined
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

    // 🟢 Lógica de Estatísticas Rápidas ATUALIZADA (Inclui Dropados)
    const stats = useMemo(() => {
        let assistindo = 0, emDia = 0, concluidos = 0, dropados = 0, somaNotas = 0, qtdNotas = 0;
        
        entradas.forEach(e => {
            if (e.status === 'Assistindo') assistindo++;
            if (e.status === 'Em Dia') emDia++;
            if (e.status === 'Completo' || e.status === 'Finalizado') concluidos++;
            if (e.status === 'Dropado') dropados++; // <-- Adicionado aqui
            if (e.nota && e.nota > 0) {
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

    // Filtro da lista
    const entradasFiltradas = entradas.filter(e => filtroAtivo === 'Todos' || e.status === filtroAtivo)

    // Helpers de visual para os Cards
    const getStatusTheme = (status: string) => {
        switch(status) {
            case 'Assistindo': return { bg: 'bg-holo-3/20', text: 'text-holo-3', border: 'border-holo-3/40' }
            case 'Em Dia': return { bg: 'bg-green/20', text: 'text-green', border: 'border-green/40' }
            case 'Completo': return { bg: 'bg-gold/20', text: 'text-gold', border: 'border-gold/40' }
            case 'Quero Assistir': return { bg: 'bg-holo-1/20', text: 'text-holo-1', border: 'border-holo-1/40' }
            case 'Dropado': return { bg: 'bg-coral/20', text: 'text-coral', border: 'border-coral/40' }
            default: return { bg: 'bg-muted-2/20', text: 'text-muted-2', border: 'border-muted-2/40' }
        }
    }

    if (loading) return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-2 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">// MONTANDO SEU DECK...</p>
      </div>
    )

    if (error) return <div className="p-10 text-center text-coral font-mono text-sm">{error}</div>

    return (
        <div className="pb-20">
            {/* O bg-ambient já é importado globalmente no index.css, mas garantimos que o container fique por cima */}
            <div className="max-w-[1180px] mx-auto px-5 pt-8 relative z-10">
                
                {/* HEADER DA PÁGINA */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
                    <div>
                        <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1">
                            Bem-vindo de volta, <span className="bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-transparent bg-clip-text">{userName}</span>
                        </h1>
                        <p className="text-muted text-sm">Aqui está o que está rolando na sua coleção.</p>
                    </div>
                    <Link to="/" className="font-extrabold text-[13.5px] px-6 py-3 rounded-full text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        <Play size={14} fill="currentColor" />
                        Buscar Anime
                    </Link>
                </div>

                {/* 🟢 QUICK STATS (Agora com 5 colunas no Desktop) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-10">
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

                {/* SESSÃO DECK */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-anton text-[17px] uppercase m-0">Meu Deck</h2>
                </div>

                {/* TABS DE FILTRO */}
                <div className="flex gap-2 flex-wrap mb-7">
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

                {/* GRID DE CARDS */}
                {entradasFiltradas.length === 0 ? (
                    <div className="text-center py-16 bg-panel border border-line rounded-2xl">
                        <Bookmark className="mx-auto mb-4 text-muted-2" size={32} />
                        <h3 className="font-anton uppercase text-text text-lg mb-1">Lista Vazia</h3>
                        <p className="text-sm text-muted">Nenhum anime encontrado com este status.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {entradasFiltradas.map((entrada, index) => {
                            const animeLocal = animesData[entrada.mal_id]
                            const gradClass = `card-g${(index % 5) + 1}`
                            const temaStatus = getStatusTheme(entrada.status)

                            return (
                                <div
                                    key={entrada.id}
                                    onClick={() => setEditando(entrada)}
                                    className={`relative aspect-[3/4.2] rounded-[14px] overflow-hidden p-3 md:p-3.5 flex flex-col justify-end border border-line cursor-pointer transition-transform hover:-translate-y-1 bg-panel ${gradClass} group`}
                                >
                                    {animeLocal?.image_url && (
                                        <img src={animeLocal.image_url} alt={animeLocal.title} className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-void/95 via-void/40 to-transparent z-10" />
                                    
                                    <span className={`absolute top-2.5 left-2.5 z-30 text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border ${temaStatus.bg} ${temaStatus.text} ${temaStatus.border}`}>
                                        {entrada.status}
                                    </span>
                                    
                                    <div className="relative z-20 mt-auto">
                                        <div className="font-anton text-[12px] sm:text-[13.5px] uppercase leading-tight mb-2 truncate text-white drop-shadow-md">
                                            {animeLocal?.title || `ID: ${entrada.mal_id}`}
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col gap-1">
                                                {animeLocal?.genre && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border w-fit backdrop-blur-sm ${getCategoryTheme(animeLocal.genre)}`}>
                                                        {animeLocal.genre}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Destaque maior na nota */}
                                            <div className={`font-anton text-[12px] sm:text-[14px] px-2 py-0.5 rounded-md backdrop-blur-sm border ${entrada.nota ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                                                {entrada.nota ? `★ ${entrada.nota}` : 'S/N'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* MODAL DE EDIÇÃO */}
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