import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertCircle, Flame, Trophy } from 'lucide-react'
import StatCard from '../components/StatCard'

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

interface ActivityWeek {
  semana: string
  episodios_assistidos: number
}

interface RatingRow {
  nota: number
  total: number
}

interface YearRow {
  season_year: number
  total: number
}

interface StreakData {
  current: number
  longest: number
}

interface WatchHour {
  hora: number
  total: number
}

interface RecordeAnime {
  title: string
  episodes?: number
  nota?: number
  episodios_marcados?: number
  horas_gastas?: number
}

interface Records {
  longest_anime: RecordeAnime | null
  top_rated: RecordeAnime | null
  fastest_binge: RecordeAnime | null
}

export default function Estatisticas() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [genres, setGenres] = useState<GenreAffinity[]>([])
  const [activity, setActivity] = useState<ActivityWeek[]>([])
  const [ratings, setRatings] = useState<RatingRow[]>([])
  const [years, setYears] = useState<YearRow[]>([])
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchHours, setWatchHours] = useState<WatchHour[]>([])
  const [records, setRecords] = useState<Records>({ longest_anime: null, top_rated: null, fastest_binge: null })

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

        setOverview(data.overview?.[0] || null)
        setGenres(data.genres || [])
        setActivity(data.activity || [])
        setRatings(data.ratings || [])
        setYears(data.years || [])
        setStreak(data.streak || { current: 0, longest: 0 })
        setWatchHours(data.watch_hours || [])
        setRecords(data.records || { longest_anime: null, top_rated: null, fastest_binge: null })
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

  const PERIODOS = [
    { label: 'Madrugada', range: [0, 5], icon: '🌙' },
    { label: 'Manhã', range: [6, 11], icon: '☀️' },
    { label: 'Tarde', range: [12, 17], icon: '🌤️' },
    { label: 'Noite', range: [18, 23], icon: '🌃' },
  ]

  const getPeriodoTotais = () => {
    return PERIODOS.map(p => {
      const total = watchHours
        .filter(w => w.hora >= p.range[0] && w.hora <= p.range[1])
        .reduce((acc, w) => acc + w.total, 0)
      return { ...p, total }
    })
  }

  const periodoTotais = getPeriodoTotais()
  const maxPeriodoTotal = Math.max(...periodoTotais.map(p => p.total), 1)
  const periodoDominante = periodoTotais.reduce((a, b) => (b.total > a.total ? b : a), periodoTotais[0])

  const formatHoras = (horas?: number) => {
    if (horas === undefined) return ''
    if (horas < 1) return `${Math.round(horas * 60)}min`
    return `${horas.toFixed(1)}h`
  }

  const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const formatWeekLabel = (dateStr: string) => {
  const [, mes, dia] = dateStr.split('-').map(Number)
  return `${dia} ${MESES_ABREV[mes - 1]}`
}

  // --- Dicionário de Tradução (fallback — a maioria já vem traduzida da view) ---
  const traduzirGenero = (genre: string) => {
    const dicionario: Record<string, string> = {
      'Action': 'Ação', 'Adventure': 'Aventura', 'Comedy': 'Comédia', 'Drama': 'Drama',
      'Ecchi': 'Ecchi', 'Fantasy': 'Fantasia', 'Horror': 'Terror', 'Mahou Shoujo': 'Garotas Mágicas',
      'Mecha': 'Mecha', 'Music': 'Música', 'Mystery': 'Mistério', 'Psychological': 'Psicológico',
      'Romance': 'Romance', 'Sci-Fi': 'Ficção Científica', 'Slice of Life': 'Slice of Life',
      'Sports': 'Esportes', 'Supernatural': 'Sobrenatural', 'Thriller': 'Suspense'
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

  // --- Dados para os gráficos de barra ---
  const activityRecente = activity.slice(-8)
  const maxEpisodios = activityRecente.length > 0
    ? Math.max(...activityRecente.map(a => a.episodios_assistidos), 1)
    : 1

  const maxRatingTotal = ratings.length > 0 ? Math.max(...ratings.map(r => r.total), 1) : 1

  const maxYearTotal = years.length > 0 ? Math.max(...years.map(y => y.total), 1) : 1

  return (
    <div className="pb-20">
      <div className="max-w-[980px] mx-auto px-5 pt-8 relative z-10">

        <div className="mb-8">
          <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1">Estatísticas</h1>
          <p className="text-muted text-sm">Sua relação com anime, em números — tudo calculado a partir do seu próprio Deck.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 mb-8 md:grid md:grid-cols-2 md:overflow-visible">
          <StatCard
            icon={<Flame size={18} />}
            value={streak.current}
            label="Streak Atual (dias)"
            accentColor="coral"
          />
          <StatCard
            icon={<Trophy size={18} />}
            value={streak.longest}
            label="Recorde de Streak (dias)"
            accentColor="gold"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Atividade por Semana */}
          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-1">Atividade Recente</h2>
            <p className="text-[11px] text-muted-2 mb-6">Episódios marcados como assistidos, por semana</p>
            {activityRecente.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">Marque episódios pra ver sua atividade por semana aqui.</p>
            ) : (
              <div className="flex items-end gap-2 h-[140px]">
                {activityRecente.map(a => {
                  const heightPct = (a.episodios_assistidos / maxEpisodios) * 100
                  return (
                    <div key={a.semana} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono text-[10px] text-muted-2 whitespace-nowrap">{a.episodios_assistidos} eps</span>
                      <div
                        className="w-full bg-gradient-to-t from-holo-3 to-holo-2 rounded-t-md min-h-[4px]"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                      <span className="font-mono text-[9.5px] text-muted-2 whitespace-nowrap">{formatWeekLabel(a.semana)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Distribuição de Notas */}
          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-1">Distribuição de Notas</h2>
            <p className="text-[11px] text-muted-2 mb-6">Quantos animes você avaliou com cada nota</p>
            {ratings.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">Avalie alguns animes pra ver o histograma aqui.</p>
            ) : (
              <div className="flex items-end gap-2 h-[140px]">
                {ratings.map(r => {
                  const heightPct = (r.total / maxRatingTotal) * 100
                  return (
                    <div key={r.nota} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" title={`${r.total} ${r.total === 1 ? 'anime' : 'animes'} com nota ${r.nota}`}>
                      <span className="font-mono text-[10px] text-muted-2 whitespace-nowrap">{r.total} {r.total === 1 ? 'anime' : 'animes'}</span>
                      <div
                        className="w-full bg-gold rounded-t-md min-h-[4px]"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                      <span className="font-mono text-[9.5px] text-muted-2 whitespace-nowrap">nota {r.nota}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-anton uppercase text-[15px] mb-1">Distribuição por Ano de Lançamento</h2>
          <p className="text-[11px] text-muted-2 mb-6">Quantos animes assistidos por ano de estreia</p>
          {years.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">
              Ainda não temos o ano de lançamento no cache dos seus animes — assim que isso for sincronizado, esse gráfico aparece aqui.
            </p>
          ) : (
            <div className="flex items-end gap-2 h-[140px] overflow-x-auto">
              {years.map(y => {
                const heightPct = (y.total / maxYearTotal) * 100
                return (
                  <div key={y.season_year} className="min-w-[36px] flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="font-mono text-[10px] text-muted-2">{y.total}</span>
                    <div
                      className="w-full bg-gradient-to-t from-holo-1 to-holo-2 rounded-t-md min-h-[4px]"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="font-mono text-[9.5px] text-muted-2">{y.season_year}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Padrão de Horário */}
        <div className="bg-panel border border-line rounded-2xl p-6 mt-5">
          <h2 className="font-anton uppercase text-[15px] mb-1">Padrão de Horário</h2>
          <p className="text-[11px] text-muted-2 mb-6">Em que período do dia você mais assiste</p>
          {watchHours.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">Marque episódios pra ver seu padrão de horário aqui.</p>
          ) : (
            <>
              <p className="text-[13px] mb-5">
                Você costuma assistir mais de <b className="text-holo-3">{periodoDominante.icon} {periodoDominante.label.toLowerCase()}</b>.
              </p>
              <div className="grid grid-cols-4 gap-3">
                {periodoTotais.map(p => {
                  const heightPct = (p.total / maxPeriodoTotal) * 100
                  return (
                    <div key={p.label} className="flex flex-col items-center gap-2">
                      <div className="w-full h-[80px] bg-panel-2 rounded-lg overflow-hidden flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-holo-1 to-holo-3 rounded-t-lg min-h-[4px]"
                          style={{ height: `${heightPct}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[10px] text-muted-2 text-center">{p.label}</span>
                      <span className="font-mono text-[9.5px] text-muted-2">{p.total} eps</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Recordes Pessoais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Maior Maratona</div>
            {records.longest_anime ? (
              <>
                <div className="font-anton text-lg truncate" title={records.longest_anime.title}>{records.longest_anime.title}</div>
                <div className="text-[12px] text-muted mt-1">{records.longest_anime.episodes} episódios</div>
              </>
            ) : (
              <div className="text-[12px] text-muted-2">Complete um anime pra desbloquear</div>
            )}
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Nota Mais Alta</div>
            {records.top_rated ? (
              <>
                <div className="font-anton text-lg truncate" title={records.top_rated.title}>{records.top_rated.title}</div>
                <div className="text-[12px] text-gold mt-1">Nota {records.top_rated.nota}</div>
              </>
            ) : (
              <div className="text-[12px] text-muted-2">Avalie um anime pra desbloquear</div>
            )}
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Maratona Mais Rápida</div>
            {records.fastest_binge ? (
              <>
                <div className="font-anton text-lg truncate" title={records.fastest_binge.title}>{records.fastest_binge.title}</div>
                <div className="text-[12px] text-holo-3 mt-1">
                  {records.fastest_binge.episodios_marcados} eps em {formatHoras(records.fastest_binge.horas_gastas)}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-muted-2">Marque 2+ episódios do mesmo anime pra desbloquear</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}