// client/src/components/rankings/SecaoEmAltaComunidade.tsx
// Seção "Animes em alta": obras com mais atividade recente da comunidade
// (episódios marcados, comentários e reações), com peso negativo para drops.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, MessageSquare, PlayCircle, Sparkles, TrendingDown, Users } from 'lucide-react'
import { obterEmAltaComunidade, type EmAltaComunidadeItem } from '../../lib/comunidadeAnimes'

interface Props {
  compacta?: boolean
}

export default function SecaoEmAltaComunidade({ compacta = false }: Props) {
  const [itens, setItens] = useState<EmAltaComunidadeItem[]>([])
  const [dias, setDias] = useState(14)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    obterEmAltaComunidade(14, compacta ? 10 : 12)
      .then(res => {
        if (!ativo) return
        setDias(res.dias)
        setItens(res.itens)
      })
      .catch(() => {
        if (ativo) setItens([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [compacta])

  if (compacta) {
    if (carregando || itens.length === 0) return null
    return (
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="font-manrope font-extrabold text-lg sm:text-xl tracking-tight m-0 flex items-center gap-2">
            <Flame size={17} className="text-coral" aria-hidden /> Animes em alta no AniDeck
          </h2>
          <Link to="/rankings?modo=em_alta" className="font-mono text-xs uppercase tracking-widest text-holo-3 hover:underline shrink-0">
            Ver ranking →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto custom-scrollbar snap-x pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          {itens.map((item, idx) => (
            <Link key={item.mal_id} to={`/anime/${item.mal_id}`} className="group shrink-0 w-36 sm:w-44 snap-start">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-line bg-panel-2 transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:border-holo-3/40">
                {item.imagem_url ? (
                  <img src={item.imagem_url} alt={item.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-2 font-mono text-xs">Sem capa</div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-void/90 border border-line font-mono font-bold tabular-nums text-xs text-coral">
                  #{idx + 1}
                </span>
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-void/90 border border-line font-mono text-[11px] tabular-nums text-text">
                  <Users size={11} className="text-holo-3" aria-hidden /> {item.usuarios_ativos < 0 ? '< 3' : item.usuarios_ativos}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors m-0">
                {item.titulo}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-5 sm:p-6 rounded-3xl surface-glass shadow-xl relative overflow-hidden mb-8">
      <div className="absolute top-0 right-0 w-80 h-80 bg-coral/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs uppercase tracking-widest text-coral select-none flex items-center gap-1.5 font-bold">
              <Flame size={13} className="text-coral" aria-hidden />
              Animes em alta
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-coral/15 text-coral border border-coral/30">
              Últimos {dias} dias
            </span>
          </div>
          <h2 className="font-manrope font-extrabold text-xl sm:text-2xl tracking-tight text-text m-0">
            Pulso da comunidade no AniDeck
          </h2>
          <p className="text-sm text-muted mt-1 max-w-2xl mb-0">
            Obras com mais atividade recente — episódios assistidos, comentários e reações. Muitos drops reduzem a posição.
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-panel-2 border border-line animate-pulse" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="py-8 text-center rounded-2xl bg-panel-2/60 border border-line/60">
          <p className="text-sm font-bold text-muted m-0">Ainda não há atividade suficiente nos últimos {dias} dias.</p>
          <p className="text-xs text-muted-2 mt-1 mb-0">
            Marque episódios no seu deck, comente ou reaja para movimentar o ranking da comunidade.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
          {itens.map((item, idx) => (
            <Link
              key={item.mal_id}
              to={`/anime/${item.mal_id}`}
              className="group flex items-stretch gap-3 rounded-2xl bg-panel-2 border border-line hover:border-coral/50 transition-all p-2.5"
            >
              <div className="relative w-16 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-void/60 border border-line/60">
                {item.imagem_url ? (
                  <img
                    src={item.imagem_url}
                    alt={item.titulo}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] font-mono text-muted-2 text-center px-1">
                    Sem capa
                  </div>
                )}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-void/85 font-anton text-xs text-coral border border-line">
                  #{idx + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                <div>
                  <h3 className="font-bold text-sm text-text group-hover:text-coral transition-colors line-clamp-2 m-0">
                    {item.titulo}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 text-holo-3">
                      <Users size={11} aria-hidden />
                      {item.usuarios_ativos < 0 ? 'Menos de 3 ativos' : `${item.usuarios_ativos} ativos`}
                    </span>
                    {item.episodios_recentes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <PlayCircle size={11} aria-hidden />
                        {item.episodios_recentes} ep
                      </span>
                    )}
                    {item.comentarios_recentes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={11} aria-hidden />
                        {item.comentarios_recentes}
                      </span>
                    )}
                    {item.reacoes_recentes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles size={11} aria-hidden />
                        {item.reacoes_recentes}
                      </span>
                    )}
                  </div>
                </div>

                {item.drops_recentes !== 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-coral w-fit px-2 py-0.5 rounded-full bg-coral/10 border border-coral/25">
                    <TrendingDown size={11} aria-hidden />
                    {item.drops_recentes < 0 ? 'Menos de 3 drops recentes' : `${item.drops_recentes} drops recentes`}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
