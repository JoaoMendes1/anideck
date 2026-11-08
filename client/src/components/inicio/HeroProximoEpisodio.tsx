// client/src/components/inicio/HeroProximoEpisodio.tsx
// O topo da Início para quem tem anime em andamento: responde "o que eu assisto agora" com o
// próximo episódio liberado, resumo da obra, atalho para assistir na plataforma certa e botão
// de marcar visto sem precisar navegar.
import { Link } from 'react-router-dom'
import { Check, Clock, Lock, Play, Plus, Tv } from 'lucide-react'
import { artigoStreaming, escolherLinkStreaming, type ParaContinuar } from '../../lib/inicio'

interface Props {
  item: ParaContinuar
  episodio: number
  marcando: boolean
  jaMarcado: boolean
  /** O episódio da vez ainda não foi ao ar (acontece logo depois de marcar o último liberado). */
  bloqueado: boolean
  onMarcar: () => void
}

function tempoRestante(airingAt?: number): string | null {
  if (!airingAt) return null
  const diffSegundos = airingAt - Math.floor(Date.now() / 1000)
  if (diffSegundos <= 0) return 'a qualquer momento'
  const dias = Math.floor(diffSegundos / 86400)
  const horas = Math.floor((diffSegundos % 86400) / 3600)
  if (dias > 0) return `em ${dias}d ${horas}h`
  if (horas > 0) return `em ${horas}h`
  const minutos = Math.max(1, Math.floor((diffSegundos % 3600) / 60))
  return `em ${minutos}m`
}

export default function HeroProximoEpisodio({ item, episodio, marcando, jaMarcado, bloqueado, onMarcar }: Props) {
  const { anime } = item
  const total = anime.episodes || 0
  const vistos = Math.max(0, episodio - 1)
  const pct = total > 0 ? Math.min(100, Math.round((vistos / total) * 100)) : 0
  const fundo = anime.banner || anime.image_url
  const streaming = escolherLinkStreaming(anime.streaming)
  const epTitulo = anime.streamingEpisodes?.[episodio - 1]?.title
  const previsao = bloqueado && anime.nextAiringEpisode?.airingAt ? tempoRestante(anime.nextAiringEpisode.airingAt) : null

  return (
    <section className="relative rounded-[24px] overflow-hidden border border-line bg-panel mb-10 min-h-[280px] sm:min-h-[320px] flex items-end shadow-2xl">
      {fundo && <img src={fundo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 transition-transform duration-700 hover:scale-105" />}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/90 to-void/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />

      <div className="relative z-10 w-full p-5 sm:p-8 flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
        <Link to={`/anime/${anime.mal_id}`} className="shrink-0 hidden sm:block group relative">
          {anime.image_url ? (
            <img
              src={anime.image_url}
              alt={anime.title}
              className="w-36 md:w-44 aspect-[2/3] object-cover rounded-2xl border-2 border-white/15 shadow-2xl transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-36 md:w-44 aspect-[2/3] rounded-2xl bg-panel-2 border border-line" />
          )}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-holo-3/0 group-hover:ring-holo-3/40 transition-all pointer-events-none" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-holo-1/15 border border-holo-1/35 text-holo-1 font-mono text-[10px] font-bold uppercase tracking-widest">
              <Play size={10} fill="currentColor" /> Seu próximo episódio
            </span>
            {anime.genres?.slice(0, 3).map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full bg-panel-2/90 border border-line text-muted font-mono text-[10px]">
                {g}
              </span>
            ))}
          </div>

          <Link to={`/anime/${anime.mal_id}`}>
            <h2 className="font-anton text-2xl sm:text-4xl uppercase leading-tight text-text hover:text-holo-3 transition-colors line-clamp-2 m-0">
              {anime.title}
            </h2>
          </Link>

          {anime.synopsis && (
            <p className="text-xs sm:text-sm text-muted/90 line-clamp-2 max-w-2xl mt-1.5 mb-2 leading-relaxed">
              {anime.synopsis}
            </p>
          )}

          <div className="flex flex-wrap items-baseline gap-2.5 mt-2 mb-3">
            <span className="font-anton text-xl sm:text-2xl text-holo-3 tracking-wide">Ep. {episodio}</span>
            {epTitulo && (
              <span className="text-xs sm:text-sm font-medium text-text/80 line-clamp-1 italic">
                · {epTitulo}
              </span>
            )}
            {total > 0 ? (
              <span className="font-mono text-[11px] text-muted">
                {vistos} de {total} vistos · {pct}%
              </span>
            ) : vistos > 0 ? (
              <span className="font-mono text-[11px] text-muted">{vistos} assistidos</span>
            ) : null}
          </div>

          {total > 0 && (
            <div className="h-1.5 max-w-md rounded-full bg-void/70 overflow-hidden border border-white/10 mb-5">
              <div className="h-full rounded-full bg-gradient-to-r from-holo-1 to-holo-3" style={{ width: `${pct}%` }} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {bloqueado ? (
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-panel-2 border border-line text-muted-2 font-bold text-xs sm:text-sm">
                <Lock size={14} className="text-gold" />
                Ep. {episodio} ainda não saiu
                {previsao && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    <Clock size={11} /> {previsao}
                  </span>
                )}
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-void/80 border border-line hover:border-holo-3 text-text font-bold text-xs sm:text-sm transition-colors"
              >
                <Play size={13} fill="currentColor" /> Assistir {artigoStreaming(streaming.name)} {streaming.name}
              </a>
            )}

            <Link
              to={`/anime/${anime.mal_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-panel-2/90 border border-line hover:border-holo-2 text-muted hover:text-text font-bold text-xs sm:text-sm transition-colors"
            >
              <Tv size={13} /> Ver detalhes
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
