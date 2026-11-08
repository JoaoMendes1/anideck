// client/src/components/inicio/HeroProximoEpisodio.tsx
// O topo da Início para quem tem anime em andamento: responde "o que eu assisto agora" com o
// próximo episódio liberado e o botão de marcar, sem precisar abrir o anime.
import { Link } from 'react-router-dom'
import { Check, Lock, Play, Plus } from 'lucide-react'
import type { ParaContinuar } from '../../lib/inicio'

interface Props {
  item: ParaContinuar
  episodio: number
  marcando: boolean
  jaMarcado: boolean
  /** O episódio da vez ainda não foi ao ar (acontece logo depois de marcar o último liberado). */
  bloqueado: boolean
  onMarcar: () => void
}

export default function HeroProximoEpisodio({ item, episodio, marcando, jaMarcado, bloqueado, onMarcar }: Props) {
  const { anime } = item
  const total = anime.episodes || 0
  const vistos = episodio - 1
  const pct = total > 0 ? Math.min(100, Math.round((vistos / total) * 100)) : 0
  const fundo = anime.banner || anime.image_url
  const streaming = anime.streaming?.[0]

  return (
    <section className="relative rounded-[24px] overflow-hidden border border-line bg-panel mb-10 min-h-[260px] sm:min-h-[300px] flex items-end">
      {fundo && <img src={fundo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" />}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-void/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />

      <div className="relative z-10 w-full p-5 sm:p-8 flex flex-col md:flex-row md:items-end gap-5 md:gap-8">
        <Link to={`/anime/${anime.mal_id}`} className="shrink-0 hidden sm:block">
          {anime.image_url ? (
            <img src={anime.image_url} alt={anime.title} className="w-36 md:w-40 aspect-[2/3] object-cover rounded-2xl border-2 border-white/15 shadow-2xl" />
          ) : (
            <div className="w-36 md:w-40 aspect-[2/3] rounded-2xl bg-panel-2" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-holo-1/15 border border-holo-1/35 text-holo-1 font-mono text-[10px] font-bold uppercase tracking-widest mb-3">
            <Play size={10} fill="currentColor" /> Seu próximo episódio
          </span>
          <Link to={`/anime/${anime.mal_id}`}>
            <h2 className="font-anton text-2xl sm:text-4xl uppercase leading-tight text-text hover:text-holo-3 transition-colors line-clamp-2 m-0">
              {anime.title}
            </h2>
          </Link>
          <div className="flex items-baseline gap-3 mt-2 mb-3">
            <span className="font-anton text-xl sm:text-2xl text-holo-3">Ep. {episodio}</span>
            {total > 0 && <span className="font-mono text-[11px] text-muted">{vistos} de {total} vistos · {pct}%</span>}
          </div>
          {total > 0 && (
            <div className="h-1.5 max-w-md rounded-full bg-void/70 overflow-hidden border border-white/10 mb-5">
              <div className="h-full rounded-full bg-gradient-to-r from-holo-1 to-holo-3" style={{ width: `${pct}%` }} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {bloqueado ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-panel-2 border border-line text-muted-2 font-bold text-xs sm:text-sm">
                <Lock size={14} /> Ep. {episodio} ainda não saiu
              </span>
            ) : (
              <button
                type="button"
                disabled={marcando}
                onClick={onMarcar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60"
              >
                {jaMarcado ? <Check size={15} /> : <Plus size={15} />} Marcar ep. {episodio} visto
              </button>
            )}
            {streaming && (
              <a
                href={streaming.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-void/70 border border-line hover:border-holo-3 text-text font-bold text-xs sm:text-sm transition-colors"
              >
                <Play size={13} fill="currentColor" /> Assistir na {streaming.name}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
