import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, Play, Lock, ChevronDown, AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { obterTextoDiaLancamento } from '../lib/deckHelpers'

interface StreamingEpisode {
  title: string
  thumbnail: string
  url: string
  site: string
  aired_at?: string
}

interface EpisodeGridProps {
  malId: number
  totalEpisodes: number
  streamingEpisodes?: StreamingEpisode[]
  initialWatched: number[]
  isLoggedIn: boolean
  isAdmin?: boolean
  status?: string
  nextAiringEpisode?: { airingAt: number; timeUntilAiring: number; episode: number }
  startDate?: { year: number; month: number; day: number }
  firstAiredAt?: string
  onEpisodeMarkedWatched?: (episodeNumber: number) => void
}

export default function EpisodeGrid({ malId, totalEpisodes, streamingEpisodes = [], initialWatched, isLoggedIn, isAdmin = false, status, nextAiringEpisode, startDate, firstAiredAt, onEpisodeMarkedWatched }: EpisodeGridProps) {
  const { showToast } = useToast()
  const [watched, setWatched] = useState<number[]>(initialWatched)
  const [visibleCount, setVisibleCount] = useState(24)
  // Relógio lido uma vez na montagem, pelo mesmo motivo do AnimeCard (pureza do render).
  const [agora] = useState(() => Date.now())

  useEffect(() => {
    setWatched(initialWatched)
  }, [initialWatched])

  useEffect(() => {
    const aoAtualizar = (ev: Event) => {
      const custom = ev as CustomEvent<{ malId?: number; episodeNumber?: number; watched?: boolean }>
      if (custom.detail?.malId === malId && typeof custom.detail.episodeNumber === 'number') {
        const epNum = custom.detail.episodeNumber
        if (custom.detail.watched) {
          setWatched(prev => (prev.includes(epNum) ? prev : [...prev, epNum]))
        }
      }
    }
    window.addEventListener('anideck:episodio-atualizado', aoAtualizar)
    return () => window.removeEventListener('anideck:episodio-atualizado', aoAtualizar)
  }, [malId])

  const episodiosJaLancados = nextAiringEpisode?.episode ? Math.max(0, nextAiringEpisode.episode - 1) : 0
  const maxAssistido = watched.length > 0 ? Math.max(...watched) : 0
  const episodesCount = Math.max(
    totalEpisodes || 0,
    streamingEpisodes.length,
    episodiosJaLancados,
    maxAssistido
  )

  const allEpisodes = Array.from({ length: episodesCount }, (_, i) => {
    const epNum = i + 1
    const data = streamingEpisodes[i]
    return {
      number: epNum,
      title: data?.title || `Episódio ${epNum}`,
      thumbnail: data?.thumbnail || null,
      url: data?.url || null,
      airedAt: data?.aired_at || null
    }
  })

  const displayEpisodes = allEpisodes.slice(0, visibleCount)

  const toggleEpisode = async (episodeNumber: number, isUnreleased = false) => {
    if (!isLoggedIn) {
      showToast('Faça login para salvar seu progresso.', 'error')
      return
    }

    const isWatched = watched.includes(episodeNumber)
    // Trava dura: episódio ainda não lançado jamais pode ser marcado como visto.
    // Só permitimos o clique se ele já estava marcado acidentalmente antes, para desmarcar.
    if (isUnreleased && !isWatched) {
      showToast('🔒 Este episódio ainda não foi lançado. Marcação bloqueada para proteger suas estatísticas.', 'error')
      return
    }

    setWatched(prev => isWatched ? prev.filter(num => num !== episodeNumber) : [...prev, episodeNumber])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const method = isWatched ? 'DELETE' : 'POST'
      const response = await fetch(`/api/entries/${malId}/episodes/${episodeNumber}`, {
        method,
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!response.ok) throw new Error()
      if (!isWatched) {
        try {
          const payload = (await response.json()) as { xp_earned?: number; reason?: string }
          if (typeof payload.xp_earned === 'number' && payload.xp_earned > 0) {
            showToast(`+${payload.xp_earned} XP na Guilda (${payload.reason || 'episódio assistido'})`, 'success')
          }
        } catch {
          // Resposta sem corpo JSON continua válida.
        }
      }
      window.dispatchEvent(
        new CustomEvent('anideck:episodio-atualizado', {
          detail: { malId, episodeNumber, watched: !isWatched },
        })
      )
      if (!isWatched) {
        onEpisodeMarkedWatched?.(episodeNumber)
      }
    } catch {
      setWatched(prev => isWatched ? [...prev, episodeNumber] : prev.filter(num => num !== episodeNumber))
      showToast('Erro ao sincronizar episódio. Verifique sua conexão.', 'error')
    }
  }

  const formatarData = (data: Date) =>
    data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const lerDataDoEpisodio = (airedAt: string) => {
    const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(airedAt)
    if (soData) {
      const [, ano, mes, dia] = soData
      return new Date(Number(ano), Number(mes) - 1, Number(dia), 23, 59, 59)
    }
    return new Date(airedAt)
  }

  const calcularDataEstimadaDoEpisodio = (epNumber: number, airedAt?: string | null): Date | null => {
    if (airedAt) {
      const dataCurada = lerDataDoEpisodio(airedAt)
      if (!isNaN(dataCurada.getTime())) return dataCurada
    }

    const base = firstAiredAt ? new Date(firstAiredAt) : null
    if (base && !isNaN(base.getTime())) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59)
      d.setDate(d.getDate() + (epNumber - 1) * 7)
      return d
    }

    if (!startDate?.year || !startDate?.month || !startDate?.day) return null
    const baseDate = new Date(startDate.year, startDate.month - 1, startDate.day, 23, 59, 59)
    baseDate.setDate(baseDate.getDate() + (epNumber - 1) * 7)
    return baseDate
  }

  const getEpisodeDate = (epNumber: number, airedAt?: string | null) => {
    const d = calcularDataEstimadaDoEpisodio(epNumber, airedAt)
    return d ? formatarData(d) : null
  }

  const diaLancamentoSemanal = obterTextoDiaLancamento({
    status,
    nextAiringEpisode,
    firstAiredAt,
    startDate,
  })

  return (
    <section id="episodios" className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2.5 select-none">
          <h2 className="font-anton text-base uppercase flex items-center gap-2 m-0">
            <span className="font-mono text-[11px] text-holo-3">EP</span> Progresso
          </h2>
          {diaLancamentoSemanal && (
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/35 text-holo-3">
              📅 {diaLancamentoSemanal}
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-muted-2 font-bold bg-panel border border-line px-2 py-1 rounded-md">
          {watched.length} / {allEpisodes.length}
        </span>
      </div>

      {episodesCount === 0 && (status === 'NOT_YET_RELEASED' || status === 'Not yet aired' || status === 'Em breve' || status === 'Ainda não lançado' || status === 'ANUNCIADO') ? (
        <div className="p-6 rounded-2xl bg-holo-3/5 border border-holo-3/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_24px_rgba(63,224,240,0.08)] select-none">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-holo-3/15 border border-holo-3/30 text-holo-3 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={20} />
            </div>
            <div>
              <span className="inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-holo-3 mb-1">
                ✨ Obra Anunciada · Em Breve
              </span>
              <h3 className="font-bold text-sm text-text leading-snug">
                Esta obra foi anunciada e ainda não possui episódios lançados.
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Você pode salvá-la em <b className="text-text">Quero Assistir</b> no seu Deck. Assim que os episódios forem ao ar ou a data for confirmada, o calendário e a grade serão liberados automaticamente.
              </p>
            </div>
          </div>
          <span className="shrink-0 px-3.5 py-1.5 rounded-full bg-holo-3/15 text-holo-3 font-mono font-bold text-xs border border-holo-3/30">
            Em Breve
          </span>
        </div>
      ) : episodesCount === 0 ? (
        <div className="p-5 rounded-2xl bg-coral/10 border border-coral/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_24px_rgba(255,107,107,0.12)]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-coral/20 border border-coral/40 text-coral flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-coral mb-1">
                🚨 Aviso de Emergência · Obra sem Episódios
              </span>
              <h3 className="font-bold text-sm text-text leading-snug">
                Esta obra está sem episódios cadastrados na base de dados (0 EP).
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                O registro de episódios está travado para evitar dados fantasmas nas suas estatísticas. Realize a curadoria de episódios para liberar o acompanhamento.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link
              to={`/admin?aba=curadoria&mal_id=${malId}`}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral text-void font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              ✏️ Realizar Curadoria
            </Link>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
        {displayEpisodes.map((ep) => {
          const isWatched = watched.includes(ep.number)
          const obraNaoLancada = status === 'NOT_YET_RELEASED' || status === 'Not yet aired' || status === 'Ainda não lançado' || status === 'Em breve' || status === 'ANUNCIADO'
          // Trava tripla: status da obra, nextAiringEpisode da API/curadoria, OU data estimada/curada futura
          const dataDoEpisodio = calcularDataEstimadaDoEpisodio(ep.number, ep.airedAt)
          const dataEhFutura = dataDoEpisodio ? dataDoEpisodio.getTime() > agora : false
          const isUnreleased = obraNaoLancada || (nextAiringEpisode ? ep.number >= nextAiringEpisode.episode : false) || dataEhFutura
          // Episódio sem miniatura ou ainda não lançado vira linha compacta: um bloco de
          // imagem vazio por episódio futuro deixava a página com milhares de pixels.
          const isCompact = !ep.thumbnail || isUnreleased

          return (
            <div 
              key={ep.number} 
              className={`relative ${isCompact ? 'flex items-center gap-3 rounded-lg px-3 py-2.5' : 'flex flex-col rounded-xl overflow-hidden'} group border transition-all select-none ${
                isUnreleased && isWatched
                  ? 'bg-coral/10 border-coral/50 cursor-pointer'
                  : isUnreleased
                    ? 'bg-panel/40 border-line/50 opacity-60 cursor-not-allowed'
                    : isWatched
                      ? 'bg-panel-2 border-green/40 shadow-[0_0_15px_rgba(160,255,120,0.1)] cursor-pointer'
                      : 'bg-panel border-line hover:border-holo-3/50 cursor-pointer'
              }`}
              onClick={() => toggleEpisode(ep.number, isUnreleased)}
            >
              {!isCompact && <div className="aspect-video bg-void relative overflow-hidden flex items-center justify-center">
                {ep.thumbnail ? (
                  <img 
                    src={ep.thumbnail} 
                    alt={`Thumb EP ${ep.number}`} 
                    className={`w-full h-full object-cover transition-all duration-300 ${isWatched ? 'opacity-40 grayscale' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}`} 
                    loading="lazy"
                  />
                ) : (
                  <span className="text-muted-2 font-mono text-[10px] uppercase tracking-widest">Sem miniatura</span>
                )}
                
                {isWatched && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green/10">
                    <div className="w-10 h-10 rounded-full bg-green text-void flex items-center justify-center shadow-[0_0_20px_rgba(160,255,120,0.4)]">
                      <Check size={20} strokeWidth={3} />
                    </div>
                  </div>
                )}

              </div>}

              {isCompact && isUnreleased && (
                <Lock size={14} className={`shrink-0 ${isWatched ? 'text-coral' : 'text-muted-2'}`} />
              )}

              <div className={isCompact ? 'min-w-0 flex-1' : 'p-2.5 sm:p-3'}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                     <div className="font-mono text-[11px] text-holo-3 font-bold leading-none mb-1">EP {ep.number}</div>
                     {getEpisodeDate(ep.number, ep.airedAt) && (
                        <div className="font-mono text-[9px] text-muted-2 leading-none">{getEpisodeDate(ep.number, ep.airedAt)}</div>
                     )}
                  </div>
                  
                  {ep.url && !isUnreleased && (
                    <a 
                      href={ep.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className="w-6 h-6 rounded-full bg-panel-2 border border-line flex items-center justify-center text-holo-3 hover:text-white hover:border-holo-3 transition-all"
                      title="Assistir Oficial"
                    >
                      <Play size={10} fill="currentColor" className="ml-0.5" />
                    </a>
                  )}
                </div>
                <div className={`text-[12px] font-bold mt-1.5 ${isCompact ? 'truncate' : 'line-clamp-2'} leading-tight ${isWatched ? 'text-muted-2' : 'text-text'}`}>
                  {isUnreleased ? (isWatched ? 'Marcado por engano · toque para remover' : 'Ainda não lançado') : ep.title}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {visibleCount < allEpisodes.length && (
        <button
          onClick={() => setVisibleCount(prev => prev + 24)}
          className="w-full mt-6 py-3 rounded-xl bg-panel border border-line text-sm font-bold hover:bg-panel-2 hover:border-holo-3 transition-colors text-muted hover:text-white flex items-center justify-center gap-2 cursor-pointer"
        >
          <ChevronDown size={16} /> Mostrar próximos episódios
        </button>
      )}

      {isLoggedIn && episodesCount > 0 && (
        <p className="font-mono text-[10.5px] text-muted-2 mt-3 mb-0">
          Marcar episódio rende <b className="text-text">XP na Guilda</b>, com bônus para quem assiste no lançamento; a partir do 3º do dia, o ganho diminui.
        </p>
      )}
    </section>
  )
}