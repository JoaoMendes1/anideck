// client/src/pages/Rankings.tsx
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    CONTENT_FILTERS, STATUS_OPTIONS, SEASON_OPTIONS,
    type FilterItem, getCategoryTheme
} from '../lib/filters'
import FilterChipGroup from '../components/FilterChipGroup'
import RankingCard from '../components/RankingCard'
import RankingSkeleton from '../components/RankingSkeleton'
import FilterSheet from '../components/FilterSheet'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
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

export default function Rankings() {
    const navigate = useNavigate()
    const [animes, setAnimes] = useState<Anime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)
    const { showToast } = useToast()
    const [savingIds, setSavingIds] = useState<number[]>([])

    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const [selectedFilters, setSelectedFilters] = useState<FilterItem[]>([])
    const [selectedStatus, setSelectedStatus] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC')

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

    useEffect(() => {
        setAnimes([])
        setPage(1)
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort])

    const fetchRanking = useCallback(async (currentPage: number, replace: boolean) => {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ page: String(currentPage), perPage: '20' })
        selectedFilters.forEach(f => params.append(f.type === 'genre' ? 'genre' : 'tag', f.value))
        if (selectedStatus) params.set('status', selectedStatus)
        if (selectedSeason) params.set('season', selectedSeason)
        if (selectedSeason && selectedYear) params.set('year', selectedYear)
        params.append('sort', selectedSort)

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
    }, [selectedFilters, selectedStatus, selectedSeason, selectedYear, selectedSort])

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
        setSelectedSort('POPULARITY_DESC')
    }

    const isInitialLoad = loading && animes.length === 0 && !error

    return (
        <div className="pb-20">
            <div className="max-w-[900px] mx-auto px-5 pt-10">
                <div className="mb-6">
                    {/* TEXTO ASSUMIDO — confirme se bate com o original, se vier de algum lugar que não te mandei */}
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-2 select-none">RANKING GLOBAL</p>
                    <h1 className="font-anton text-3xl md:text-4xl uppercase text-text mb-2 select-none">Os mais aclamados</h1>
                    <p className="text-muted text-sm select-none">Direto da base pública da AniList — filtros aplicados no servidor.</p>
                </div>

                <div className="flex gap-2 flex-wrap mb-6 select-none border-b border-line pb-4">
                    <button
                        onClick={() => { setSelectedStatus(''); setSelectedSeason(''); setSelectedYear(''); setSelectedSort('POPULARITY_DESC'); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer ${selectedStatus === '' && selectedSort === 'POPULARITY_DESC'
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-lg'
                                : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                    >
                        🏆 Top Global
                    </button>
                    <button
                        onClick={() => { setSelectedStatus('RELEASING'); setSelectedSort('TRENDING_DESC'); }}
                        className={`text-[13px] font-bold px-5 py-2.5 rounded-full border transition-colors cursor-pointer flex items-center gap-2 ${selectedStatus === 'RELEASING' && selectedSort === 'TRENDING_DESC'
                                ? 'bg-coral/20 border-coral text-coral shadow-[0_0_15px_rgba(255,92,108,0.2)]'
                                : 'bg-panel border-line text-muted hover:border-coral hover:text-text'
                            }`}
                    >
                        🔥 Em Alta / Temporada
                    </button>
                </div>

                <div className="mb-6">
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

                    <FilterSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtros Avançados">
                        <FilterChipGroup
                            label="Ordenar por"
                            options={SORT_OPTIONS}
                            isActive={(v) => selectedSort === v}
                            onToggle={(v) => setSelectedSort(v)}
                            activeClassName="bg-gold/20 border-gold/40 text-gold shadow-[0_0_12px_rgba(255,197,66,0.3)]"
                        />

                        <FilterChipGroup
                            label="Status"
                            options={STATUS_OPTIONS}
                            isActive={(v) => selectedStatus === v}
                            onToggle={(v) => setSelectedStatus(selectedStatus === v ? '' : v)}
                        />

                        <div>
                            <FilterChipGroup
                                label="Temporada"
                                options={SEASON_OPTIONS}
                                isActive={(v) => selectedSeason === v}
                                onToggle={(v) => {
                                    setSelectedSeason(selectedSeason === v ? '' : v)
                                    if (selectedSeason === v) setSelectedYear('')
                                }}
                            />

                            {selectedSeason && (
                                <div className="flex flex-wrap gap-2 p-3 mt-3 bg-panel-2 border border-line rounded-xl">
                                    <span className="text-[11px] font-bold text-muted uppercase w-full mb-1">Selecione o Ano:</span>
                                    {YEAR_OPTIONS.map(y => (
                                        <button
                                            key={y}
                                            onClick={() => setSelectedYear(selectedYear === String(y) ? '' : String(y))}
                                            className={`select-none px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${selectedYear === String(y)
                                                    ? 'bg-holo-3/20 border border-holo-3/50 text-holo-3'
                                                    : 'bg-panel border border-line text-muted hover:border-holo-3 hover:text-text'
                                                }`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">
                                Gêneros e Tags
                            </p>
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
                            <div className="pt-4 border-t border-line flex justify-end">
                                <button onClick={clearFilters} className="select-none flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                                    <X size={14} /> Limpar todos os filtros
                                </button>
                            </div>
                        )}
                    </FilterSheet>
                </div>

                {isInitialLoad ? (
                    <RankingSkeleton />
                ) : (
                    <div className="flex flex-col gap-3">
                        {animes.map((anime, index) => {
                            const savedEntry = savedEntries.find(e => e.mal_id === anime.mal_id)
                            return (
                                <RankingCard
                                    key={`${anime.mal_id}-${index}`}
                                    anime={anime}
                                    rank={index + 1}
                                    isSaved={!!savedEntry}
                                    isFavorite={savedEntry?.is_favorite}
                                    isSaving={savingIds.includes(anime.mal_id)}
                                    onToggleSave={handleSalvar}
                                />
                            )
                        })}
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

                {!isInitialLoad && !error && animes.length > 0 && (
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={loading}
                        className="select-none flex items-center justify-center gap-2 mx-auto mt-8 mb-10 px-6 py-3 rounded-full border border-line bg-panel text-text font-bold text-sm hover:border-holo-3 hover:text-holo-3 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        {loading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                )}
            </div>
        </div>
    )
}