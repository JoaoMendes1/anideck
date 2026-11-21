// client/src/components/AnimeCard.tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getCategoryTheme } from '../lib/filters'
import { miniatura } from '../lib/miniatura'
import { obterTextoProximoEp } from '../lib/deckHelpers'

interface NextAiringInfo {
    airingAt: number
    timeUntilAiring?: number
    episode: number
}

interface AnimeCardProps {
    priority?: boolean
    malId: number
    title: string
    imageUrl?: string
    genre?: string
    genres?: string[]
    year?: number
    score?: number | null
    ranking?: number
    isFavorite?: boolean
    gradientClass: string
    statusBadge: ReactNode
    extraBadges?: ReactNode
    topRightAction?: ReactNode
    nextAiringEpisode?: NextAiringInfo
}

export default function AnimeCard({
    priority = false,
    malId, title, imageUrl, genre, genres, year, score, ranking, isFavorite,
    gradientClass, statusBadge, extraBadges, topRightAction, nextAiringEpisode,
}: AnimeCardProps) {
    const [imagemFalhou, setImagemFalhou] = useState(false)
    // Relógio lido uma vez na montagem: Date.now() direto no render dá um valor diferente
    // a cada renderização (a regra de pureza do React acusa isso).
    const [agora] = useState(() => Date.now() / 1000)
    const semCapa = !imageUrl || imagemFalhou
    const temNota = score !== null && score !== undefined
    const temRanking = ranking !== undefined && ranking !== null

    const listaGeneros: string[] = genres && genres.length > 0
        ? genres.slice(0, 2)
        : genre
            ? [genre]
            : []

    const animacaoHover = isFavorite ? '' : 'hover:-translate-y-1'

    const proximoEpTexto = obterTextoProximoEp(nextAiringEpisode, agora)

    const posterContent = (
        <div
            className={`relative aspect-[3/4.3] w-full overflow-hidden transition-all duration-300 ${
                isFavorite
                    ? 'carta-rara-corpo'
                    : `rounded-2xl border border-line bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] group-hover:border-holo-3/50 ${gradientClass}`
            }`}
        >
            <Link to={`/anime/${malId}`} className="absolute inset-0 z-10" aria-label={title} />

            {semCapa && (
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-panel-2">
                    <span className="font-mono text-xs text-muted-2 uppercase tracking-widest text-center px-2">
                        Capa indisponível
                    </span>
                </div>
            )}

            {imageUrl && !imagemFalhou && (
                <img
                    src={miniatura(imageUrl)}
                    alt={title}
                    loading={priority ? "eager" : "lazy"}
                    onError={() => setImagemFalhou(true)}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-100 transition-transform duration-300 ease-out group-hover:scale-105"
                />
            )}

            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-void/80 via-void/25 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void via-void/70 to-transparent z-10 pointer-events-none" />

            {/* Nenhum selo deste card usa backdrop-blur, de propósito: evita custo em listas longas. */}
            <div className="absolute top-2.5 left-2.5 right-11 z-20 flex flex-col gap-1 items-start pointer-events-none">
                {statusBadge}
                {extraBadges}
                {temRanking && (
                    <div title={`#${ranking} no ranking geral da AniList`} className="hidden sm:flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md bg-void/85 text-holo-3 border border-holo-3/40">
                        <span className="text-[9px] leading-none">🏆</span>#{ranking}
                    </div>
                )}
            </div>

            {topRightAction && (
                <div className="absolute top-2.5 right-2.5 z-30">
                    {topRightAction}
                </div>
            )}

            {/* Rodapé interno do pôster: Tags e Nota */}
            <div className="absolute bottom-2.5 inset-x-2.5 z-20 flex items-center justify-between gap-1.5 pointer-events-none select-none">
                <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                    {listaGeneros.map((g, idx) => (
                        <span
                            key={g}
                            className={`${idx > 0 ? 'hidden sm:inline-block' : 'inline-block'} text-[8.5px] sm:text-[9px] leading-tight font-bold px-1.5 py-0.5 rounded border truncate max-w-[92px] ${getCategoryTheme(g)}`}
                        >
                            {g}
                        </span>
                    ))}
                </div>

                <div className={`shrink-0 font-mono text-[10.5px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-md border ${
                    temNota
                        ? 'bg-void/85 text-gold border-gold/45'
                        : 'bg-void/85 text-muted-2 border-line'
                }`}>
                    {temNota ? `★ ${score}` : 'S/N'}
                </div>
            </div>
        </div>
    )

    return (
        <div className={`flex flex-col group transition-transform duration-200 ${animacaoHover}`}>
            {isFavorite ? (
                <div className="relative">
                    <div
                        className="absolute -top-2.5 -left-2.5 z-40 w-7 h-7 rounded-full bg-void/95 border border-gold/60 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(255,197,66,0.45)] select-none pointer-events-none"
                        title="Favorito (Carta Rara)"
                    >
                        👑
                    </div>
                    <div className="carta-rara-moldura">
                        {posterContent}
                    </div>
                </div>
            ) : (
                posterContent
            )}

            {/* Legenda externa: Título legível em Manrope alinhado em até 2 linhas */}
            <div className="mt-2.5 flex flex-col gap-1 px-0.5 select-none">
                <Link
                    to={`/anime/${malId}`}
                    className="font-manrope font-extrabold text-[13px] sm:text-sm leading-snug tracking-tight text-text group-hover:text-holo-3 transition-colors line-clamp-2 break-words min-h-[2.45rem]"
                    title={title}
                >
                    {title}
                </Link>

                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-2 font-semibold tabular-nums truncate">
                    {year && <span className={proximoEpTexto ? 'hidden sm:inline' : undefined}>{year}</span>}
                    {year && proximoEpTexto && <span className="hidden sm:inline opacity-40">•</span>}
                    {proximoEpTexto && (
                        <span className="text-holo-3 truncate font-bold" title={proximoEpTexto}>
                            {proximoEpTexto}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
