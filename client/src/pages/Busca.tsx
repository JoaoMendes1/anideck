import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { Link, useNavigate } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X, Check, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem, getCategoryTheme
} from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    episodes?: number
    score?: number
    images?: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface SavedEntry {
    mal_id: number
    id: string
    is_favorite?: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

const SORT_OPTIONS = [
    { label: 'Mais Populares', value: 'POPULARITY_DESC' },
    { label: 'Em Alta', value: 'TRENDING_DESC' },
    { label: 'Maior Nota', value: 'SCORE_DESC' },
    { label: 'Lançamentos', value: 'START_DATE_DESC' },
]

export default function Busca() {
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [query, setQuery] = useState('')
    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC') 
    const [page, setPage] = useState(1) 

    const [resultados, setResultados] = useState<Anime[]>([])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [savingIds, setSavingIds] = useState<number[]>([]) 
    
    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0) +
        (selectedSort !== 'POPULARITY_DESC' ? 1 : 0)

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
                        const idsSalvos = entradas.map((e: any) => ({ mal_id: e.mal_id, id: e.id, is_favorite: e.is_favorite }))
                        setSavedEntries(idsSalvos)
                    }
                }
            } catch (err) {
                console.error('Falha ao sincronizar deck:', err)
            }
        }
        carregarDeck()
    }, [])

    const hasAnyFilter =
        query.trim() !== '' ||
        selectedFilters.length > 0 ||
        !!selectedStatus ||
        !!selectedSeason

    useEffect(() => {
        if (!hasAnyFilter) {
            setResultados([])
            setHasSearched(false)
            setError(null)
            return
        }

        const controller = new AbortController()

        const timer = setTimeout(async () => {
            setLoading(true)
            setHasSearched(true)
            setError(null)

            const params = new URLSearchParams()
            if (query.trim()) params.append('q', query.trim())
            selectedFilters.forEach(f => params.append(f.type === 'genre' ? 'genre' : 'tag', f.value))
            if (selectedStatus) params.set('status', selectedStatus)
            if (selectedSeason) {
                params.set('season', selectedSeason)
                if (selectedYear) params.set('year', selectedYear)
            }
            params.append('sort', selectedSort)
            params.append('page', String(page)) 
            params.append('perPage', '40') 

            try {
                const response = await fetch(`/api/search?${params.toString()}`, {
                    signal: controller.signal
                })

                if (!response.ok) throw new Error('Busca indisponível no momento. Tente novamente mais tarde.')
                const data = await response.json()
                
                setResultados(prev => page === 1 ? (data.data || []) : [...prev, ...(data.data || [])])

            } catch (err: any) {
                if (err.name === 'AbortError') return
                if (page === 1) setResultados([])
                setError(err.message || 'Falha ao conectar com o servidor.')
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }, 400)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query, selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort, page, hasAnyFilter])

    const handleSalvar = async (e: React.MouseEvent, malId: number) => {
        e.preventDefault()
        if (savingIds.includes(malId)) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }

        setSavingIds(prev => [...prev, malId])
        
        const entrySalva = savedEntries.find(e => e.mal_id === malId)

        try {
            if (entrySalva) {
                const res = await fetch(`/api/entries/${entrySalva.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                if (!res.ok) throw new Error()
                setSavedEntries(prev => prev.filter(e => e.mal_id !== malId))
                showToast('Removido do Deck', 'success')
            } else {
                const res = await fetch('/api/entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
                })
                if (!res.ok) throw new Error()
                const novaEntrada = await res.json()
                setSavedEntries(prev => [...prev, { mal_id: malId, id: novaEntrada.id || novaEntrada[0]?.id, is_favorite: false }])
                showToast('Anime salvo no seu Deck!', 'success')
            }
        } catch { 
            showToast('Erro ao processar. Tente novamente.', 'error')
        } finally {
            setSavingIds(prev => prev.filter(id => id !== malId))
        }
    }

    const toggleFilter = (f: FilterItem) => {
        setPage(1)
        setSelectedFilters(prev =>
            prev.some(x => x.value === f.value && x.type === f.type)
                ? prev.filter(x => !(x.value === f.value && x.type === f.type))
                : [...prev, f]
        )
    }

    const clearFilters = () => {
        setSelectedFilters([])
        setSelectedStatus('')
        setSelectedSeason('')
        setSelectedYear('')
        setSelectedSort('POPULARITY_DESC')
        setPage(1)
    }

    const traduzirStatus = (statusOriginal: string) => {
        if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
        if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
        if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
        return statusOriginal
    }

    return (
        <div className="w-full min-w-0 max-w-[960px] mx-auto pt-16 px-5 pb-10">

            <div className="flex items-center gap-3 bg-panel border-2 border-holo-2 rounded-xl p-4 mb-4">
                <Search className="text-muted-2 shrink-0" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Buscar anime, gênero, estúdio..."
                    className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
                />
            </div>

            <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide select-none">
                <button
                    onClick={() => setShowFilters(v => !v)}
                    title="Filtros"
                    className={`inline-flex items-center shrink-0 gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${showFilters || activeFilterCount > 0
                            ? 'border-holo-2 text-holo-2 bg-holo-2/10'
                            : 'border-line text-muted bg-panel hover:border-holo-2 hover:text-holo-2'
                        }`}
                >
                    <SlidersHorizontal size={16} />
                    {activeFilterCount > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-[10px] font-black">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => { setSelectedStatus(selectedStatus === 'RELEASING' ? '' : 'RELEASING'); setPage(1); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
                        selectedStatus === 'RELEASING'
                            ? 'bg-coral/20 border-coral text-coral shadow-[0_0_10px_rgba(255,92,108,0.2)]'
                            : 'bg-panel-2 border-line text-muted hover:border-coral hover:text-text'
                    }`}
                >
                    🔥 Em Lançamento
                </button>

                {['Ação', 'Romance', 'Comédia', 'Fantasia', 'Isekai'].map(cat => {
                    const filterObj = CONTENT_FILTERS.find(f => f.label === cat)
                    if (!filterObj) return null;
                    const isActive = selectedFilters.some(x => x.value === filterObj.value)
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleFilter(filterObj)}
                            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${isActive
                                    ? `${getCategoryTheme(cat)} shadow-[0_0_10px_currentColor]`
                                    : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                }`}
                        >
                            {cat}
                        </button>
                    )
                })}

                {!showFilters && activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-nowrap shrink-0 border-l border-line pl-3">
                        {selectedSort !== 'POPULARITY_DESC' && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-[11px] font-bold">
                                {SORT_OPTIONS.find(s => s.value === selectedSort)?.label}
                                <button onClick={() => { setSelectedSort('POPULARITY_DESC'); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedFilters.filter(f => !['Ação', 'Romance', 'Comédia', 'Fantasia', 'Isekai'].includes(f.label)).map(f => (
                            <span key={`${f.type}-${f.value}`} className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-2 text-[11px] font-bold">
                                {f.label}
                                <button onClick={() => toggleFilter(f)} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        ))}
                        {selectedStatus && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-3/20 border border-holo-3/40 text-holo-3 text-[11px] font-bold">
                                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                <button onClick={() => { setSelectedStatus(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedSeason && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-1/20 border border-holo-1/40 text-holo-1 text-[11px] font-bold">
                                {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.emoji} {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
                                <button onClick={() => { setSelectedSeason(''); setSelectedYear(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className={`fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none md:relative md:inset-auto md:z-auto md:block transition-all duration-300 select-none ${
                showFilters ? 'opacity-100' : 'opacity-0 md:opacity-100 md:hidden'
            }`}>
                <div 
                    className={`absolute inset-0 bg-void/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                    onClick={() => setShowFilters(false)}
                />
                
                <div className={`relative bg-panel md:bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl p-6 pb-safe md:pb-6 space-y-6 transition-transform duration-300 transform md:transform-none max-h-[85vh] overflow-y-auto ${
                    showFilters ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:translate-y-0 md:pointer-events-auto'
                } mb-0 md:mb-6`}>
                    
                    <div className="flex justify-between items-center md:hidden mb-2">
                        <h3 className="font-anton text-lg uppercase text-text">Filtros Avançados</h3>
                        <button onClick={() => setShowFilters(false)} className="text-muted hover:text-text cursor-pointer p-1"><X size={20} /></button>
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">ORDENAR POR</p>
                        <div className="flex flex-wrap gap-2">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedSort(opt.value); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSort === opt.value
                                            ? 'bg-gold/20 text-gold border border-gold/40 shadow-[0_0_12px_rgba(255,197,66,0.2)]'
                                            : 'bg-panel-2 border border-line text-muted hover:border-gold hover:text-text'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">STATUS DE LANÇAMENTO</p>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedStatus(selectedStatus === opt.value ? '' : opt.value); setPage(1); }}
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

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">TEMPORADA E ANO</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {SEASON_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedSeason(selectedSeason === opt.value ? '' : opt.value); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSeason === opt.value
                                            ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                            : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                        }`}
                                >
                                    {opt.emoji} {opt.label}
                                </button>
                            ))}
                        </div>
                        {selectedSeason && (
                            <div className="flex flex-wrap gap-2">
                                {YEAR_OPTIONS.map(y => (
                                    <button
                                        key={y}
                                        onClick={() => { setSelectedYear(selectedYear === String(y) ? '' : String(y)); setPage(1); }}
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

                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">GÊNEROS E TAGS</p>
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
                        <button onClick={clearFilters} className="flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 cursor-pointer">
                            <X size={12} /> Limpar todos os filtros
                        </button>
                    )}
                </div>
            </div>

            {loading && page === 1 && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">CARREGANDO CATÁLOGO...</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                            <div key={n} className="aspect-[2/3] rounded-xl shimmer border border-line" />
                        ))}
                    </div>
                </>
            )}

            {!loading && error && page === 1 && (
                <div className="text-center py-16 text-coral select-none">
                    <AlertCircle className="mx-auto mb-4 opacity-80" size={34} />
                    <h3 className="font-anton uppercase text-xl mb-2">Ops, problema de conexão</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!error && hasSearched && resultados.length > 0 && (
                <>
                    {page === 1 && <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">RESULTADOS DA BUSCA</p>}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {resultados.map((anime, index) => {
                            const gradClass = `card-g${(index % 5) + 1}`
                            const savedEntry = savedEntries.find(e => e.mal_id === anime.mal_id)
                            const isSaved = !!savedEntry
                            const isFoil = savedEntry?.is_favorite
                            
                            return (
                                <Link 
                                    to={`/anime/${anime.mal_id}`} 
                                    key={`${anime.mal_id}-${index}`} 
                                    className={`relative aspect-[2/3] rounded-xl overflow-hidden border flex flex-col justify-end p-3 group block transition-transform hover:-translate-y-1 ${
                                        isFoil ? 'foil-card border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' : `border-line ${gradClass}`
                                    }`}
                                >
                                    {anime.images?.jpg?.image_url && (
                                        <img src={anime.images.jpg.image_url} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500 opacity-80" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-void/95 via-void/40 to-transparent z-10" />
                                    
                                    <span className={`absolute top-2.5 left-2.5 z-20 text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border bg-void/50 text-holo-3 border-holo-3/50 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] select-none`}>
                                        {traduzirStatus(anime.status)}
                                    </span>

                                    <button 
                                        onClick={(e) => handleSalvar(e, anime.mal_id)} 
                                        disabled={savingIds.includes(anime.mal_id)}
                                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center font-bold backdrop-blur-sm transition-all z-30 select-none shadow-lg ${
                                            isSaved
                                                ? 'bg-green/20 border-green text-green hover:bg-coral/20 hover:border-coral hover:text-coral cursor-pointer'
                                                : 'bg-void/70 border-white/40 text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent cursor-pointer'
                                        }`}
                                    >
                                        {savingIds.includes(anime.mal_id) ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        ) : isSaved ? (
                                            <>
                                                <span className="hover:hidden flex items-center justify-center"><Check size={16} strokeWidth={3} /></span>
                                                <span className="hidden hover:flex items-center justify-center text-[15px]">×</span>
                                            </>
                                        ) : (
                                            '+'
                                        )}
                                    </button>
                                    
                                    <div className="relative z-20 mt-auto flex flex-col pointer-events-none select-none w-full min-h-[75px] justify-end">
                                        <div className="font-anton text-[13px] md:text-[14px] leading-tight mb-2 drop-shadow-md text-white overflow-hidden text-ellipsis line-clamp-2 break-words" title={anime.title}>
                                            {isFoil && <span className="text-gold mr-1" title="Favorito">👑</span>}
                                            {anime.title}
                                        </div>

                                        <div className="flex flex-wrap justify-between items-end gap-1.5 mt-auto">
                                            <div className="flex flex-col gap-1 shrink-0 max-w-[50%]">
                                                {anime.genres?.slice(0, 1).map(g => (
                                                    <span key={g.name} className={`backdrop-blur-sm border text-[9px] px-1.5 py-0.5 rounded font-bold truncate max-w-full ${getCategoryTheme(g.name)}`}>
                                                        {g.name}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 max-w-[100%] ml-auto pt-1">
                                                <div className="flex items-center gap-1">
                                                    <Star className="text-gold fill-gold" size={10} />
                                                    <span className="font-anton text-[11px] sm:text-[12px] text-gold">{anime.score || 'N/A'}</span>
                                                </div>
                                                <span className="font-mono text-[9px] text-muted-2 font-bold uppercase tracking-wider ml-1">
                                                    {anime.episodes ? `${anime.episodes} EP` : '? EP'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    {!loading && resultados.length >= 20 && (
                        <button 
                            onClick={() => setPage(p => p + 1)} 
                            className="select-none block mx-auto mt-8 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer"
                        >
                            Carregar mais
                        </button>
                    )}
                    
                    {loading && page > 1 && (
                        <div className="py-8 text-center">
                            <div className="inline-block w-6 h-6 rounded-full border-4 border-line border-t-holo-3 animate-spin"></div>
                        </div>
                    )}
                </>
            )}

            {!loading && !error && hasSearched && resultados.length === 0 && page === 1 && (
                <div className="text-center py-16 text-muted select-none">
                    <Search className="mx-auto mb-4 text-muted-2" size={34} />
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Nada encontrado</h3>
                    <p className="text-sm">Tente outros termos ou ajuste os filtros.</p>
                </div>
            )}

            {!loading && !error && !hasSearched && (
                <div className="text-center py-16 select-none">
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Descubra novos animes</h3>
                    <p className="text-sm text-muted">Busque por título, selecione uma categoria ou filtre por temporada.</p>
                </div>
            )}
        </div>
    )
}