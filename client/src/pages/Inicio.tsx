// client/src/pages/Inicio.tsx
// A home de quem está logado: personalizável em ordem, visibilidade, minimização e coluna lateral (#275).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { precisaDaConfiguracaoInicial } from '../lib/bemVindo'
import {
  CalendarDays, Compass, Play, Sparkles, Trophy, Plus, Check,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload, Lock,
  AlertTriangle, SlidersHorizontal,
} from 'lucide-react'
import PalcoDestaques from '../components/inicio/PalcoDestaques'
import GostoPoucoExplorado from '../components/inicio/GostoPoucoExplorado'
import OnboardingGostoModal from '../components/OnboardingGostoModal'
import OrganizarInicioModal from '../components/inicio/OrganizarInicioModal'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useCelebracao } from '../contexts/CelebracaoContext'
import { useConfirmacao } from '../hooks/useConfirmacao'
import { useMidia } from '../hooks/useMidia'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria, invalidarCachesDoDeck } from '../lib/cacheDeTela'
import { confirmarMarcacaoNaMaratona } from '../lib/avisoDaMaratona'
import { anotarMarcacao, mensagemDaMaratona, type ResultadoMaratonaEpisodio } from '../lib/maratona'
import { gradienteDoCard, obterTextoDiaLancamento } from '../lib/deckHelpers'
import { miniatura } from '../lib/miniatura'
import {
  continuarAssistindo, proximoEpisodioEmDestaque, semanaDoDeck,
  type AnimeResumido, type EntradaDoDeck, type ProgressoDoAnime,
} from '../lib/inicio'
import {
  SECAO_HUD_INICIO,
  SECOES_LATERAIS,
  SECOES_PRINCIPAIS,
  alternarItemSecao,
  carregarInicioPreferencias,
  configInicioPadrao,
  guardarCacheLocalInicio,
  lerCacheLocalInicio,
  normalizarConfigInicio,
  salvarInicioPreferencias,
  type ConfigInicio,
  type FonteDestaqueInicio,
  type SecaoInicioId,
  type SecaoMinimizavelInicioId,
} from '../lib/inicioPreferencias'
import SuaSemana from '../components/inicio/SuaSemana'
import HeroProximoEpisodio from '../components/inicio/HeroProximoEpisodio'
import PlayerHudInicio from '../components/inicio/PlayerHudInicio'
import CardMissoesDiarias from '../components/inicio/CardMissoesDiarias'
import CardDesafioClaInicio from '../components/inicio/CardDesafioClaInicio'
import CardChefao from '../components/chefao/CardChefao'
import TrilhasDaCuradoria, { type TrilhaDaHome } from '../components/inicio/TrilhasDaCuradoria'
import { encontrarLacuna, type AfinidadeComNota } from '../lib/lacuna'
import {
  lerPreferenciasDeGosto,
  selecionarGenerosRecomendados,
  filtrarRecomendacoesPorGosto,
  type PreferenciasDeGosto,
} from '../lib/preferenciasGosto'
import type { AnimeDaApi } from '../types/anime'

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
  recomendados: { generos: string[]; itens: Cartaz[] }
  lacuna: { rotulo: string; nota: number; vistos: number; mediaPessoal: number; sugestoes: Cartaz[] } | null
}

