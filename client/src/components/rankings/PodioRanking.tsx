// client/src/components/rankings/PodioRanking.tsx
// Os três primeiros do ranking em destaque: pôster grande, posição e nota. O 1º fica no
// meio e mais alto, como num pódio; no celular, os três lado a lado em tamanho menor.
import { Link } from 'react-router-dom'
import { Crown, Star } from 'lucide-react'
import { miniatura } from '../../lib/miniatura'

interface AnimeDoPodio {
  mal_id: number
  title: string
  score: number
  bayesian_score?: number
  images: { jpg: { image_url: string } }
  genres?: { name: string }[]
}

// Escritas por extenso: o Tailwind não enxerga classe montada em tempo de execução.
const ESTILO = [
  { ordem: 'order-2', altura: 'sm:-translate-y-6', borda: 'border-gold/70', brilho: 'shadow-[0_0_60px_rgba(255,197,66,0.25)]', medalha: 'bg-gold text-void', texto: 'text-gold' },
  { ordem: 'order-1', altura: '', borda: 'border-holo-3/50', brilho: 'shadow-[0_0_40px_rgba(63,224,240,0.15)]', medalha: 'bg-holo-3 text-void', texto: 'text-holo-3' },
  { ordem: 'order-3', altura: '', borda: 'border-holo-1/50', brilho: 'shadow-[0_0_40px_rgba(255,79,216,0.15)]', medalha: 'bg-holo-1 text-void', texto: 'text-holo-1' },
]

export default function PodioRanking({ animes }: { animes: AnimeDoPodio[] }) {
  if (animes.length < 3) return null
  return (
    <section aria-label="Três primeiros do ranking" className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-8 pb-4 mb-6 max-w-2xl mx-auto">
      {animes.slice(0, 3).map((anime, i) => {
        const e = ESTILO[i]
        const nota = anime.bayesian_score || anime.score
        return (
          <Link key={anime.mal_id} to={`/anime/${anime.mal_id}`} className={`group ${e.ordem} ${e.altura} min-w-0`}>
            <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden border-2 bg-panel-2 ${e.borda} ${e.brilho} transition-transform duration-300 group-hover:-translate-y-1.5`}>
              {anime.images?.jpg?.image_url && (
                <img src={miniatura(anime.images.jpg.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent" />
              <span className={`absolute top-2 left-2 sm:top-3 sm:left-3 w-8 h-8 sm:w-11 sm:h-11 grid place-items-center rounded-full font-anton text-base sm:text-xl ${e.medalha}`}>
                {i === 0 ? <Crown size={18} aria-label="1º" /> : i + 1}
              </span>
              {nota > 0 && (
                <span className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-void/80 backdrop-blur-md border border-white/10 font-mono text-xs sm:text-sm font-bold text-gold tabular-nums">
                  <Star size={12} aria-hidden /> {nota.toFixed(1)}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-xs sm:text-base font-bold leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors">{anime.title}</h3>
            {anime.genres && anime.genres.length > 0 && (
              <p className={`hidden sm:block font-mono text-xs uppercase tracking-widest mt-1 truncate ${e.texto}`}>{anime.genres.slice(0, 2).map(g => g.name).join(' · ')}</p>
            )}
          </Link>
        )
      })}
    </section>
  )
}
