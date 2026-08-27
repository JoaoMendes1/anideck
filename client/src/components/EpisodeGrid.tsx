import { useState } from 'react'
import { Check, Play, ImageOff, Lock, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface StreamingEpisode {
  title: string
  thumbnail: string
  url: string
  site: string
  // Só vem da curadoria: a AniList não informa data por episódio.
  aired_at?: string
}

interface EpisodeGridProps {
  malId: number
  totalEpisodes: number
  streamingEpisodes?: StreamingEpisode[]
  initialWatched: number[]
  isLoggedIn: boolean
  nextAiringEpisode?: { airingAt: number; timeUntilAiring: number; episode: number }
  startDate?: { year: number; month: number; day: number }
}

export default function EpisodeGrid({ malId, totalEpisodes, streamingEpisodes = [], initialWatched, isLoggedIn, nextAiringEpisode, startDate }: EpisodeGridProps) {
  const { showToast } = useToast()
  const [watched, setWatched] = useState<number[]>(initialWatched)
  
  // PAGINAÇÃO: Estado para limitar a quantidade inicial de episódios no DOM
  const [visibleCount, setVisibleCount] = useState(24) 

  const episodesCount = totalEpisodes > 0 ? totalEpisodes : streamingEpisodes.length
  
  // Array total
  const allEpisodes = Array.from({ length: episodesCount || 12 }, (_, i) => {
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

  // Array fatiado para renderização
  const displayEpisodes = allEpisodes.slice(0, visibleCount)

  const toggleEpisode = async (episodeNumber: number) => {
    if (!isLoggedIn) {
      showToast('Faça login para salvar seu progresso.', 'error')
      return
    }

    const isWatched = watched.includes(episodeNumber)
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
    } catch (err) {
      setWatched(prev => isWatched ? [...prev, episodeNumber] : prev.filter(num => num !== episodeNumber))
      showToast('Erro ao sincronizar episódio. Verifique sua conexão.', 'error')
    }
  }

  const formatarData = (data: Date) =>
    data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Converte o aired_at da curadoria numa data no fuso de quem está olhando.
  //
  // O cuidado aqui não é preciosismo: `new Date("2023-10-13")` interpreta data-sem-hora como
  // meia-noite UTC, e em UTC-3 isso vira 12/10 às 21h — o episódio aparece um dia antes do
  // que foi cadastrado. Por isso a data pura é montada pelo construtor por componentes, que
  // trabalha em horário local (é o que o cálculo por startDate abaixo sempre fez).
  //
  // Já um texto com hora e fuso ("2023-10-13T14:00:00Z") tem o instante definido sem
  // ambiguidade, e aí o parse normal é o certo.
  const lerDataDoEpisodio = (airedAt: string) => {
    const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(airedAt)
    if (soData) {
      const [, ano, mes, dia] = soData
      return new Date(Number(ano), Number(mes) - 1, Number(dia))
    }
    return new Date(airedAt)
  }

  // A data curada do episódio ganha da estimativa. A estimativa soma 7 dias por episódio a
  // partir da estreia, o que erra em qualquer obra com hiato, recap ou especial no meio —
  // e o erro se acumula: no episódio 20, uma semana de pausa vira uma semana de defasagem
  // em todas as datas seguintes.
  const getEpisodeDate = (epNumber: number, airedAt?: string | null) => {
    if (airedAt) {
      const dataCurada = lerDataDoEpisodio(airedAt)
      if (!isNaN(dataCurada.getTime())) return formatarData(dataCurada)
    }

    if (!startDate?.year || !startDate?.month || !startDate?.day) return null;
    const baseDate = new Date(startDate.year, startDate.month - 1, startDate.day);
    baseDate.setDate(baseDate.getDate() + (epNumber - 1) * 7); // Soma 7 dias por episódio
    return formatarData(baseDate);
  }

  return (
    <section id="episodios" className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-anton text-base uppercase flex items-center gap-2 select-none">
          <span className="font-mono text-[11px] text-holo-3">EP</span> Progresso
        </h2>
        <span className="font-mono text-[11px] text-muted-2 font-bold bg-panel border border-line px-2 py-1 rounded-md">
          {watched.length} / {allEpisodes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {displayEpisodes.map((ep) => {
          const isWatched = watched.includes(ep.number)
          const isUnreleased = nextAiringEpisode ? ep.number >= nextAiringEpisode.episode : false

          return (
            <div 
              key={ep.number} 
              className={`relative flex flex-col group rounded-xl overflow-hidden border transition-all select-none ${
                isUnreleased ? 'bg-panel/50 border-line/50 opacity-60' : 
                isWatched ? 'bg-panel-2 border-green/40 shadow-[0_0_15px_rgba(160,255,120,0.1)] cursor-pointer' : 
                'bg-panel border-line hover:border-holo-3/50 cursor-pointer'
              }`}
              onClick={() => !isUnreleased && toggleEpisode(ep.number)}
            >
              <div className="aspect-video bg-void relative overflow-hidden flex items-center justify-center">
                {ep.thumbnail && !isUnreleased ? (
                  <img 
                    src={ep.thumbnail} 
                    alt={`Thumb EP ${ep.number}`} 
                    className={`w-full h-full object-cover transition-all duration-300 ${isWatched ? 'opacity-40 grayscale' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}`} 
                    loading="lazy"
                  />
                ) : (
                  <ImageOff size={24} className="text-line" />
                )}
                
                {isWatched && !isUnreleased && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green/10">
                    <div className="w-10 h-10 rounded-full bg-green text-void flex items-center justify-center shadow-[0_0_20px_rgba(160,255,120,0.4)]">
                      <Check size={20} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {isUnreleased && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/80 backdrop-blur-[2px]">
                    <Lock size={20} className="text-muted-2 mb-1" />
                    <span className="font-anton text-[11px] text-muted-2 uppercase tracking-widest">Em Breve</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                     <div className="font-mono text-[11px] text-holo-3 font-bold leading-none mb-1">EP {ep.number}</div>
                     {/* Aqui a data aparece se existir */}
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
                <div className={`text-[12px] font-bold mt-1.5 line-clamp-2 leading-tight ${isWatched ? 'text-muted-2' : 'text-text'}`}>
                  {isUnreleased ? 'Título não revelado' : ep.title}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {visibleCount < allEpisodes.length && (
        <button
          onClick={() => setVisibleCount(prev => prev + 24)}
          className="w-full mt-6 py-3 rounded-xl bg-panel border border-line text-sm font-bold hover:bg-panel-2 hover:border-holo-3 transition-colors text-muted hover:text-white flex items-center justify-center gap-2 cursor-pointer"
        >
          <ChevronDown size={16} /> Mostrar próximos episódios
        </button>
      )}
    </section>
  )
}