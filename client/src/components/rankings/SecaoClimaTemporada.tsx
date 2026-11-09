import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EyeOff, Flame, Sparkles } from 'lucide-react'
import { REACOES } from '../../lib/comunidade'
import { supabase } from '../../lib/supabase'

interface ClimaItem {
  mal_id: number
  titulo: string
  imagem_url: string
  total_reacoes: number
  episodio_lider: number
  mostrar_spoiler: boolean
}

interface RespostaClima {
  reacao: string
  itens: ClimaItem[]
}

export default function SecaoClimaTemporada() {
  const [reacaoAtiva, setReacaoAtiva] = useState<string>('chorei')
  const [itens, setItens] = useState<ClimaItem[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    let ativo = true
    setCarregando(true)

    async function carregar() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        const res = await fetch(`/api/rankings/clima?reacao=${reacaoAtiva}`, { headers })
        if (!res.ok) throw new Error('Falha ao buscar clima')
        const dados: RespostaClima = await res.json()
        if (ativo) {
          setItens(dados.itens || [])
        }
      } catch {
        if (ativo) setItens([])
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [reacaoAtiva])

  const metaReacao = REACOES.find(r => r.id === reacaoAtiva) || REACOES[0]

  return (
    <section className="mt-10 mb-12 p-5 sm:p-7 rounded-3xl bg-panel border border-line shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-holo-1/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-widest text-holo-3 select-none flex items-center gap-1.5 font-bold">
            <Sparkles size={13} className="text-holo-3" />
            Clima da Temporada
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-holo-2/15 text-holo-2 border border-holo-2/30">
            Comunidade
          </span>
        </div>
        <h2 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-text m-0">
          O que está mexendo com quem assiste
        </h2>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Rankings de sentimentos reais marcados episódio a episódio nesta temporada. 
          Picos de episódios protegem spoilers de quem ainda não chegou lá.
        </p>
      </div>

      {/* Chips de Reações */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar select-none">
        {REACOES.map(r => {
          const selecionado = r.id === reacaoAtiva
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setReacaoAtiva(r.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                selecionado
                  ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void border-transparent shadow-md scale-105'
                  : 'bg-panel-2 border-line text-muted hover:text-text hover:border-holo-3/40'
              }`}
            >
              <span>{r.emoji}</span>
              <span>{r.rotulo}</span>
            </button>
          )
        })}
      </div>

      {/* Grid de Obras Líderes */}
      {carregando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-panel-2 border border-line animate-pulse" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-panel-2/50 border border-line/60">
          <p className="text-sm font-bold text-muted m-0">
            Nenhuma reação &quot;{metaReacao.rotulo}&quot; registrada em episódios nesta temporada ainda.
          </p>
          <p className="text-xs text-muted-2 mt-1">
            Marque suas reações assistindo episódios da temporada para movimentar o termômetro!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {itens.map((item, idx) => (
            <Link
              key={item.mal_id}
              to={`/anime/${item.mal_id}`}
              className="group flex flex-col rounded-2xl bg-panel-2 border border-line hover:border-holo-2/50 transition-all overflow-hidden p-2.5 relative"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-void/50 mb-2.5">
                {item.imagem_url ? (
                  <img
                    src={item.imagem_url}
                    alt={item.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-2 font-mono text-xs">
                    Sem capa
                  </div>
                )}
                <span className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-void/80 backdrop-blur font-anton text-xs text-holo-3 grid place-items-center border border-line">
                  #{idx + 1}
                </span>

                <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-void/85 backdrop-blur font-mono text-[10px] text-text border border-line">
                  <span>{metaReacao.emoji}</span>
                  <span className="font-bold">{item.total_reacoes}</span>
                </span>
              </div>

              <h3 className="font-bold text-xs line-clamp-1 text-text group-hover:text-holo-2 transition-colors m-0" title={item.titulo}>
                {item.titulo}
              </h3>

              {item.episodio_lider > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono">
                  {item.mostrar_spoiler ? (
                    <span className="text-holo-3 flex items-center gap-1">
                      <Flame size={12} className="text-coral" />
                      Pico: Ep. {item.episodio_lider}
                    </span>
                  ) : (
                    <span className="text-muted-2 flex items-center gap-1" title="Assista a este episódio para revelar o spoiler">
                      <EyeOff size={11} className="text-muted-2" />
                      Pico: Ep. ??
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
