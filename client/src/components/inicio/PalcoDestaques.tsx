// client/src/components/inicio/PalcoDestaques.tsx
// Palco "Em destaque" configurável: escolhe entre Curadoria, Em lançamento, Bem avaliados e Em alta (#275).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Sparkles } from 'lucide-react'
import type { CuratedAnime } from '../../types/curation'
import type { AnimeDaApi } from '../../types/anime'
import { lerDaMemoria, guardarNaMemoria } from '../../lib/cacheDeTela'
import { miniatura } from '../../lib/miniatura'
import { buscarDestaquesDaCuradoria } from '../../lib/destaques'
import { obterEmAltaComunidade } from '../../lib/comunidadeAnimes'
import { FONTES_DESTAQUE, type FonteDestaqueInicio } from '../../lib/inicioPreferencias'

const MAXIMO = 12
const NA_FILA = 5
const INTERVALO_MS = 8000

interface ObraPalco {
  mal_id: number
  titulo: string
  capa: string
  banner: string
  formato?: string
  tags: string[]
  sinopse?: string
}

function deCuradoria(dados: CuratedAnime[]): ObraPalco[] {
  return dados.slice(0, MAXIMO).map(c => ({
    mal_id: c.mal_id,
    titulo: c.custom_title,
    capa: c.custom_cover_image || '',
    banner: c.custom_banner_image || c.custom_cover_image || '',
    formato: c.custom_format,
    tags: c.custom_tags ?? [],
    sinopse: c.custom_synopsis,
  }))
}

function deAnimeApi(dados: AnimeDaApi[]): ObraPalco[] {
  return dados.slice(0, MAXIMO).map(a => {
    const capa = a.images?.jpg?.image_url || ''
    return {
      mal_id: a.mal_id,
      titulo: a.title,
      capa,
      banner: a.bannerImage || capa,
      formato:
        a.score && a.score > 0
          ? `★ ${a.score.toFixed(1)}`
          : a.episodes > 0
            ? `${a.episodes} eps`
            : a.season_year
              ? String(a.season_year)
              : undefined,
      tags: (a.genres ?? []).slice(0, 4).map(g => g.name),
      sinopse: a.synopsis,
    }
  })
}

async function carregarObrasDaFonte(fonte: FonteDestaqueInicio): Promise<ObraPalco[]> {
  if (fonte === 'curadoria') {
    const dados = await buscarDestaquesDaCuradoria()
    return deCuradoria(dados)
  }
  if (fonte === 'lancamento') {
    const res = await fetch('/api/search?status=RELEASING&perPage=12')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = (await res.json()) as { data?: AnimeDaApi[] }
    return deAnimeApi(payload.data ?? [])
  }
  if (fonte === 'bem_avaliados') {
    const res = await fetch('/api/ranking?page=1&perPage=12')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = (await res.json()) as { data?: AnimeDaApi[] }
    return deAnimeApi(payload.data ?? [])
  }
  const emAlta = await obterEmAltaComunidade(14, MAXIMO)
  return emAlta.itens.map(item => ({
    mal_id: item.mal_id,
    titulo: item.titulo,
    capa: item.imagem_url || '',
    banner: item.imagem_url || '',
    formato: `${item.episodios_recentes} eps recentes`,
    tags: item.comentarios_recentes > 0 ? [`${item.comentarios_recentes} comentários`] : [],
    sinopse: `${item.usuarios_ativos < 0 ? 'Menos de 3' : item.usuarios_ativos} pessoas ativas nos últimos ${emAlta.dias} dias no AniDeck.`,
  }))
}

interface PalcoDestaquesProps {
  fonte?: FonteDestaqueInicio
  aoMudarFonte?: (fonte: FonteDestaqueInicio) => void
  minimizada?: boolean
  onAlternarMinimizar?: () => void
}

