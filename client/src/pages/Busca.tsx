import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import { Link, useNavigate } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X, Check } from 'lucide-react'
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

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

export default function Busca() {
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [query, setQuery] = useState('')
    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [resultados, setResultados] = useState<Anime[]>([])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [savingIds, setSavingIds] = useState<number[]>([]) // <-- Estado para controlar botões de loading individuais
    const [savedIds, setSavedIds]   = useState<number[]>([])

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

    // Há busca ativa se qualquer campo tiver valor
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

        // 1. Criamos um controlador para poder abortar a requisição antiga
        const controller = new AbortController()

        // Debounce — evita disparo a cada tecla
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

            try {
                // 2. Passamos o sinal de cancelamento para o fetch
                const response = await fetch(`/api/search?${params.toString()}`, {
                    signal: controller.signal
                })

                if (!response.ok) throw new Error('Busca indisponível no momento. Tente novamente mais tarde.')
                const data = await response.json()
                setResultados(data.data || [])

            } catch (err: any) {
                // 3. Se o erro for apenas o nosso cancelamento forçado (AbortError), ignoramos silenciosamente!
                if (err.name === 'AbortError') return

                setResultados([])
                setError(err.message || 'Falha ao conectar com o servidor.')
            } finally {
                // 4. Só removemos o Skeleton de carregamento se a requisição NÃO foi cancelada
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }, 400)

        // 5. Cleanup do React: Se o usuário digitar uma nova letra ANTES da requisição anterior terminar, 
        // nós limpamos o timer E "matamos" a requisição velha no meio do caminho!
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query, selectedFilters, selectedStatus, selectedSeason, selectedYear, hasAnyFilter])

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

  // Traduz os status técnicos do banco/AniList para a interface
    const traduzirStatus = (statusOriginal: string) => {
        if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
        if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
        if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
        return statusOriginal
    }

    return (
        <div className="w-full min-w-0 max-w-[960px] mx-auto pt-16 px-5 pb-10">

            {/* Campo de busca */}
            <div className="flex items-center gap-3 bg-panel border-2 border-holo-2 rounded-xl p-4 mb-4">
                <Search className="text-muted-2 shrink-0" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar anime, gênero, estúdio..."
                    className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
                />
            </div>

                        {/* Linha de controle e Quick Filters */}
            <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
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

              {/* Quick Filters (Categorias de Destaque) */}
                {['Ação', 'Romance', 'Comédia', 'Fantasia'].map(cat => {
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

                {/* Tags dos filtros ativos que não estão nos Quick Filters */}
                {!showFilters && activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-nowrap shrink-0 border-l border-line pl-3">
                        {selectedFilters.filter(f => !['Ação', 'Romance', 'Comédia', 'Fantasia'].includes(f.label)).map(f => (
                            <span key={`${f.type}-${f.value}`} className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-2 text-[11px] font-bold">
                                {f.label}
                                <button onClick={() => toggleFilter(f)} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        ))}
                        {selectedStatus && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-3/20 border border-holo-3/40 text-holo-3 text-[11px] font-bold">
                                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                <button onClick={() => setSelectedStatus('')} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedSeason && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-1/20 border border-holo-1/40 text-holo-1 text-[11px] font-bold">
                                {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.emoji} {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
                                <button onClick={() => { setSelectedSeason(''); setSelectedYear('') }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

              {/* Painel de filtros (Drawer Mobile / Bloco Desktop) */}
            <div className={`fixed inset-0 z-[70] flex flex-col justify-end pointer-events-none md:relative md:inset-auto md:z-auto md:block transition-all duration-300 ${
                showFilters ? 'opacity-100' : 'opacity-0 md:opacity-100 md:hidden'
            }`}>
                {/* Overlay escuro (Só Mobile) - CORRIGIDO: pointer-events-none quando fechado */}
                <div 
                    className={`absolute inset-0 bg-void/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                    onClick={() => setShowFilters(false)}
                />
                
                {/* Container do Drawer - CORRIGIDO: pointer-events-none quando fechado */}
                <div className={`relative bg-panel md:bg-panel border-t md:border border-line rounded-t-3xl md:rounded-2xl p-6 pb-safe md:pb-6 space-y-6 transition-transform duration-300 transform md:transform-none max-h-[85vh] overflow-y-auto ${
                    showFilters ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:translate-y-0 md:pointer-events-auto'
                } mb-0 md:mb-6`}>
                    
                    {/* Header do Drawer (Só Mobile) */}

                    {/* Header do Drawer (Só Mobile) */}
                    <div className="flex justify-between items-center md:hidden mb-2">
                        <h3 className="font-anton text-lg uppercase text-text">Filtros Avançados</h3>
                        <button onClick={() => setShowFilters(false)} className="text-muted hover:text-text cursor-pointer p-1"><X size={20} /></button>
                    </div>

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

                    {/* Temporada */}
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

                    {/* Categoria */}
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
                        <button onClick={clearFilters} className="flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 cursor-pointer">
                            <X size={12} /> Limpar todos os filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Estados */}
            {loading && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// BUSCANDO...</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                            <div key={n} className="aspect-[2/3] rounded-xl shimmer border border-line" />
                        ))}
                    </div>
                </>
            )}

            {!loading && error && (
                <div className="text-center py-16 text-coral">
                    <AlertCircle className="mx-auto mb-4 opacity-80" size={34} />
                    <h3 className="font-anton uppercase text-xl mb-2">Ops, problema de conexão</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && hasSearched && resultados.length > 0 && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// RESULTADOS</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {resultados.map((anime, index) => {
                            // Calcula a classe do gradiente com base no índice (c1 a c5)
                            const gradClass = `card-g${(index % 5) + 1}`
                            
                            return (
                                <Link to={`/anime/${anime.mal_id}`} key={anime.mal_id} className={`relative aspect-[2/3] rounded-xl overflow-hidden border border-line flex flex-col justify-end p-3 group block ${gradClass}`}>
                                    {anime.images?.jpg?.image_url && (
                                        <img src={anime.images.jpg.image_url} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent z-10" />
                                    <div className="relative z-20">
                                        <div className="font-bold text-sm leading-tight mb-1 drop-shadow-md">{anime.title}</div>

                                        {/* 🟢 Renderiza no máximo 2 tags para não poluir o mobile */}
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                            {anime.genres?.slice(0, 2).map(g => (
                                                <span key={g.name} className={`backdrop-blur-sm border text-[9px] px-1.5 py-0.5 rounded font-bold ${getCategoryTheme(g.name)}`}>
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>

                                        {/* 🟢 Status traduzido */}
                                        <div className="font-mono text-[10px] text-holo-3 font-bold uppercase">
                                            {traduzirStatus(anime.status)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleSalvar(e, anime.mal_id)} 
                                        disabled={savingIds.includes(anime.mal_id) || savedIds.includes(anime.mal_id)}
                                        className={`absolute top-2 right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold backdrop-blur-sm transition-all z-20 ${
                                            savedIds.includes(anime.mal_id)
                                                ? 'bg-green/30 border-green text-green cursor-default'
                                                : 'bg-void/70 border-white/40 text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent cursor-pointer'
                                        }`}
                                    >
                                        {savingIds.includes(anime.mal_id) ? (
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                </>
            )}

            {!loading && !error && hasSearched && resultados.length === 0 && (
                <div className="text-center py-16 text-muted">
                    <Search className="mx-auto mb-4 text-muted-2" size={34} />
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Nada encontrado</h3>
                    <p className="text-sm">Tente outros termos ou ajuste os filtros.</p>
                </div>
            )}

            {!loading && !error && !hasSearched && (
                <div className="text-center py-16">
                    <h3 className="font-anton uppercase text-text text-xl mb-2">Descubra novos animes</h3>
                    <p className="text-sm text-muted">Busque por título, selecione uma categoria ou filtre por temporada.</p>
                </div>
            )}
        </div>
    )
}