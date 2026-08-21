import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AlertCircle, Flame, Trophy, Compass, Target, Clock } from 'lucide-react'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useContagemAnimada } from '../hooks/useContagemAnimada'
import QuadranteAfinidade from '../components/QuadranteAfinidade'
import SheetDeAnimes, { type AnimeDoGenero } from '../components/SheetDeAnimes'

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

interface AnimeEsquecido {
  mal_id: number
  title: string
  ultimo_episodio: string
  episodios_assistidos: number
  total_episodios: number | null
}

interface Records {
  longest_anime: RecordeAnime | null
  top_rated: RecordeAnime | null
  fastest_binge: RecordeAnime | null
  forgotten: AnimeEsquecido | null
}

interface Variacao {
  pct: number
  valida: boolean
}

interface Perfil {
  tipo: '' | 'especialista' | 'explorador' | 'equilibrado'
  concentracao: number
}

interface Conclusao {
  taxa: number
  valida: boolean
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
  const [records, setRecords] = useState<Records>({ longest_anime: null, top_rated: null, fastest_binge: null, forgotten: null })
  const [abaAfinidade, setAbaAfinidade] = useState<'genero' | 'demografia'>('genero')

  // Sessões de assistir (marcações agrupadas por proximidade no tempo, calculadas no Go).
  // Chegam como timestamps ISO justamente pra hora local ser resolvida aqui no navegador.
  const [sessions, setSessions] = useState<string[]>([])
  const [diasComAtividade, setDiasComAtividade] = useState(0)
  const [variacao, setVariacao] = useState<Variacao>({ pct: 0, valida: false })
  const [perfil, setPerfil] = useState<Perfil>({ tipo: '', concentracao: 0 })
  const [conclusao, setConclusao] = useState<Conclusao>({ taxa: 0, valida: false })

  // "Agora" congelado na primeira renderização: chamar Date.now() no meio do render tornaria
  // o cálculo de "parado há N dias" instável entre re-renderizações.
  const [agora] = useState(() => Date.now())

