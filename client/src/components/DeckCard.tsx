// client/src/components/DeckCard.tsx
// Adapta os dados do Deck (Entrada + HydratedAnime) pro <AnimeCard>.
import AnimeCard from './AnimeCard'
import { getStatusTheme, getAiringBadge, type AiringInfo } from '../lib/deckHelpers'

interface Entrada {
    id: string
    mal_id: number
    tipo: string
    status: string
    nota?: number | null
    anotacao?: string
    is_favorite?: boolean
}

interface HydratedAnime {
    mal_id: number
    title: string
    image_url: string
    genre?: string
    ranking?: number
    nextAiringEpisode?: AiringInfo
    streaming?: { name: string; url: string }[]
}

interface DeckCardProps {
    entrada: Entrada
    animeLocal?: HydratedAnime
    gradientClass: string
    onEdit: (entrada: Entrada) => void
}

export default function DeckCard({ entrada, animeLocal, gradientClass, onEdit }: DeckCardProps) {
    const temaStatus = getStatusTheme(entrada.status)
    const { acabouDeLancar, lancaHoje, lancaAmanha } = getAiringBadge(animeLocal?.nextAiringEpisode)
    const mostraSelosDeAr = entrada.status === 'Assistindo' || entrada.status === 'Em Dia'

    return (
        <AnimeCard
            malId={entrada.mal_id}
            title={animeLocal?.title || `ID: ${entrada.mal_id}`}
            imageUrl={animeLocal?.image_url}
            genre={animeLocal?.genre}
            score={entrada.nota}
            ranking={animeLocal?.ranking}
            isFavorite={entrada.is_favorite}
            gradientClass={gradientClass}
            statusBadge={
                <span className={`select-none text-[9px] md:text-[9.5px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider border backdrop-blur-md truncate max-w-full ${temaStatus.bg} ${temaStatus.text} ${temaStatus.border}`}>
                    {entrada.status}
                </span>
            }
            extraBadges={
                mostraSelosDeAr && (
                    <>
                        {acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-coral text-white shadow-[0_0_10px_rgba(255,92,108,0.5)] uppercase tracking-widest">Novo EP</span>}
                        {lancaHoje && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-holo-3 text-void shadow-[0_0_10px_rgba(63,224,240,0.5)] uppercase tracking-widest">Hoje</span>}
                        {lancaAmanha && !acabouDeLancar && <span className="select-none text-[8.5px] font-black px-2 py-1 rounded-md bg-gold text-void shadow-[0_0_10px_rgba(255,197,66,0.5)] uppercase tracking-widest">Amanhã</span>}
                    </>
                )
            }
            topRightAction={
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(entrada) }}
                    className="w-8 h-8 rounded-full bg-void/80 border border-line text-muted hover:text-holo-3 hover:border-holo-3 flex items-center justify-center backdrop-blur-md cursor-pointer transition-all shadow-lg opacity-70 md:opacity-0 group-hover:opacity-100 active:scale-90"
                    title="Editar entrada"
                    aria-label="Editar entrada"
                >
                    ✎
                </button>
            }
        />
    )
}