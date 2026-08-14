// client/src/components/SearchResultCard.tsx
// Adapta um resultado de busca (formato AniList) pro <AnimeCard>.
import { Check } from 'lucide-react'
import AnimeCard from './AnimeCard'

interface Anime {
    mal_id: number
    title: string
    status: string
    episodes?: number
    score?: number
    images?: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface SearchResultCardProps {
    anime: Anime
    gradientClass: string
    isSaved: boolean
    isFavorite?: boolean
    isSaving: boolean
    statusLabel: string
    onToggleSave: (e: React.MouseEvent, malId: number) => void
}

export default function SearchResultCard({
    anime, gradientClass, isSaved, isFavorite, isSaving, statusLabel, onToggleSave,
}: SearchResultCardProps) {
    return (
        <AnimeCard
            malId={anime.mal_id}
            title={anime.title}
            imageUrl={anime.images?.jpg?.image_url}
            genre={anime.genres?.[0]?.name}
            score={anime.score}
            isFavorite={isFavorite}
            gradientClass={gradientClass}
            statusBadge={
                <span className="select-none text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider backdrop-blur-md border bg-void/70 text-holo-3 border-holo-3/50 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] truncate max-w-full">
                    {statusLabel}
                </span>
            }
            topRightAction={
                <button
                    onClick={(e) => onToggleSave(e, anime.mal_id)}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Remover do Deck' : 'Adicionar ao Deck'}
                    /* BOTÃO SEMPRE VISÍVEL: Removido qualquer 'opacity-0' ou hover para esconder */
                    className={`w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center font-bold backdrop-blur-md transition-all select-none shadow-lg active:scale-90 ${
                        isSaved
                            ? 'bg-green/20 border-green text-green hover:bg-coral/20 hover:border-coral hover:text-coral cursor-pointer'
                            : 'bg-void/80 border-white/40 text-white hover:bg-gradient-to-r hover:from-holo-1 hover:to-holo-2 hover:border-transparent cursor-pointer opacity-90 hover:opacity-100'
                    }`}
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                        <Check size={16} strokeWidth={3} />
                    ) : (
                        '+'
                    )}
                </button>
            }
        />
    )
}