export default function PalcoDestaques({
  fonte = 'curadoria',
  aoMudarFonte,
  minimizada = false,
  onAlternarMinimizar,
}: PalcoDestaquesProps) {
  const chaveMemoria = `vitrine:${fonte}`
  const [destaques, setDestaques] = useState<ObraPalco[]>(() => lerDaMemoria<ObraPalco[]>(chaveMemoria) ?? [])
  const [carregando, setCarregando] = useState(() => !lerDaMemoria<ObraPalco[]>(chaveMemoria))
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    let cancelado = false
    const guardados = lerDaMemoria<ObraPalco[]>(chaveMemoria)
    if (guardados) {
      setDestaques(guardados)
      setCarregando(false)
    } else {
      setCarregando(true)
    }
    setIndice(0)

    carregarObrasDaFonte(fonte)
      .then(lista => {
        guardarNaMemoria(chaveMemoria, lista)
        if (!cancelado) setDestaques(lista)
      })
      .catch(() => {
        if (!cancelado && !guardados) setDestaques([])
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [fonte, chaveMemoria])

  const total = destaques.length

  useEffect(() => {
    if (pausado || minimizada || total < 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const relogio = window.setInterval(() => setIndice(i => (i + 1) % total), INTERVALO_MS)
    return () => window.clearInterval(relogio)
  }, [pausado, minimizada, total])

  const infoFonte = FONTES_DESTAQUE.find(f => f.id === fonte) ?? FONTES_DESTAQUE[0]
  if (total === 0 && !carregando && !aoMudarFonte && fonte === 'curadoria') return null

  const atual = total > 0 ? destaques[indice % total] : null
  const fundo = atual?.banner || atual?.capa
  const tags = (atual?.tags ?? []).slice(0, 4)
  const fila = total > 1 ? Array.from({ length: Math.min(NA_FILA, total - 1) }, (_, k) => (indice + 1 + k) % total) : []
  const ir = (passo: number) => setIndice(i => (i + passo + total) % total)

  return (
    <section
      className="mb-11"
      aria-roledescription="carrossel"
      aria-label="Em destaque"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4 select-none">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-holo-1 m-0 mb-1">
            {infoFonte.subtitulo}
          </p>
          <h2 className="font-anton text-xl sm:text-2xl uppercase m-0 flex items-center gap-2 tracking-wide">
            <Sparkles size={18} className="text-holo-1 shrink-0" aria-hidden /> Em destaque
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {aoMudarFonte && (
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-panel border border-line">
              {FONTES_DESTAQUE.map(opcao => {
                const ativa = opcao.id === fonte
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => aoMudarFonte(opcao.id)}
                    aria-pressed={ativa}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                      ativa
                        ? 'bg-holo-1 text-void'
                        : 'text-muted hover:text-text hover:bg-panel-2'
                    }`}
                  >
                    {opcao.rotulo}
                  </button>
                )
              })}
            </div>
          )}

          {!minimizada && total > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-2 tabular-nums px-1">
                {String((indice % total) + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Destaque anterior"
                className="w-8 h-8 grid place-items-center rounded-full border border-line bg-panel hover:border-holo-3 cursor-pointer"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Próximo destaque"
                className="w-8 h-8 grid place-items-center rounded-full border border-line bg-panel hover:border-holo-3 cursor-pointer"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          )}

          {onAlternarMinimizar && (
            <button
              type="button"
              onClick={onAlternarMinimizar}
              aria-label={minimizada ? 'Expandir Em destaque' : 'Minimizar Em destaque'}
              className="w-8 h-8 grid place-items-center rounded-full border border-line bg-panel hover:border-holo-2 text-muted hover:text-text cursor-pointer"
            >
              {minimizada ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>
      </div>

      {minimizada ? (
        <div className="rounded-2xl border border-line bg-panel px-4 py-3 flex items-center justify-between gap-3 text-xs text-muted">
          <span className="truncate">
            Seção minimizada · exibindo <strong className="text-text">{infoFonte.rotulo}</strong>
            {atual ? ` (${atual.titulo})` : ''}
          </span>
          {onAlternarMinimizar && (
            <button
              type="button"
              onClick={onAlternarMinimizar}
              className="font-mono text-xs text-holo-3 hover:underline shrink-0 cursor-pointer"
            >
              Mostrar
            </button>
          )}
        </div>
      ) : carregando && total === 0 ? (
        <div className="rounded-3xl border border-line bg-panel min-h-[260px] shimmer" />
      ) : !atual ? (
        <div className="rounded-2xl border border-line bg-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted m-0">
            Nenhum anime disponível nesta seleção no momento.
          </p>
          {aoMudarFonte && fonte !== 'curadoria' && (
            <button
              type="button"
              onClick={() => aoMudarFonte('curadoria')}
              className="px-4 py-2 rounded-full bg-holo-1/15 border border-holo-1/40 text-holo-1 font-mono text-xs font-bold uppercase cursor-pointer self-start"
            >
              Voltar para Curadoria
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel min-h-[340px] sm:min-h-[390px] flex items-end">
            {fundo && (
              <img key={fundo} src={fundo} alt="" className="palco-destaque-fundo absolute inset-0 w-full h-full object-cover opacity-45" />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-void/20" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />

            <div key={`${fonte}-${atual.mal_id}`} className="palco-destaque-texto relative w-full flex items-end gap-6 p-5 sm:p-8">
              {atual.capa && (
                <Link to={`/anime/${atual.mal_id}`} tabIndex={-1} aria-hidden className="hidden sm:block shrink-0 w-36 lg:w-44">
                  <img
                    src={miniatura(atual.capa)}
                    alt=""
                    className="w-full aspect-[2/3] object-cover rounded-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                  />
                </Link>
              )}
              <div className="min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {atual.formato && (
                    <span className="px-2 py-0.5 rounded-md bg-holo-1/15 border border-holo-1/40 font-mono text-xs font-bold uppercase tracking-widest text-holo-1">
                      {atual.formato}
                    </span>
                  )}
                  {tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-void/60 border border-white/10 text-xs font-bold text-text/90">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-anton uppercase text-2xl sm:text-4xl lg:text-5xl leading-[1.02] m-0 line-clamp-3">
                  {atual.titulo}
                </h3>
                {atual.sinopse && (
                  <p className="text-sm text-muted leading-relaxed mt-3 mb-0 line-clamp-3">
                    {atual.sinopse.replace(/\*\*/g, '').replace(/\*/g, '')}
                  </p>
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
              <span key={`${fonte}-${indice}-tempo`} aria-hidden className="palco-destaque-tempo absolute left-0 bottom-0 h-0.5 w-full origin-left bg-gradient-to-r from-holo-1 to-holo-3" />
            )}
          </div>

          {fila.length > 0 && (
            <ol className="m-0 p-0 list-none flex gap-2.5 overflow-x-auto custom-scrollbar pb-2">
              {fila.map((posicao, k) => {
                const obra = destaques[posicao]
                return (
                  <li key={`${fonte}-${obra.mal_id}`} className="shrink-0 w-64 2xl:w-auto 2xl:flex-1 2xl:min-w-0">
                    <button
                      type="button"
                      onClick={() => setIndice(posicao)}
                      className="group w-full h-full flex items-center gap-3 rounded-2xl border border-line bg-panel/70 p-2.5 text-left transition-colors hover:border-holo-3/60 hover:bg-panel cursor-pointer"
                    >
                      {obra.capa ? (
                        <img src={miniatura(obra.capa)} alt="" loading="lazy" className="w-11 h-16 shrink-0 object-cover rounded-lg border border-white/10" />
                      ) : (
                        <span className="w-11 h-16 shrink-0 rounded-lg bg-panel-2" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-xs text-muted-2 uppercase tracking-widest">
                          {k === 0 ? 'A seguir' : obra.formato || 'Destaque'}
                        </span>
                        <span className="block text-sm font-bold leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors">
                          {obra.titulo}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
