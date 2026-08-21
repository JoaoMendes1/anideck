import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertCircle, Flame, Trophy } from 'lucide-react'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useContagemAnimada } from '../hooks/useContagemAnimada'

interface StatsOverview {
  total_animes: number
  assistindo: number
  em_dia: number
  completos: number
  dropados: number
  nota_media: number
  tempo_total_minutos: number
}

// As três camadas da taxonomia do AniDeck. Demografias e Gêneros competem no ranking;
// Tags Temáticas ficam de fora dele, como badge informativo.
type Tier = 'demografia' | 'genero' | 'tag_tematica'

interface GenreAffinity {
  genre: string
  // Opcional de propósito: enquanto a migration 003 não for aplicada no Supabase, a view
  // antiga não devolve essa coluna — e aí tudo cai em 'genero' e a tela segue funcionando.
  tier?: Tier
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
  const [abaAfinidade, setAbaAfinidade] = useState<'genero' | 'demografia'>('genero')

  // Dispara o crescimento das barras. Elas nascem com tamanho 0 e só recebem o valor real
  // depois que os dados chegaram — é a transição do CSS que faz o resto.
  const [desenhado, setDesenhado] = useState(false)

  const registrar = useRevealOnScroll()

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar suas estatísticas.')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Um frame de atraso depois que o loading sai: sem isso o React pintaria o tamanho final
  // de uma vez e não haveria transição nenhuma pra ver.
  useEffect(() => {
    if (loading) return
    const frame = requestAnimationFrame(() => setDesenhado(true))
    return () => cancelAnimationFrame(frame)
  }, [loading])

  // --- Contadores animados dos cards de destaque ---
  const tempoAnimado = useContagemAnimada(overview?.tempo_total_minutos || 0)
  const notaAnimada = useContagemAnimada(overview?.nota_media || 0)
  const streakAtualAnimado = useContagemAnimada(streak.current)
  const streakRecordeAnimado = useContagemAnimada(streak.longest)

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

  const tierDe = (g: GenreAffinity): Tier => g.tier ?? 'genero'

  const demografias = genres.filter(g => tierDe(g) === 'demografia')
  const generosNarrativos = genres.filter(g => tierDe(g) === 'genero')
  const tagsTematicas = genres.filter(g => tierDe(g) === 'tag_tematica')

  // O favorito sai do ranking competitivo (Demografias + Gêneros). Tag temática não
  // disputa esse posto: "Escolar" não é uma resposta pra "que tipo de anime você assiste".
  // A view já devolve ordenado por total_watched, então o primeiro que sobra é o topo.
  const favorito = genres.find(g => tierDe(g) !== 'tag_tematica')
  const generoFavorito = favorito ? favorito.genre : 'N/A'

  const afinidadeAtiva = abaAfinidade === 'demografia' ? demografias : generosNarrativos
  const maxGenreWatched = afinidadeAtiva.length > 0
    ? Math.max(...afinidadeAtiva.map(g => g.total_watched))
    : 1

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

  // Cada arco começa com comprimento 0 e cresce até a fatia real.
  const arco = (pct: number) => (desenhado ? `${pct} ${100 - pct}` : `0 100`)

  // --- Dados para os gráficos de barra ---
  const activityRecente = activity.slice(-8)
  const maxEpisodios = activityRecente.length > 0
    ? Math.max(...activityRecente.map(a => a.episodios_assistidos), 1)
    : 1

  const maxRatingTotal = ratings.length > 0 ? Math.max(...ratings.map(r => r.total), 1) : 1

  const maxYearTotal = years.length > 0 ? Math.max(...years.map(y => y.total), 1) : 1

  // Escalona o atraso de cada barra dentro do mesmo gráfico: elas sobem em cascata da
  // esquerda pra direita em vez de todas de uma vez, o que lê como um gráfico "montando".
  const atrasoBarra = (indice: number) => ({ transitionDelay: `${indice * 45}ms` })

