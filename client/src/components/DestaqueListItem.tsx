// client/src/components/DestaqueListItem.tsx
import type { CuratedAnime } from '../types/curation'

interface DestaqueListItemProps {
  anime: CuratedAnime
  gradClass: string
  onEdit: (anime: CuratedAnime) => void
  onDelete: (id: string, titulo: string) => void
}

export default function DestaqueListItem({ anime, gradClass, onEdit, onDelete }: DestaqueListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 border border-line p-3 md:p-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg ${gradClass}`}
    >
      <div className="font-anton text-white/30 text-xl md:text-2xl w-6 md:w-8 text-center shrink-0">#{anime.order_index}</div>

      <div className="w-10 h-14 md:w-12 md:h-16 rounded-md border border-white/10 shrink-0 overflow-hidden bg-panel flex items-center justify-center">
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
          <span className="text-[9px] text-muted-2 font-bold uppercase text-center leading-tight">
            Sem
            <br />
            Capa
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm md:text-[15px] text-white drop-shadow-md truncate">{anime.custom_title}</div>
        <div className="text-xs text-muted-2 mt-1 truncate">{anime.custom_characters?.length || 0} personagens customizados</div>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onEdit(anime)}
          aria-label={`Editar ${anime.custom_title}`}
          className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-panel-2/80 border border-line text-muted hover:text-white hover:border-holo-2 transition-colors cursor-pointer flex items-center justify-center"
        >
          ✎
        </button>
        <button
          onClick={() => anime.id && onDelete(anime.id, anime.custom_title)}
          aria-label={`Remover ${anime.custom_title}`}
          className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-panel-2/80 border border-line text-muted hover:text-coral hover:border-coral transition-colors cursor-pointer flex items-center justify-center"
        >
          🗑
        </button>
      </div>
    </div>
  )
}