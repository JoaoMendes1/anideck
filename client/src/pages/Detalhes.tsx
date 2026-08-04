import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle, Save } from 'lucide-react'
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
  nota?: number
  anotacao?: string
}

const STATUS_OPCOES = ['Assistindo', 'Em Dia', 'Completo', 'Quero Assistir', 'Dropado']

export default function Detalhes() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [stats, setStats] = useState<AnimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [minhaEntrada, setMinhaEntrada] = useState<MinhaEntrada | null>(null)
  const [salvando, setSalvando] = useState(false)
  
  // 🟢 NOVA LÓGICA: Estados temporários para o formulário (só salva quando clicar no botão)
  const [statusInput, setStatusInput] = useState<string>('Quero Assistir')
  const [notaInput, setNotaInput] = useState<string>('')
  const [anotacaoInput, setAnotacaoInput] = useState<string>('')

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
            const entrada = entradas?.find((e: any) => e.mal_id === Number(id))
            if (entrada) {
                setMinhaEntrada(entrada)
                setStatusInput(entrada.status)
                setNotaInput(entrada.nota?.toString() || '')
                setAnotacaoInput(entrada.anotacao || '')
            }
          }
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  // Lida com o salvamento unificado de status, notas e anotações
  const handleAtualizarEntrada = async (overrideStatus?: string) => {
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        showToast('Você precisa estar logado para salvar no Deck.', 'error')
        setSalvando(false)
        return
    }
    
    // Se vier um status forçado (ex: botão "Marcar como Completo"), usa ele. Senão, usa o status selecionado nas pílulas.
    const statusFinal = overrideStatus || statusInput
    const notaFormatada = notaInput ? Number(notaInput.toString().replace(',', '.')) : null
    const payload = {
        mal_id: Number(id),
        tipo: 'anime',
        status: statusFinal,
        nota: Number.isNaN(notaFormatada) ? null : notaFormatada,
        anotacao: anotacaoInput
    }

    try {
        const url = minhaEntrada ? `/api/entries/${minhaEntrada.id}` : '/api/entries'
        const method = minhaEntrada ? 'PUT' : 'POST'

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error()
        
        const atualizada = await response.json()
        setMinhaEntrada(Array.isArray(atualizada) ? atualizada[0] : atualizada)
        if (overrideStatus) setStatusInput(overrideStatus)
        
        showToast(overrideStatus ? 'Parabéns! Movido para os Completos.' : 'Avaliação salva no seu Deck!', 'success')
    } catch {
        showToast('Erro ao atualizar seu Deck. Tente novamente.', 'error')
    } finally {
        setSalvando(false)
    }
  }

  const traduzirStatus = (statusOriginal: string) => {
    if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
    if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
    if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
    return statusOriginal
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">// CARREGANDO DADOS...</p>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="text-coral mb-4" size={48} />
        <h2 className="font-anton text-2xl text-text uppercase mb-2">Erro de Conexão</h2>
        <p className="text-muted mb-6">{error || 'Anime não encontrado.'}</p>
        <Link to="/" className="text-holo-3 font-bold hover:underline">Voltar para a Busca</Link>
      </div>
    )
  }

  const maxPercentage = stats?.scores ? Math.max(...stats.scores.map(s => s.percentage)) : 100

  return (
    // 🟢 CORREÇÃO DE LAYOUT: O -mt-24 puxa a página para cima, anulando o padding do Layout.tsx e colando o banner no teto
    <div className="-mt-24 pb-20">
      
      <div className="relative h-[220px] overflow-hidden bg-gradient-to-br from-[#3a1a4a] to-[#0A0714] after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-t after:from-void after:to-transparent" />

      <div className="max-w-[1040px] mx-auto px-5 -mt-[90px] relative z-20 pb-2">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-end mb-8 text-center sm:text-left items-center">
          {/* POSTER */}
          <img
            src={anime.images?.jpg?.image_url}
            alt={`Poster de ${anime.title}`}
            className="w-[140px] h-[198px] rounded-xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)] border-[3px] border-panel shrink-0 object-cover bg-panel-2"
          />
          
          {/* INFO PRINCIPAL */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-anton text-[clamp(1.4rem,3.5vw,2.4rem)] uppercase leading-[1.05] mb-2 tracking-wide drop-shadow-md">
              {anime.title}
            </h1>
            
            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start font-mono text-[11px] text-muted mb-3">
              <span className="text-holo-3">{traduzirStatus(anime.status)}</span>
              <span className="text-muted-2">•</span>
              <span>{anime.episodes || '?'} EP</span>
              {anime.studios?.length > 0 && (
                <>
                  <span className="text-muted-2">•</span>
                  <span>{anime.studios[0].name}</span>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {anime.genres?.map(g => (
                <span key={g.name} className="text-[10px] font-bold px-3 py-1 rounded-full bg-panel border border-line text-muted">
                  {g.name}
                </span>
              ))}
            </div>
          </div>

          {/* SCORE BADGE */}
          <div className="bg-panel border border-line rounded-xl px-5 py-3 flex items-center gap-3 shrink-0 shadow-lg">
            <Star className="text-gold fill-gold" size={24} />
            <div className="text-left">
              <div className="font-anton text-[22px] text-gold leading-none">{anime.score || 'N/A'}</div>
              <div className="text-[10px] font-bold text-muted-2 mt-1">NOTA GERAL</div>
            </div>
          </div>
        </div>

        {/* TABS STICKY */}
        <div className="sticky top-[63px] md:top-[73px] z-40 bg-void/95 backdrop-blur-sm border-b border-line overflow-x-auto whitespace-nowrap py-3 mb-8 scrollbar-hide">
          <div className="flex gap-2.5">
            <a href="#visao-geral" className="text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Visão Geral</a>
            <a href="#onde-assistir" className="text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Onde Assistir</a>
            <a href="#estatisticas" className="text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Estatísticas</a>
            <a href="#relacionados" className="text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Relacionados</a>
          </div>
        </div>

        {/* BANNER DE TRANSIÇÃO (SE APLICÁVEL) */}
        {minhaEntrada?.status === 'Em Dia' && (anime.status === 'Finished Airing' || anime.status === 'FINISHED') && (
            <div className="bg-gradient-to-r from-holo-1/20 to-holo-2/20 border border-holo-2/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg mb-8 backdrop-blur-md">
                <div className="text-center md:text-left">
                    <h3 className="font-anton uppercase text-holo-1 text-xl mb-1">Anime Finalizado!</h3>
                    <p className="font-bold text-sm text-text">A AniList detectou que esta obra acabou. Deseja mover da sua lista de "Em Dia" para "Completo"?</p>
                </div>
                <button 
                    onClick={() => handleAtualizarEntrada('Completo')} 
                    disabled={salvando}
                    className="bg-gradient-to-r from-holo-1 to-holo-2 text-void px-6 py-3 rounded-full font-extrabold text-sm shrink-0 transition-transform cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                    {salvando ? 'Atualizando...' : 'Marcar como Completo ✓'}
                </button>
            </div>
        )}

        {/* GRID PRINCIPAL DE CONTEÚDO */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10" id="visao-geral">
          
          <div className="space-y-10">
            {/* SINOPSE */}
            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-[11px] text-holo-3">01</span> Sinopse
              </h2>
              <div className="text-muted text-[14.5px] leading-[1.7] whitespace-pre-line bg-panel border border-line rounded-2xl p-6">
                {anime.synopsis || 'Sinopse não disponível nesta base de dados.'}
              </div>
            </section>

            {/* PAINEL DE AVALIAÇÃO */}
            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                <span className="font-mono text-[11px] text-holo-3">02</span> Sua Avaliação
              </h2>
              <div className="bg-panel border border-line rounded-2xl p-5 relative">
                {salvando && (
                   <div className="absolute inset-0 bg-panel/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                     <div className="w-8 h-8 border-4 border-line border-t-holo-2 rounded-full animate-spin"></div>
                   </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-5">
                    {STATUS_OPCOES.map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusInput(status)}
                            className={`text-[12.5px] font-bold px-3.5 py-1.5 rounded-full border cursor-pointer transition-colors ${
                                statusInput === status 
                                ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-white border-transparent shadow-md' 
                                : 'bg-transparent border-line text-muted hover:border-holo-3 hover:text-text'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Nota (0-10)</label>
                        <input 
                            type="number" 
                            min="0" max="10" step="0.1"
                            value={notaInput}
                            onChange={(e) => setNotaInput(e.target.value)}
                            placeholder="Ex: 8.5"
                            className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Anotação Privada</label>
                        <textarea 
                            value={anotacaoInput}
                            onChange={(e) => setAnotacaoInput(e.target.value)}
                            placeholder="O que você achou deste anime?"
                            className="w-full bg-panel-2 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-holo-2 min-h-[80px] resize-none font-manrope"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={() => handleAtualizarEntrada()}
                        className="flex items-center gap-2 bg-panel-2 border border-line hover:border-holo-3 text-text px-4 py-2 rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
                    >
                        <Save size={14} className="text-holo-3" />
                        Salvar Anotações
                    </button>
                </div>
              </div>
            </section>

            {/* ONDE ASSISTIR */}
            {anime.streaming?.length > 0 && (
              <section id="onde-assistir">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-holo-3">03</span> Onde Assistir Oficial
                </h2>
                <div className="flex flex-wrap gap-3">
                  {anime.streaming.map(st => (
                    <a key={st.name} href={st.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-panel border border-line rounded-xl px-5 py-3 text-[13px] font-bold hover:border-holo-1 hover:text-holo-1 transition-colors">
                      <PlayCircle size={16} />
                      {st.name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ABERTURAS / ENCERRAMENTOS */}
            {(anime.theme?.openings?.length > 0 || anime.theme?.endings?.length > 0) && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-holo-3">04</span> Temas Musicais
                </h2>
                <div className="flex flex-col gap-2">
                  {anime.theme?.openings?.slice(0, 3).map((op, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                        <span className="font-mono text-[10px] text-holo-3 font-bold shrink-0 mr-3">OP {i+1}</span>
                        <span className="text-muted truncate">{op}</span>
                    </div>
                  ))}
                  {anime.theme?.endings?.slice(0, 3).map((ed, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-panel border border-line rounded-xl text-[13px]">
                        <span className="font-mono text-[10px] text-holo-1 font-bold shrink-0 mr-3">ED {i+1}</span>
                        <span className="text-muted truncate">{ed}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* RELACIONADOS */}
            {anime.relations?.length > 0 && (
              <section id="relacionados">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-holo-3">05</span> Títulos Relacionados
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {anime.relations.map((rel, i) => (
                    <div key={i} className="flex-none w-[160px] bg-panel border border-line rounded-xl p-4">
                      <div className="font-mono text-[10px] text-holo-2 mb-2 uppercase">{rel.relation}</div>
                      <div className="text-[13px] font-bold leading-tight">
                        {rel.entry[0]?.name || 'Título Desconhecido'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* COLUNA LATERAL DIREITA */}
          <div className="space-y-10" id="estatisticas">
            
            {/* INFORMAÇÃO PESSOAL (RESUMO) */}
            {minhaEntrada && (
              <section>
                 <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-holo-3">MEU DECK</span>
                </h2>
                <div className="bg-gradient-to-br from-panel to-panel-2 border border-holo-3/30 rounded-2xl p-5">
                   <div className="text-xs font-bold text-muted uppercase mb-1">Status Atual</div>
                   <div className="font-anton text-2xl text-text mb-4 tracking-wide">{minhaEntrada.status}</div>
                   <Link to="/deck" className="block text-center w-full py-2.5 rounded-xl border border-line text-sm font-bold hover:bg-panel-2 transition-colors">
                     Gerenciar no Deck
                   </Link>
                </div>
              </section>
            )}

            {/* HISTOGRAMA */}
            {stats && stats.scores && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-holo-3">ESTATÍSTICAS</span> Histograma
                </h2>
                <div className="bg-panel border border-line rounded-2xl p-5">
                  <div className="flex items-end gap-1.5 h-[120px] mb-2">
                    {stats.scores.slice().reverse().map(s => {
                      const heightPct = maxPercentage > 0 ? (s.percentage / maxPercentage) * 100 : 0
                      return (
                        <div key={s.score} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="bg-gradient-to-t from-holo-2 to-holo-3 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all w-full"
                          >
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-void text-text text-[9px] font-mono px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 border border-line">
                              {s.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-muted-2 px-1">
                    <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-line">
                    <b className="font-anton text-lg text-text block leading-none mb-1">
                        {stats.scores.reduce((acc, curr) => acc + curr.votes, 0).toLocaleString()}
                    </b>
                    <span className="font-mono text-[10.5px] text-muted tracking-wider">AVALIAÇÕES</span>
                  </div>
                </div>
              </section>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}