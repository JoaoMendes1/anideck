// client/src/components/inicio/TrilhasDaCuradoria.tsx
// As trilhas viram cartões com um mosaico das capas, em vez de mais uma fileira de pôsteres.
// O toque abre a trilha inteira numa folha, com a nota da curadoria no topo.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Sheet from '../Sheet'
import { miniatura } from '../../lib/miniatura'
import { gradienteDoCard } from '../../lib/deckHelpers'

export interface TrilhaDaHome {
  id: string
  nome: string
  subtitulo: string
  nota: string
  animes: { mal_id: number; titulo: string; image_url: string }[]
}

export default function TrilhasDaCuradoria({ trilhas }: { trilhas: TrilhaDaHome[] }) {
  const [aberta, setAberta] = useState<TrilhaDaHome | null>(null)
  if (trilhas.length === 0) return null

  return (
    <>
      <div className="flex gap-4 overflow-x-auto custom-scrollbar snap-x snap-mandatory -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 pb-2.5 md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible">
        {trilhas.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAberta(t)}
            className="shrink-0 w-[260px] md:w-auto snap-start text-left bg-panel border border-line rounded-2xl overflow-hidden hover:border-holo-2/50 transition-colors group cursor-pointer"
          >
            <div className="grid grid-cols-4 gap-0.5 h-28 bg-void">
              {Array.from({ length: 4 }).map((_, i) => {
                const a = t.animes[i]
                return (
                  <div key={i} className={`relative overflow-hidden ${gradienteDoCard(i)}`}>
                    {a?.image_url && (
                      <img src={miniatura(a.image_url)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-anton text-[16px] uppercase leading-tight m-0 group-hover:text-holo-2 transition-colors line-clamp-1">{t.nome}</h3>
                <span className="shrink-0 font-mono text-[10px] text-muted-2">{t.animes.length} obras</span>
              </div>
              {t.subtitulo && <p className="text-xs text-muted mt-1 line-clamp-1">{t.subtitulo}</p>}
            </div>
          </button>
        ))}
      </div>

      <Sheet isOpen={aberta !== null} onClose={() => setAberta(null)} title={aberta?.nome ?? ''} maxWidthClass="md:max-w-2xl">
        {aberta && (
          <>
            {aberta.subtitulo && <p className="text-sm text-muted -mt-2 mb-3">{aberta.subtitulo}</p>}
            {aberta.nota && (
              <p className="text-[13px] text-text/85 italic border-l-2 border-holo-2/50 pl-3 mb-5">{aberta.nota}</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {aberta.animes.map((a, i) => (
                <Link key={a.mal_id} to={`/anime/${a.mal_id}`} onClick={() => setAberta(null)} className="group">
                  <div className={`relative aspect-[2/3] rounded-xl overflow-hidden border border-line ${gradienteDoCard(i)}`}>
                    {a.image_url && <img src={miniatura(a.image_url)} alt={a.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                  </div>
                  <span className="block mt-1.5 text-[11.5px] font-bold leading-snug line-clamp-2 group-hover:text-holo-3">{a.titulo}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-5 font-mono text-[10px] text-muted-2 uppercase tracking-widest">
              <Compass size={12} /> Trilha montada pela curadoria do AniDeck
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
