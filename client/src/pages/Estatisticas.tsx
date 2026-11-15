import { useState, useEffect } from 'react'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, lerDaMemoria, guardarNaMemoria } from '../lib/cacheDeTela'
import { usePosicaoDeLista } from '../lib/posicaoDeLista'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Activity, AlertCircle, CalendarRange, ChartPie, ChartScatter, Clock, Compass, Flame, Heart, Hourglass, Layers, Star, Tags, Target, Trophy } from 'lucide-react'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useContagemAnimada } from '../hooks/useContagemAnimada'
import QuadranteAfinidade from '../components/QuadranteAfinidade'
import SheetDeAnimes, { type AnimeDoGenero } from '../components/SheetDeAnimes'
import { montarVeredito } from '../lib/veredito'
import { rotulosDoCard } from '../lib/cardDeGosto'
import CompartilharGosto from '../components/CompartilharGosto'
import Painel from '../components/gosto/Painel'
import Indicador from '../components/gosto/Indicador'
import GraficoArea from '../components/gosto/GraficoArea'
import GraficoColunas from '../components/gosto/GraficoColunas'
import RoscaStatus from '../components/gosto/RoscaStatus'
import PeriodosDoDia from '../components/gosto/PeriodosDoDia'
import { agruparNotas, preencherAnos } from '../lib/graficos'

interface StatsOverview {
  total_animes: number
  assistindo: number
  em_dia: number
  completos: number
  dropados: number
  quero_assistir: number
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
  mal_id?: number
  title: string
  image_url?: string
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

// Formato do /api/stats/user. Tudo opcional porque a tela já tratava campo ausente
// com um valor padrão; o tipo só torna explícito o que antes vinha como any.
interface RespostaStats {
  overview?: StatsOverview[]
  genres?: GenreAffinity[]
  activity?: ActivityWeek[]
  ratings?: RatingRow[]
  years?: YearRow[]
  streak?: StreakData
  watch_hours?: WatchHour[]
  records?: Records
  sessions?: string[]
  dias_com_atividade?: number
  variacao_semanal?: Variacao
  perfil?: Perfil
  conclusao?: Conclusao
}

export default function Estatisticas() {
  // Mesmo padrão do Meu Deck (ver cacheDeTela.ts): com as estatísticas já vistas nesta
  // aba, a tela nasce pronta e a versão nova chega por trás.
  const { session } = useSessao()
  const chaveDasStats = chaveDoUsuario(session?.user.id, 'estatisticas')
  const [emMemoria] = useState(() => lerDaMemoria<RespostaStats>(chaveDasStats))

  const [overview, setOverview] = useState<StatsOverview | null>(emMemoria?.overview?.[0] || null)
  const [genres, setGenres] = useState<GenreAffinity[]>(emMemoria?.genres || [])
  const [activity, setActivity] = useState<ActivityWeek[]>(emMemoria?.activity || [])
  const [ratings, setRatings] = useState<RatingRow[]>(emMemoria?.ratings || [])
  const [years, setYears] = useState<YearRow[]>(emMemoria?.years || [])
  const [streak, setStreak] = useState<StreakData>(emMemoria?.streak || { current: 0, longest: 0 })
  const [loading, setLoading] = useState(!emMemoria)
  const [error, setError] = useState<string | null>(null)
  const [watchHours, setWatchHours] = useState<WatchHour[]>(emMemoria?.watch_hours || [])
  const [records, setRecords] = useState<Records>(emMemoria?.records || { longest_anime: null, top_rated: null, fastest_binge: null, forgotten: null })
  const [abaAfinidade, setAbaAfinidade] = useState<'genero' | 'demografia'>('genero')

  // Sessões de assistir (marcações agrupadas por proximidade no tempo, calculadas no Go).
  // Chegam como timestamps ISO justamente pra hora local ser resolvida aqui no navegador.
  const [sessions, setSessions] = useState<string[]>(emMemoria?.sessions || [])
  const [diasComAtividade, setDiasComAtividade] = useState(emMemoria?.dias_com_atividade || 0)
  const [variacao, setVariacao] = useState<Variacao>(emMemoria?.variacao_semanal || { pct: 0, valida: false })
  const [perfil, setPerfil] = useState<Perfil>(emMemoria?.perfil || { tipo: '', concentracao: 0 })
  const [conclusao, setConclusao] = useState<Conclusao>(emMemoria?.conclusao || { taxa: 0, valida: false })

  // "Agora" congelado na primeira renderização: chamar Date.now() no meio do render tornaria
  // o cálculo de "parado há N dias" instável entre re-renderizações.
  const [agora] = useState(() => Date.now())

  // Drill-down: qual recorte está aberto no Sheet. Guardar o tipo junto do valor deixa o
  // mesmo fluxo servir a gênero, ano, nota e status sem duplicar estado nem componente.
  const [recorte, setRecorte] = useState<{ tipo: 'genero' | 'ano' | 'nota' | 'status'; valor: string; notas?: number[] } | null>(null)
  const [animesDoRecorte, setAnimesDoRecorte] = useState<AnimeDoGenero[]>([])
  const [carregandoRecorte, setCarregandoRecorte] = useState(false)
  const [capasDosRecordes, setCapasDosRecordes] = useState<Record<number, string>>({})

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

        const data: RespostaStats = await res.json()
        guardarNaMemoria(chaveDasStats, data)

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
        // Com dados em memória, a falha da atualização por trás não troca a tela por erro.
        if (!emMemoria) setError(err instanceof Error ? err.message : 'Não foi possível carregar suas estatísticas.')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [chaveDasStats, emMemoria])

