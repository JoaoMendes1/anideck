// client/src/components/SheetAnimesDoGenero.tsx
// O drill-down da Afinidade: responde "assisti 30 de Fantasia — mas quais?".
//
// É apresentacional de propósito. Quem busca os dados é a página de Estatísticas, que já
// tem o token e o controle de qual gênero está aberto; assim este componente não precisa
// saber nada sobre autenticação nem sobre a API.
import AnimeCard from './AnimeCard'
import Sheet from './Sheet'
import { getStatusTheme } from '../lib/deckHelpers'

export interface AnimeDoGenero {
    mal_id: number
    title: string
    nota: number | null
    status: string
    image_url?: string
}

interface SheetAnimesDoGeneroProps {
    genero: string | null
    animes: AnimeDoGenero[]
    carregando: boolean
    onClose: () => void
}

export default function SheetAnimesDoGenero({ genero, animes, carregando, onClose }: SheetAnimesDoGeneroProps) {
    return (
        <Sheet
            isOpen={genero !== null}
            onClose={onClose}
            title={genero ? `Seus animes de ${genero}` : ''}
            maxWidthClass="md:max-w-2xl"
        >
            {carregando ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {/* Placeholders com o mesmo formato dos cards, pra lista não "pular"
                        de tamanho quando os dados chegarem. */}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4.2] rounded-[14px] shimmer border border-line" />
                    ))}
                </div>
            ) : animes.length === 0 ? (
                <p className="text-[12.5px] text-muted-2 py-4">Nenhum anime encontrado nessa categoria.</p>
            ) : (
                <>
                    <p className="text-[11px] text-muted-2 mb-4 font-mono">
                        {animes.length} {animes.length === 1 ? 'anime' : 'animes'}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {animes.map((anime, index) => {
                            const tema = getStatusTheme(anime.status)
                            return (
                                <AnimeCard
                                    key={anime.mal_id}
                                    malId={anime.mal_id}
                                    title={anime.title || `ID: ${anime.mal_id}`}
                                    imageUrl={anime.image_url}
                                    score={anime.nota}
                                    gradientClass={`card-g${(index % 5) + 1}`}
                                    statusBadge={
                                        <span className={`select-none text-[9px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider border backdrop-blur-md truncate max-w-full ${tema.bg} ${tema.text} ${tema.border}`}>
                                            {anime.status}
                                        </span>
                                    }
                                />
                            )
                        })}
                    </div>
                </>
            )}
        </Sheet>
    )
}
