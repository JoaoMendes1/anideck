import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, SlidersHorizontal, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem
} from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

export default function Rankings() {
    const navigate = useNavigate()
    const [animes, setAnimes] = useState<Anime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)
    const { showToast } = useToast()
    const [savingIds, setSavingIds] = useState<number[]>([]) // <-- Estado para controlar botões de loading individuais
    const [savedIds, setSavedIds]       = useState<number[]>([])


    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0)

        // Busca o deck do usuário ao carregar a página para acender os checks
    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (response.ok) {
                    const entradas = await response.json()
                    if (entradas && entradas.length > 0) {
                        const idsSalvos = entradas.map((e: any) => e.mal_id)
                        setSavedIds(idsSalvos)
                    }
                }
            } catch (err) {
                console.error('Falha ao sincronizar deck:', err)
            }
        }
        carregarDeck()
    }, [])

    // Reseta paginação quando filtros mudam
    useEffect(() => {
        setAnimes([])
        setPage(1)
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear])

    const fetchRanking = useCallback(async (currentPage: number, replace: boolean) => {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ page: String(currentPage), perPage: '20' })
        selectedFilters.forEach(f => params.append(f.type === 'genre' ? 'genre' : 'tag', f.value))
        if (selectedStatus) params.set('status', selectedStatus)
        if (selectedSeason) params.set('season', selectedSeason)
        // year só é relevante com season (regra da AniList)
        if (selectedSeason && selectedYear) params.set('year', selectedYear)

        try {
            const response = await fetch(`/api/ranking?${params.toString()}`)
            if (!response.ok) throw new Error('Ranking indisponível no momento.')
            const data = await response.json()
            const incoming: Anime[] = data.data || []
            setAnimes(prev => replace ? incoming : [...prev, ...incoming])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear])

    useEffect(() => {
        fetchRanking(page, page === 1)
    }, [page, fetchRanking])

  const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault()
        
        if (savingIds.includes(malId) || savedIds.includes(malId)) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }

        setSavingIds(prev => [...prev, malId])

        try {
            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
            })
            if (!res.ok) {
                // Caiu aqui, significa que a trava do banco (Unique) bloqueou a duplicidade.
                setSavedIds(prev => [...prev, malId])
                showToast('Este anime já estava no seu Deck!', 'error')
                throw new Error('Duplicado')
            }
            
            // Sucesso inédito
            setSavedIds(prev => [...prev, malId])
            showToast('Anime salvo no seu Deck!', 'success')
        } catch { 
            // Tratamento silencioso pois o Toast já foi disparado
        } finally {
            setSavingIds(prev => prev.filter(id => id !== malId))
        }
    }

    const toggleFilter = (f: FilterItem) =>
        setSelectedFilters(prev =>
            prev.some(x => x.value === f.value && x.type === f.type)
                ? prev.filter(x => !(x.value === f.value && x.type === f.type))
                : [...prev, f]
        )

    const clearFilters = () => {
        setSelectedFilters([])
        setSelectedStatus('')
        setSelectedSeason('')
        setSelectedYear('')
    }

    return (
        <div className="pb-20">
            <div className="max-w-[900px] mx-auto px-5 pt-10">
                <div className="mb-6">
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-2">// RANKING GLOBAL</p>
                    <h1 className="font-anton text-3xl md:text-4xl uppercase text-text mb-2">Os mais aclamados</h1>
                    <p className="text-muted text-sm">Direto da base pública da AniList — filtros aplicados no servidor.</p>
                </div>

                {/* Controles de filtro */}
                <div className="mb-6 space-y-3">
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${showFilters || activeFilterCount > 0
                                ? 'border-holo-2 text-holo-2 bg-holo-2/10'
                                : 'border-line text-muted bg-panel hover:border-holo-2 hover:text-holo-2'
                            }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-[10px] font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {showFilters && (
                        <div className="bg-panel border border-line rounded-2xl p-5 space-y-6">

                            {/* Status */}
                            <div>
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3">// STATUS</p>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedStatus(selectedStatus === opt.value ? '' : opt.value)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedStatus === opt.value
                                                    ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                                    : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Temporada + Ano */}
                            <div>
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3">// TEMPORADA</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {SEASON_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedSeason(selectedSeason === opt.value ? '' : opt.value)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSeason === opt.value
                                                    ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                                    : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                                }`}
                                        >
                                            {opt.emoji} {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {/* Ano — só relevante quando temporada está selecionada */}
                                {selectedSeason && (
                                    <div className="flex flex-wrap gap-2">
                                        {YEAR_OPTIONS.map(y => (
                                            <button
                                                key={y}
                                                onClick={() => setSelectedYear(selectedYear === String(y) ? '' : String(y))}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedYear === String(y)
                                                        ? 'bg-holo-3/20 border border-holo-3 text-holo-3'
                                                        : 'bg-panel-2 border border-line text-muted hover:border-holo-3 hover:text-text'
                                                    }`}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Categoria (gênero + tag) */}
                            <div>
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3">// CATEGORIA</p>
                                <div className="flex flex-wrap gap-2">
                                    {CONTENT_FILTERS.map(f => {
                                        const isActive = selectedFilters.some(x => x.value === f.value)
                                        return (
                                            <button
                                                key={`${f.type}-${f.value}`}
                                                onClick={() => toggleFilter(f)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
                                                        ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                                        : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                                    <X size={12} /> Limpar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Lista */}
                <div className="flex flex-col gap-3">
                    {animes.map((anime, index) => {
                        const rank = index + 1
                        let rankColor = 'text-muted-2'
                        if (rank === 1) rankColor = 'bg-gradient-to-b from-gold to-[#e08a1a] text-transparent bg-clip-text'
                        else if (rank === 2) rankColor = 'text-[#D9DDE6]'
                        else if (rank === 3) rankColor = 'text-[#C77B3E]'

                        return (
                           <Link
                                to={`/anime/${anime.mal_id}`}
                                key={`${anime.mal_id}-${index}`}
                                // Corrigido o grid mobile para caber o botão (24px_44px_1fr_auto_auto)
                                className="grid grid-cols-[24px_44px_1fr_auto_auto] md:grid-cols-[36px_56px_1fr_auto_auto] gap-2 md:gap-4 items-center p-3 bg-panel border border-line rounded-xl hover:border-holo-2 transition-colors group"
                            >
                                <span className={`font-anton text-lg md:text-xl text-center ${rankColor}`}>
                                    {rank < 10 ? `0${rank}` : rank}
                                </span>
                                <img src={anime.images?.jpg?.image_url} alt={anime.title} className="w-11 h-11 md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line" />
                                <div className="min-w-0">
                                    <div className="font-bold text-sm md:text-[14.5px] truncate">{anime.title}</div>
                                    <div className="font-mono text-[10px] md:text-[10.5px] text-muted-2 mt-1">{anime.status} • {anime.episodes || '?'} EP</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-anton text-sm md:text-base text-gold">★ {anime.score || 'N/A'}</div>
                                    <span className="font-mono text-[9px] text-muted-2 hidden md:block">NOTA</span>
                                </div>
                                
                                {/* Removido o hidden md:flex e adicionada a lógica de Check visual */}
                                <button 
                                    onClick={(e) => handleSalvar(e, anime.mal_id)} 
                                    disabled={savingIds.includes(anime.mal_id) || savedIds.includes(anime.mal_id)}
                                    className={`flex w-8 h-8 rounded-full border-[1.5px] items-center justify-center font-bold text-lg transition-colors z-10 ${
                                        savedIds.includes(anime.mal_id)
                                            ? 'bg-green/20 border-green text-green cursor-default'
                                            : 'border-line bg-transparent text-muted group-hover:border-holo-3 group-hover:text-holo-3 cursor-pointer'
                                    }`}
                                >
                                    {savingIds.includes(anime.mal_id) ? (
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : savedIds.includes(anime.mal_id) ? (
                                        <Check size={16} strokeWidth={3} />
                                    ) : (
                                        '+'
                                    )}
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

                {!loading && !error && animes.length === 0 && activeFilterCount > 0 && (
                    <div className="text-center py-16">
                        <p className="font-anton uppercase text-text text-xl mb-2">Nenhum resultado</p>
                        <p className="text-sm text-muted mb-4">Nenhum anime encontrado com esses filtros.</p>
                        <button onClick={clearFilters} className="px-4 py-2 rounded-full border border-coral text-coral text-sm font-bold hover:bg-coral/10 transition-colors cursor-pointer">
                            Limpar filtros
                        </button>
                    </div>
                )}

                {!loading && !error && animes.length > 0 && (
                    <button onClick={() => setPage(p => p + 1)} className="block mx-auto mt-8 mb-10 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer">
                        Carregar mais
                    </button>
                )}
            </div>
        </div>
    )
}
