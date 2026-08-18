import { useState } from 'react'
import { Check, Play, ImageOff, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

interface StreamingEpisode {
  title: string
  thumbnail: string
  url: string
  site: string
}

interface EpisodeGridProps {
  malId: number
  totalEpisodes: number
  streamingEpisodes?: StreamingEpisode[]
  initialWatched: number[]
  isLoggedIn: boolean
  // NOVA PROP: Recebe os dados de lançamento do backend
  nextAiringEpisode?: { airingAt: number; timeUntilAiring: number; episode: number }
}

export default function EpisodeGrid({ malId, totalEpisodes, streamingEpisodes = [], initialWatched, isLoggedIn, nextAiringEpisode }: EpisodeGridProps) {
  const { showToast } = useToast()
  const [watched, setWatched] = useState<number[]>(initialWatched)

  const episodesCount = totalEpisodes > 0 ? totalEpisodes : streamingEpisodes.length
  const displayEpisodes = Array.from({ length: episodesCount || 12 }, (_, i) => {
    const epNum = i + 1
    const data = streamingEpisodes[i]
    return {
      number: epNum,
      title: data?.title || `Episódio ${epNum}`,
      thumbnail: data?.thumbnail || null,
      url: data?.url || null
    }
  })

  const toggleEpisode = async (episodeNumber: number) => {
    if (!isLoggedIn) {
      showToast('Faça login para salvar seu progresso.', 'error')
      return
    }

    const isWatched = watched.includes(episodeNumber)
    
    setWatched(prev => 
      isWatched ? prev.filter(num => num !== episodeNumber) : [...prev, episodeNumber]
    )

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
      setWatched(prev => 
        isWatched ? [...prev, episodeNumber] : prev.filter(num => num !== episodeNumber)
      )
      showToast('Erro ao sincronizar episódio. Verifique sua conexão.', 'error')
    }
  }

  return (
    <section id="episodios" className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-anton text-base uppercase flex items-center gap-2 select-none">
          <span className="font-mono text-[11px] text-holo-3">EP</span> Progresso
        </h2>
        <span className="font-mono text-[11px] text-muted-2 font-bold bg-panel border border-line px-2 py-1 rounded-md">
          {watched.length} / {displayEpisodes.length}
        </span>
      </div>

      {/* Grid atualizado para cards maiores: 1 col no mobile, 2 no tablet, 3 ou 4 no desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {displayEpisodes.map((ep) => {
          const isWatched = watched.includes(ep.number)
          // Lógica: Se existe um próximo episódio e o número deste card for maior ou igual a ele, não lançou ainda.
          const isUnreleased = nextAiringEpisode ? ep.number >= nextAiringEpisode.episode : false

          return (
            <div 
              key={ep.number} 
              // Desativa o hover e o cursor se não lançou
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

                {/* Overlay de Bloqueio para episódios futuros */}
                {isUnreleased && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/80 backdrop-blur-[2px]">
                    <Lock size={20} className="text-muted-2 mb-1" />
                    <span className="font-anton text-[11px] text-muted-2 uppercase tracking-widest">Em Breve</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-mono text-[11px] text-muted-2 font-bold leading-none">EP {ep.number}</div>
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
    </section>
  )
}