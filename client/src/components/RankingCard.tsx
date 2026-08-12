// client/src/components/RankingCard.tsx
// Mudança principal pro mobile: rank virou badge sobreposto no canto da capa
// (em vez de coluna própria de 24-36px), e nota+botão viraram uma pilha vertical
// única (em vez de 2 colunas "auto" separadas). Resultado: grid de 5 colunas -> 3,
// e o título ganha bem mais largura em telas pequenas.
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import BotaoCopiar from './BotaoCopiar'
import { getCategoryTheme } from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    episodes: number
    images: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface RankingCardProps {
    anime: Anime
    rank: number
    isSaved: boolean
    isFavorite?: boolean
    isSaving: boolean
    onToggleSave: (e: React.MouseEvent, malId: number) => void
}

// Ouro/prata/bronze pros top 3; resto usa um badge neutro discreto.
const RANK_STYLES: Record<number, string> = {
    1: 'bg-gradient-to-b from-gold to-[#e08a1a] text-void shadow-[0_0_10px_rgba(255,197,66,0.6)]',
    2: 'bg-gradient-to-b from-[#E8ECF5] to-[#B9C0D4] text-void',
    3: 'bg-gradient-to-b from-[#D89A63] to-[#96602F] text-void',
}

export default function RankingCard({ anime, rank, isSaved, isFavorite, isSaving, onToggleSave }: RankingCardProps) {
    const rankBadgeClass = RANK_STYLES[rank] ?? 'bg-void/90 border border-line text-muted-2'

    return (
        <Link
            to={`/anime/${anime.mal_id}`}
            className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                isFavorite
                    ? 'foil-card border border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]'
                    : 'bg-panel border border-line hover:border-holo-2'
            }`}
        >
            <div className="relative z-30 shrink-0">
                <img
                    src={anime.images?.jpg?.image_url}
                    alt={anime.title}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line"
                />
                <span
                    className={`absolute -top-1.5 -left-1.5 flex items-center justify-center w-5 h-5 rounded-full font-anton text-[10px] select-none ${rankBadgeClass}`}
                >
                    {rank}
                </span>
            </div>

            <div className="relative z-30 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-sm truncate">
                        {isFavorite && <span className="text-gold mr-1" title="Favorito">👑</span>}
                        {anime.title}
                    </span>
                    <BotaoCopiar
                        texto={anime.title}
                        className="opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity relative z-40 shrink-0"
                    />
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-2">
                    {anime.genres?.[0] && (
                        <span className={`px-1.5 py-0.5 rounded border font-bold font-manrope shrink-0 ${getCategoryTheme(anime.genres[0].name)}`}>
                            {anime.genres[0].name}
                        </span>
                    )}
                    <span className="select-none truncate">{anime.status} • {anime.episodes || '?'} EP</span>
                </div>
            </div>

            <div className="relative z-30 flex flex-col items-center gap-1.5 shrink-0">
                <div className="font-anton text-sm text-gold select-none">★ {anime.score || 'N/A'}</div>
                <button
                    onClick={(e) => onToggleSave(e, anime.mal_id)}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Remover do Deck' : 'Adicionar ao Deck'}
                    className={`flex w-7 h-7 rounded-full border-[1.5px] items-center justify-center font-bold text-base transition-colors select-none ${
                        isSaved
                            ? 'bg-green/20 border-green text-green cursor-pointer hover:bg-coral/20 hover:border-coral hover:text-coral'
                            : 'border-line bg-transparent text-muted group-hover:border-holo-3 group-hover:text-holo-3 cursor-pointer'
                    }`}
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                        <Check size={14} strokeWidth={3} />
                    ) : (
                        '+'
                    )}
                </button>
            </div>
        </Link>
    )
}