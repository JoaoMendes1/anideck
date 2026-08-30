// client/src/components/AnimeCard.tsx
// Casco genérico do card em formato pôster. Usado pelo DeckCard (Meu Deck)
// e pelo SearchResultCard (Busca) — cada um só monta os "slots" diferentes.
import { useState, type CSSProperties, type ReactNode } from 'react'
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
    /** Atraso da animação do foil, já calculado pela lista (ver atrasoDoFoil).
        Vem pronto de fora porque só a lista sabe a posição do card. */
    foilDelay?: string
    statusBadge: ReactNode      // badge do topo-esquerda (obrigatório: todo card tem status)
    extraBadges?: ReactNode     // badges extras empilhadas abaixo do status (ex: "Novo EP")
    topRightAction?: ReactNode  // botão do canto superior direito (editar OU salvar)
}

export default function AnimeCard({
    malId, title, imageUrl, genre, score, ranking, isFavorite,
    gradientClass, foilDelay, statusBadge, extraBadges, topRightAction,
}: AnimeCardProps) {
    const [imagemFalhou, setImagemFalhou] = useState(false)
    const semCapa = !imageUrl || imagemFalhou
    const temNota = score !== null && score !== undefined

    return (
        <div
            className={`relative aspect-[3/4.2] rounded-[14px] overflow-hidden p-3 flex flex-col justify-end border transition-transform active:scale-[0.98] hover:-translate-y-1 group ${
                isFavorite ? 'foil-card border-gold/50 shadow-[0_0_15px_rgba(255,197,66,0.15)]' : `border-line bg-panel ${gradientClass}`
            }`}
            style={isFavorite && foilDelay ? ({ '--foil-atraso': foilDelay } as CSSProperties) : undefined}
        >
            <Link to={`/anime/${malId}`} className="absolute inset-0 z-10" aria-label={title} />

                        {semCapa && (
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-panel-2">
                    <span className="font-mono text-[8px] text-muted-2 uppercase tracking-widest text-center px-2">
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

                {/* Gênero sozinho na primeira linha. Dos três dados, é o único de
                    largura imprevisível — enquanto dividia uma linha só com ranking e
                    nota, era sempre ele que truncava: num card de ~160px sobravam ~29px
                    e "Slice of Life" precisa de ~74px. Com a linha inteira (~136px) cabe.
                    A altura do card não muda: o aspect-[3/4.2] a trava, então a segunda
                    linha sai do espaço de capa, não do tamanho do card. */}
                {genre && (
                    <div className="min-w-0 mb-1.5">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm truncate max-w-full ${getCategoryTheme(genre)}`}>
                            {genre}
                        </span>
                    </div>
                )}

                {/* ml-auto na nota, e não justify-between no pai: sem ranking, o
                    justify-between jogaria a nota pro lado esquerdo. */}
                <div className="flex items-end gap-1.5">
                    {ranking && (
                        <div className="shrink-0 font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border bg-panel-2/90 text-holo-3 border-holo-3/40">
                            🏆 #{ranking}
                        </div>
                    )}
                    <div className={`ml-auto shrink-0 font-anton text-[11px] sm:text-[12px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border ${temNota ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                        {temNota ? `★ ${score}` : 'S/N'}
                    </div>
                </div>
            </div>
        </div>
    )
}