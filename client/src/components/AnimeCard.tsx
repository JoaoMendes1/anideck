// client/src/components/AnimeCard.tsx
// Casco genérico do card em formato pôster. Usado pelo DeckCard (Meu Deck)
// e pelo SearchResultCard (Busca) — cada um só monta os "slots" diferentes.
import { useState, type ReactNode } from 'react'
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
    /** @deprecated Sobrou do foil antigo, que era um brilho em loop com atraso
        por card. A carta rara agora é só a moldura chanfrada — não há animação
        a defasar. Continua aceito só pra não quebrar quem ainda passa. */
    foilDelay?: string
    statusBadge: ReactNode      // badge do topo-esquerda (obrigatório: todo card tem status)
    extraBadges?: ReactNode     // badges extras empilhadas abaixo do status (ex: "Novo EP")
    topRightAction?: ReactNode  // botão do canto superior direito (editar OU salvar)
}

export default function AnimeCard({
    malId, title, imageUrl, genre, score, ranking, isFavorite,
    gradientClass, statusBadge, extraBadges, topRightAction,
}: AnimeCardProps) {
    const [imagemFalhou, setImagemFalhou] = useState(false)
    const semCapa = !imageUrl || imagemFalhou
    const temNota = score !== null && score !== undefined
    const temRanking = ranking !== undefined && ranking !== null

    // O favorito não leva o hover:-translate-y: quem sobe é a moldura, que é o
    // elemento de fora. Se os dois subissem, o movimento dobrava.
    const movimentoPadrao = isFavorite ? 'active:scale-[0.98]' : 'active:scale-[0.98] hover:-translate-y-1'

    const conteudo = (
        <div
            className={`relative aspect-[3/4.2] overflow-hidden p-3 pb-2.5 flex flex-col justify-end transition-transform group ${movimentoPadrao} ${
                isFavorite
                    ? 'carta-rara-corpo'
                    : `rounded-[14px] border border-line bg-panel ${gradientClass}`
            }`}
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

            {/* Gradiente mais fechado que antes: a base do card ganhou uma linha
                a mais de conteúdo, e o texto precisa de fundo pra continuar legível
                sobre capa clara. */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/85 to-transparent z-0 opacity-95" />

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

            {/*
              Ordem invertida em relação ao layout antigo: os metadados vêm ANTES
              do título, e o título fecha o card.

              A linha de metadados usa flex-wrap: o navegador tenta encaixar
              ranking, gênero e nota lado a lado e, quando não cabe, o gênero é
              quem desce sozinho pra linha seguinte. É por isso que a nota vem
              antes do gênero no HTML e volta pro lugar com "order" — assim quem
              quebra é sempre o elemento de largura imprevisível, não a nota.

              Antes disso, os três disputavam uma linha fixa em ~136px no grid
              de 2 colunas do celular, e quem cedia era sempre o gênero,
              virando "Adv...".
            */}
            <div className="relative z-20 mt-auto flex flex-col pointer-events-none select-none w-full justify-end">

                <div className="flex flex-wrap items-center gap-1">
                    {temRanking && (
                        <div className="order-1 shrink-0 flex items-center gap-1 font-anton text-[9.5px] md:text-[10.5px] px-1.5 py-0.5 rounded-md bg-panel-2/80 text-holo-3 border border-holo-3/40 backdrop-blur-sm shadow-[0_0_8px_rgba(63,224,240,0.25)]">
                            <span className="text-[8.5px] leading-none">🏆</span>#{ranking}
                        </div>
                    )}

                    <div className={`order-3 shrink-0 ml-auto font-anton text-[9.5px] md:text-[10.5px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border ${temNota ? 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.3)]' : 'bg-panel-2/80 text-muted-2 border-line'}`}>
                        {temNota ? `★ ${score}` : 'S/N'}
                    </div>

                    {genre && (
                        <div className={`order-2 min-w-0 max-w-full px-1.5 py-0.5 rounded-md border backdrop-blur-sm text-[8.5px] font-bold truncate ${getCategoryTheme(genre)}`}>
                            {genre}
                        </div>
                    )}
                </div>

                <h3 className="mt-2 pt-2 border-t border-dashed border-muted/20 font-anton text-[13px] md:text-[14px] uppercase leading-tight text-white drop-shadow-md line-clamp-2 break-words" title={title}>
                    {isFavorite && <span className="text-gold mr-1 inline-block -translate-y-[1px]" title="Favorito">👑</span>}
                    {title}
                </h3>
            </div>
        </div>
    )

    if (!isFavorite) return conteudo

    return <div className="carta-rara-moldura">{conteudo}</div>
}