// client/src/components/SearchResultCard.tsx
// Adapta um resultado de busca (formato AniList) pro <AnimeCard>.
import BotaoSalvarNoDeck from './BotaoSalvarNoDeck'
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
                <span className="select-none text-[9px] md:text-[9.5px] leading-none font-extrabold px-1.5 py-1 rounded-md uppercase tracking-wider border bg-void/85 text-holo-3 border-holo-3/45 truncate max-w-full">
                    {statusLabel}
                </span>
            }
            topRightAction={<BotaoSalvarNoDeck salvo={isSaved} salvando={isSaving} aoClicar={(e) => onToggleSave(e, anime.mal_id)} />}
        />
    )
}