  return (
    <div className="pb-20">
      <div className="max-w-[980px] mx-auto px-5 pt-8 relative z-10">

        <div ref={registrar} className="reveal mb-8">
          <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-1">Estatísticas</h1>
          <p className="text-muted text-sm">Sua relação com anime, em números — tudo calculado a partir do seu próprio Deck.</p>
        </div>

        {/* Três colunas em qualquer largura: empilhados no mobile, esses cards empurravam
            o resto da página pra baixo demais. Fonte e padding encolhem via sm:. */}
        <div ref={registrar} className="reveal grid grid-cols-3 gap-2.5 sm:gap-4 mb-3 sm:mb-4" style={{ transitionDelay: '.05s' }}>
          <div className="bg-gradient-to-br from-holo-1/10 to-holo-3/10 border border-holo-3/30 rounded-2xl p-3.5 sm:p-6">
            <div className="font-mono text-[8.5px] sm:text-[10.5px] text-muted-2 tracking-wider sm:tracking-widest mb-1.5 sm:mb-2 uppercase leading-tight">Tempo Assistido</div>
            <div className="font-anton text-lg sm:text-3xl tabular-nums">{formatTime(Math.round(tempoAnimado))}</div>
          </div>
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-6">
            <div className="font-mono text-[8.5px] sm:text-[10.5px] text-muted-2 tracking-wider sm:tracking-widest mb-1.5 sm:mb-2 uppercase leading-tight">Gênero Favorito</div>
            <div className="font-anton text-lg sm:text-3xl text-holo-2 truncate" title={traduzirGenero(generoFavorito)}>{traduzirGenero(generoFavorito)}</div>
          </div>
          <div className="bg-panel border border-line rounded-2xl p-3.5 sm:p-6">
            <div className="font-mono text-[8.5px] sm:text-[10.5px] text-muted-2 tracking-wider sm:tracking-widest mb-1.5 sm:mb-2 uppercase leading-tight">Sua Nota Média</div>
            <div className="font-anton text-lg sm:text-3xl text-gold tabular-nums">
              {overview?.nota_media ? notaAnimada.toFixed(1) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Streak: markup próprio em grid-cols-2 em vez do StatCard, que tem largura fixa
            pensada pra lista com scroll horizontal e cortava na borda da tela no mobile. */}
        <div ref={registrar} className="reveal grid grid-cols-2 gap-2.5 sm:gap-4 mb-8" style={{ transitionDelay: '.1s' }}>
          <div className="bg-panel border border-line border-t-[3px] border-t-coral rounded-[14px] p-4 sm:p-[18px]">
            <div className="w-7 h-7 rounded-lg bg-coral/20 text-coral flex items-center justify-center mb-2">
              <Flame size={18} />
            </div>
            <b className="block font-anton text-2xl mb-0.5 tabular-nums">{Math.round(streakAtualAnimado)}</b>
            <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">Streak Atual (dias)</span>
          </div>
          <div className="bg-panel border border-line border-t-[3px] border-t-gold rounded-[14px] p-4 sm:p-[18px]">
            <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold flex items-center justify-center mb-2">
              <Trophy size={18} />
            </div>
            <b className="block font-anton text-2xl mb-0.5 tabular-nums">{Math.round(streakRecordeAnimado)}</b>
            <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">Recorde de Streak (dias)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-6">Distribuição por Status</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <svg width="130" height="130" viewBox="0 0 42 42" className="-rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#181330" strokeWidth="6"></circle>
                {pctAssistindo > 0 && <circle className="anim-donut" cx="21" cy="21" r="15.9" fill="transparent" stroke="#3FE0F0" strokeWidth="6" strokeDasharray={arco(pctAssistindo)} strokeDashoffset="25" />}
                {pctEmDia > 0 && <circle className="anim-donut" cx="21" cy="21" r="15.9" fill="transparent" stroke="#a0ff78" strokeWidth="6" strokeDasharray={arco(pctEmDia)} strokeDashoffset={offEmDia} />}
                {pctCompleto > 0 && <circle className="anim-donut" cx="21" cy="21" r="15.9" fill="transparent" stroke="#FFC542" strokeWidth="6" strokeDasharray={arco(pctCompleto)} strokeDashoffset={offCompleto} />}
                {pctDropado > 0 && <circle className="anim-donut" cx="21" cy="21" r="15.9" fill="transparent" stroke="#6B5F94" strokeWidth="6" strokeDasharray={arco(pctDropado)} strokeDashoffset={offDropado} />}
              </svg>
              <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-holo-3"></span>Assistindo <b className="ml-auto font-mono tabular-nums">{pctAssistindo.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-green"></span>Em Dia <b className="ml-auto font-mono tabular-nums">{pctEmDia.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-gold"></span>Completo <b className="ml-auto font-mono tabular-nums">{pctCompleto.toFixed(0)}%</b></div>
                <div className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-sm bg-muted-2"></span>Dropado <b className="ml-auto font-mono tabular-nums">{pctDropado.toFixed(0)}%</b></div>
              </div>
            </div>
          </div>

          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6" style={{ transitionDelay: '.08s' }}>
            <h2 className="font-anton uppercase text-[15px] mb-1">Afinidade</h2>
            <p className="text-[11px] text-muted-2 mb-4">
              Demografia é o mercado da obra (Isekai, Shounen); gênero é a narrativa (Ação, Drama)
            </p>

            <div className="flex gap-2 mb-5">
              {([
                { valor: 'genero', label: 'Gêneros' },
                { valor: 'demografia', label: 'Demografias' },
              ] as const).map(aba => (
                <button
                  key={aba.valor}
                  type="button"
                  onClick={() => setAbaAfinidade(aba.valor)}
                  className={`select-none px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer border ${
                    abaAfinidade === aba.valor
                      ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void border-transparent'
                      : 'bg-panel-2 border-line text-muted hover:border-holo-2 hover:text-text'
                  }`}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {afinidadeAtiva.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">
                {abaAfinidade === 'demografia'
                  ? 'Nenhuma demografia identificada ainda nos seus animes.'
                  : 'Cadastre animes no seu Deck pra ver sua afinidade aqui.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {afinidadeAtiva.slice(0, 5).map((g, i) => {
                  const widthPct = (g.total_watched / maxGenreWatched) * 100
                  return (
                    <div key={g.genre} className="grid grid-cols-[90px_1fr_40px] gap-3 items-center group">
                      <span className="text-[12.5px] font-bold truncate" title={traduzirGenero(g.genre)}>{traduzirGenero(g.genre)}</span>
                      <div className="h-2 bg-panel-2 rounded-full overflow-hidden" title={`Nota média: ${g.media_nota_genero ?? '—'}`}>
                        <div
                          className="anim-crescer barra-hover h-full bg-gradient-to-r from-holo-1 to-holo-2 rounded-full"
                          style={{ width: desenhado ? `${widthPct}%` : '0%', ...atrasoBarra(i) }}
                        ></div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-2 text-right tabular-nums">{g.total_watched}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tags Temáticas — fora do ranking competitivo de propósito: elas descrevem
            cenário e ferramenta da obra ("Escolar", "Magia"), não uma categoria que
            disputa a atenção do usuário. Por isso viram badge, e não gráfico de barra. */}
        {tagsTematicas.length > 0 && (
          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6 mb-5">
            <h2 className="font-anton uppercase text-[15px] mb-1">Tags Temáticas</h2>
            <p className="text-[11px] text-muted-2 mb-5">Elementos que mais aparecem nos seus animes</p>
            <div className="flex flex-wrap gap-2">
              {tagsTematicas.slice(0, 14).map(t => (
                <span
                  key={t.genre}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-panel-2 border border-line text-[11.5px] font-bold transition-all duration-200 hover:border-holo-2 hover:-translate-y-0.5 cursor-default"
                  title={`${t.total_watched} ${t.total_watched === 1 ? 'anime' : 'animes'}`}
                >
                  {traduzirGenero(t.genre)}
                  <b className="font-mono text-[10px] text-muted-2 tabular-nums">{t.total_watched}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Atividade por Semana */}
          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-anton uppercase text-[15px] mb-1">Atividade Recente</h2>
            <p className="text-[11px] text-muted-2 mb-6">Episódios marcados como assistidos, por semana</p>
            {activityRecente.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">Marque episódios pra ver sua atividade por semana aqui.</p>
            ) : (
              <div className="flex items-end gap-2 h-[140px]">
                {activityRecente.map((a, i) => {
                  const heightPct = (a.episodios_assistidos / maxEpisodios) * 100
                  return (
                    <div key={a.semana} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono text-[10px] text-muted-2 whitespace-nowrap tabular-nums">{a.episodios_assistidos} eps</span>
                      <div
                        className="anim-crescer barra-hover w-full bg-gradient-to-t from-holo-3 to-holo-2 rounded-t-md min-h-[4px]"
                        style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                      ></div>
                      <span className="font-mono text-[9.5px] text-muted-2 whitespace-nowrap">{formatWeekLabel(a.semana)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Distribuição de Notas */}
          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6" style={{ transitionDelay: '.08s' }}>
            <h2 className="font-anton uppercase text-[15px] mb-1">Distribuição de Notas</h2>
            <p className="text-[11px] text-muted-2 mb-6">Quantos animes você avaliou com cada nota</p>
            {ratings.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">Avalie alguns animes pra ver o histograma aqui.</p>
            ) : (
              <div className="flex items-end gap-2 h-[140px]">
                {ratings.map((r, i) => {
                  const heightPct = (r.total / maxRatingTotal) * 100
                  return (
                    <div key={r.nota} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" title={`${r.total} ${r.total === 1 ? 'anime' : 'animes'} com nota ${r.nota}`}>
                      <span className="font-mono text-[10px] text-muted-2 whitespace-nowrap tabular-nums">{r.total} {r.total === 1 ? 'anime' : 'animes'}</span>
                      <div
                        className="anim-crescer barra-hover w-full bg-gold rounded-t-md min-h-[4px]"
                        style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                      ></div>
                      <span className="font-mono text-[9.5px] text-muted-2 whitespace-nowrap">nota {r.nota}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-anton uppercase text-[15px] mb-1">Distribuição por Ano de Lançamento</h2>
          <p className="text-[11px] text-muted-2 mb-6">Quantos animes assistidos por ano de estreia</p>
          {years.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">
              Ainda não temos o ano de lançamento no cache dos seus animes — assim que isso for sincronizado, esse gráfico aparece aqui.
            </p>
          ) : (
            <div className="flex items-end gap-2 h-[140px] overflow-x-auto custom-scrollbar">
              {years.map((y, i) => {
                const heightPct = (y.total / maxYearTotal) * 100
                return (
                  <div key={y.season_year} className="min-w-[36px] flex-1 flex flex-col items-center gap-2 h-full justify-end" title={`${y.total} ${y.total === 1 ? 'anime' : 'animes'} de ${y.season_year}`}>
                    <span className="font-mono text-[10px] text-muted-2 tabular-nums">{y.total}</span>
                    <div
                      className="anim-crescer barra-hover w-full bg-gradient-to-t from-holo-1 to-holo-2 rounded-t-md min-h-[4px]"
                      style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                    ></div>
                    <span className="font-mono text-[9.5px] text-muted-2 tabular-nums">{y.season_year}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Padrão de Horário */}
        <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6 mt-5">
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
                {periodoTotais.map((p, i) => {
                  const heightPct = (p.total / maxPeriodoTotal) * 100
                  const dominante = p.label === periodoDominante.label && p.total > 0
                  return (
                    <div key={p.label} className="flex flex-col items-center gap-2">
                      <div className="w-full h-[80px] bg-panel-2 rounded-lg overflow-hidden flex items-end">
                        <div
                          className={`anim-crescer barra-hover w-full rounded-t-lg min-h-[4px] bg-gradient-to-t from-holo-1 to-holo-3 ${dominante ? '' : 'opacity-45'}`}
                          style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                        ></div>
                      </div>
                      <span className={`font-mono text-[10px] text-center ${dominante ? 'text-holo-3' : 'text-muted-2'}`}>{p.label}</span>
                      <span className="font-mono text-[9.5px] text-muted-2 tabular-nums">{p.total} eps</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Recordes Pessoais */}
        <div ref={registrar} className="reveal grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-panel border border-line rounded-2xl p-5 transition-colors duration-200 hover:border-muted-2">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Maior Maratona</div>
            {records.longest_anime ? (
              <>
                {/* line-clamp-2 em vez de truncate: título de anime cortado no meio da
                    primeira palavra não identifica a obra. */}
                <div className="font-anton text-lg leading-tight line-clamp-2" title={records.longest_anime.title}>{records.longest_anime.title}</div>
                <div className="text-[12px] text-muted mt-1 tabular-nums">{records.longest_anime.episodes} episódios</div>
              </>
            ) : (
              <div className="text-[12px] text-muted-2">Complete um anime pra desbloquear</div>
            )}
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5 transition-colors duration-200 hover:border-muted-2">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Nota Mais Alta</div>
            {records.top_rated ? (
              <>
                <div className="font-anton text-lg leading-tight line-clamp-2" title={records.top_rated.title}>{records.top_rated.title}</div>
                <div className="text-[12px] text-gold mt-1 tabular-nums">Nota {records.top_rated.nota}</div>
              </>
            ) : (
              <div className="text-[12px] text-muted-2">Avalie um anime pra desbloquear</div>
            )}
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5 transition-colors duration-200 hover:border-muted-2">
            <div className="font-mono text-[10.5px] text-muted-2 tracking-widest mb-2 uppercase">Maratona Mais Rápida</div>
            {records.fastest_binge ? (
              <>
                <div className="font-anton text-lg leading-tight line-clamp-2" title={records.fastest_binge.title}>{records.fastest_binge.title}</div>
                <div className="text-[12px] text-holo-3 mt-1 tabular-nums">
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
