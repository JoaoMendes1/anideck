import { useState, useMemo } from 'react'
import { Search, Trash2, ImageOff, CheckCircle2, AlertCircle, Film, Plus, X } from 'lucide-react'
import { totalEpisodiosCurado, type CuratedAnime } from '../types/curation'

interface DestaquesRailProps {
  destaques: CuratedAnime[]
  selectedId: string | null
  onSelect: (anime: CuratedAnime) => void
  onDelete: (id: string, titulo: string) => void
  onNovo: () => void
  novoAtivo: boolean
}

type FiltroTipo = 'ALL' | 'PARCIAL' | 'COMPLETO' | 'REVISAR' | 'NO_COVER' | 'NO_EPISODES'

// O estado de curadoria existe para responder "onde eu parei?" com 100+ animes cadastrados.
// Sem aparecer aqui na lista, ele só era visível abrindo cada anime um por um — que é
// exatamente o problema que ele deveria resolver.
const TEMA_STATUS: Record<string, { rotulo: string; classe: string }> = {
  completo: { rotulo: 'completo', classe: 'text-green border-green/40 bg-green/10' },
  revisar: { rotulo: 'revisar', classe: 'text-coral border-coral/40 bg-coral/10' },
  parcial: { rotulo: 'parcial', classe: 'text-muted-2 border-line bg-panel-2' },
}

export default function DestaquesRail({
  destaques,
  selectedId,
  onSelect,
  onDelete,
  onNovo,
  novoAtivo,
}: DestaquesRailProps) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroTipo>('ALL')

  const contagens = useMemo(() => {
    let parcial = 0
    let completo = 0
    let revisar = 0
    let semCapa = 0
    let semEps = 0
    for (const d of destaques) {
      const st = d.curation_status || 'parcial'
      if (st === 'parcial') parcial++
      else if (st === 'completo') completo++
      else if (st === 'revisar') revisar++
      if (!d.custom_cover_image) semCapa++
      if (totalEpisodiosCurado(d) === 0) semEps++
    }
    return { parcial, completo, revisar, semCapa, semEps }
  }, [destaques])

  const destaquesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return destaques.filter((d) => {
      const matchBusca =
        !termo ||
        d.custom_title.toLowerCase().includes(termo) ||
        String(d.mal_id || '').includes(termo)
      if (!matchBusca) return false

      const st = d.curation_status || 'parcial'
      if (filtro === 'PARCIAL') return st === 'parcial'
      if (filtro === 'COMPLETO') return st === 'completo'
      if (filtro === 'REVISAR') return st === 'revisar'
      if (filtro === 'NO_COVER') return !d.custom_cover_image
      if (filtro === 'NO_EPISODES') return totalEpisodiosCurado(d) === 0

      return true
    })
  }, [destaques, busca, filtro])

  return (
    <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-xl">
      {/* Cabeçalho da coluna de catálogo + ação rápida */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
            Catálogo ({destaquesFiltrados.length}/{destaques.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onNovo}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer shrink-0 ${
            novoAtivo
              ? 'bg-holo-2 text-void border-holo-2 shadow-[0_0_12px_rgba(123,92,255,0.3)]'
              : 'bg-panel-2 border-line text-text hover:border-holo-2 hover:text-holo-2'
          }`}
        >
          <Plus size={13} /> Nova obra
        </button>
      </div>

      {/* Busca e chips de filtro */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título ou MAL ID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:border-holo-2 text-text placeholder:text-muted/50 transition-colors"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filtro === 'ALL'} onClick={() => setFiltro('ALL')} label={`Todos (${destaques.length})`} />
          <FilterChip active={filtro === 'COMPLETO'} onClick={() => setFiltro('COMPLETO')} label={`Completo (${contagens.completo})`} icon={<CheckCircle2 size={10} />} />
          <FilterChip active={filtro === 'PARCIAL'} onClick={() => setFiltro('PARCIAL')} label={`Parcial (${contagens.parcial})`} />
          {contagens.revisar > 0 && (
            <FilterChip active={filtro === 'REVISAR'} onClick={() => setFiltro('REVISAR')} label={`Revisar (${contagens.revisar})`} icon={<AlertCircle size={10} />} />
          )}
          {contagens.semCapa > 0 && (
            <FilterChip active={filtro === 'NO_COVER'} onClick={() => setFiltro('NO_COVER')} label={`Sem Capa (${contagens.semCapa})`} icon={<ImageOff size={10} />} />
          )}
          <FilterChip
            active={filtro === 'NO_EPISODES'}
            onClick={() => setFiltro('NO_EPISODES')}
            label={`Sem Eps (${contagens.semEps})`}
            icon={<Film size={10} />}
          />
        </div>
      </div>

      {/* Lista com scroll otimizado */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar pr-1 pt-0.5">
        {destaquesFiltrados.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted font-mono bg-panel-2 rounded-xl border border-line border-dashed">
            Nenhum anime encontrado nos filtros.
          </div>
        ) : (
          destaquesFiltrados.map((anime) => {
            const isSelected = selectedId === anime.id
            return (
              <div
                key={anime.id}
                onClick={() => onSelect(anime)}
                className={`group flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-panel-2 border-holo-2 shadow-[0_0_15px_rgba(123,92,255,0.15)]'
                    : 'bg-panel-2/50 border-line hover:bg-panel-2 hover:border-muted-2'
                }`}
              >
                <div className="w-10 h-14 rounded-md bg-void border border-line overflow-hidden shrink-0 flex items-center justify-center relative">
                  {anime.custom_cover_image ? (
                    <img
                      src={anime.custom_cover_image}
                      alt={anime.custom_title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[8px] font-bold text-muted-2 text-center uppercase leading-tight">
                      Sem<br />Capa
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-text'}`}>
                    {anime.custom_title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-[10px] font-mono text-muted">
                      {anime.custom_characters?.length || 0} personagens
                      {totalEpisodiosCurado(anime) > 0 && ` · ${totalEpisodiosCurado(anime)} eps`}
                    </p>
                    {totalEpisodiosCurado(anime) === 0 && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border text-gold border-gold/40 bg-gold/10"
                        title="Nenhum episódio encontrado na curadoria nem no cache da AniList"
                      >
                        ⚠ 0 eps
                      </span>
                    )}
                    {(() => {
                      const tema = TEMA_STATUS[anime.curation_status || 'parcial']
                      return (
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${tema.classe}`}>
                          {tema.rotulo}
                        </span>
                      )
                    })()}
                    {anime.is_destaque === false && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border text-muted-2 border-line"
                        title="Curado, mas fora da vitrine de destaques"
                      >
                        oculto
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (anime.id) onDelete(anime.id, anime.custom_title)
                  }}
                  /* Opacidade 100 no mobile, e esconde apenas no desktop (lg:opacity-0) */
                  className="p-2 text-muted hover:text-coral active:bg-coral/20 lg:hover:bg-coral/10 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer"
                  aria-label="Excluir destaque"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
        active
          ? 'bg-holo-2/20 border-holo-2 text-holo-2'
          : 'bg-panel-2 border-line text-muted hover:text-text hover:border-muted-2'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}