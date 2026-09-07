// client/src/components/AnimeCard.tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getCategoryTheme } from '../lib/filters'

interface NextAiringInfo {
    airingAt: number
    timeUntilAiring?: number
    episode: number
}

interface AnimeCardProps {
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
    /** @deprecated Sobrou do foil antigo */
    foilDelay?: string
    statusBadge: ReactNode
    extraBadges?: ReactNode
    topRightAction?: ReactNode
    nextAiringEpisode?: NextAiringInfo
}

export default function AnimeCard({
    malId, title, imageUrl, genre, genres, year, score, ranking, isFavorite,
    gradientClass, statusBadge, extraBadges, topRightAction, nextAiringEpisode,
}: AnimeCardProps) {
    const [imagemFalhou, setImagemFalhou] = useState(false)
    const semCapa = !imageUrl || imagemFalhou
    const temNota = score !== null && score !== undefined
    const temRanking = ranking !== undefined && ranking !== null

    const listaGeneros: string[] = genres && genres.length > 0
        ? genres.slice(0, 2)
        : genre
            ? [genre]
            : []

    const animacaoHover = isFavorite ? '' : 'hover:-translate-y-1'

    // Formata o lançamento do próximo episódio de forma inteligente
    const obterTextoProximoEp = (info?: NextAiringInfo) => {
        if (!info?.airingAt || !info?.episode) return null

        const agora = Date.now() / 1000
        const segundosRestantes = info.airingAt - agora
        if (segundosRestantes <= 0) return null

        const dias = Math.floor(segundosRestantes / 86400)

        if (dias === 0) {
            const horas = Math.floor(segundosRestantes / 3600)
            return `EP ${info.episode} hoje${horas > 0 ? ` (~${horas}h)` : ''}`
        }
        if (dias === 1) return `EP ${info.episode} amanhã`
        if (dias < 7) return `EP ${info.episode} em ${dias}d`

        const data = new Date(info.airingAt * 1000)
        const diaMes = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return `EP ${info.episode} • ${diaMes}`
    }

    const proximoEpTexto = obterTextoProximoEp(nextAiringEpisode)

    const posterContent = (
        <div
            className={`relative aspect-[3/4.3] w-full overflow-hidden transition-all duration-300 ${
                isFavorite
                    ? 'carta-rara-corpo'
                    : `rounded-[14px] border border-line bg-panel-2 ${gradientClass}`
            }`}
        >
            <Link to={`/anime/${malId}`} className="absolute inset-0 z-10" aria-label={title} />

            {semCapa && (
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-panel-2">
                    <span className="font-mono text-[9px] text-muted-2 uppercase tracking-widest text-center px-2">
                        Capa indisponível
                    </span>
                </div>
            )}

            {imageUrl && !imagemFalhou && (
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    onError={() => setImagemFalhou(true)}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-100 transition-transform duration-300 ease-out group-hover:scale-105"
                />
            )}

            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-void/75 via-void/25 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-void/85 via-void/35 to-transparent z-10 pointer-events-none" />

            {/* Badges superiores */}
            <div className="absolute top-2.5 left-2.5 right-11 z-20 flex flex-col gap-1 items-start pointer-events-none">
                {statusBadge}
                {extraBadges}
                {temRanking && (
                    <div className="flex items-center gap-1 font-anton text-[9.5px] px-1.5 py-0.5 rounded-md bg-void/80 text-holo-3 border border-holo-3/40 backdrop-blur-md shadow-[0_0_8px_rgba(63,224,240,0.25)]">
                        <span className="text-[8.5px] leading-none">🏆</span>#{ranking}
                    </div>
                )}
            </div>

            {/* Botão de ação (editar) */}
            {topRightAction && (
                <div className="absolute top-2.5 right-2.5 z-30">
                    {topRightAction}
                </div>
            )}

            {/* Rodapé interno do pôster: Tags e Nota */}
            <div className="absolute bottom-2.5 inset-x-2.5 z-20 flex items-center justify-between gap-1.5 pointer-events-none select-none">
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                    {listaGeneros.map((g) => (
                        <span
                            key={g}
                            className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border backdrop-blur-md truncate max-w-[85px] ${getCategoryTheme(g)}`}
                        >
                            {g}
                        </span>
                    ))}
                </div>

                <div className={`shrink-0 font-anton text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-md border ${
                    temNota
                        ? 'bg-void/80 text-gold border-gold/50 shadow-[0_0_8px_rgba(255,197,66,0.3)]'
                        : 'bg-void/80 text-muted-2 border-line'
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
                        className="absolute -top-2.5 -left-2.5 z-40 w-7 h-7 rounded-full bg-void/90 border border-gold/60 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(255,197,66,0.45)] backdrop-blur-md select-none pointer-events-none"
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

            {/* Legenda externa: Título com altura fixa de 2 linhas para prateleira perfeita */}
            <div className="mt-2 flex flex-col gap-1 px-0.5 select-none">
                <Link
                    to={`/anime/${malId}`}
                    className="font-anton text-[13px] sm:text-[14px] uppercase leading-tight tracking-wide text-text group-hover:text-holo-3 transition-colors line-clamp-2 break-words h-[34px] sm:h-[36px] flex items-start"
                    title={title}
                >
                    {title}
                </Link>

                {/* Ano e Próximo Episódio rigorosamente alinhados */}
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-2 font-semibold truncate">
                    {year && <span>{year}</span>}
                    {year && proximoEpTexto && <span className="opacity-40">•</span>}
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