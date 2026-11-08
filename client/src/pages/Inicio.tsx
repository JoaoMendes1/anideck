// client/src/pages/Inicio.tsx
// A home de quem está logado: responde "o que eu faço agora" antes de mostrar a coleção.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Compass, Play, Sparkles, Trophy, Plus, Check,
  SlidersHorizontal, ChevronLeft, ChevronRight, Upload, Lock, AlertTriangle,
} from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'
import VitrineDestaques from '../components/VitrineDestaques'
import OnboardingGostoModal from '../components/OnboardingGostoModal'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria, invalidarCachesDoDeck } from '../lib/cacheDeTela'
import { gradienteDoCard, obterTextoDiaLancamento } from '../lib/deckHelpers'
import { miniatura } from '../lib/miniatura'
import {
  continuarAssistindo, proximoEpisodioEmDestaque, semanaDoDeck,
  type AnimeResumido, type EntradaDoDeck, type ProgressoDoAnime,
} from '../lib/inicio'
import SuaSemana from '../components/inicio/SuaSemana'
import ResumoGuildaCard from '../components/inicio/ResumoGuildaCard'
import HeroProximoEpisodio from '../components/inicio/HeroProximoEpisodio'
import TrilhasDaCuradoria, { type TrilhaDaHome } from '../components/inicio/TrilhasDaCuradoria'
import { encontrarLacuna, type AfinidadeComNota } from '../lib/lacuna'
import {
  lerPreferenciasDeGosto,
  selecionarGenerosRecomendados,
  filtrarRecomendacoesPorGosto,
  type PreferenciasDeGosto,
} from '../lib/preferenciasGosto'
import type { AnimeDaApi } from '../types/anime'
import type { CuratedAnime } from '../types/curation'

interface Cartaz {
  mal_id: number
  titulo: string
  imagem: string
  legenda?: string
  nota?: number | null
}

interface StatsParaInicio {
  overview?: { nota_media: number }[]
  genres?: AfinidadeComNota[]
}

interface DadosDaInicio {
  entradas: EntradaDoDeck[]
  animes: Record<number, AnimeResumido>
  progresso: ProgressoDoAnime[]
  trilhas: TrilhaDaHome[]
  ranking: Cartaz[]
  destaquesHero: CuratedAnime[]
  recomendados: { generos: string[]; itens: Cartaz[] }
  lacuna: { rotulo: string; nota: number; vistos: number; mediaPessoal: number; sugestoes: Cartaz[] } | null
}

const VAZIO: DadosDaInicio = {
  entradas: [],
  animes: {},
  progresso: [],
  trilhas: [],
  ranking: [],
  destaquesHero: [],
  recomendados: { generos: [], itens: [] },
  lacuna: null,
}

const lerJson = async <T,>(res: Response, padrao: T): Promise<T> => (res.ok ? ((await res.json()) as T) : padrao)


