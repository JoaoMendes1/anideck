import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface AnimeDetail {
  mal_id: number
  title: string
  status: string
  synopsis: string
  episodes: number
  score: number
  images: { jpg: { image_url: string } }
  genres: { name: string }[]
  studios: { name: string }[]
  streaming: { name: string; url: string }[]
  theme: { openings: string[]; endings: string[] }
  relations: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[]
}

interface AnimeStats {
  scores: { score: number; votes: number; percentage: number }[]
}

interface MinhaEntrada {
  id: string
  status: string
  mal_id: number
  tipo: string
}

export default function Detalhes() {
  const { id } = useParams<{ id: string }>()

  const { showToast } = useToast()
  
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [stats, setStats] = useState<AnimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [minhaEntrada, setMinhaEntrada] = useState<MinhaEntrada | null>(null)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [resAnime, resStats] = await Promise.all([
          fetch(`/api/anime/${id}`),
          fetch(`/api/anime/${id}/statistics`)
        ])
        
        if (!resAnime.ok || !resStats.ok) {
          throw new Error('Falha ao carregar os dados do anime. Tente novamente.')
        }
        
        const dataAnime = await resAnime.json()
        const dataStats = await resStats.json()
        setAnime(dataAnime.data)
        setStats(dataStats.data)

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const resEntries = await fetch('/api/entries', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (resEntries.ok) {
            const entradas = await resEntries.json()
            const entradaDesteAnime = entradas?.find((e: any) => e.mal_id === Number(id))
            if (entradaDesteAnime) setMinhaEntrada(entradaDesteAnime)
          }
        }

      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id])

  const handleCompletarAnime = async () => {
    if (!minhaEntrada) return
    setAtualizandoStatus(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
        const response = await fetch(`/api/entries/${minhaEntrada.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
                mal_id: minhaEntrada.mal_id,
                tipo: minhaEntrada.tipo || 'anime',
                status: 'Completo' 
            }),
        })

        if (!response.ok) throw new Error()
        
        setMinhaEntrada({ ...minhaEntrada, status: 'Completo' })
        showToast('Parabéns! Movido para os Completos.')
    } catch {
        showToast('Erro ao atualizar. Tente novamente.', 'error')
    } finally {
        setAtualizandoStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">// CARREGANDO DADOS...</p>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="text-coral mb-4" size={48} />
        <h2 className="font-anton text-2xl text-text uppercase mb-2">Erro de Conexão</h2>
        <p className="text-muted mb-6">{error || 'Anime não encontrado.'}</p>
        <Link to="/" className="text-holo-3 font-bold hover:underline">Voltar para a Busca</Link>
      </div>
    )
  }

  const maxPercentage = stats?.scores ? Math.max(...stats.scores.map(s => s.percentage)) : 100

  return (
    <div className="pb-20">
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-panel to-panel-2">
        <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent"></div>
      </div>

      <div className="max-w-[1080px] mx-auto px-5 -mt-24 relative z-10 flex flex-col md:flex-row gap-6 md:items-end mb-12">
        <img
          src={anime.images?.jpg?.image_url}
          alt={`Poster de ${anime.title}`}
          className="w-40 md:w-48 rounded-xl shadow-2xl border-4 border-void"
        />
        <div className="flex-1 pb-2">
          <h1 className="font-anton text-3xl md:text-5xl uppercase leading-tight mb-2">
            {anime.title}
          </h1>
          <div className="flex flex-wrap gap-4 items-center font-mono text-xs text-muted mb-4">
            <span className="bg-panel px-2 py-1 rounded border border-line">{anime.status}</span>
            <span>{anime.episodes || '?'} EPISÓDIOS</span>
            {anime.studios?.length > 0 && <span>• {anime.studios[0].name}</span>}

            {/* 🟢 ADICIONE ESTE BLOCO AQUI: O seu selo pessoal visual */}
            {minhaEntrada && (
              <span className="bg-holo-2/10 text-holo-2 border border-holo-2/30 px-3 py-1 rounded-full font-bold ml-2">
                MEU DECK: {minhaEntrada.status}
              </span>
            )}
            
          </div>
          <div className="flex flex-wrap gap-2">
            {anime.genres?.map(g => (
              <span key={g.name} className="text-[11px] font-bold px-3 py-1 rounded-full bg-panel border border-line text-muted-2">
                {g.name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-4 flex items-center gap-3 shrink-0">
          <Star className="text-gold fill-gold" size={24} />
          <div>
            <div className="font-anton text-2xl text-gold leading-none">{anime.score || 'N/A'}</div>
            <div className="text-[10px] font-bold text-muted-2">NOTA JIKAN</div>
          </div>
        </div>
      </div>

      {/* O BANNER MÁGICO DE TRANSIÇÃO */}
      {minhaEntrada?.status === 'Em Dia' && anime?.status === 'Finished Airing' && (
          <div className="max-w-[1080px] mx-auto px-5 mb-8">
              <div className="bg-gradient-to-r from-holo-1 to-holo-2 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 text-void shadow-lg">
                  <div>
                      <h3 className="font-anton uppercase text-xl mb-1">Anime Finalizado!</h3>
                      <p className="font-bold text-sm opacity-90">A Jikan detectou que esta obra acabou. Deseja mover da sua lista de "Em Dia" para "Completo"?</p>
                  </div>
                  <button 
                      onClick={handleCompletarAnime} 
                      disabled={atualizandoStatus}
                      className="bg-void text-text px-6 py-3 rounded-xl font-extrabold text-sm shrink-0 hover:scale-105 transition-transform cursor-pointer"
                  >
                      {atualizandoStatus ? 'Atualizando...' : 'Marcar como Completo'}
                  </button>
              </div>
          </div>
      )}

      <div className="max-w-[1080px] mx-auto px-5 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="font-anton text-lg uppercase mb-4 flex items-center gap-2">
              <span className="font-mono text-xs text-holo-3">01</span> Sinopse
            </h2>
            <p className="text-muted text-sm leading-relaxed whitespace-pre-line">
              {anime.synopsis || 'Sinopse não disponível.'}
            </p>
          </section>

          {anime.streaming?.length > 0 && (
            <section>
              <h2 className="font-anton text-lg uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-xs text-holo-3">02</span> Onde Assistir
              </h2>
              <div className="flex flex-wrap gap-3">
                {anime.streaming.map(st => (
                  <a key={st.name} href={st.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-panel border border-line rounded-xl px-4 py-2 text-sm font-bold hover:border-holo-3 transition-colors">
                    <PlayCircle size={16} className="text-holo-2" />
                    {st.name}
                  </a>
                ))}
              </div>
            </section>
          )}

          {anime.theme?.openings?.length > 0 && (
            <section>
              <h2 className="font-anton text-lg uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-xs text-holo-3">03</span> Trilhas (Openings)
              </h2>
              <div className="bg-panel border border-line rounded-xl overflow-hidden divide-y divide-line">
                {anime.theme.openings.slice(0, 4).map((op, i) => (
                  <div key={i} className="p-3 text-sm text-muted font-mono">{op}</div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-10">
          {stats && stats.scores && (
            <section>
              <h2 className="font-anton text-lg uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-xs text-holo-3">04</span> Histograma de Notas
              </h2>
              <div className="bg-panel border border-line rounded-xl p-5">
                <div className="flex items-end gap-1 h-32 mb-2">
                  {stats.scores.slice().reverse().map(s => {
                    const heightPct = maxPercentage > 0 ? (s.percentage / maxPercentage) * 100 : 0
                    return (
                      <div key={s.score} className="flex-1 flex flex-col justify-end h-full group">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="bg-gradient-to-t from-holo-2 to-holo-3 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all relative"
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-void text-text text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none">
                            {s.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between font-mono text-[10px] text-muted-2">
                  <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
                </div>
              </div>
            </section>
          )}

          {anime.relations?.length > 0 && (
            <section>
              <h2 className="font-anton text-lg uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-xs text-holo-3">05</span> Relacionados
              </h2>
              <div className="flex flex-col gap-3">
                {anime.relations.slice(0, 4).map((rel, i) => (
                  <div key={i} className="bg-panel border border-line rounded-xl p-3">
                    <div className="font-mono text-[10px] text-holo-1 mb-1">{rel.relation}</div>
                    <div className="text-sm font-bold leading-tight">
                      {rel.entry[0]?.name || 'Título Desconhecido'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}