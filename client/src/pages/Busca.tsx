import { useState, useEffect, useMemo, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDadosRestaurados, usePosicaoDeLista, guardarDados } from '../lib/posicaoDeLista'
import { STATUS_OPTIONS, SEASON_OPTIONS, getCategoryTheme } from '../lib/filters'
import { useRotulos, type CamadaPublica } from '../hooks/useRotulos'
import { normalizar } from '../hooks/useTaxonomia'
import SearchResultCard from '../components/SearchResultCard'
import FilterSheet from '../components/FilterSheet'
import FilterChipGroup from '../components/FilterChipGroup'
import AbasDescobrir from '../components/AbasDescobrir'
import { gradienteDoCard } from '../lib/deckHelpers'

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

// Atalhos da barra de chips. São nomes de rótulo da taxonomia: o servidor resolve o
// termo da AniList e a equivalência com a curadoria.
const ROTULOS_RAPIDOS = ['Ação', 'Romance', 'Comédia', 'Fantasia', 'Isekai']

const GRUPOS_DE_ROTULOS: { camada: CamadaPublica; titulo: string }[] = [
    { camada: 'genero', titulo: 'Gêneros' },
    { camada: 'demografia', titulo: 'Demografias' },
    { camada: 'tag_tematica', titulo: 'Temas' },
]

const SORT_OPTIONS = [
    { label: 'Mais Populares', value: 'POPULARITY_DESC' },
    { label: 'Em Alta', value: 'TRENDING_DESC' },
    { label: 'Maior Nota', value: 'SCORE_DESC' },
    { label: 'Lançamentos', value: 'START_DATE_DESC' },
]

/** O que a Busca precisa para renascer inteira ao voltar do Detalhes. */
interface EstadoBusca {
    query: string
    selectedRotulos: string[]
    selectedStatus: string
    selectedSeason: string
    selectedYear: string
    selectedSort: string
    page: number
    resultados: Anime[]
    hasSearched: boolean
}