function Secao({
  titulo,
  subtitulo,
  icone,
  link,
  acaoExtra,
  children,
}: {
  titulo: string
  subtitulo?: string
  icone: ReactNode
  link?: { para: string; texto: string }
  acaoExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-11">
      {/* No celular, título e subtítulo usam a largura toda e as ações descem para a linha
          de baixo: lado a lado, as ações (que não encolhem) espremiam o título. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-4 select-none">
        <div className="min-w-0">
          <h2 className="font-anton text-[18px] sm:text-[20px] uppercase m-0 flex items-center gap-2 tracking-wide">
            <span className="shrink-0">{icone}</span>
            <span className="min-w-0">{titulo}</span>
          </h2>
          {subtitulo && <p className="text-xs text-muted mt-1 mb-0 leading-relaxed">{subtitulo}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:shrink-0">
          {acaoExtra}
          {link && (
            <Link
              to={link.para}
              className="font-mono text-[10.5px] text-muted-2 uppercase tracking-widest hover:text-holo-3 transition-colors"
            >
              {link.texto} →
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function FaixaRolavel({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const rolar = (direcao: -1 | 1) => {
    const el = ref.current
    if (!el) return
    const passo = Math.max(260, Math.round(el.clientWidth * 0.72))
    el.scrollBy({ left: direcao * passo, behavior: 'smooth' })
  }

  return (
    <div className="relative group/trilho">
      <button
        type="button"
        onClick={() => rolar(-1)}
        aria-label={`Rolar ${ariaLabel ?? 'lista'} para a esquerda`}
        className="hidden sm:flex items-center justify-center absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-void/90 border border-line text-text hover:border-holo-3 hover:text-holo-3 shadow-lg opacity-0 group-hover/trilho:opacity-100 focus:opacity-100 transition-all cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <div
        ref={ref}
        className="flex gap-4 sm:gap-5 overflow-x-auto custom-scrollbar snap-x snap-mandatory -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 pb-3"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => rolar(1)}
        aria-label={`Rolar ${ariaLabel ?? 'lista'} para a direita`}
        className="hidden sm:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-void/90 border border-line text-text hover:border-holo-3 hover:text-holo-3 shadow-lg opacity-0 group-hover/trilho:opacity-100 focus:opacity-100 transition-all cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function Trilho({ cartazes }: { cartazes: Cartaz[] }) {
  return (
    <FaixaRolavel>
      {cartazes.map((c, i) => (
        <Link
          key={c.mal_id}
          to={`/anime/${c.mal_id}`}
          className="group shrink-0 w-[160px] sm:w-[186px] lg:w-[206px] snap-start"
        >
          <div
            className={`relative aspect-[2/3] rounded-[16px] overflow-hidden border border-line bg-panel ${gradienteDoCard(i)} transition-all duration-200 group-hover:-translate-y-1.5 group-hover:border-holo-3/50 shadow-sm`}
          >
            {c.imagem && (
              <img
                src={miniatura(c.imagem)}
                alt={c.titulo}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-300"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            {c.legenda && (
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-void/85 backdrop-blur-md border border-white/10 font-mono text-[10px] font-bold text-holo-3 uppercase tracking-wider">
                {c.legenda}
              </span>
            )}
            {c.nota && c.nota > 0 ? (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-void/85 backdrop-blur-md border border-gold/30 font-mono text-[10px] font-bold text-gold">
                ★ {c.nota.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2.5 text-[13px] font-bold leading-snug line-clamp-2 text-text group-hover:text-holo-3 transition-colors">
            {c.titulo}
          </h3>
        </Link>
      ))}
    </FaixaRolavel>
  )
}

export default function Inicio() {
  const { session, isAdmin } = useSessao()
  const { showToast } = useToast()
  const userId = session?.user.id || ''
  const chave = chaveDoUsuario(userId, 'inicio')
  const [emMemoria] = useState(() => lerDaMemoria<DadosDaInicio>(chave))
  const [dados, setDados] = useState<DadosDaInicio>(emMemoria ?? VAZIO)
  const [carregando, setCarregando] = useState(!emMemoria)
  const [agora] = useState(() => new Date())

  const [prefsGosto, setPrefsGosto] = useState<PreferenciasDeGosto>(() =>
    lerPreferenciasDeGosto(userId, session?.user.user_metadata),
  )
  const [modalGostoAberto, setModalGostoAberto] = useState(false)
  const [indiceHero, setIndiceHero] = useState(0)
  const [indiceHeroProximo, setIndiceHeroProximo] = useState(0)
  const [marcandoEp, setMarcandoEp] = useState<Record<number, boolean>>({})
  const [recemMarcados, setRecemMarcados] = useState<Record<number, number>>({})

  useEffect(() => {
    if (session?.user) {
      setPrefsGosto(lerPreferenciasDeGosto(session.user.id, session.user.user_metadata))
    }
  }, [session])

  const assinaturaFavoritos = prefsGosto.favoritos.join(',')
  const assinaturaBloqueados = prefsGosto.bloqueados.join(',')

  useEffect(() => {
    if (!session) return
    let ativo = true
    const auth = { headers: { Authorization: `Bearer ${session.access_token}` } }
    const chaveStats = chaveDoUsuario(session.user.id, 'estatisticas')
    const prefsAtuais = lerPreferenciasDeGosto(session.user.id, session.user.user_metadata)

    const carregar = async () => {
      try {
        const [entradas, progresso, trilhas, rankingResp, destaquesResp, stats] = await Promise.all([
          fetch('/api/entries', auth).then(r => lerJson<EntradaDoDeck[]>(r, [])),
          fetch('/api/entries/progresso', auth).then(r => lerJson<ProgressoDoAnime[]>(r, [])),
          fetch('/api/trilhas').then(r => lerJson<TrilhaDaHome[]>(r, [])).catch(() => []),
          fetch('/api/ranking?page=1&perPage=10').then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] })),
          fetch('/api/curation?destaques=true').then(r => lerJson<CuratedAnime[]>(r, [])).catch(() => []),
          (async (): Promise<StatsParaInicio> => {
            const guardadas = lerDaMemoria<StatsParaInicio>(chaveStats)
            if (guardadas) return guardadas
            return fetch('/api/stats/user', auth).then(r => lerJson<StatsParaInicio>(r, {})).catch(() => ({}))
          })(),
        ])

        const animes: Record<number, AnimeResumido> = {}
        if (entradas.length > 0) {
          const res = await fetch('/api/anime/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: entradas.map(e => e.mal_id) }),
          })
          const media = (await lerJson<{ data?: AnimeDaApi[] }>(res, {})).data ?? []
          for (const m of media) {
            animes[m.mal_id] = {
              mal_id: m.mal_id,
              title: m.title || 'Título indisponível',
              image_url: m.images?.jpg?.image_url || '',
              episodes: m.episodes || m.streamingEpisodes?.length || (m.nextAiringEpisode?.episode ? m.nextAiringEpisode.episode - 1 : 0),
              synopsis: m.synopsis,
              genres: m.genres?.slice(0, 3).map(g => g.name),
              streaming: m.streaming ?? undefined,
              streamingEpisodes: m.streamingEpisodes,
              nextAiringEpisode: m.nextAiringEpisode,
              banner: m.bannerImage,
            }
          }
        }

        const noDeck = new Set(entradas.map(e => e.mal_id))

        // Recomendações personalizadas (#139)
        const generosAlvo = selecionarGenerosRecomendados(stats.genres ?? [], prefsAtuais, 3)
        let itensRecomendados: Cartaz[] = []
        if (generosAlvo.length > 0) {
          const buscas = await Promise.all(
            generosAlvo.map(rotulo => {
              const params = new URLSearchParams({ rotulo, so_curadoria: '1', perPage: '18' })
              return fetch(`/api/search?${params}`)
                .then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {}))
                .catch(() => ({ data: [] }))
            }),
          )
          const todosCandidatos = buscas.flatMap(b => b.data ?? [])
          const filtrados = filtrarRecomendacoesPorGosto(todosCandidatos, noDeck, prefsAtuais.bloqueados)
          itensRecomendados = filtrados.slice(0, 12).map(a => ({
            mal_id: a.mal_id,
            titulo: a.title,
            imagem: a.images?.jpg?.image_url || '',
            nota: a.score,
            legenda: a.genres?.[0]?.name,
          }))
        }

        let lacuna: DadosDaInicio['lacuna'] = null
        const achada = encontrarLacuna(stats.genres ?? [], stats.overview?.[0]?.nota_media ?? 0)
        if (achada) {
          const params = new URLSearchParams({ rotulo: achada.rotulo, so_curadoria: '1', perPage: '30' })
          const busca = await fetch(`/api/search?${params}`).then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] }))
          const sugestoes = filtrarRecomendacoesPorGosto(busca.data ?? [], noDeck, prefsAtuais.bloqueados)
            .slice(0, 10)
            .map(a => ({ mal_id: a.mal_id, titulo: a.title, imagem: a.images?.jpg?.image_url || '', nota: a.score }))
          if (sugestoes.length > 0) lacuna = { ...achada, sugestoes }
        }

        const ranking = (rankingResp.data ?? []).map((a, i) => ({
          mal_id: a.mal_id,
          titulo: a.title,
          imagem: a.images?.jpg?.image_url || '',
          legenda: `#${a.current_rank || i + 1}`,
          nota: a.score,
        }))

        const novos: DadosDaInicio = {
          entradas,
          animes,
          progresso,
          trilhas,
          ranking,
          destaquesHero: (destaquesResp || []).slice(0, 6),
          recomendados: { generos: generosAlvo, itens: itensRecomendados },
          lacuna,
        }
        guardarNaMemoria(chave, novos)
        if (ativo) {
          setDados(novos)
          if (entradas.length < 3 && !prefsAtuais.tutorialConcluido) {
            setModalGostoAberto(true)
          }
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => { ativo = false }
  }, [session, chave, assinaturaFavoritos, assinaturaBloqueados])

  const nome = (session?.user.user_metadata?.display_name as string | undefined) || ''
  const semana = semanaDoDeck(dados.entradas, dados.animes, agora)
  const emAndamento = continuarAssistindo(dados.progresso, dados.entradas, dados.animes, 12)
  const itensHero = emAndamento.filter(c => !c.bloqueadoPorLancamento && !c.semEpisodios)
  const destaqueProximo = itensHero[0] ?? proximoEpisodioEmDestaque(emAndamento)
  const heroAtivo = itensHero.length > 0 ? itensHero[indiceHeroProximo % itensHero.length] : destaqueProximo
  const continuar = emAndamento.filter(c => c.anime.mal_id !== heroAtivo?.anime.mal_id).slice(0, 8)
  const episodioDoDestaque = destaqueProximo
    ? (recemMarcados[destaqueProximo.anime.mal_id] ?? destaqueProximo.proximoEpisodio - 1) + 1
    : 0
  const destaqueBloqueado = Boolean(
    destaqueProximo?.anime.nextAiringEpisode?.episode &&
      episodioDoDestaque >= destaqueProximo.anime.nextAiringEpisode.episode,
  )
  const deckVazio = !carregando && dados.entradas.length === 0
  const dataDeHoje = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const slidesHero = dados.destaquesHero
  const heroAtual = slidesHero.length > 0 ? slidesHero[indiceHero % slidesHero.length] : null

  useEffect(() => {
    if (slidesHero.length <= 1) return
    const timer = window.setInterval(() => {
      setIndiceHero(i => (i + 1) % slidesHero.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [slidesHero.length])

  const avancarEpisodioRapido = async (malId: number, episodio: number, titulo: string) => {
    if (!session || marcandoEp[malId]) return
    setMarcandoEp(prev => ({ ...prev, [malId]: true }))
    try {
      const res = await fetch(`/api/entries/${malId}/episodes/${episodio}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        let sufixoXP = ''
        try {
          const payload = (await res.json()) as { xp_earned?: number }
          if (typeof payload.xp_earned === 'number' && payload.xp_earned > 0) {
            sufixoXP = ` (+${payload.xp_earned} XP)`
          }
        } catch {
          // Segue sem sufixo se a resposta vier vazia.
        }
        setRecemMarcados(prev => ({ ...prev, [malId]: episodio }))
        invalidarCachesDoDeck(session.user.id)
        window.dispatchEvent(
          new CustomEvent('anideck:episodio-atualizado', {
            detail: { malId, episodeNumber: episodio, watched: true },
          }),
        )

        // Se a obra está em lançamento e alcançou o último episódio lançado até o momento,
        // promove para 'Em Dia'
        const animeObj = dados.animes[malId]
        const entradaObj = dados.entradas.find(e => e.mal_id === malId)
        if (entradaObj && animeObj?.nextAiringEpisode?.episode && episodio >= animeObj.nextAiringEpisode.episode - 1) {
          fetch(`/api/entries/${(entradaObj as unknown as { id: string }).id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              mal_id: malId,
              tipo: 'anime',
              status: 'Em Dia',
              nota: (entradaObj as unknown as { nota?: number | null }).nota ?? null,
              anotacao: (entradaObj as unknown as { anotacao?: string }).anotacao ?? '',
              is_favorite: (entradaObj as unknown as { is_favorite?: boolean }).is_favorite ?? false,
            }),
          }).catch(() => null)
        }

        showToast(`Ep. ${episodio} de ${titulo} marcado como visto!${sufixoXP}`, 'success')
      } else {
        showToast('Não foi possível registrar o episódio.', 'error')
      }
    } catch {
      showToast('Erro de conexão ao registrar episódio.', 'error')
    } finally {
      setMarcandoEp(prev => ({ ...prev, [malId]: false }))
    }
  }

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24">
      {/* Cabeçalho compacto com ações rápidas */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6 select-none">
        <div>
          <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest mb-1">{dataDeHoje}</p>
          <h1 className="font-anton text-[clamp(1.6rem,3.4vw,2.2rem)] uppercase m-0 leading-none">
            {nome ? `Olá, ${nome}` : 'Sua Central'}
          </h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setModalGostoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-panel border border-line hover:border-holo-2 text-xs font-bold text-text transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={13} className="text-holo-2" /> Ajustar meu gosto
          </button>
          <Link
            to="/meu-gosto"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-holo-2/15 border border-holo-2/30 text-xs font-bold text-holo-2 hover:bg-holo-2/25 transition-colors"
          >
            <Sparkles size={13} /> Meu Gosto →
          </Link>
        </div>
      </header>

      {/* Topo: o próximo episódio de quem tem anime em andamento (com carrossel); sem nenhum, os destaques da curadoria. */}
      {itensHero.length > 0 ? (
        <HeroProximoEpisodio
          itens={itensHero}
          indiceAtivo={indiceHeroProximo % itensHero.length}
          onMudarIndice={setIndiceHeroProximo}
          recemMarcados={recemMarcados}
          marcandoEp={marcandoEp}
          onMarcarEpisodio={avancarEpisodioRapido}
        />
      ) : destaqueProximo ? (
        <HeroProximoEpisodio
          item={destaqueProximo}
          episodio={episodioDoDestaque}
          marcando={Boolean(marcandoEp[destaqueProximo.anime.mal_id])}
          jaMarcado={recemMarcados[destaqueProximo.anime.mal_id] !== undefined}
          bloqueado={destaqueBloqueado}
          onMarcar={() => avancarEpisodioRapido(destaqueProximo.anime.mal_id, episodioDoDestaque, destaqueProximo.anime.title)}
        />
      ) : null}

      {itensHero.length === 0 && !destaqueProximo && heroAtual && (
        <section className="relative rounded-[24px] overflow-hidden border border-line bg-panel mb-10 min-h-[280px] sm:min-h-[340px] flex items-end">
          {(heroAtual.custom_banner_image || heroAtual.custom_cover_image) && (
            <img
              src={heroAtual.custom_banner_image || heroAtual.custom_cover_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-50 transition-all duration-700"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-void/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/35 to-transparent" />

          <div className="relative z-10 w-full p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-end gap-5 sm:gap-6 max-w-3xl">
              {heroAtual.custom_cover_image && (
                <Link to={`/anime/${heroAtual.mal_id}`} className="shrink-0">
                  <img
                    src={heroAtual.custom_cover_image}
                    alt={heroAtual.custom_title}
                    className="w-28 sm:w-40 md:w-44 aspect-[2/3] object-cover rounded-2xl border-2 border-white/15 shadow-2xl"
                  />
                </Link>
              )}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-holo-1/15 border border-holo-1/35 text-holo-1 font-mono text-[10px] font-bold uppercase tracking-widest mb-2.5">
                  <Sparkles size={11} /> Destaque da Curadoria
                </div>
                <Link to={`/anime/${heroAtual.mal_id}`}>
                  <h2 className="font-anton text-2xl sm:text-4xl uppercase leading-tight text-text hover:text-holo-3 transition-colors line-clamp-2">
                    {heroAtual.custom_title}
                  </h2>
                </Link>
                {heroAtual.custom_tags && heroAtual.custom_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {heroAtual.custom_tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full border font-mono text-[9.5px] font-bold uppercase ${getCategoryTheme(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {heroAtual.custom_synopsis && (
                  <p className="text-xs sm:text-sm text-muted mt-2.5 line-clamp-2 max-w-xl leading-relaxed">
                    {heroAtual.custom_synopsis.replace(/\*\*/g, '').replace(/\*/g, '')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <Link
                to={`/anime/${heroAtual.mal_id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:opacity-95 transition-opacity"
              >
                <Play size={14} fill="currentColor" /> Ver obra
              </Link>

              {slidesHero.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIndiceHero(i => (i - 1 + slidesHero.length) % slidesHero.length)}
                    className="w-8 h-8 rounded-full bg-void/70 border border-line hover:border-holo-3 text-text flex items-center justify-center cursor-pointer"
                    aria-label="Destaque anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="font-mono text-[10px] text-muted-2 px-1 tabular-nums">
                    {(indiceHero % slidesHero.length) + 1}/{slidesHero.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIndiceHero(i => (i + 1) % slidesHero.length)}
                    className="w-8 h-8 rounded-full bg-void/70 border border-line hover:border-holo-3 text-text flex items-center justify-center cursor-pointer"
                    aria-label="Próximo destaque"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* No monitor largo, o conteúdo ganha uma coluna lateral com a Guilda e a semana. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10 xl:items-start">
      <div className="min-w-0">
      {carregando && (
        <div className="flex gap-4 overflow-hidden mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] sm:w-[186px] lg:w-[206px] aspect-[2/3] rounded-[16px] shimmer" />
          ))}
        </div>
      )}

      {deckVazio && (
        <section className="mb-10 bg-gradient-to-br from-holo-1/10 to-holo-3/10 border border-holo-3/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-anton text-xl uppercase mb-1.5">Seu deck está vazio</h2>
            <p className="text-muted text-sm">
              Adicione animes ao seu Deck, personalize seus gêneros favoritos ou importe sua lista do MyAnimeList.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              to="/descobrir"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-bold text-xs uppercase tracking-wider"
            >
              <Compass size={15} /> Descobrir animes
            </Link>
            <Link
              to="/configuracoes#importar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-panel border border-line hover:border-holo-3 text-text font-bold text-xs uppercase tracking-wider"
            >
              <Upload size={14} /> Importar do MAL
            </Link>
          </div>
        </section>
      )}

      {/* CONTINUE DE ONDE PAROU — Pôsteres grandes 2:3 nítidos com trava de lançamento e alerta de curadoria (#141) */}
      {continuar.length > 0 && (
        <Secao
          titulo="Continue de onde parou"
          subtitulo="Avance para o próximo episódio com um toque"
          icone={<Play size={17} className="text-holo-1" />}
          link={{ para: '/deck', texto: 'Meu deck' }}
        >
          <FaixaRolavel ariaLabel="Continue de onde parou">
            {continuar.map((c, idx) => {
              const epAlvo = recemMarcados[c.anime.mal_id]
                ? recemMarcados[c.anime.mal_id] + 1
                : c.proximoEpisodio
              const vistos = epAlvo - 1
              const total = c.anime.episodes || 0
              const pct = total > 0 ? Math.min(100, Math.round((vistos / total) * 100)) : 0
              const diaSemana = obterTextoDiaLancamento({
                status: 'RELEASING',
                nextAiringEpisode: c.anime.nextAiringEpisode,
              })
              const bloqueadoPorLancamento =
                Boolean(c.bloqueadoPorLancamento) ||
                Boolean(c.anime.nextAiringEpisode?.episode && epAlvo >= c.anime.nextAiringEpisode.episode)
              const semEpisodios = Boolean(c.semEpisodios) || total <= 0

              return (
                <div
                  key={c.anime.mal_id}
                  className="shrink-0 w-[195px] sm:w-[218px] lg:w-[232px] snap-start rounded-2xl border border-line bg-panel overflow-hidden hover:border-holo-1/50 transition-all group flex flex-col"
                >
                  <Link
                    to={`/anime/${c.anime.mal_id}`}
                    className={`relative aspect-[2/3] w-full overflow-hidden bg-panel-2 ${gradienteDoCard(idx)} block`}
                  >
                    {c.anime.image_url && (
                      <img
                        src={c.anime.image_url}
                        alt={c.anime.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-transparent" />

                    {semEpisodios ? (
                      <span className="absolute top-2.5 left-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-coral/90 backdrop-blur-md text-void font-mono text-[9.5px] font-extrabold uppercase tracking-wider shadow-md">
                        <AlertTriangle size={11} className="shrink-0" /> Sem episódios (Curar)
                      </span>
                    ) : diaSemana ? (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-void/85 backdrop-blur-md border border-holo-3/40 font-mono text-[9.5px] font-bold uppercase tracking-wider text-holo-3 shadow-md">
                        📅 {diaSemana}
                      </span>
                    ) : null}

                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-white/90 mb-1.5 tabular-nums drop-shadow">
                        <span>
                          Visto: <strong className="text-white">{vistos}</strong>
                          {total > 0 ? ` / ${total} eps` : ' eps'}
                        </span>
                        {total > 0 && <span className="text-[10px] text-holo-3 font-bold">{pct}%</span>}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-void/70 overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            semEpisodios
                              ? 'bg-coral w-full'
                              : 'bg-gradient-to-r from-holo-1 to-holo-3'
                          }`}
                          style={{ width: semEpisodios ? '100%' : `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <Link
                      to={`/anime/${c.anime.mal_id}`}
                      title={c.anime.title}
                      className="font-bold text-[13px] text-text leading-snug line-clamp-2 min-h-[2.6em] group-hover:text-holo-1 transition-colors"
                    >
                      {c.anime.title}
                    </Link>

                    {semEpisodios ? (
                      <Link
                        to={isAdmin ? `/admin?aba=curadoria&mal_id=${c.anime.mal_id}` : `/anime/${c.anime.mal_id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-coral/15 hover:bg-coral/25 border border-coral/45 text-coral text-[11px] font-extrabold transition-colors text-center"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {isAdmin ? 'Curar episódios' : 'Sem episódios'}
                      </Link>
                    ) : bloqueadoPorLancamento ? (
                      <button
                        type="button"
                        disabled
                        title="Este episódio ainda não foi ao ar"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-panel-2 border border-line text-muted-2 text-[11px] font-bold cursor-not-allowed opacity-75"
                      >
                        <Lock size={12} className="shrink-0" /> Ep. {epAlvo} não lançado
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={marcandoEp[c.anime.mal_id]}
                        onClick={() => avancarEpisodioRapido(c.anime.mal_id, epAlvo, c.anime.title)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-holo-1/15 hover:bg-holo-1/25 border border-holo-1/35 text-holo-1 text-[11.5px] font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {recemMarcados[c.anime.mal_id] === c.proximoEpisodio ? (
                          <>
                            <Check size={13} /> Marcar Ep. {epAlvo}
                          </>
                        ) : (
                          <>
                            <Plus size={13} /> Marcar Ep. {epAlvo} visto
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </FaixaRolavel>
        </Secao>
      )}

      {!carregando && !deckVazio && (
        <div className="xl:hidden">
          <Secao
            titulo="Sua semana"
            subtitulo="O que sai do seu deck nos próximos 7 dias, no seu horário"
            icone={<CalendarDays size={17} className="text-holo-3" />}
            link={{ para: '/calendario', texto: 'Agenda' }}
          >
            <SuaSemana semana={semana} />
          </Secao>
        </div>
      )}

      {/* RECOMENDADOS PARA VOCÊ (#139 + #141) */}
      {dados.recomendados.itens.length > 0 && (
        <Secao
          titulo="Recomendados para Você"
          subtitulo={`Com base na sua afinidade e gêneros favoritos: ${dados.recomendados.generos.join(' • ')}`}
          icone={<Sparkles size={17} className="text-holo-2" />}
          acaoExtra={
            <button
              type="button"
              onClick={() => setModalGostoAberto(true)}
              className="font-mono text-[10.5px] text-holo-2 uppercase tracking-widest hover:underline cursor-pointer"
            >
              Personalizar
            </button>
          }
          link={{ para: '/descobrir', texto: 'Explorar catálogo' }}
        >
          <Trilho cartazes={dados.recomendados.itens} />
        </Secao>
      )}

      {dados.lacuna && (
        <Secao
          titulo="O buraco no seu gosto"
          icone={<Sparkles size={17} className="text-gold" />}
          link={{ para: `/descobrir?rotulo=${encodeURIComponent(dados.lacuna.rotulo)}`, texto: 'Ver tudo' }}
        >
          <p className="text-sm text-muted mb-4 max-w-[640px]">
            Você dá em média <strong className="text-text">{dados.lacuna.nota.toFixed(1)}</strong> para{' '}
            <strong className="text-text">{dados.lacuna.rotulo}</strong>, acima da sua média de {dados.lacuna.mediaPessoal.toFixed(1)}, e só viu{' '}
            {dados.lacuna.vistos}. Obras curadas que ainda não estão no seu Deck:
          </p>
          <Trilho cartazes={dados.lacuna.sugestoes} />
        </Secao>
      )}

      {dados.trilhas.length > 0 && (
        <Secao
          titulo="Trilhas da curadoria"
          subtitulo="Listas temáticas montadas a dedo, para maratonar em sequência"
          icone={<Compass size={17} className="text-holo-2" />}
        >
          <TrilhasDaCuradoria trilhas={dados.trilhas} />
        </Secao>
      )}

      {/* Com os destaques já no topo (sem anime em andamento), a vitrine repetiria os mesmos. */}
      {(itensHero.length > 0 || destaqueProximo) && <VitrineDestaques />}

      {dados.ranking.length > 0 && (
        <Secao
          titulo="Topo do ranking"
          subtitulo="As obras mais bem avaliadas no ranking bayesiano do AniDeck"
          icone={<Trophy size={17} className="text-gold" />}
          link={{ para: '/rankings', texto: 'Ranking completo' }}
        >
          <Trilho cartazes={dados.ranking} />
        </Secao>
      )}

      </div>

      {!deckVazio && (
        <aside className="hidden xl:flex flex-col gap-6 sticky top-24">
          <ResumoGuildaCard />
          {!carregando && (
            <div>
              <div className="flex items-center justify-between mb-3 select-none">
                <h2 className="font-anton text-[16px] uppercase m-0 flex items-center gap-2 tracking-wide">
                  <CalendarDays size={15} className="text-holo-3" /> Sua semana
                </h2>
                <Link to="/calendario" className="font-mono text-[10px] text-muted-2 uppercase tracking-widest hover:text-holo-3">
                  Agenda →
                </Link>
              </div>
              <SuaSemana semana={semana} compacta />
            </div>
          )}
        </aside>
      )}
      </div>

      <OnboardingGostoModal
        isOpen={modalGostoAberto}
        userId={userId}
        preferenciasAtuais={prefsGosto}
        onClose={() => setModalGostoAberto(false)}
        onSaved={novas => setPrefsGosto(novas)}
      />
    </div>
  )
}