const VAZIO: DadosDaInicio = {
  entradas: [],
  animes: {},
  progresso: [],
  trilhas: [],
  ranking: [],
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
  minimizada = false,
  aoAlternarMinimizar,
  espacamento = 'mb-11',
  children,
}: {
  titulo: string
  subtitulo?: string
  icone: ReactNode
  link?: { para: string; texto: string }
  acaoExtra?: ReactNode
  minimizada?: boolean
  aoAlternarMinimizar?: () => void
  espacamento?: string
  children: ReactNode
}) {
  return (
    <section className={espacamento}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-4 select-none">
        <div className="min-w-0">
          <h2 className="font-manrope font-extrabold text-lg sm:text-xl text-text m-0 flex items-center gap-2 tracking-tight">
            <span className="shrink-0">{icone}</span>
            <span className="min-w-0">{titulo}</span>
          </h2>
          {subtitulo && !minimizada && (
            <p className="text-xs sm:text-[13px] text-muted mt-1 mb-0 leading-relaxed">{subtitulo}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:shrink-0">
          {acaoExtra}
          {link && (
            <Link
              to={link.para}
              className="font-mono text-xs text-muted-2 uppercase tracking-widest hover:text-holo-3 transition-colors"
            >
              {link.texto} →
            </Link>
          )}
          {aoAlternarMinimizar && (
            <button
              type="button"
              onClick={aoAlternarMinimizar}
              aria-label={minimizada ? `Expandir ${titulo}` : `Minimizar ${titulo}`}
              className="w-8 h-8 rounded-full bg-panel border border-line hover:border-holo-2 text-muted hover:text-text grid place-items-center cursor-pointer transition-colors"
            >
              {minimizada ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>
      </div>

      {minimizada ? (
        <div className="rounded-2xl border border-line bg-panel px-4 py-3 flex items-center justify-between gap-3 text-xs text-muted">
          <span>Seção minimizada</span>
          {aoAlternarMinimizar && (
            <button
              type="button"
              onClick={aoAlternarMinimizar}
              className="font-mono text-xs text-holo-3 hover:underline cursor-pointer"
            >
              Mostrar
            </button>
          )}
        </div>
      ) : (
        children
      )}
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
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-void/85 backdrop-blur-md border border-white/10 font-mono text-xs font-bold text-holo-3 uppercase tracking-wider">
                {c.legenda}
              </span>
            )}
            {c.nota && c.nota > 0 ? (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-void/85 backdrop-blur-md border border-gold/30 font-mono text-xs font-bold text-gold">
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

async function buscarAnimesDoDeck(entradas: EntradaDoDeck[]): Promise<Record<number, AnimeResumido>> {
  const animes: Record<number, AnimeResumido> = {}
  if (entradas.length === 0) return animes
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
  return animes
}

export default function Inicio() {
  const { session, isAdmin } = useSessao()
  const navigate = useNavigate()

  // Conta nova com a configuração inicial pendente vai para /bem-vindo; quem pula ou termina
  // ganha a marca de concluída e não volta mais para lá.
  useEffect(() => {
    if (precisaDaConfiguracaoInicial(session?.user.user_metadata)) navigate('/bem-vindo', { replace: true })
  }, [session, navigate])
  const { showToast } = useToast()
  const { celebrar } = useCelebracao()
  const { confirmar, dialogo } = useConfirmacao()
  const ehDesktopLargo = useMidia('(min-width: 1280px)')
  const userId = session?.user.id || ''
  const chave = chaveDoUsuario(userId, 'inicio')
  const [emMemoria] = useState(() => lerDaMemoria<DadosDaInicio>(chave))
  const [dados, setDados] = useState<DadosDaInicio>(emMemoria ?? VAZIO)
  const [carregando, setCarregando] = useState(!emMemoria)
  const [agora] = useState(() => new Date())

  const [prefsGosto, setPrefsGosto] = useState<PreferenciasDeGosto>(() =>
    lerPreferenciasDeGosto(userId, session?.user.user_metadata),
  )
  const [configInicio, setConfigInicio] = useState<ConfigInicio>(() =>
    lerCacheLocalInicio(userId) ?? configInicioPadrao(),
  )
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false)
  const [organizandoAberto, setOrganizandoAberto] = useState(false)
  const [modalGostoAberto, setModalGostoAberto] = useState(false)
  const [indiceHeroProximo, setIndiceHeroProximo] = useState(0)
  const [marcandoEp, setMarcandoEp] = useState<Record<number, boolean>>({})
  const [recemMarcados, setRecemMarcados] = useState<Record<number, number>>({})

  useEffect(() => {
    if (session?.user) {
      setPrefsGosto(lerPreferenciasDeGosto(session.user.id, session.user.user_metadata))
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    let ativo = true
    const local = lerCacheLocalInicio(session.user.id)
    if (local) setConfigInicio(local)

    carregarInicioPreferencias(session.access_token)
      .then(remota => {
        if (!ativo || !remota) return
        setConfigInicio(remota)
        guardarCacheLocalInicio(session.user.id, remota)
      })
      .catch(() => null)

    return () => {
      ativo = false
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
        const entradasP = fetch('/api/entries', auth).then(r => lerJson<EntradaDoDeck[]>(r, []))
        const [entradas, animes, progresso, trilhas, rankingResp, stats] = await Promise.all([
          entradasP,
          entradasP.then(buscarAnimesDoDeck),
          fetch('/api/entries/progresso', auth).then(r => lerJson<ProgressoDoAnime[]>(r, [])),
          fetch('/api/trilhas').then(r => lerJson<TrilhaDaHome[]>(r, [])).catch(() => []),
          fetch('/api/ranking?page=1&perPage=10').then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] })),
          (async (): Promise<StatsParaInicio> => {
            const guardadas = lerDaMemoria<StatsParaInicio>(chaveStats)
            if (guardadas) return guardadas
            return fetch('/api/stats/user', auth).then(r => lerJson<StatsParaInicio>(r, {})).catch(() => ({}))
          })(),
        ])

        const noDeck = new Set(entradas.map(e => e.mal_id))
        const ranking = (rankingResp.data ?? []).map((a, i) => ({
          mal_id: a.mal_id,
          titulo: a.title,
          imagem: a.images?.jpg?.image_url || '',
          legenda: `#${a.current_rank || i + 1}`,
          nota: a.score,
        }))
        const base = { entradas, animes, progresso, trilhas, ranking }

        if (ativo) {
          setDados(anterior => ({ ...base, recomendados: anterior.recomendados, lacuna: anterior.lacuna }))
          setCarregando(false)
          if (entradas.length < 3 && !prefsAtuais.tutorialConcluido) {
            setModalGostoAberto(true)
          }
        }

        const generosAlvo = selecionarGenerosRecomendados(stats.genres ?? [], prefsAtuais, 3)

        const buscarRecomendados = async (): Promise<Cartaz[]> => {
          if (generosAlvo.length === 0) return []
          const buscas = await Promise.all(
            generosAlvo.map(rotulo => {
              const params = new URLSearchParams({ rotulo, so_curadoria: '1', perPage: '18' })
              return fetch(`/api/search?${params}`)
                .then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {}))
                .catch(() => ({ data: [] }))
            }),
          )
          const todosCandidatos = buscas.flatMap(b => b.data ?? [])
          return filtrarRecomendacoesPorGosto(todosCandidatos, noDeck, prefsAtuais.bloqueados)
            .slice(0, 12)
            .map(a => ({
              mal_id: a.mal_id,
              titulo: a.title,
              imagem: a.images?.jpg?.image_url || '',
              nota: a.score,
              legenda: a.genres?.[0]?.name,
            }))
        }

        const buscarLacuna = async (): Promise<DadosDaInicio['lacuna']> => {
          const achada = encontrarLacuna(stats.genres ?? [], stats.overview?.[0]?.nota_media ?? 0)
          if (!achada) return null
          const params = new URLSearchParams({ rotulo: achada.rotulo, so_curadoria: '1', perPage: '30' })
          const busca = await fetch(`/api/search?${params}`).then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] }))
          const sugestoes = filtrarRecomendacoesPorGosto(busca.data ?? [], noDeck, prefsAtuais.bloqueados)
            .slice(0, 10)
            .map(a => ({ mal_id: a.mal_id, titulo: a.title, imagem: a.images?.jpg?.image_url || '', nota: a.score }))
          return sugestoes.length > 0 ? { ...achada, sugestoes } : null
        }

        const [itensRecomendados, lacuna] = await Promise.all([buscarRecomendados(), buscarLacuna()])
        const novos: DadosDaInicio = { ...base, recomendados: { generos: generosAlvo, itens: itensRecomendados }, lacuna }
        guardarNaMemoria(chave, novos)
        if (ativo) setDados(novos)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => { ativo = false }
  }, [session, chave, assinaturaFavoritos, assinaturaBloqueados])

  const atualizarConfigInicio = async (bruta: ConfigInicio) => {
    const nova = normalizarConfigInicio(bruta)
    setConfigInicio(nova)
    if (userId) guardarCacheLocalInicio(userId, nova)
    if (!session) return

    setSalvandoPreferencias(true)
    try {
      const salva = await salvarInicioPreferencias(nova, session.access_token)
      setConfigInicio(salva)
      if (userId) guardarCacheLocalInicio(userId, salva)
    } catch {
      showToast('Não foi possível salvar a organização da Início.', 'error')
    } finally {
      setSalvandoPreferencias(false)
    }
  }

  const alternarMinimizar = (id: SecaoMinimizavelInicioId) => {
    void atualizarConfigInicio({
      ...configInicio,
      minimizadas: alternarItemSecao(configInicio.minimizadas, id),
    })
  }

  const mudarFonteDestaque = (fonte: FonteDestaqueInicio) => {
    if (fonte === configInicio.destaque_fonte) return
    void atualizarConfigInicio({
      ...configInicio,
      destaque_fonte: fonte,
    })
  }

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

  const avancarEpisodioRapido = async (malId: number, episodio: number, titulo: string) => {
    if (!session || marcandoEp[malId]) return
    if (!(await confirmarMarcacaoNaMaratona(malId, episodio, confirmar))) return

    const animeObj = dados.animes[malId]
    const totalEp = animeObj?.episodes || 0
    const entradaAnterior = dados.entradas.find(e => e.mal_id === malId)
    const progressoAnterior = dados.progresso.find(p => p.mal_id === malId)
    const recemAnterior = recemMarcados[malId]
    const ultimoPrev = progressoAnterior?.ultimo_episodio ?? 0
    const marcadosPrev = progressoAnterior?.marcados ?? 0
    const atingiuFim = totalEp > 0 && episodio >= totalEp
    const concluiuOtimista = atingiuFim && marcadosPrev + 1 >= totalEp

    const aplicarOtimismo = () => {
      setDados(prev => {
        const existeProg = prev.progresso.some(p => p.mal_id === malId)
        const novoProg: ProgressoDoAnime = {
          mal_id: malId,
          ultimo_episodio: Math.max(ultimoPrev, episodio),
          marcados: marcadosPrev + 1,
          ultimo_em: new Date().toISOString(),
        }
        const progressoAtualizado = existeProg
          ? prev.progresso.map(p => (p.mal_id === malId ? novoProg : p))
          : [...prev.progresso, novoProg]

        const entradasAtualizadas = prev.entradas.map(e => {
          if (e.mal_id !== malId) return e
          if (concluiuOtimista) return { ...e, status: 'Completo' }
          if (e.status === 'Quero Assistir') return { ...e, status: 'Assistindo' }
          return e
        })
        return { ...prev, progresso: progressoAtualizado, entradas: entradasAtualizadas }
      })
      setRecemMarcados(prev => {
        if (atingiuFim) {
          if (!(malId in prev)) return prev
          const copia = { ...prev }
          delete copia[malId]
          return copia
        }
        return { ...prev, [malId]: episodio }
      })
    }

    const reverterOtimismo = () => {
      setDados(prev => ({
        ...prev,
        progresso: progressoAnterior
          ? prev.progresso.map(p => (p.mal_id === malId ? progressoAnterior : p))
          : prev.progresso.filter(p => p.mal_id !== malId),
        entradas: entradaAnterior
          ? prev.entradas.map(e => (e.mal_id === malId ? entradaAnterior : e))
          : prev.entradas,
      }))
      setRecemMarcados(prev => {
        const copia = { ...prev }
        if (recemAnterior === undefined) delete copia[malId]
        else copia[malId] = recemAnterior
        return copia
      })
    }

    aplicarOtimismo()
    setMarcandoEp(prev => ({ ...prev, [malId]: true }))
    try {
      const res = await fetch(`/api/entries/${malId}/episodes/${episodio}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        let sufixoXP = ''
        let avisoMaratona: { texto: string; tipo: 'success' | 'error' } | null = null
        let maratonaConcluida: ResultadoMaratonaEpisodio | null = null
        let concluiu = concluiuOtimista
        try {
          const payload = (await res.json()) as {
            xp_earned?: number
            concluiu?: boolean
            maratona?: ResultadoMaratonaEpisodio
          }
          if (typeof payload.concluiu === 'boolean') concluiu = payload.concluiu
          anotarMarcacao(malId, episodio, payload.maratona)
          if (payload.maratona?.status === 'concluida') {
            maratonaConcluida = payload.maratona
          } else {
            avisoMaratona = mensagemDaMaratona(payload.maratona)
          }
          if (typeof payload.xp_earned === 'number' && payload.xp_earned > 0) {
            sufixoXP = ` (+${payload.xp_earned} XP)`
          }
        } catch {
          // Segue sem sufixo se a resposta vier vazia.
        }
        if (concluiu) {
          setDados(prev => ({
            ...prev,
            entradas: prev.entradas.map(e => (e.mal_id === malId ? { ...e, status: 'Completo' } : e)),
          }))
          setRecemMarcados(prev => {
            if (!(malId in prev)) return prev
            const copia = { ...prev }
            delete copia[malId]
            return copia
          })
        }
        invalidarCachesDoDeck(session.user.id)
        window.dispatchEvent(
          new CustomEvent('anideck:episodio-atualizado', {
            detail: { malId, episodeNumber: episodio, watched: true, concluiu },
          }),
        )

        if (entradaAnterior && animeObj?.nextAiringEpisode?.episode && episodio >= animeObj.nextAiringEpisode.episode - 1) {
          fetch(`/api/entries/${(entradaAnterior as unknown as { id: string }).id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              mal_id: malId,
              tipo: 'anime',
              status: 'Em Dia',
              nota: (entradaAnterior as unknown as { nota?: number | null }).nota ?? null,
              anotacao: (entradaAnterior as unknown as { anotacao?: string }).anotacao ?? '',
              is_favorite: (entradaAnterior as unknown as { is_favorite?: boolean }).is_favorite ?? false,
            }),
          }).catch(() => null)
        }

        showToast(`Ep. ${episodio} de ${titulo} marcado como visto!${sufixoXP}`, 'success')
        if (maratonaConcluida) {
          celebrar({
            tipo: 'maratona',
            subtitulo: maratonaConcluida.faixa
              ? `Faixa ${maratonaConcluida.faixa} · Maratona finalizada`
              : 'Maratona finalizada',
            notaExtra: 'Conta para as Insígnias de Maratona!',
            recompensas: {
              ouro: maratonaConcluida.ouro,
              xp: maratonaConcluida.xp,
              anicoins: maratonaConcluida.anicoins,
              bilhetes: maratonaConcluida.bilhetes,
            },
          })
        } else if (avisoMaratona) {
          showToast(avisoMaratona.texto, avisoMaratona.tipo)
        }
      } else {
        reverterOtimismo()
        showToast('Não foi possível registrar o episódio.', 'error')
      }
    } catch {
      reverterOtimismo()
      showToast('Erro de conexão ao registrar episódio.', 'error')
    } finally {
      setMarcandoEp(prev => ({ ...prev, [malId]: false }))
    }
  }

  const ocultasSet = new Set(configInicio.ocultas)
  const minimizadasSet = new Set(configInicio.minimizadas)

  const renderizarContinuarUnificado = () => {
    if (carregando) {
      return (
        <div className="mb-10 space-y-4">
          <div className="h-[260px] rounded-[24px] border border-line bg-panel shimmer" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[160px] sm:w-[186px] lg:w-[206px] aspect-[2/3] rounded-[16px] shimmer" />
            ))}
          </div>
        </div>
      )
    }

    if (deckVazio) {
      return (
        <section className="mb-10 bg-gradient-to-br from-holo-1/10 to-holo-3/10 border border-holo-3/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-anton text-xl uppercase mb-1.5">Seu deck está vazio</h2>
            <p className="text-muted text-sm m-0">
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
      )
    }

    if (emAndamento.length === 0) {
      return null
    }

    const minimizada = minimizadasSet.has('continuar')

    return (
      <Secao
        titulo="Continue de onde parou"
        subtitulo="Seu próximo episódio em foco e a fila de animes em andamento do seu deck"
        icone={<Play size={17} className="text-holo-1" />}
        link={{ para: '/deck', texto: 'Meu deck' }}
        minimizada={minimizada}
        aoAlternarMinimizar={() => alternarMinimizar('continuar')}
      >
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

        {continuar.length > 0 && (
          <FaixaRolavel ariaLabel="Continue de onde parou">
            {continuar.map((c, idx) => {
              const epAlvoBruto = recemMarcados[c.anime.mal_id]
                ? recemMarcados[c.anime.mal_id] + 1
                : c.proximoEpisodio
              const total = c.anime.episodes || 0
              const concluidoLocal = total > 0 && epAlvoBruto > total
              const epAlvo = concluidoLocal ? total : epAlvoBruto
              const vistos = concluidoLocal ? total : epAlvo - 1
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
                      <span className="absolute top-2.5 left-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-coral/90 backdrop-blur-md text-void font-mono text-xs font-extrabold uppercase tracking-wider shadow-md">
                        <AlertTriangle size={11} className="shrink-0" /> Sem episódios (Curar)
                      </span>
                    ) : diaSemana ? (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-void/85 backdrop-blur-md border border-holo-3/40 font-mono text-xs font-bold uppercase tracking-wider text-holo-3 shadow-md">
                        📅 {diaSemana}
                      </span>
                    ) : null}

                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <div className="flex items-center justify-between gap-2 font-mono text-xs text-white/90 mb-1.5 tabular-nums drop-shadow">
                        <span>
                          Visto: <strong className="text-white">{vistos}</strong>
                          {total > 0 ? ` / ${total} eps` : ' eps'}
                        </span>
                        {total > 0 && <span className="text-xs text-holo-3 font-bold">{pct}%</span>}
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
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-coral/15 hover:bg-coral/25 border border-coral/45 text-coral text-xs font-extrabold transition-colors text-center"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {isAdmin ? 'Curar episódios' : 'Sem episódios'}
                      </Link>
                    ) : concluidoLocal ? (
                      <span className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-jade/15 border border-jade/40 text-jade text-xs font-extrabold">
                        <Check size={13} /> Concluído
                      </span>
                    ) : bloqueadoPorLancamento ? (
                      <button
                        type="button"
                        disabled
                        title="Este episódio ainda não foi ao ar"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-panel-2 border border-line text-muted-2 text-xs font-bold cursor-not-allowed opacity-75"
                      >
                        <Lock size={12} className="shrink-0" /> Ep. {epAlvo} não lançado
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={marcandoEp[c.anime.mal_id]}
                        onClick={() => avancarEpisodioRapido(c.anime.mal_id, epAlvo, c.anime.title)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-holo-1/15 hover:bg-holo-1/25 border border-holo-1/35 text-holo-1 text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
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
        )}
      </Secao>
    )
  }

  const renderizarSecao = (id: SecaoInicioId, modoSidebar: boolean): ReactNode => {
    if (ocultasSet.has(id)) return null
    const minimizada = minimizadasSet.has(id)

    switch (id) {
      case 'continuar':
        return renderizarContinuarUnificado()

      case 'destaques':
        return (
          <PalcoDestaques
            fonte={configInicio.destaque_fonte}
            aoMudarFonte={mudarFonteDestaque}
            minimizada={minimizada}
            onAlternarMinimizar={() => alternarMinimizar('destaques')}
          />
        )

      case 'recomendados':
        if (dados.recomendados.itens.length === 0) return null
        return (
          <Secao
            titulo="Recomendados para Você"
            subtitulo={`Com base na sua afinidade e gêneros favoritos: ${dados.recomendados.generos.join(' • ')}`}
            icone={<Sparkles size={17} className="text-holo-2" />}
            acaoExtra={
              <button
                type="button"
                onClick={() => setModalGostoAberto(true)}
                className="font-mono text-xs text-holo-2 uppercase tracking-widest hover:underline cursor-pointer"
              >
                Personalizar
              </button>
            }
            link={{ para: '/descobrir', texto: 'Explorar catálogo' }}
            minimizada={minimizada}
            aoAlternarMinimizar={() => alternarMinimizar('recomendados')}
          >
            <Trilho cartazes={dados.recomendados.itens} />
          </Secao>
        )

      case 'lacuna':
        if (!dados.lacuna) return null
        return (
          <GostoPoucoExplorado
            rotulo={dados.lacuna.rotulo}
            nota={dados.lacuna.nota}
            mediaPessoal={dados.lacuna.mediaPessoal}
            vistos={dados.lacuna.vistos}
            minimizada={minimizada}
            onAlternarMinimizar={() => alternarMinimizar('lacuna')}
          >
            <Trilho cartazes={dados.lacuna.sugestoes} />
          </GostoPoucoExplorado>
        )

      case 'trilhas':
        if (dados.trilhas.length === 0) return null
        return (
          <Secao
            titulo="Trilhas da curadoria"
            subtitulo="Listas temáticas montadas a dedo, para maratonar em sequência"
            icone={<Compass size={17} className="text-holo-2" />}
            minimizada={minimizada}
            aoAlternarMinimizar={() => alternarMinimizar('trilhas')}
          >
            <TrilhasDaCuradoria trilhas={dados.trilhas} />
          </Secao>
        )

      case 'ranking':
        if (dados.ranking.length === 0) return null
        return (
          <Secao
            titulo="Topo do ranking"
            subtitulo="As obras mais bem avaliadas no ranking bayesiano do AniDeck"
            icone={<Trophy size={17} className="text-gold" />}
            link={{ para: '/rankings', texto: 'Ranking completo' }}
            minimizada={minimizada}
            aoAlternarMinimizar={() => alternarMinimizar('ranking')}
          >
            <Trilho cartazes={dados.ranking} />
          </Secao>
        )

      case 'missoes':
        return (
          <CardMissoesDiarias
            compacto={modoSidebar}
            minimizada={minimizada}
            onAlternarMinimizar={() => alternarMinimizar('missoes')}
          />
        )

      case 'semana':
        if (carregando || deckVazio) return null
        if (modoSidebar) {
          return (
            <div className="rounded-2xl border border-line bg-panel/80 p-3.5">
              <div className="flex items-center justify-between gap-2 select-none mb-2">
                <h2 className="font-anton text-[16px] uppercase m-0 flex items-center gap-2 tracking-wide">
                  <CalendarDays size={15} className="text-holo-3" /> Sua semana
                </h2>
                <div className="flex items-center gap-2">
                  <Link
                    to="/calendario"
                    className="font-mono text-xs text-muted-2 uppercase tracking-widest hover:text-holo-3"
                  >
                    Agenda →
                  </Link>
                  <button
                    type="button"
                    onClick={() => alternarMinimizar('semana')}
                    aria-label={minimizada ? 'Expandir Sua semana' : 'Minimizar Sua semana'}
                    className="w-7 h-7 rounded-full bg-panel-2 border border-line hover:border-holo-3 text-muted hover:text-text grid place-items-center cursor-pointer"
                  >
                    {minimizada ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>
              {minimizada ? (
                <p className="text-xs text-muted m-0">Calendário semanal minimizado.</p>
              ) : (
                <SuaSemana semana={semana} compacta />
              )}
            </div>
          )
        }
        return (
          <Secao
            titulo="Sua semana"
            subtitulo="O que sai do seu deck nos próximos 7 dias, no seu horário"
            icone={<CalendarDays size={17} className="text-holo-3" />}
            link={{ para: '/calendario', texto: 'Agenda' }}
            minimizada={minimizada}
            aoAlternarMinimizar={() => alternarMinimizar('semana')}
          >
            <SuaSemana semana={semana} />
          </Secao>
        )

      case 'chefao':
        return (
          <CardChefao
            compacto={modoSidebar}
            minimizada={minimizada}
            onAlternarMinimizar={() => alternarMinimizar('chefao')}
            className={modoSidebar ? '' : 'mb-6'}
          />
        )

      case 'cla':
        return (
          <CardDesafioClaInicio
            compacto={modoSidebar}
            minimizada={minimizada}
            onAlternarMinimizar={() => alternarMinimizar('cla')}
          />
        )

      default:
        return null
    }
  }

  const principais = ehDesktopLargo
    ? configInicio.ordem.filter(id => (SECOES_PRINCIPAIS as readonly SecaoInicioId[]).includes(id) && !ocultasSet.has(id))
    : configInicio.ordem.filter(id => !ocultasSet.has(id))

  const laterais = ehDesktopLargo
    ? configInicio.ordem.filter(id => (SECOES_LATERAIS as readonly SecaoInicioId[]).includes(id) && !ocultasSet.has(id))
    : []

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-3 sm:pt-6 pb-24">
      <PlayerHudInicio
        nome={nome}
        dataHoje={dataDeHoje}
        minimizada={minimizadasSet.has(SECAO_HUD_INICIO)}
        aoAlternarMinimizar={() => alternarMinimizar(SECAO_HUD_INICIO)}
        aoAbrirGosto={() => setModalGostoAberto(true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <span className="font-mono text-xs text-muted-2">
          {configInicio.ocultas.length > 0
            ? `${configInicio.ocultas.length} ${configInicio.ocultas.length === 1 ? 'seção oculta' : 'seções ocultas'}`
            : 'Personalize a ordem e visibilidade da sua Início'}
        </span>
        <button
          type="button"
          onClick={() => setOrganizandoAberto(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-panel hover:border-holo-3 text-xs font-bold text-text transition-colors cursor-pointer"
        >
          <SlidersHorizontal size={14} className="text-holo-3" /> Organizar Início
        </button>
      </div>

      <div className={laterais.length > 0 ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_310px] 2xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-6 xl:items-start' : ''}>
        <div className="min-w-0">
          {principais.map(id => (
            <div key={id}>{renderizarSecao(id, false)}</div>
          ))}
        </div>

        {laterais.length > 0 && (
          <aside className="flex flex-col gap-5 sticky top-24 min-w-0">
            {laterais.map(id => (
              <div key={id}>{renderizarSecao(id, true)}</div>
            ))}
          </aside>
        )}
      </div>

      <OrganizarInicioModal
        aberto={organizandoAberto}
        config={configInicio}
        ehDesktopLargo={ehDesktopLargo}
        salvando={salvandoPreferencias}
        aoFechar={() => setOrganizandoAberto(false)}
        aoAtualizar={atualizarConfigInicio}
      />

      <OnboardingGostoModal
        isOpen={modalGostoAberto}
        userId={userId}
        preferenciasAtuais={prefsGosto}
        onClose={() => setModalGostoAberto(false)}
        onSaved={novas => setPrefsGosto(novas)}
      />
      {dialogo}
    </div>
  )
}