  // Drill-down: qual recorte está aberto no Sheet. Guardar o tipo junto do valor deixa o
  // mesmo fluxo servir a gênero e a ano sem duplicar estado nem componente.
  const [recorte, setRecorte] = useState<{ tipo: 'genero' | 'ano'; valor: string } | null>(null)
  const [animesDoRecorte, setAnimesDoRecorte] = useState<AnimeDoGenero[]>([])
  const [carregandoRecorte, setCarregandoRecorte] = useState(false)

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
        setRecords(data.records || { longest_anime: null, top_rated: null, fastest_binge: null, forgotten: null })
        setSessions(data.sessions || [])
        setDiasComAtividade(data.dias_com_atividade || 0)
        setVariacao(data.variacao_semanal || { pct: 0, valida: false })
        setPerfil(data.perfil || { tipo: '', concentracao: 0 })
        setConclusao(data.conclusao || { taxa: 0, valida: false })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar suas estatísticas.')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Busca os animes do gênero clicado. Roda só quando o Sheet abre — não faz sentido
  // carregar a lista de todos os gêneros de antemão se o usuário talvez não clique em nenhum.
  useEffect(() => {
    if (!recorte) return

    let cancelado = false
    const buscar = async () => {
      setCarregandoRecorte(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const url = recorte.tipo === 'genero'
          ? `/api/stats/genre?nome=${encodeURIComponent(recorte.valor)}`
          : `/api/stats/year?ano=${encodeURIComponent(recorte.valor)}`

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (!res.ok) throw new Error('Falha ao carregar os animes')
        const lista: AnimeDoGenero[] = await res.json()

        // As capas não vivem no nosso banco (regra de não armazenar catálogo), então vêm
        // da AniList num segundo passo — mesmo caminho que o Meu Deck já usa.
        let comCapas = lista || []
        if (comCapas.length > 0) {
          const capas = await fetch('/api/anime/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: comCapas.map(a => a.mal_id) })
          })
          const json = await capas.json()
          const mapa: Record<number, string> = {}
          for (const m of json.data || []) {
            mapa[m.mal_id] = m.images?.jpg?.image_url || ''
          }
          comCapas = comCapas.map(a => ({ ...a, image_url: mapa[a.mal_id] }))
        }

        // Ignora a resposta se o usuário já fechou o Sheet ou clicou noutro recorte.
        if (!cancelado) setAnimesDoRecorte(comCapas)
      } catch {
        if (!cancelado) setAnimesDoRecorte([])
      } finally {
        if (!cancelado) setCarregandoRecorte(false)
      }
    }

    buscar()
    return () => { cancelado = true }
  }, [recorte])

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

  // Sessão em vez de episódio solto: 20 episódios marcados em 5 minutos são UMA maratona,
  // não 20 eventos independentes de comportamento. Sem isso, quem cadastra o backlog inteiro
  // numa sentada às 23h recebe um gráfico afirmando que é espectador noturno.
  //
  // A hora é lida com getHours(), que é a hora local do navegador. O Postgres extraía a hora
  // em UTC — para quem está em UTC-3, isso deslocava o gráfico inteiro em 3 horas.
  const usandoSessoes = sessions.length > 0

  const getPeriodoTotais = () => {
    return PERIODOS.map(p => {
      if (usandoSessoes) {
        const total = sessions.filter(iso => {
          const hora = new Date(iso).getHours()
          return hora >= p.range[0] && hora <= p.range[1]
        }).length
        return { ...p, total }
      }

      // Fallback para a contagem antiga enquanto a view de sessões não existir no banco.
      const total = watchHours
        .filter(w => w.hora >= p.range[0] && w.hora <= p.range[1])
        .reduce((acc, w) => acc + w.total, 0)
      return { ...p, total }
    })
  }

  const periodoTotais = getPeriodoTotais()
  const unidadePeriodo = usandoSessoes ? 'sessões' : 'eps'

  // Cold-start: com pouco histórico, qualquer padrão é ruído. Dez dias distintos de atividade
  // é o mínimo pra frase de insight não estar falando de uma tarde de cadastro em lote.
  const DIAS_MINIMOS_PADRAO = 10
  const padraoConfiavel = diasComAtividade >= DIAS_MINIMOS_PADRAO
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

  // Anime esquecido: só vira alerta depois de uma semana parado. Antes disso é só uma pausa
  // normal, e cutucar alguém por não ter assistido ontem seria irritante, não útil.
  const DIAS_PARA_ESQUECIDO = 7
  const esquecido = records.forgotten
  const diasParado = esquecido
    ? Math.floor((agora - new Date(esquecido.ultimo_episodio).getTime()) / 86400000)
    : 0
  const mostrarEsquecido = Boolean(esquecido) && diasParado >= DIAS_PARA_ESQUECIDO

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
        <div ref={registrar} className="reveal grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-8" style={{ transitionDelay: '.1s' }}>
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

          {/* Perfil de gosto — concentração do consumo nos dois rótulos mais assistidos.
              É heurística assumida, não estatística: o texto explica o número que a gerou
              pra não virar rótulo misterioso. */}
          <div className="bg-panel border border-line border-t-[3px] border-t-holo-2 rounded-[14px] p-4 sm:p-[18px]">
            <div className="w-7 h-7 rounded-lg bg-holo-2/20 text-holo-2 flex items-center justify-center mb-2">
              <Compass size={18} />
            </div>
            {perfil.tipo ? (
              <>
                <b className="block font-anton text-xl sm:text-2xl mb-0.5 capitalize">{perfil.tipo}</b>
                <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">
                  {perfil.concentracao.toFixed(0)}% em 2 categorias
                </span>
              </>
            ) : (
              <>
                <b className="block font-anton text-xl sm:text-2xl mb-0.5 text-muted-2">—</b>
                <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">Perfil de gosto</span>
              </>
            )}
          </div>

          {/* Taxa de conclusão — enquadrada como curiosidade, nunca como cobrança.
              Ninguém abre estatística do próprio hobby pra ser lembrado do que abandonou. */}
          <div className="bg-panel border border-line border-t-[3px] border-t-green rounded-[14px] p-4 sm:p-[18px]">
            <div className="w-7 h-7 rounded-lg bg-green/20 text-green flex items-center justify-center mb-2">
              <Target size={18} />
            </div>
            {conclusao.valida ? (
              <>
                <b className="block font-anton text-xl sm:text-2xl mb-0.5 tabular-nums">{conclusao.taxa.toFixed(0)} de 10</b>
                <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">Você termina</span>
              </>
            ) : (
              <>
                <b className="block font-anton text-xl sm:text-2xl mb-0.5 text-muted-2">—</b>
                <span className="text-[10px] sm:text-[11px] text-muted-2 font-bold uppercase tracking-wider">Taxa de conclusão</span>
              </>
            )}
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
                    // Botão de verdade, não div com onClick: assim funciona por teclado e
                    // leitor de tela anuncia que a linha faz alguma coisa.
                    <button
                      key={g.genre}
                      type="button"
                      onClick={() => setRecorte({ tipo: 'genero', valor: g.genre })}
                      className="grid grid-cols-[90px_1fr_40px] gap-3 items-center text-left cursor-pointer rounded-md -mx-1 px-1 py-0.5 transition-colors hover:bg-panel-2/60 focus-visible:outline-2 focus-visible:outline-holo-3"
                      title={`Ver seus animes de ${traduzirGenero(g.genre)}`}
                    >
                      <span className="text-[12.5px] font-bold truncate">{traduzirGenero(g.genre)}</span>
                      <div className="h-2 bg-panel-2 rounded-full overflow-hidden">
                        <div
                          className="anim-crescer barra-hover h-full bg-gradient-to-r from-holo-1 to-holo-2 rounded-full"
                          style={{ width: desenhado ? `${widthPct}%` : '0%', ...atrasoBarra(i) }}
                        ></div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-2 text-right tabular-nums">{g.total_watched}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {afinidadeAtiva.length > 0 && (
              <p className="text-[10px] text-muted-2 mt-4 font-mono">Toque numa categoria pra ver os animes</p>
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

        {/* Volume x Satisfação — a view já calculava os dois números, mas eles nunca tinham
            sido cruzados. Responde "que gênero eu assisto muito mas não curto tanto?". */}
        <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6 mb-5">
          <h2 className="font-anton uppercase text-[15px] mb-1">Volume × Satisfação</h2>
          <p className="text-[11px] text-muted-2 mb-6">Quanto você assiste de cada categoria, cruzado com a nota que costuma dar</p>
          <QuadranteAfinidade
            generos={[...demografias, ...generosNarrativos]}
            notaMedia={overview?.nota_media || 0}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Atividade por Semana */}
          <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-anton uppercase text-[15px]">Atividade Recente</h2>
              {variacao.valida && (
                <span
                  className={`shrink-0 font-mono text-[10.5px] font-bold px-2 py-1 rounded-md border tabular-nums ${
                    variacao.pct >= 0
                      ? 'text-green border-green/40 bg-green/10'
                      : 'text-coral border-coral/40 bg-coral/10'
                  }`}
                  title="Últimas 4 semanas comparadas com as 4 anteriores"
                >
                  {variacao.pct >= 0 ? '↑' : '↓'} {Math.abs(variacao.pct).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-2 mb-6">
              Episódios marcados como assistidos, por semana
              {variacao.valida && ' — a variação compara as últimas 4 semanas com as 4 anteriores'}
            </p>
            {/* justify-center + max-w nas barras: com uma semana só de histórico, `flex-1`
                sozinho esticava a única barra pra largura inteira do card e o gráfico virava
                um retângulo gigante sem significado nenhum. Vale pros três gráficos de barra. */}
            {activityRecente.length === 0 ? (
              <p className="text-[12.5px] text-muted-2">Marque episódios pra ver sua atividade por semana aqui.</p>
            ) : (
              <div className="flex items-end justify-center gap-2 h-[140px]">
                {activityRecente.map((a, i) => {
                  const heightPct = (a.episodios_assistidos / maxEpisodios) * 100
                  return (
                    <div key={a.semana} className="flex-1 max-w-[64px] flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono text-[10px] text-muted-2 whitespace-nowrap tabular-nums">{a.episodios_assistidos}</span>
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
              <>
                {/* Rótulo é só o número: "4 animes" repetido seis vezes é largo demais pra
                    caber no celular, e a palavra é a mesma em todas as barras — ela vira
                    legenda embaixo do eixo, e o texto completo fica no title. */}
                <div className="flex items-end justify-center gap-2 h-[140px]">
                  {ratings.map((r, i) => {
                    const heightPct = (r.total / maxRatingTotal) * 100
                    return (
                      <div key={r.nota} className="flex-1 max-w-[64px] flex flex-col items-center gap-2 h-full justify-end" title={`${r.total} ${r.total === 1 ? 'anime' : 'animes'} com nota ${r.nota}`}>
                        <span className="font-mono text-[10px] text-muted-2 tabular-nums">{r.total}</span>
                        <div
                          className="anim-crescer barra-hover w-full bg-gold rounded-t-md min-h-[4px]"
                          style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                        ></div>
                        <span className="font-mono text-[9.5px] text-muted-2 tabular-nums">{r.nota}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-center font-mono text-[9.5px] text-muted-2 mt-2">animes por nota</p>
              </>
            )}
          </div>
        </div>

        <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-anton uppercase text-[15px] mb-1">Distribuição por Ano de Lançamento</h2>
          <p className="text-[11px] text-muted-2 mb-6">Quantos animes assistidos por ano de estreia — toque numa barra pra ver quais</p>
          {years.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">
              Ainda não temos o ano de lançamento no cache dos seus animes — assim que isso for sincronizado, esse gráfico aparece aqui.
            </p>
          ) : (
            <div className="flex items-end justify-center gap-2 h-[140px] overflow-x-auto custom-scrollbar">
              {years.map((y, i) => {
                const heightPct = (y.total / maxYearTotal) * 100
                return (
                  <button
                    key={y.season_year}
                    type="button"
                    onClick={() => setRecorte({ tipo: 'ano', valor: String(y.season_year) })}
                    className="min-w-[36px] max-w-[64px] flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer rounded-md transition-colors hover:bg-panel-2/60 focus-visible:outline-2 focus-visible:outline-holo-3"
                    title={`Ver os ${y.total} ${y.total === 1 ? 'anime' : 'animes'} de ${y.season_year}`}
                  >
                    <span className="font-mono text-[10px] text-muted-2 tabular-nums">{y.total}</span>
                    <div
                      className="anim-crescer barra-hover w-full bg-gradient-to-t from-holo-1 to-holo-2 rounded-t-md min-h-[4px]"
                      style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                    ></div>
                    <span className="font-mono text-[9.5px] text-muted-2 tabular-nums">{y.season_year}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Padrão de Horário */}
        <div ref={registrar} className="reveal bg-panel border border-line rounded-2xl p-6 mt-5">
          <h2 className="font-anton uppercase text-[15px] mb-1">Padrão de Horário</h2>
          <p className="text-[11px] text-muted-2 mb-6">
            {usandoSessoes
              ? 'Em que período do dia você começa a assistir — contando sessões, não episódios soltos'
              : 'Em que período do dia você mais assiste'}
          </p>
          {periodoTotais.every(p => p.total === 0) ? (
            <p className="text-[12.5px] text-muted-2">Marque episódios pra ver seu padrão de horário aqui.</p>
          ) : (
            <>
              {padraoConfiavel ? (
                <p className="text-[13px] mb-5">
                  Você costuma assistir mais de <b className="text-holo-3">{periodoDominante.icon} {periodoDominante.label.toLowerCase()}</b>.
                </p>
              ) : (
                // Sem histórico suficiente a tela mostra os dados mas não afirma nada sobre
                // hábito: `watched_at` grava quando o episódio foi MARCADO, e quem cadastrou
                // o backlog de uma vez ainda não revelou padrão nenhum.
                <p className="text-[13px] mb-5 text-muted">
                  Continue registrando episódios pra desbloquear seu padrão de horário —
                  <b className="text-muted-2 font-mono text-[12px]"> {diasComAtividade}/{DIAS_MINIMOS_PADRAO} dias</b> de atividade até agora.
                </p>
              )}
              <div className="grid grid-cols-4 gap-3">
                {periodoTotais.map((p, i) => {
                  const heightPct = (p.total / maxPeriodoTotal) * 100
                  const dominante = p.label === periodoDominante.label && p.total > 0
                  return (
                    <div key={p.label} className="flex flex-col items-center gap-2">
                      <div className="w-full h-[80px] bg-panel-2 rounded-lg overflow-hidden flex items-end">
                        <div
                          className={`anim-crescer barra-hover w-full rounded-t-lg min-h-[4px] bg-gradient-to-t from-holo-1 to-holo-3 ${dominante && padraoConfiavel ? '' : 'opacity-45'}`}
                          style={{ height: desenhado ? `${heightPct}%` : '0%', ...atrasoBarra(i) }}
                        ></div>
                      </div>
                      <span className={`font-mono text-[10px] text-center ${dominante && padraoConfiavel ? 'text-holo-3' : 'text-muted-2'}`}>{p.label}</span>
                      <span className="font-mono text-[9.5px] text-muted-2 tabular-nums">{p.total} {unidadePeriodo}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Anime esquecido — o único bloco acionável da página: não conta o que passou,
            aponta pra algo que dá pra fazer agora. Por isso o card inteiro é um link. */}
        {mostrarEsquecido && esquecido && (
          <div ref={registrar} className="reveal mt-5">
            <Link
              to={`/anime/${esquecido.mal_id}`}
              className="block bg-gradient-to-br from-coral/10 to-panel border border-coral/30 rounded-2xl p-6 transition-all duration-200 hover:border-coral/60 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-coral/20 text-coral flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10.5px] text-coral tracking-widest mb-1.5 uppercase">Parado há {diasParado} dias</div>
                  <div className="font-anton text-lg leading-tight line-clamp-2 mb-1">{esquecido.title}</div>
                  <div className="text-[12px] text-muted tabular-nums">
                    Você viu {esquecido.episodios_assistidos}
                    {esquecido.total_episodios ? ` de ${esquecido.total_episodios}` : ''} episódios — retomar?
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

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

      <SheetDeAnimes
        titulo={recorte && `Seus animes de ${recorte.valor}`}
        animes={animesDoRecorte}
        carregando={carregandoRecorte}
        onClose={() => { setRecorte(null); setAnimesDoRecorte([]) }}
      />
    </div>
  )
}
