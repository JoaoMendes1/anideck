// client/src/components/AnimeCard.tsx
// Casco genérico do card em formato pôster. Usado pelo DeckCard (Meu Deck)
// e pelo SearchResultCard (Busca) — cada um só monta os "slots" diferentes.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getCategoryTheme } from '../lib/filters'

interface AnimeCardProps {
    malId: number
    title: string
    imageUrl?: string
    genre?: string
    score?: number | null
    ranking?: number
    isFavorite?: boolean
    gradientClass: string
    statusBadge: ReactNode      // badge do topo-esquerda (obrigatório: todo card tem status)
    extraBadges?: ReactNode     // badges extras empilhadas abaixo do status (ex: "Novo EP")
    topRightAction?: ReactNode  // botão do canto superior direito (editar OU salvar)
}

export default function AnimeCard({
    malId, title, imageUrl, genre, score, ranking, isFavorite,
    gradientClass, statusBadge, extraBadges, topRightAction,
}: AnimeCardProps) {
    const temNota = score !== null && score !== undefined

    return (
        <div
            className={`relative aspect-[3/4.2] rounded-[14px] overflow-hidden p-3 flex flex-col justify-end border transition-transform active:scale-[0.98] hover:-translate-y-1 group ${
                isFavorite ? 'foil-card border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' : `border-line bg-panel ${gradientClass}`
            }`}
        >
            <Link to={`/anime/${malId}`} className="absolute inset-0 z-10" aria-label={title} />

            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 group-hover:opacity-100 transition-opacity"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent z-0 opacity-90" />

            {/* right-12 reserva espaço fixo pro botão do canto — a fonte única
                do fix de sobreposição que fiz no MeuDeck. Agora vale pro Busca também. */}
            <div className="absolute top-3 left-3 right-12 z-30 flex flex-col gap-1.5 items-start pointer-events-none">
                {statusBadge}
                {extraBadges}
            </div>

            {topRightAction && (
                <div className="absolute top-3 right-3 z-30">
                    {topRightAction}
                </div>
            )}

            <div className="relative z-20 mt-auto flex flex-col pointer-events-none select-none w-full justify-end">
                <h3 className="font-anton text-[13px] md:text-[14px] uppercase leading-tight mb-2 text-white drop-shadow-md line-clamp-2 break-words" title={title}>
                    {isFavorite && <span className="text-gold mr-1 inline-block -translate-y-[1px]" title="Favorito">👑</span>}
                    {title}
                </h3>

                <div className="flex justify-between items-end gap-2">
                    <div className="flex-1 min-w-0">
                        {genre && (
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm truncate max-w-full ${getCategoryTheme(genre)}`}>
                                {genre}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {ranking && (
                            <div className="font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border bg-panel-2/90 text-holo-3 border-holo-3/40 shadow-[0_0_8px_rgba(63,224,240,0.15)] flex items-center gap-1" title={`#${ranking} no mundo`}>
                                🏆 #{ranking}
                            </div>
                        )}
                        <div className={`font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border ${temNota ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                            {temNota ? `★ ${score}` : 'S/N'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}