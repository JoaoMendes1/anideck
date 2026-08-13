import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertCircle } from 'lucide-react'

interface StatsOverview {
  total_animes: number
  assistindo: number
  em_dia: number
  completos: number
  dropados: number
  nota_media: number
  tempo_total_minutos: number
}

interface GenreAffinity {
  genre: string
  total_watched: number
  media_nota_genero: number
}

export default function Estatisticas() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [genres, setGenres] = useState<GenreAffinity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const res = await fetch('/api/stats/user', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (!res.ok) throw new Error('Falha ao carregar estatísticas')
        
        const data = await res.json()
        
        // Como a view retorna um array, pegamos a primeira posição (se existir)
        setOverview(data.overview?.[0] || null)
        setGenres(data.genres || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-20 text-center text-coral">
        <AlertCircle className="mx-auto mb-2 opacity-80" size={28} />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  // --- Lógica de Formatação ---
  const formatTime = (minutes?: number) => {
    if (!minutes) return '0h'
    const d = Math.floor(minutes / 1440)
    const h = Math.floor((minutes % 1440) / 60)
    if (d > 0) return `${d}d ${h}h`
    return `${h}h`
  }

  // --- Dicionário de Tradução ---
  const traduzirGenero = (genre: string) => {
    const dicionario: Record<string, string> = {
      'Action': 'Ação',
      'Adventure': 'Aventura',
      'Comedy': 'Comédia',
      'Drama': 'Drama',
      'Ecchi': 'Ecchi',
      'Fantasy': 'Fantasia',
      'Horror': 'Terror',
      'Mahou Shoujo': 'Garotas Mágicas',
      'Mecha': 'Mecha',
      'Music': 'Música',
      'Mystery': 'Mistério',
      'Psychological': 'Psicológico',
      'Romance': 'Romance',
      'Sci-Fi': 'Ficção Científica',
      'Slice of Life': 'Slice of Life',
      'Sports': 'Esportes',
      'Supernatural': 'Sobrenatural',
      'Thriller': 'Suspense'
    }
    return dicionario[genre] || genre
  }

  const generoFavorito = genres.length > 0 ? genres[0].genre : 'N/A'
  const maxGenreWatched = genres.length > 0 ? Math.max(...genres.map(g => g.total_watched)) : 1

  // --- Matemática do Gráfico Donut (SVG) ---
  const totalAnimes = overview?.total_animes || 1
  const getPct = (val: number) => (val / totalAnimes) * 100

  const pctAssistindo = getPct(overview?.assistindo || 0)
  const pctEmDia = getPct(overview?.em_dia || 0)
  const pctCompleto = getPct(overview?.completos || 0)
  const pctDropado = getPct(overview?.dropados || 0)
  
  const offEmDia = 25 - pctAssistindo
  const offCompleto = offEmDia - pctEmDia
  const offDropado = offCompleto - pctCompleto

  return (
    <div className="pb-20">
      <div className="max-w-[980px] mx-auto px-5 pt-8 relative z-10">
        
        <div className="mb-8">
          <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1">Estatísticas</h1>
          <p className="text-muted text-sm">Sua relação com anime, em números — tudo calculado a partir do seu próprio Deck.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-holo-1/10 to-holo-3/10 border border-holo-3/30 rounded-2xl p-6">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Tempo Total Assistido</div>
            <div className="font-anton text-3xl">{formatTime(overview?.tempo_total_minutos)}</div>
          </div>
          <div className="bg-panel border border-line rounded-2xl p-6">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Gênero Favorito</div>
            <div className="font-anton text-3xl text-holo-2 truncate">{traduzirGenero(generoFavorito)}</div>
          </div>
          <div className="bg-panel border border-line rounded-2xl p-6">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Sua Nota Média</div>
            <div className="font-anton text-3xl text-gold">{overview?.nota_media || 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Gráfico Donut de Status */}
          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-6">Distribuição por Status</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <svg width="130" height="130" viewBox="0 0 42 42" className="-rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#181330" strokeWidth="6"></circle>
                {pctAssistindo > 0 && <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#3FE0F0" strokeWidth="6" strokeDasharray={`${pctAssistindo} ${100 - pctAssistindo}`} strokeDashoffset="25" />}
                {pctEmDia > 0 && <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#a0ff78" strokeWidth="6" strokeDasharray={`${pctEmDia} ${100 - pctEmDia}`} strokeDashoffset={offEmDia} />}
                {pctCompleto > 0 && <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#FFC542" strokeWidth="6" strokeDasharray={`${pctCompleto} ${100 - pctCompleto}`} strokeDashoffset={offCompleto} />}
                {pctDropado > 0 && <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#6B5F94" strokeWidth="6" strokeDasharray={`${pctDropado} ${100 - pctDropado}`} strokeDashoffset={offDropado} />}
              </svg>
              <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-holo-3"></span>Assistindo <b className="ml-auto font-mono">{pctAssistindo.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-green"></span>Em Dia <b className="ml-auto font-mono">{pctEmDia.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-gold"></span>Completo <b className="ml-auto font-mono">{pctCompleto.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-muted-2"></span>Dropado <b className="ml-auto font-mono">{pctDropado.toFixed(0)}%</b></div>
              </div>
            </div>
          </div>

          {/* Barras de Afinidade de Gêneros */}
          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-6">Afinidade de Gêneros</h2>
            <div className="flex flex-col gap-3">
              {genres.slice(0, 5).map(g => {
                const widthPct = (g.total_watched / maxGenreWatched) * 100
                return (
                  <div key={g.genre} className="grid grid-cols-[90px_1fr_40px] gap-3 items-center">
                    <span className="text-[12.5px] font-bold truncate" title={traduzirGenero(g.genre)}>{traduzirGenero(g.genre)}</span>
                    <div className="h-2 bg-panel-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-holo-1 to-holo-2 rounded-full" style={{ width: `${widthPct}%` }}></div>
                    </div>
                    <span className="font-mono text-[11px] text-muted-2 text-right">{g.total_watched}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}