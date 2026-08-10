import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, SlidersHorizontal, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem
} from '../lib/filters'
import { getCategoryTheme } from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

// 🟢 Adicionamos o is_favorite aqui para o Rankings saber quem é Carta Rara
interface SavedEntry {
    mal_id: number
    id: string
    is_favorite?: boolean
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
    const [savingIds, setSavingIds] = useState<number[]>([]) 
    
    // Agora salvamos o ID e o status de Favorito
    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')

    const activeFilterCount =
        selectedFilters.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0)

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
                        // 🟢 Salva o is_favorite que vem do banco
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
                // 🟢 Quando adiciona novo, ele entra como is_favorite: false por padrão
                setSavedEntries(prev => [...prev, { mal_id: malId, id: novaEntrada.id || novaEntrada[0]?.id, is_favorite: false }])
                showToast('Adicionado ao Deck', 'success')
            }
        } catch {
            showToast('Erro ao processar. Tente novamente.', 'error')
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
                    <h1 className="font-anton text-3xl md:text-4xl uppercase text-text mb-2 select-none">Os mais aclamados</h1>
                    <p className="text-muted text-sm select-none">Direto da base pública da AniList — filtros aplicados no servidor.</p>
                </div>

                {/* Abas de Navegação Rápida no Ranking */}
                <div className="flex gap-2 flex-wrap mb-6 select-none border-b border-line pb-4">
                    <button
                        onClick={() => { setSelectedStatus(''); setSelectedSeason(''); setSelectedYear(''); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${
                            selectedStatus === '' 
                            ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                            : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                        }`}
                    >
                        🏆 Top Global
                    </button>
                    <button
                        onClick={() => setSelectedStatus('RELEASING')}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${
                            selectedStatus === 'RELEASING'
                            ? 'bg-coral/20 border-coral text-coral shadow-[0_0_15px_rgba(255,92,108,0.2)]'
                            : 'bg-panel border-line text-muted hover:border-coral hover:text-text'
                        }`}
                    >
                        🔥 Temporada Atual
                    </button>
                </div>

                <div className="mb-6 space-y-3">
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`select-none inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 cursor-pointer ${showFilters || activeFilterCount > 0
                                ? 'border-holo-2 text-holo-2 bg-holo-2/10'
                                : 'border-line text-muted bg-panel hover:border-holo-2 hover:text-holo-2'
                            }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filtros Avançados
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void text-[10px] font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {showFilters && (
                        <div className="bg-panel border border-line rounded-2xl p-5 space-y-6">
                            <div>
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">// STATUS</p>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedStatus(selectedStatus === opt.value ? '' : opt.value)}
                                            className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedStatus === opt.value
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
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">// TEMPORADA</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {SEASON_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedSeason(selectedSeason === opt.value ? '' : opt.value)}
                                            className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedSeason === opt.value
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
                                                className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedYear === String(y)
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
                                <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none">// CATEGORIA</p>
                                <div className="flex flex-wrap gap-2">
                                    {CONTENT_FILTERS.map(f => {
                                        const isActive = selectedFilters.some(x => x.value === f.value)
                                        return (
                                            <button
                                                key={`${f.type}-${f.value}`}
                                                onClick={() => toggleFilter(f)}
                                                className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border ${isActive
                                                        ? `${getCategoryTheme(f.label)} shadow-[0_0_10px_currentColor]`
                                                        : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="select-none flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                                    <X size={12} /> Limpar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {animes.map((anime, index) => {
                        const rank = index + 1
                        let rankColor = 'text-muted-2'
                        if (rank === 1) rankColor = 'bg-gradient-to-b from-gold to-[#e08a1a] text-transparent bg-clip-text'
                        else if (rank === 2) rankColor = 'text-[#D9DDE6]'
                        else if (rank === 3) rankColor = 'text-[#C77B3E]'

                        const savedEntry = savedEntries.find(e => e.mal_id === anime.mal_id)
                        const isFoil = savedEntry?.is_favorite

                        return (
                           <Link
                                to={`/anime/${anime.mal_id}`}
                                key={`${anime.mal_id}-${index}`}
                                className={`relative overflow-hidden grid grid-cols-[24px_44px_1fr_auto_auto] md:grid-cols-[36px_56px_1fr_auto_auto] gap-2 md:gap-4 items-center p-3 rounded-xl transition-colors group ${
                                    isFoil 
                                        ? 'foil-card border border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' 
                                        : 'bg-panel border border-line hover:border-holo-2'
                                }`}
                            >
                                <span className={`relative z-30 font-anton text-lg md:text-xl text-center select-none ${rankColor}`}>
                                    {rank < 10 ? `0${rank}` : rank}
                                </span>
                                
                                <img src={anime.images?.jpg?.image_url} alt={anime.title} className="relative z-30 w-11 h-11 md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line" />
                                
                                <div className="relative z-30 min-w-0">
                                    <div className="font-bold text-sm md:text-[14.5px] truncate mb-1.5">
                                        {isFoil && <span className="text-gold mr-1" title="Favorito">👑</span>}
                                        {anime.title}
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-[10px] md:text-[10.5px] text-muted-2">
                                        {anime.genres && anime.genres.length > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded border font-bold font-manrope ${getCategoryTheme(anime.genres[0].name)}`}>
                                                {anime.genres[0].name}
                                            </span>
                                        )}
                                        <span className="select-none">{anime.status} • {anime.episodes || '?'} EP</span>
                                    </div>
                                </div>
                                
                                <div className="relative z-30 text-right select-none">
                                    <div className="font-anton text-sm md:text-base text-gold">★ {anime.score || 'N/A'}</div>
                                    <span className="font-mono text-[9px] text-muted-2 hidden md:block">NOTA</span>
                                </div>
                                
                                <button 
                                    onClick={(e) => handleSalvar(e, anime.mal_id)} 
                                    disabled={savingIds.includes(anime.mal_id)}
                                    className={`relative z-30 flex w-8 h-8 rounded-full border-[1.5px] items-center justify-center font-bold text-lg transition-colors select-none ${
                                        savedEntry
                                            ? 'bg-green/20 border-green text-green cursor-pointer hover:bg-coral/20 hover:border-coral hover:text-coral'
                                            : 'border-line bg-transparent text-muted group-hover:border-holo-3 group-hover:text-holo-3 cursor-pointer'
                                    }`}
                                >
                                    {savingIds.includes(anime.mal_id) ? (
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : savedEntry ? (
                                        <>
                                            <span className="hover:hidden flex items-center justify-center"><Check size={16} strokeWidth={3} /></span>
                                            <span className="hidden hover:flex items-center justify-center text-[15px]">×</span>
                                        </>
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
                        <p className="font-mono text-muted text-xs tracking-widest select-none">// CARREGANDO...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-10 text-coral">
                        <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
                        <p className="text-sm select-none">{error}</p>
                    </div>
                )}

                {!loading && !error && animes.length === 0 && activeFilterCount > 0 && (
                    <div className="text-center py-16">
                        <p className="font-anton uppercase text-text text-xl mb-2 select-none">Nenhum resultado</p>
                        <p className="text-sm text-muted mb-4 select-none">Nenhum anime encontrado com esses filtros.</p>
                        <button onClick={clearFilters} className="select-none px-4 py-2 rounded-full border border-coral text-coral text-sm font-bold hover:bg-coral/10 transition-colors cursor-pointer">
                            Limpar filtros
                        </button>
                    </div>
                )}

                {!loading && !error && animes.length > 0 && (
                    <button onClick={() => setPage(p => p + 1)} className="select-none block mx-auto mt-8 mb-10 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer">
                        Carregar mais
                    </button>
                )}
            </div>
        </div>
    )
}