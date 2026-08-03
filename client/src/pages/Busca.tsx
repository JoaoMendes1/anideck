import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem
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

    const [query, setQuery]                         = useState('')
    const [selectedFilters, setSelectedFilters]     = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus]       = useState('')
    const [selectedSeason, setSelectedSeason]       = useState('')
    const [selectedYear, setSelectedYear]           = useState('')
    const [resultados, setResultados]               = useState<Anime[]>([])
    const [loading, setLoading]                     = useState(false)
    const [hasSearched, setHasSearched]             = useState(false)
    const [error, setError]                         = useState<string | null>(null)
    const [showFilters, setShowFilters]             = useState(false)

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0)

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
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return }
        try {
            const res = await fetch('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ mal_id: malId, tipo: 'anime', status: 'Quero Assistir' }),
            })
            if (!res.ok) throw new Error()
            alert('Salvo na sua lista!')
        } catch { alert('Erro ao salvar. Tente novamente!') }
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
        if (statusOriginal === 'NOT_YET_RELEASED') return 'Em Breve'
        return statusOriginal
    }

    return (
        <div className="max-w-[960px] mx-auto pt-16 px-5 pb-10">

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

            {/* Linha de controle */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${
                        showFilters || activeFilterCount > 0
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

                {/* Tags dos filtros ativos (painel fechado) */}
                {!showFilters && activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedFilters.map(f => (
                            <span key={`${f.type}-${f.value}`} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-2 text-[11px] font-bold">
                                {f.label}
                                <button onClick={() => toggleFilter(f)} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        ))}
                        {selectedStatus && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-holo-3/20 border border-holo-3/40 text-holo-3 text-[11px] font-bold">
                                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                <button onClick={() => setSelectedStatus('')} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {selectedSeason && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-holo-1/20 border border-holo-1/40 text-holo-1 text-[11px] font-bold">
                                {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.emoji} {SEASON_OPTIONS.find(s => s.value === selectedSeason)?.label} {selectedYear}
                                <button onClick={() => { setSelectedSeason(''); setSelectedYear('') }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Painel de filtros */}
            {showFilters && (
                <div className="bg-panel border border-line rounded-2xl p-5 space-y-6 mb-6">

                    {/* Status */}
                    <div>
                        <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3">// STATUS</p>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSelectedStatus(selectedStatus === opt.value ? '' : opt.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                                        selectedStatus === opt.value
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
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                                        selectedSeason === opt.value
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
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                                            selectedYear === String(y)
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
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                                            isActive
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
            )}

            {/* Estados */}
            {loading && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4">// BUSCANDO...</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1,2,3,4,5].map(n => <div key={n} className="aspect-[2/3] rounded-xl bg-panel-2 animate-pulse border border-line" />)}
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
                        {resultados.map(anime => (
                            <Link to={`/anime/${anime.mal_id}`} key={anime.mal_id} className="relative aspect-[2/3] rounded-xl overflow-hidden border border-line bg-panel flex flex-col justify-end p-3 group block">
                                {anime.images?.jpg?.image_url
                                    ? <img src={anime.images.jpg.image_url} alt={anime.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500" />
                                    : <div className="absolute inset-0 bg-gradient-to-br from-panel-2 to-void z-0" />
                                }
                                <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent z-10" />
                                <div className="relative z-20">
                                    <div className="font-bold text-sm leading-tight mb-1 drop-shadow-md">{anime.title}</div>
                                    
                                    {/* 🟢 Renderiza no máximo 2 tags para não poluir o mobile */}
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {anime.genres?.slice(0, 2).map(g => (
                                            <span key={g.name} className="bg-panel-2/80 backdrop-blur-sm border border-line text-[9px] px-1.5 py-0.5 rounded text-muted font-bold">
                                                {g.name}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* 🟢 Status traduzido */}
                                    <div className="font-mono text-[10px] text-holo-3 font-bold uppercase">
                                        {traduzirStatus(anime.status)}
                                    </div>
                                </div>
                                <button onClick={(e) => handleSalvar(e, anime.mal_id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-void/70 border-2 border-white/40 text-white font-bold backdrop-blur-sm hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent transition-all z-20 cursor-pointer">+</button>
                            </Link>
                        ))}
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