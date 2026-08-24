import { Link } from 'react-router-dom'
import { Check, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import BotaoCopiar from './BotaoCopiar'
import { getCategoryTheme } from '../lib/filters'

interface Anime {
    mal_id: number
    title: string
    status: string
    score: number
    popularity?: number
    bayesian_score?: number
    current_rank?: number
    previous_rank?: number
    episodes: number
    images: { jpg: { image_url: string } }
    genres?: { name: string }[]
}

interface RankingCardProps {
    anime: Anime
    rank: number
    mostrarVariacao?: boolean
    isSaved: boolean
    isFavorite?: boolean
    isSaving: boolean
    onToggleSave: (e: React.MouseEvent, malId: number) => void
}

// Indicador de variação de posição desde a última medição mensal.
//
// Três estados visíveis (subiu, desceu, manteve) e um invisível: quando não
// há histórico, o componente não renderiza nada. Isso é diferente de
// "manteve" — anime que acabou de entrar no ranking, ou o primeiro mês de
// operação, não têm com o que comparar, e inventar um traço ali seria mentira.
//
// O backend manda previousRank = 0 nesse caso, e o `omitempty` do Go faz o
// campo sumir do JSON — por isso o undefined chega até aqui.
function IndicadorVariacao({ atual, anterior }: { atual?: number; anterior?: number }) {
    if (!atual || !anterior) return null

    // Posição menor = melhor. Estava em 3, agora em 1 → subiu 2.
    const diferenca = anterior - atual

    if (diferenca === 0) {
        return (
            <span className="flex items-center text-muted-2" title="Mesma posição do mês passado">
                <Minus size={10} strokeWidth={3} />
            </span>
        )
    }

    const subiu = diferenca > 0

    return (
        <span
            className={`flex items-center font-anton text-[9px] leading-none select-none ${subiu ? 'text-green' : 'text-coral'
                }`}
            title={`${subiu ? 'Subiu' : 'Caiu'} ${Math.abs(diferenca)} ${Math.abs(diferenca) === 1 ? 'posição' : 'posições'} desde o mês passado`}
        >
            {subiu ? <ChevronUp size={10} strokeWidth={3} /> : <ChevronDown size={10} strokeWidth={3} />}
            {Math.abs(diferenca)}
        </span>
    )
}

const RANK_STYLES: Record<number, string> = {
    1: 'bg-gradient-to-b from-gold to-[#e08a1a] text-void shadow-[0_0_10px_rgba(255,197,66,0.6)]',
    2: 'bg-gradient-to-b from-[#E8ECF5] to-[#B9C0D4] text-void',
    3: 'bg-gradient-to-b from-[#D89A63] to-[#96602F] text-void',
}

export default function RankingCard({ anime, rank, mostrarVariacao, isSaved, isFavorite, isSaving, onToggleSave }: RankingCardProps) {
    const rankBadgeClass = RANK_STYLES[rank] ?? 'bg-void/90 border border-line text-muted-2'

    return (
        <Link
            to={`/anime/${anime.mal_id}`}
            className={`relative overflow-hidden flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-colors group ${isFavorite
                    ? 'foil-card border border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]'
                    : 'bg-panel border border-line hover:border-holo-2'
                }`}
        >
            {/* COLUNA ESQUERDA: Capa, Badge de posição e variação */}
            <div className="relative z-30 shrink-0 flex items-center gap-1.5">
                <div className="relative">
                    <img
                        src={anime.images?.jpg?.image_url}
                        alt={anime.title}
                        className="w-[52px] h-[52px] md:w-14 md:h-14 rounded-lg object-cover bg-panel-2 border border-line"
                    />
                    <span
                        className={`absolute -top-1.5 -left-1.5 flex items-center justify-center w-[22px] h-[22px] rounded-full font-anton text-[10px] select-none ${rankBadgeClass}`}
                    >
                        {rank}
                    </span>
                </div>

                {mostrarVariacao && (
                    <IndicadorVariacao atual={anime.current_rank} anterior={anime.previous_rank} />
                )}
            </div>

            {/* COLUNA DO MEIO: Título e Metadados (min-w-0 obriga o flex a respeitar o truncate) */}
            <div className="relative z-30 min-w-0 flex-1 flex flex-col justify-center gap-0.5">

                {/* Título */}
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] sm:text-sm truncate leading-tight pt-0.5">
                        {isFavorite && <span className="text-gold mr-1" title="Favorito">👑</span>}
                        {anime.title}
                    </span>
                    <BotaoCopiar
                        texto={anime.title}
                        className="opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity relative z-40 shrink-0"
                    />
                </div>

                {/* Linha 1: Status e Episódios */}
                <div className="flex items-center gap-1.5 font-mono text-[9.5px] sm:text-[10px] text-muted overflow-hidden">
                    {anime.genres?.[0] && (
                        <span className={`px-1.5 py-[2px] rounded border font-bold font-manrope shrink-0 leading-none ${getCategoryTheme(anime.genres[0].name)}`}>
                            {anime.genres[0].name}
                        </span>
                    )}
                    <span className="select-none truncate leading-none pt-[2px]">{anime.status} • {anime.episodes || '?'} EP</span>
                </div>

                {/* Linha 2: Transparência das notas. TROCADO PARA TRUNCATE para nunca quebrar a linha no celular */}
                <div className="font-mono text-[9px] sm:text-[10px] mt-0.5 select-none truncate leading-none">
                    {anime.bayesian_score ? (
                        <>
                            <span className="font-bold text-muted-2">AniList: ★ {anime.score > 0 ? anime.score.toFixed(1) : 'N/A'}</span>
                            <span className="text-muted opacity-70 ml-1">({anime.popularity?.toLocaleString('pt-BR')} usuários)</span>
                        </>
                    ) : (
                        <span className="text-muted opacity-70">{anime.popularity?.toLocaleString('pt-BR')} usuários</span>
                    )}
                </div>
            </div>

            {/* COLUNA DA DIREITA: Largura fixa (w-[42px]) para não ser esmagada pelos títulos longos */}
            <div className="relative z-30 flex flex-col items-center justify-between shrink-0 w-[42px] sm:w-[48px] h-full gap-2">
                <div className="flex flex-col items-center justify-center pt-1">
                    <span className="font-anton text-sm sm:text-[15px] text-gold select-none leading-none">
                        ★ {anime.bayesian_score ? anime.bayesian_score.toFixed(1) : (anime.score > 0 ? anime.score.toFixed(1) : 'N/A')}
                    </span>
                    <span className={`text-[7px] sm:text-[8px] font-bold uppercase mt-1 leading-none tracking-widest select-none ${anime.bayesian_score ? 'text-gold/70' : 'text-muted-2'}`}>
                        {anime.bayesian_score ? 'ANIDECK' : 'ANILIST'}
                    </span>
                </div>

                <button
                    onClick={(e) => {
                        e.preventDefault() // Garante que clicar no botão não navegue pro detalhe do anime
                        onToggleSave(e, anime.mal_id)
                    }}
                    disabled={isSaving}
                    aria-label={isSaved ? 'Remover do Deck' : 'Adicionar ao Deck'}
                    className={`flex w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full border-[1.5px] items-center justify-center font-bold text-base transition-colors select-none ${isSaved
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