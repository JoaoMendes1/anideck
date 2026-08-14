import { useState, useMemo } from 'react'
import { Search, Trash2, ImageOff, CheckCircle2, PlayCircle } from 'lucide-react'
import type { CuratedAnime } from '../types/curation'

interface DestaquesRailProps {
  destaques: CuratedAnime[]
  selectedId: string | null
  onSelect: (anime: CuratedAnime) => void
  onDelete: (id: string, titulo: string) => void
  onNovo: () => void
  novoAtivo: boolean
}

type FiltroTipo = 'ALL' | 'RELEASING' | 'FINISHED' | 'NO_COVER'

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

  const destaquesFiltrados = useMemo(() => {
    return destaques.filter((d) => {
      const matchBusca = d.custom_title.toLowerCase().includes(busca.toLowerCase())
      if (!matchBusca) return false

      if (filtro === 'RELEASING') return d.custom_status === 'RELEASING'
      if (filtro === 'FINISHED') return d.custom_status === 'FINISHED'
      if (filtro === 'NO_COVER') return !d.custom_cover_image

      return true
    })
  }, [destaques, busca, filtro])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-anton text-xl flex items-center gap-2">
          <span className="text-coral">📌</span> Destaques ativos{' '}
          <span className="text-xs font-mono bg-panel-2 border border-line px-2 py-0.5 rounded-full text-muted">
            {destaques.length}
          </span>
        </h2>
      </div>

      <button
        onClick={onNovo}
        className={`w-full py-3 rounded-xl border border-dashed font-bold text-sm transition-all flex items-center justify-center gap-2 ${
          novoAtivo
            ? 'bg-holo-2/10 border-holo-2 text-holo-2'
            : 'bg-panel border-line text-muted hover:border-holo-2 hover:text-holo-2'
        }`}
      >
        + Novo Destaque
      </button>

      {/* Área de Filtros e Busca Local */}
      <div className="flex flex-col gap-3 bg-panel border border-line p-3 rounded-xl">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar nos destaques..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-panel-2 border border-line rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-holo-2 text-text placeholder:text-muted/50"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filtro === 'ALL'} onClick={() => setFiltro('ALL')} label="Todos" />
          <FilterChip active={filtro === 'RELEASING'} onClick={() => setFiltro('RELEASING')} label="Lançamento" icon={<PlayCircle size={10} />} />
          <FilterChip active={filtro === 'FINISHED'} onClick={() => setFiltro('FINISHED')} label="Finalizado" icon={<CheckCircle2 size={10} />} />
          <FilterChip active={filtro === 'NO_COVER'} onClick={() => setFiltro('NO_COVER')} label="Sem Capa" icon={<ImageOff size={10} />} />
        </div>
      </div>

      {/* Lista com scroll otimizado */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar pr-1 pb-4">
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
                    : 'bg-panel border-line hover:border-muted-2'
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
                  <p className="text-[10px] font-mono text-muted mt-0.5">
                    {anime.custom_characters?.length || 0} personagens
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (anime.id) onDelete(anime.id, anime.custom_title)
                  }}
                  /* CORREÇÃO DO BUG: Opacidade 100 no mobile, e esconde apenas no desktop (lg:opacity-0) */
                  className="p-2 text-muted hover:text-coral active:bg-coral/20 lg:hover:bg-coral/10 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
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
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
        active
          ? 'bg-holo-2/20 border-holo-2 text-holo-2'
          : 'bg-panel-2 border-line text-muted hover:border-muted-2'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}