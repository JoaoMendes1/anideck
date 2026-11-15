// client/src/components/inicio/PalcoDestaques.tsx
// Os destaques da curadoria como um palco: uma obra em evidência (arte, sinopse, tags) e
// a fila das próximas ao lado. Troca sozinho a cada alguns segundos, pausa com o mouse em
// cima ou com foco dentro, e não troca sozinho para quem pediu menos movimento.
//
// Como a vitrine do Meu Deck, não depende da AniList: tudo vem de `curated_animes`.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import type { CuratedAnime } from '../../types/curation'
import { lerDaMemoria, guardarNaMemoria } from '../../lib/cacheDeTela'
import { miniatura } from '../../lib/miniatura'
import { buscarDestaquesDaCuradoria } from '../../lib/destaques'

const MAXIMO = 12
const NA_FILA = 5
const INTERVALO_MS = 8000

export default function PalcoDestaques() {
  const [emMemoria] = useState(() => lerDaMemoria<CuratedAnime[]>('vitrine'))
  const [destaques, setDestaques] = useState<CuratedAnime[]>(emMemoria ?? [])
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    let cancelado = false
    buscarDestaquesDaCuradoria()
      .then(dados => {
        const lista = dados.slice(0, MAXIMO)
        guardarNaMemoria('vitrine', lista)
        if (!cancelado) setDestaques(lista)
      })
      // A seção é acessória: sem resposta, fica o que estava em memória ou nada.
      .catch(() => {})
    return () => { cancelado = true }
  }, [])

  const total = destaques.length

  useEffect(() => {
    if (pausado || total < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const relogio = window.setInterval(() => setIndice(i => (i + 1) % total), INTERVALO_MS)
    return () => window.clearInterval(relogio)
  }, [pausado, total])

  if (total === 0) return null

  const atual = destaques[indice % total]
  const fundo = atual.custom_banner_image || atual.custom_cover_image
  const tags = (atual.custom_tags ?? []).slice(0, 4)
  const fila = Array.from({ length: Math.min(NA_FILA, total - 1) }, (_, k) => (indice + 1 + k) % total)
  const ir = (passo: number) => setIndice(i => (i + passo + total) % total)

  return (
    <section
      className="mb-11"
      aria-roledescription="carrossel"
      aria-label="Destaques da curadoria"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="flex items-end justify-between gap-4 mb-4 select-none">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-holo-1 m-0 mb-1">Curadoria do AniDeck</p>
          <h2 className="font-anton text-xl sm:text-2xl uppercase m-0 flex items-center gap-2 tracking-wide">
            <Sparkles size={18} className="text-holo-1 shrink-0" aria-hidden /> Em destaque
          </h2>
        </div>
        {total > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-2 tabular-nums">
              {String((indice % total) + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => ir(-1)} aria-label="Destaque anterior" className="w-9 h-9 grid place-items-center rounded-full border border-line bg-panel hover:border-holo-3 cursor-pointer">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button type="button" onClick={() => ir(1)} aria-label="Próximo destaque" className="w-9 h-9 grid place-items-center rounded-full border border-line bg-panel hover:border-holo-3 cursor-pointer">
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel min-h-[380px] sm:min-h-[420px] flex items-end">
          {fundo && (
            <img key={fundo} src={fundo} alt="" className="palco-destaque-fundo absolute inset-0 w-full h-full object-cover opacity-45" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-void/20" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />

          <div key={atual.mal_id} className="palco-destaque-texto relative w-full flex items-end gap-6 p-5 sm:p-8">
            {atual.custom_cover_image && (
              <Link to={`/anime/${atual.mal_id}`} tabIndex={-1} aria-hidden className="hidden sm:block shrink-0 w-36 lg:w-44">
                <img
                  src={miniatura(atual.custom_cover_image)}
                  alt=""
                  className="w-full aspect-[2/3] object-cover rounded-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                />
              </Link>
            )}
            <div className="min-w-0 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {atual.custom_format && (
                  <span className="px-2 py-0.5 rounded-md bg-holo-1/15 border border-holo-1/40 font-mono text-xs font-bold uppercase tracking-widest text-holo-1">{atual.custom_format}</span>
                )}
                {tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-void/60 border border-white/10 text-xs font-bold text-text/90">{tag}</span>
                ))}
              </div>
              <h3 className="font-anton uppercase text-3xl sm:text-4xl lg:text-5xl leading-[1.02] m-0 line-clamp-3">{atual.custom_title}</h3>
              {atual.custom_synopsis && (
                <p className="text-sm text-muted leading-relaxed mt-3 mb-0 line-clamp-3">{atual.custom_synopsis}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <Link
                  to={`/anime/${atual.mal_id}`}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-bold text-sm"
                >
                  Ver a obra <ChevronRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          {total > 1 && !pausado && (
            <span key={`${indice}-tempo`} aria-hidden className="palco-destaque-tempo absolute left-0 bottom-0 h-0.5 w-full origin-left bg-gradient-to-r from-holo-1 to-holo-3" />
          )}
        </div>

        {fila.length > 0 && (
          <ol className="m-0 p-0 list-none flex xl:flex-col gap-2.5 overflow-x-auto xl:overflow-visible custom-scrollbar pb-2 xl:pb-0">
            {fila.map((posicao, k) => {
              const obra = destaques[posicao]
              return (
                <li key={obra.mal_id} className="shrink-0 w-64 xl:w-auto xl:flex-1 xl:min-h-0">
                  <button
                    type="button"
                    onClick={() => setIndice(posicao)}
                    className="group w-full h-full flex items-center gap-3 rounded-2xl border border-line bg-panel/70 p-2.5 text-left transition-colors hover:border-holo-3/60 hover:bg-panel cursor-pointer"
                  >
                    {obra.custom_cover_image ? (
                      <img src={miniatura(obra.custom_cover_image)} alt="" loading="lazy" className="w-11 h-16 shrink-0 object-cover rounded-lg border border-white/10" />
                    ) : (
                      <span className="w-11 h-16 shrink-0 rounded-lg bg-panel-2" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs text-muted-2 uppercase tracking-widest">{k === 0 ? 'A seguir' : obra.custom_format || 'Destaque'}</span>
                      <span className="block text-sm font-bold leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors">{obra.custom_title}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