  useEffect(() => {
    const ids = [
      records.longest_anime?.mal_id,
      records.top_rated?.mal_id,
      records.fastest_binge?.mal_id,
      records.forgotten?.mal_id,
    ].filter((id): id is number => Boolean(id && id > 0))
    if (ids.length === 0) return

    let cancelado = false
    fetch('/api/anime/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(new Set(ids)) }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!json || cancelado) return
        const mapa: Record<number, string> = {}
        for (const m of json.data || []) {
          if (m.mal_id && m.images?.jpg?.image_url) {
            mapa[m.mal_id] = m.images.jpg.image_url
          }
        }
        setCapasDosRecordes(mapa)
      })
      .catch(() => {})

    return () => { cancelado = true }
  }, [records])

  // Busca os animes do recorte clicado. Roda só quando o Sheet abre — não faz sentido
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
          : recorte.tipo === 'ano'
          ? `/api/stats/year?ano=${encodeURIComponent(recorte.valor)}`
          : `/api/stats/status?status=${encodeURIComponent(recorte.valor)}`

        const buscarLista = async (endereco: string): Promise<AnimeDoGenero[]> => {
          const res = await fetch(endereco, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (!res.ok) throw new Error('Falha ao carregar os animes')
          return (await res.json()) || []
        }

        // A coluna de nota é uma faixa (8 = de 8,0 a 8,9) e o servidor responde por nota
        // exata: uma busca por nota da faixa, juntadas aqui.
        const lista = recorte.tipo === 'nota'
          ? (await Promise.all((recorte.notas ?? [Number(recorte.valor)]).map(n => buscarLista(`/api/stats/rating?nota=${encodeURIComponent(String(n))}`)))).flat()
          : await buscarLista(url)

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
          comCapas = comCapas.map(a => ({ ...a, image_url: a.image_url || mapa[a.mal_id] }))
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

  // Vários fetches, nenhum paginado: quando o loading sai, a página está inteira.
  usePosicaoDeLista(!loading)

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

  // --- Dados dos gráficos ---
  const semanas = activity.slice(-12)
  const faixasDeNota = agruparNotas(ratings)
  const totalAvaliados = ratings.reduce((soma, r) => soma + r.total, 0)
  const rotuloDaFaixa = (faixa: number) => (faixa >= 10 ? '10' : `${faixa} a ${faixa},9`)
  const anos = preencherAnos(years)
  const anoDominante = anos.length > 0 ? anos.reduce((a, b) => (b.total > a.total ? b : a), anos[0]) : null
  const somaDosPeriodos = periodoTotais.reduce((soma, p) => soma + p.total, 0)

  // Anime esquecido: só vira alerta depois de uma semana parado. Antes disso é só uma pausa
  // normal, e cutucar alguém por não ter assistido ontem seria irritante, não útil.
  const DIAS_PARA_ESQUECIDO = 7
  const esquecido = records.forgotten
  const diasParado = esquecido
    ? Math.floor((agora - new Date(esquecido.ultimo_episodio).getTime()) / 86400000)
    : 0
  const mostrarEsquecido = Boolean(esquecido) && diasParado >= DIAS_PARA_ESQUECIDO

  // A página abre pela conclusão; os gráficos abaixo são o apoio dela. "Quero Assistir"
  // fica fora da conta: o que ainda não foi visto não diz nada sobre o gosto.
  const animesConsiderados = (overview?.total_animes || 0) - (overview?.quero_assistir || 0)
  const veredito = montarVeredito(
    genres.map(g => ({ ...g, genre: traduzirGenero(g.genre) })),
    perfil.tipo,
    animesConsiderados,
  )

  return (
    <div className="pb-20">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 relative z-10">

        {/* Cabeçalho: a conclusão primeiro; os gráficos abaixo são o apoio dela. */}
        <header ref={registrar} className="reveal relative overflow-hidden rounded-3xl border border-line bg-panel/80 p-5 sm:p-8 mb-4 sm:mb-5">
          <span aria-hidden className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-holo-2 opacity-20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-28 right-0 w-80 h-80 rounded-full bg-holo-3 opacity-10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h1 className="font-mono text-xs uppercase tracking-[0.3em] text-holo-3 m-0">Meu Gosto</h1>
                {perfil.tipo && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-holo-2/40 bg-holo-2/10 text-xs font-bold capitalize"
                    title={`${perfil.concentracao.toFixed(0)}% do que você assiste está em 2 categorias`}
                  >
                    <Compass size={12} className="text-holo-2" aria-hidden /> {perfil.tipo}
                    <span className="font-mono font-normal text-muted-2 normal-case">· {perfil.concentracao.toFixed(0)}% em 2 categorias</span>
                  </span>
                )}
              </div>
              <p className="font-anton uppercase text-2xl sm:text-4xl leading-[1.08] max-w-[900px] m-0">
                {veredito.pronto
                  ? veredito.frase
                  : `Ainda estou te conhecendo. Com mais ${veredito.faltam} ${veredito.faltam === 1 ? 'anime' : 'animes'} no deck, eu te digo do que você gosta.`}
              </p>
              <p className="text-muted text-sm mt-3 m-0">Tudo calculado a partir do seu próprio Deck. Toque em qualquer gráfico para ver os animes por trás do número.</p>
            </div>
            {veredito.pronto && (
              <div className="shrink-0">
                <CompartilharGosto dados={{
                  frase: veredito.frase,
                  rotulos: rotulosDoCard(genres.map(g => ({ ...g, genre: traduzirGenero(g.genre) }))),
                  horas: Math.round((overview?.tempo_total_minutos || 0) / 60),
                  animes: animesConsiderados,
                }} />
              </div>
            )}
          </div>
        </header>

        {/* Números de relance. */}
        <div ref={registrar} className="reveal grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-2.5 sm:gap-4 mb-4 sm:mb-5">
          <Indicador tom="ciano" rotulo="Tempo assistido" icone={<Hourglass size={15} aria-hidden />}
            valor={formatTime(Math.round(tempoAnimado))}
            contexto={`${Math.round((overview?.tempo_total_minutos || 0) / 60).toLocaleString('pt-BR')} horas no total`} />
          <Indicador tom="roxo" rotulo="Animes vistos" icone={<Layers size={15} aria-hidden />}
            valor={animesConsiderados}
            contexto={`${overview?.completos || 0} completos`} />
          <Indicador tom="ouro" rotulo="Nota média" icone={<Star size={15} aria-hidden />}
            valor={overview?.nota_media ? notaAnimada.toFixed(1) : '—'}
            contexto={totalAvaliados > 0 ? `em ${totalAvaliados} ${totalAvaliados === 1 ? 'avaliado' : 'avaliados'}` : 'nenhum avaliado ainda'} />
          <Indicador tom="rosa" rotulo="Favorito" icone={<Heart size={15} aria-hidden />}
            valor={<span className="text-xl sm:text-2xl">{traduzirGenero(generoFavorito)}</span>}
            contexto={favorito ? `${favorito.total_watched} animes` : 'cadastre animes no Deck'} />
          <Indicador tom="coral" rotulo="Sequência" icone={<Flame size={15} aria-hidden />}
            valor={<>{Math.round(streakAtualAnimado)} <span className="font-mono text-xs font-normal text-muted-2">{streak.current === 1 ? 'dia' : 'dias'}</span></>}
            contexto={`recorde: ${Math.round(streakRecordeAnimado)} ${streak.longest === 1 ? 'dia' : 'dias'}`} />
          <Indicador tom="verde" rotulo="Você termina" icone={<Target size={15} aria-hidden />}
            valor={conclusao.valida ? <>{conclusao.taxa.toFixed(0)} <span className="font-mono text-xs font-normal text-muted-2">de 10</span></> : '—'}
            contexto={conclusao.valida ? 'dos animes que começa' : 'ainda sem base para medir'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          <Painel
            ref={registrar}
            className="lg:col-span-8"
            titulo="Ritmo das últimas semanas"
            icone={<Activity size={17} className="text-holo-3 shrink-0" aria-hidden />}
            descricao="Episódios marcados como assistidos em cada semana"
            acao={variacao.valida ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-mono text-xs font-bold tabular-nums ${variacao.pct >= 0 ? 'border-green/40 bg-green/10 text-green' : 'border-coral/40 bg-coral/10 text-coral'}`}
                title="Últimas 4 semanas comparadas com as 4 anteriores"
              >
                {variacao.pct >= 0 ? '↑' : '↓'} {Math.abs(variacao.pct).toFixed(0)}%
                <span className="hidden sm:inline font-normal text-muted">vs. 4 semanas antes</span>
              </span>
            ) : undefined}
          >
            {semanas.length === 0 ? (
              <p className="text-sm text-muted-2">Marque episódios pra ver sua atividade por semana aqui.</p>
            ) : (
              <GraficoArea
                pontos={semanas.map(a => ({ rotulo: formatWeekLabel(a.semana), valor: a.episodios_assistidos }))}
                desenhado={desenhado}
                unidade="episódios"
                rotuloDoGrafico="Episódios assistidos por semana"
              />
            )}
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-4"
            titulo="Seu deck por status"
            icone={<ChartPie size={17} className="text-holo-1 shrink-0" aria-hidden />}
          >
            <RoscaStatus
              desenhado={desenhado}
              aoClicar={status => setRecorte({ tipo: 'status', valor: status })}
              fatias={[
                { status: 'Assistindo', total: overview?.assistindo || 0, cor: 'var(--color-status-assistindo)', classeCor: 'bg-status-assistindo' },
                { status: 'Em Dia', total: overview?.em_dia || 0, cor: 'var(--color-status-em-dia)', classeCor: 'bg-status-em-dia' },
                { status: 'Completo', total: overview?.completos || 0, cor: 'var(--color-status-completo)', classeCor: 'bg-status-completo' },
                { status: 'Dropado', total: overview?.dropados || 0, cor: 'var(--color-status-dropado)', classeCor: 'bg-status-dropado' },
                { status: 'Quero Assistir', total: overview?.quero_assistir || 0, cor: 'var(--color-status-quero)', classeCor: 'bg-status-quero' },
              ]}
            />
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-5"
            titulo="O que você mais assiste"
            icone={<Heart size={17} className="text-holo-1 shrink-0" aria-hidden />}
            descricao="Barra: quantos animes. Selo: a nota média que você dá, em verde quando fica acima da sua média geral."
            acao={
              <div className="flex gap-1 p-1 rounded-full bg-panel-2/70 border border-line">
                {([
                  { valor: 'genero', label: 'Gêneros' },
                  { valor: 'demografia', label: 'Demografias' },
                ] as const).map(aba => (
                  <button
                    key={aba.valor}
                    type="button"
                    aria-pressed={abaAfinidade === aba.valor}
                    onClick={() => setAbaAfinidade(aba.valor)}
                    className={`select-none px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${abaAfinidade === aba.valor ? 'bg-gradient-to-r from-holo-1 to-holo-2 text-void' : 'text-muted hover:text-text'}`}
                  >
                    {aba.label}
                  </button>
                ))}
              </div>
            }
          >
            {afinidadeAtiva.length === 0 ? (
              <p className="text-sm text-muted-2">
                {abaAfinidade === 'demografia'
                  ? 'Nenhuma demografia identificada ainda nos seus animes.'
                  : 'Cadastre animes no seu Deck pra ver sua afinidade aqui.'}
              </p>
            ) : (
              <ol className="flex-1 flex flex-col justify-between gap-1 m-0 p-0 list-none">
                {afinidadeAtiva.slice(0, 10).map((g, i) => {
                  const nota = g.media_nota_genero
                  const acima = nota >= (overview?.nota_media || 0)
                  return (
                    <li key={g.genre}>
                      <button
                        type="button"
                        onClick={() => setRecorte({ tipo: 'genero', valor: g.genre })}
                        title={`Ver seus animes de ${traduzirGenero(g.genre)}`}
                        className="w-full grid grid-cols-[1.25rem_minmax(0,6.5rem)_1fr_2rem_3.25rem] sm:grid-cols-[1.25rem_minmax(0,8.5rem)_1fr_2rem_3.25rem] items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-panel-2/70 cursor-pointer"
                      >
                        <span className={`font-mono text-xs tabular-nums ${i === 0 ? 'text-holo-1 font-bold' : 'text-muted-2'}`}>{i + 1}</span>
                        <span className="text-sm font-bold truncate">{traduzirGenero(g.genre)}</span>
                        <span className="h-2.5 rounded-full bg-panel-2 overflow-hidden">
                          <span
                            className={`block h-full rounded-full bg-gradient-to-r from-holo-2 to-holo-1 origin-left transition-transform duration-700 ease-out motion-reduce:transition-none ${desenhado ? 'scale-x-100' : 'scale-x-0'}`}
                            style={{ width: `${(g.total_watched / maxGenreWatched) * 100}%`, transitionDelay: `${i * 45}ms` }}
                          />
                        </span>
                        <span className="font-mono text-xs text-muted tabular-nums text-right">{g.total_watched}</span>
                        {nota > 0 ? (
                          <span className={`inline-flex items-center justify-center gap-0.5 rounded-md px-1 py-0.5 font-mono text-xs font-bold tabular-nums ${acima ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'}`}>
                            <Star size={10} aria-hidden /> {nota.toFixed(1)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted-2 text-center">—</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-7"
            titulo="Quanto você vê × quanto você gosta"
            icone={<ChartScatter size={17} className="text-holo-3 shrink-0" aria-hidden />}
            descricao="Cada categoria no lugar dela: o que é zona de conforto, o que é hábito e o que vale explorar"
          >
            <QuadranteAfinidade
              generos={[...demografias, ...generosNarrativos]}
              notaMedia={overview?.nota_media || 0}
              onSelectCategoria={(genre) => setRecorte({ tipo: 'genero', valor: genre })}
            />
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-5"
            titulo="Como você dá nota"
            icone={<Star size={17} className="text-gold shrink-0" aria-hidden />}
            descricao="Animes avaliados em cada faixa: a coluna 8 reúne as notas de 8,0 a 8,9"
          >
            {faixasDeNota.length === 0 ? (
              <p className="text-sm text-muted-2">Avalie alguns animes pra ver o histograma aqui.</p>
            ) : (
              <GraficoColunas
                tom="ouro"
                desenhado={desenhado}
                rotuloDoGrafico="Animes avaliados por faixa de nota"
                larguraDoRotulo={22}
                aoClicar={chave => {
                  const faixa = faixasDeNota.find(f => String(f.faixa) === chave)
                  if (faixa) setRecorte({ tipo: 'nota', valor: chave, notas: faixa.notas })
                }}
                colunas={faixasDeNota.map(f => ({
                  chave: String(f.faixa),
                  rotulo: String(f.faixa),
                  valor: f.total,
                  descricao: `Ver os ${f.total} ${f.total === 1 ? 'anime' : 'animes'} com nota ${rotuloDaFaixa(f.faixa)}`,
                }))}
              />
            )}
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-7"
            titulo="De que época são seus animes"
            icone={<CalendarRange size={17} className="text-holo-1 shrink-0" aria-hidden />}
            descricao={anoDominante ? <>Animes do seu deck por ano de estreia. O ano mais presente é <b className="text-holo-1">{anoDominante.season_year}</b>, com {anoDominante.total}.</> : 'Animes do seu deck por ano de estreia'}
          >
            {anos.length === 0 ? (
              <p className="text-sm text-muted-2">Os anos aparecem conforme os animes do seu Deck forem sincronizados com a AniList.</p>
            ) : (
              <GraficoColunas
                tom="rosa"
                desenhado={desenhado}
                rotuloDoGrafico="Animes por ano de estreia"
                larguraDoRotulo={44}
                aoClicar={ano => setRecorte({ tipo: 'ano', valor: ano })}
                colunas={anos.map(y => ({
                  chave: String(y.season_year),
                  rotulo: String(y.season_year),
                  valor: y.total,
                  descricao: `Ver os ${y.total} ${y.total === 1 ? 'anime' : 'animes'} de ${y.season_year}`,
                }))}
              />
            )}
          </Painel>

          <Painel
            ref={registrar}
            className="lg:col-span-5"
            titulo="Quando você assiste"
            icone={<Clock size={17} className="text-holo-3 shrink-0" aria-hidden />}
            descricao={
              somaDosPeriodos === 0
                ? undefined
                : padraoConfiavel
                ? <>Você costuma assistir mais de <b className="text-holo-3">{periodoDominante.label.toLowerCase()}</b>. Conta {usandoSessoes ? 'sessões, não episódios soltos' : 'episódios marcados'}.</>
                : `Ainda é cedo pra dizer seu horário: preciso de ${DIAS_MINIMOS_PADRAO} dias com atividade e você tem ${diasComAtividade}.`
            }
          >
            {somaDosPeriodos === 0 ? (
              <p className="text-sm text-muted-2">Marque episódios pra ver seu padrão de horário aqui.</p>
            ) : (
              <PeriodosDoDia
                periodos={periodoTotais}
                dominante={periodoDominante.label}
                confiavel={padraoConfiavel}
                unidade={unidadePeriodo}
                desenhado={desenhado}
              />
            )}
          </Painel>

          {/* Tags temáticas ficam fora do ranking de propósito: descrevem cenário e
              ferramenta da obra ("Escolar", "Magia"), não um tipo de anime. */}
          <Painel
            ref={registrar}
            className="lg:col-span-7"
            titulo="Temas que se repetem"
            icone={<Tags size={17} className="text-holo-2 shrink-0" aria-hidden />}
            descricao="Elementos que mais aparecem nos seus animes. Quanto maior a etiqueta, mais vezes apareceu."
          >
            {tagsTematicas.length === 0 ? (
              <p className="text-sm text-muted-2">Nenhum tema identificado ainda nos seus animes.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {tagsTematicas.slice(0, 18).map((t, i) => (
                  <button
                    key={t.genre}
                    type="button"
                    onClick={() => setRecorte({ tipo: 'genero', valor: t.genre })}
                    title={`Ver seus ${t.total_watched} ${t.total_watched === 1 ? 'anime' : 'animes'} com ${traduzirGenero(t.genre)}`}
                    className={`inline-flex items-center gap-2 rounded-full border font-bold transition-colors cursor-pointer hover:border-holo-2 hover:text-holo-2 ${
                      i < 3
                        ? 'px-4 py-2 text-base border-holo-2/50 bg-holo-2/15'
                        : i < 8
                        ? 'px-3.5 py-1.5 text-sm border-line bg-panel-2'
                        : 'px-3 py-1 text-xs border-line bg-panel-2/60 text-muted'
                    }`}
                  >
                    {traduzirGenero(t.genre)}
                    <b className="font-mono text-xs font-normal text-muted-2 tabular-nums">{t.total_watched}</b>
                  </button>
                ))}
              </div>
            )}
          </Painel>
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
                  <div className="font-mono text-xs text-coral tracking-widest mb-1.5 uppercase">Parado há {diasParado} dias</div>
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
        <h2 className="font-anton uppercase text-base sm:text-lg tracking-wide flex items-center gap-2 mt-8 mb-3"><Trophy size={17} className="text-gold" aria-hidden /> Recordes pessoais</h2>
        <div ref={registrar} className="reveal grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            {
              rotulo: 'Maior Maratona',
              dados: records.longest_anime,
              detalhe: records.longest_anime ? `${records.longest_anime.episodes} episódios` : '',
              corDetalhe: 'text-muted',
              vazio: 'Complete um anime pra desbloquear',
            },
            {
              rotulo: 'Nota Mais Alta',
              dados: records.top_rated,
              detalhe: records.top_rated ? `Nota ${records.top_rated.nota}` : '',
              corDetalhe: 'text-gold',
              vazio: 'Avalie um anime pra desbloquear',
            },
            {
              rotulo: 'Maratona Mais Rápida',
              dados: records.fastest_binge,
              detalhe: records.fastest_binge
                ? `${records.fastest_binge.episodios_marcados} eps em ${formatHoras(records.fastest_binge.horas_gastas)}`
                : '',
              corDetalhe: 'text-holo-3',
              vazio: 'Marque 2+ episódios do mesmo anime pra desbloquear',
            },
          ] as const).map(card => {
            const capa = card.dados?.image_url || (card.dados?.mal_id ? capasDosRecordes[card.dados.mal_id] : undefined)
            const conteudo = (
              <>
                <div className="font-mono text-xs text-muted-2 tracking-widest mb-2.5 uppercase">{card.rotulo}</div>
                {card.dados ? (
                  <div className="flex items-center gap-3.5">
                    {capa && (
                      <img
                        src={capa}
                        alt=""
                        className="w-12 h-16 rounded-lg object-cover border border-line shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-anton text-lg leading-tight line-clamp-2 group-hover:text-holo-2 transition-colors" title={card.dados.title}>
                        {card.dados.title}
                      </div>
                      <div className={`text-[12px] ${card.corDetalhe} mt-1 tabular-nums font-bold`}>
                        {card.detalhe}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-2">{card.vazio}</div>
                )}
              </>
            )

            return card.dados?.mal_id ? (
              <Link
                key={card.rotulo}
                to={`/anime/${card.dados.mal_id}`}
                className="group bg-panel border border-line rounded-2xl p-5 transition-all duration-200 hover:border-holo-2 hover:-translate-y-0.5 block"
              >
                {conteudo}
              </Link>
            ) : (
              <div key={card.rotulo} className="bg-panel border border-line rounded-2xl p-5">
                {conteudo}
              </div>
            )
          })}
        </div>

      </div>

      <SheetDeAnimes
        titulo={
          recorte
            ? recorte.tipo === 'genero'
              ? `Seus animes de ${traduzirGenero(recorte.valor)}`
              : recorte.tipo === 'ano'
              ? `Seus animes de ${recorte.valor}`
              : recorte.tipo === 'nota'
              ? `Seus animes com nota ${rotuloDaFaixa(Number(recorte.valor))}`
              : `Seus animes em "${recorte.valor}"`
            : null
        }
        animes={animesDoRecorte}
        carregando={carregandoRecorte}
        onClose={() => { setRecorte(null); setAnimesDoRecorte([]) }}
      />
    </div>
  )
}