export default function Busca() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const { reportarFalha, reportarSucesso } = useCatalogoStatus()

    // Retrato deixado ao sair para o Detalhes. Lido antes de todo o resto: cada
    // useState abaixo nasce dele, no MESMO primeiro render. Se os filtros viessem
    // do retrato num render e o resto noutro, o bloco `tinhaFiltro` mais abaixo
    // leria a discordância como "o filtro mudou" e jogaria fora a lista restaurada.
    const retrato = useDadosRestaurados<EstadoBusca>()
    const [searchParams, setSearchParams] = useSearchParams()
    const { rotulos } = useRotulos()
    const inputBuscaRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (searchParams.get('foco') === '1') {
            inputBuscaRef.current?.focus()
            const novos = new URLSearchParams(searchParams)
            novos.delete('foco')
            setSearchParams(novos, { replace: true })
        }
    }, [searchParams, setSearchParams])

    const [query, setQuery] = useState(retrato?.query ?? '')
    // Um link pode chegar com ?rotulo=Nome (ex.: a sugestão de gosto): o filtro já abre aplicado.
    const [selectedRotulos, setSelectedRotulos] = useState<string[]>(
        retrato?.selectedRotulos ?? searchParams.getAll('rotulo')
    )
    const [selectedStatus, setSelectedStatus] = useState(retrato?.selectedStatus ?? '')
    const [selectedSeason, setSelectedSeason] = useState(retrato?.selectedSeason ?? '')
    const [selectedYear, setSelectedYear] = useState(retrato?.selectedYear ?? '')
    const [selectedSort, setSelectedSort] = useState(retrato?.selectedSort ?? 'POPULARITY_DESC')
    const [page, setPage] = useState(retrato?.page ?? 1)

    const [resultados, setResultados] = useState<Anime[]>(retrato?.resultados ?? [])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(retrato?.hasSearched ?? false)
    const [error, setError] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [savingIds, setSavingIds] = useState<number[]>([])

    const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])

    const activeFilterCount =
        selectedRotulos.length +
        (selectedStatus ? 1 : 0) +
        (selectedSeason ? 1 : 0) +
        (selectedYear ? 1 : 0) +
        (selectedSort !== 'POPULARITY_DESC' ? 1 : 0)

    useEffect(() => {
        const carregarDeck = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { setLoading(false); return }

            try {
                const response = await fetch('/api/entries', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                })
                if (response.ok) {
                    const entradas = await response.json()
                    if (entradas && entradas.length > 0) {
                        const idsSalvos = entradas.map((e: SavedEntry) => ({ mal_id: e.mal_id, id: e.id, is_favorite: e.is_favorite }))
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
        selectedRotulos.length > 0 ||
        !!selectedStatus ||
        !!selectedSeason ||
        !!selectedYear

    // A limpeza dos resultados acontece na TRANSIÇÃO para "sem filtro", ajustada durante o
    // render em vez de dentro do efeito.
    //
    // Antes ela rodava a cada execução do efeito enquanto não houvesse filtro — e como
    // `setResultados([])` cria um array novo toda vez, cada uma dessas execuções forçava
    // um render a mais sem nada ter mudado na tela. Mexer no `sort` com a busca vazia,
    // por exemplo, disparava isso.
    const [tinhaFiltro, setTinhaFiltro] = useState(hasAnyFilter)

    if (tinhaFiltro !== hasAnyFilter) {
        setTinhaFiltro(hasAnyFilter)
        if (!hasAnyFilter) {
            setResultados([])
            setHasSearched(false)
            setError(null)
        }
    }

    // O conjunto que o retrato já colocou na tela. Enquanto o efeito for chamado
    // para exatamente ele, não há o que buscar: a lista restaurada já É o
    // resultado dessa busca. Comparar, em vez de "pular a primeira execução", é o
    // que torna isto correto sob o StrictMode, que roda todo efeito duas vezes no
    // dev — medido no Rankings, onde o sinalizador de uso único deixava a segunda
    // execução refazer a requisição e duplicar a última página.
    // A comparação é por identidade em cada campo, mesmo idioma do bloco acima.
    const [buscaJaFeita] = useState(() => (retrato
        ? { query, selectedRotulos, selectedStatus, selectedSeason, selectedYear, selectedSort, page }
        : null))

    const ehABuscaRestaurada =
        buscaJaFeita !== null &&
        buscaJaFeita.query === query &&
        buscaJaFeita.selectedRotulos === selectedRotulos &&
        buscaJaFeita.selectedStatus === selectedStatus &&
        buscaJaFeita.selectedSeason === selectedSeason &&
        buscaJaFeita.selectedYear === selectedYear &&
        buscaJaFeita.selectedSort === selectedSort &&
        buscaJaFeita.page === page

    useEffect(() => {
        if (!hasAnyFilter) return
        if (ehABuscaRestaurada) return

        const controller = new AbortController()

        const timer = setTimeout(async () => {
            setLoading(true)
            setHasSearched(true)
            setError(null)

            const params = new URLSearchParams()
            if (query.trim()) params.append('q', query.trim())
            selectedRotulos.forEach(nome => params.append('rotulo', nome))
            if (selectedStatus) params.set('status', selectedStatus)
            if (selectedSeason) params.set('season', selectedSeason)
            if (selectedYear) params.set('year', selectedYear)
            params.append('sort', selectedSort)
            params.append('page', String(page))
            params.append('perPage', '40')

            try {
                const response = await fetch(`/api/search?${params.toString()}`, {
                    signal: controller.signal
                })

                if (!response.ok) {
                    if (response.status >= 500) reportarFalha()
                    throw new Error('Busca indisponível no momento. Tente novamente mais tarde.')
                }
                const data = await response.json()
                reportarSucesso()

                setResultados(prev => page === 1 ? (data.data || []) : [...prev, ...(data.data || [])])

            } catch (err) {
                if ((err as Error).name === 'AbortError') return
                if (page === 1) setResultados([])
                setError((err as Error).message || 'Falha ao conectar com o servidor.')
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
    }, [query, selectedRotulos, selectedStatus, selectedSeason, selectedYear, selectedSort, page, hasAnyFilter, ehABuscaRestaurada, reportarFalha, reportarSucesso])

    // Mantém o retrato em dia. Guardar é só anotar referências, então sai barato
    // mesmo rodando a cada tecla digitada na busca.
    useEffect(() => {
        guardarDados<EstadoBusca>('/descobrir', {
            query, selectedRotulos, selectedStatus, selectedSeason, selectedYear,
            selectedSort, page, resultados, hasSearched,
        })
    }, [query, selectedRotulos, selectedStatus, selectedSeason, selectedYear,
        selectedSort, page, resultados, hasSearched])

    usePosicaoDeLista(resultados.length > 0)

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

    const toggleRotulo = (nome: string) => {
        setPage(1)
        setSelectedRotulos(prev =>
            prev.includes(nome) ? prev.filter(x => x !== nome) : [...prev, nome]
        )
    }

    // Rótulos cujo nome contém o texto digitado. O campo de texto da AniList casa só
    // com título: sem isto, digitar "isekai" não acharia nada.
    const sugestoes = useMemo(() => {
        const termo = normalizar(query)
        if (termo.length < 2) return []
        return rotulos
            .filter(r => normalizar(r.nome).includes(termo) && !selectedRotulos.includes(r.nome))
            .slice(0, 6)
    }, [query, rotulos, selectedRotulos])

    const escolherSugestao = (nome: string) => {
        setQuery('')
        toggleRotulo(nome)
    }

    const clearFilters = () => {
        setSelectedRotulos([])
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
        <div className="w-full min-w-0 max-w-[1440px] mx-auto pt-16 px-4 sm:px-6 lg:px-10 pb-10">
            <AbasDescobrir />

            <div className="flex items-center gap-3 bg-panel border-2 border-holo-2 rounded-xl p-4 mb-4">
                <Search className="text-muted-2 shrink-0" size={20} />
                <input
                    ref={inputBuscaRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Buscar anime ou rótulo..."
                    className="bg-transparent border-none outline-none text-text text-base w-full font-manrope placeholder:text-muted-2"
                />
            </div>

            {sugestoes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 -mt-2 mb-4">
                    <span className="font-mono text-[10px] text-muted-2 tracking-widest uppercase select-none">Filtrar por</span>
                    {sugestoes.map(r => (
                        <button
                            key={r.nome}
                            onClick={() => escolherSugestao(r.nome)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-panel-2 border border-holo-2/40 text-holo-2 hover:bg-holo-2/10 transition-colors cursor-pointer"
                        >
                            {r.nome}
                        </button>
                    ))}
                </div>
            )}

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
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${selectedStatus === 'RELEASING'
                        ? 'bg-coral/20 border-coral text-coral shadow-[0_0_10px_rgba(255,92,108,0.2)]'
                        : 'bg-panel-2 border-line text-muted hover:border-coral hover:text-text'
                        }`}
                >
                    🔥 Em Lançamento
                </button>

                {ROTULOS_RAPIDOS.map(cat => {
                    const isActive = selectedRotulos.includes(cat)
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleRotulo(cat)}
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
                        {selectedRotulos.filter(nome => !ROTULOS_RAPIDOS.includes(nome)).map(nome => (
                            <span key={nome} className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-2 text-[11px] font-bold">
                                {nome}
                                <button onClick={() => toggleRotulo(nome)} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        ))}
                        {selectedStatus && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-3/20 border border-holo-3/40 text-holo-3 text-[11px] font-bold">
                                {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}
                                <button onClick={() => { setSelectedStatus(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                        {(selectedSeason || selectedYear) && (
                            <span className="flex items-center shrink-0 gap-1 px-2.5 py-1.5 rounded-full bg-holo-1/20 border border-holo-1/40 text-holo-1 text-[11px] font-bold">
                                {selectedSeason
                                    ? `${SEASON_OPTIONS.find(s => s.value === selectedSeason)?.emoji} ${SEASON_OPTIONS.find(s => s.value === selectedSeason)?.label}${selectedYear ? ` ${selectedYear}` : ''}`
                                    : `📅 Ano ${selectedYear}`}
                                <button onClick={() => { setSelectedSeason(''); setSelectedYear(''); setPage(1) }} className="cursor-pointer hover:text-white"><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            <FilterSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtros Avançados">
                <FilterChipGroup
                    label="Ordenar por"
                    options={SORT_OPTIONS}
                    isActive={(v) => selectedSort === v}
                    onToggle={(v) => { setSelectedSort(v); setPage(1) }}
                    activeClassName="bg-gold/20 border-gold/40 text-gold shadow-[0_0_12px_rgba(255,197,66,0.2)]"
                />

                <FilterChipGroup
                    label="Status"
                    options={STATUS_OPTIONS}
                    isActive={(v) => selectedStatus === v}
                    onToggle={(v) => { setSelectedStatus(selectedStatus === v ? '' : v); setPage(1) }}
                />

                <div className="flex flex-col gap-3">
                    <FilterChipGroup
                        label="Temporada"
                        options={SEASON_OPTIONS}
                        isActive={(v) => selectedSeason === v}
                        onToggle={(v) => {
                            setSelectedSeason(selectedSeason === v ? '' : v)
                            setPage(1)
                        }}
                    />

                    <div className="flex flex-wrap gap-2 p-3 bg-panel-2 border border-line rounded-xl">
                        <span className="text-[11px] font-bold text-muted uppercase w-full mb-1">
                            Ano de lançamento (opcional com ou sem temporada):
                        </span>
                        {YEAR_OPTIONS.map(y => (
                            <button
                                key={y}
                                onClick={() => {
                                    setSelectedYear(selectedYear === String(y) ? '' : String(y))
                                    setPage(1)
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 border cursor-pointer ${
                                    selectedYear === String(y)
                                        ? 'bg-holo-3/20 border-holo-3/50 text-holo-3'
                                        : 'bg-panel border-line text-muted hover:border-holo-3 hover:text-text'
                                }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {GRUPOS_DE_ROTULOS.map(grupo => {
                    const doGrupo = rotulos.filter(r => r.camada === grupo.camada)
                    if (doGrupo.length === 0) return null
                    return (
                        <div key={grupo.camada}>
                            <p className="font-mono text-[10px] text-muted-2 tracking-widest mb-3 select-none uppercase">{grupo.titulo}</p>
                            <div className="flex flex-wrap gap-2">
                                {doGrupo.map(r => {
                                    const isActive = selectedRotulos.includes(r.nome)
                                    return (
                                        <button
                                            key={r.nome}
                                            onClick={() => toggleRotulo(r.nome)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
                                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void shadow-[0_0_12px_rgba(123,92,255,0.4)]'
                                                : 'bg-panel-2 border border-line text-muted hover:border-holo-2 hover:text-text'
                                                }`}
                                        >
                                            {r.nome}
                                            {r.curados > 0 && <span className="ml-1.5 opacity-60 font-mono">{r.curados}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {activeFilterCount > 0 && (
                    <div className="pt-4 border-t border-line flex justify-end">
                        <button onClick={clearFilters} className="select-none flex items-center gap-1.5 text-coral text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer">
                            <X size={14} /> Limpar todos os filtros
                        </button>
                    </div>
                )}
            </FilterSheet>

            {loading && page === 1 && (
                <>
                    <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">// CARREGANDO CATÁLOGO...</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <div key={n} className="aspect-[3/4.2] rounded-[14px] shimmer border border-line" />
                        ))}
                    </div>
                </>
            )}

            {!loading && error && page === 1 && (
                <div className="text-center py-16 text-coral select-none">
                    <AlertCircle className="mx-auto mb-4 opacity-80" size={34} />
                    <h3 className="font-anton uppercase text-xl mb-2">Busca indisponível</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!error && hasSearched && resultados.length > 0 && (
                <>
                    {page === 1 && <p className="font-mono text-xs text-holo-3 tracking-widest mb-4 select-none">// RESULTADOS DA BUSCA</p>}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {resultados.map((anime, index) => (
                            <SearchResultCard
                                key={`${anime.mal_id}-${index}`}
                                anime={anime}
                                gradientClass={gradienteDoCard(index)}
                                isSaved={savedEntries.some(e => e.mal_id === anime.mal_id)}
                                isFavorite={savedEntries.find(e => e.mal_id === anime.mal_id)?.is_favorite}
                                isSaving={savingIds.includes(anime.mal_id)}
                                statusLabel={traduzirStatus(anime.status)}
                                onToggleSave={handleSalvar}
                            />
                        ))}
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