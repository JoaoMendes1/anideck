// client/src/components/DestaqueRailCard.tsx
import { Trash2 } from 'lucide-react'
import type { CuratedAnime } from '../types/curation'

interface DestaqueRailCardProps {
  anime: CuratedAnime
  gradClass: string
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}

export default function DestaqueRailCard({ anime, gradClass, selected, onSelect, onDelete }: DestaqueRailCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full flex items-center gap-3 p-2.5 rounded-xl border text-left overflow-hidden transition-all group ${
        selected
          ? 'border-holo-2 bg-panel-2 shadow-lg shadow-holo-2/10'
          : 'border-line bg-panel hover:border-holo-2/40 hover:-translate-y-0.5'
      }`}
    >
      {/* Faixa de assinatura visual: reaproveita as gradações card-gN já usadas
          no resto do app (AnimeCard/RankingCard), agora como um filete no topo
          em vez de fundo cheio — mais "painel pro", menos poluído. */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${gradClass}`} aria-hidden="true" />

      <div className="relative w-11 h-15 rounded-lg border border-white/10 shrink-0 overflow-hidden bg-void flex items-center justify-center">
        {anime.custom_cover_image ? (
          <img
            src={anime.custom_cover_image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <span className="text-[8px] text-muted-2 font-bold uppercase text-center leading-tight px-1">Sem Capa</span>
        )}
        <span className="absolute bottom-0 left-0 right-0 bg-void/90 text-[9px] font-mono font-bold text-holo-3 text-center py-0.5">
          #{anime.order_index}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`font-extrabold text-sm truncate ${selected ? 'text-white' : 'text-text'}`}>{anime.custom_title}</div>
        <div className="text-[11px] text-muted-2 mt-0.5 truncate">{anime.custom_characters?.length || 0} personagens</div>
      </div>

      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onDelete()
          }
        }}
        aria-label={`Remover ${anime.custom_title}`}
        className="shrink-0 w-8 h-8 rounded-lg text-muted hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 size={14} />
      </span>
    </button>
  )
}