import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle, Trophy, X, ArrowLeft, CalendarDays, ChevronDown, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSessao } from '../contexts/SessaoContext'
import { useToast } from '../contexts/ToastContext'
import { useCartas } from '../hooks/useCartas'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'
import BotaoCopiar from '../components/BotaoCopiar'
import ReactMarkdown from 'react-markdown'
import EpisodeGrid from '../components/EpisodeGrid'
import ConversaDoAnime from '../components/comunidade/ConversaDoAnime'
import PainelMinhaLista from '../components/detalhes/PainelMinhaLista'
import FerramentasCuradoria from '../components/detalhes/FerramentasCuradoria'
import NumerosDaObra, { type EstatisticasDaObra } from '../components/detalhes/NumerosDaObra'
import { getCategoryTheme } from '../lib/filters'
import { obterTextoDiaLancamento } from '../lib/deckHelpers'
import { temHistoriaNoApp, veioDeListaRestauravel } from '../lib/posicaoDeLista'
import ImagemAmpliada from '../components/ImagemAmpliada'
import { lerDaMemoria, guardarNaMemoria, invalidarCachesDoDeck } from '../lib/cacheDeTela'
import { abaDaUrl, type AbaDetalhes, type EntradaNoDeck } from '../lib/detalhes'
import { filtrarLinksStreaming } from '../lib/inicio'
import { ultimoEpisodioDisponivel } from '../lib/comunidade'
import { useMidia } from '../hooks/useMidia'

interface AnimeDetail {
  mal_id: number
  title: string
  status: string
  is_curated?: boolean
  curation_status?: string
  synopsis: string
  episodes: number
  score: number
  ranking?: number
  bannerImage?: string
  startDate?: { year: number; month: number; day: number }
  /** Instante exato da estreia, vindo da curadoria. Mais preciso que o startDate. */
  first_aired_at?: string
  images: { jpg: { image_url: string } }
  genres: { name: string }[]
  studios: { name: string }[]
  streaming: { name: string; url: string }[]
  theme: { openings: string[]; endings: string[] }
  // mal_id é opcional: a AniList devolve `idMal` nulo em parte do catálogo, e o backend
  // omite o campo nesse caso em vez de mandar 0 — que virava um link para /anime/0.
  relations: { relation: string; entry: { mal_id?: number | null; type: string; name: string; image?: string }[] }[]
  // id é opcional: o elenco curado no Painel é gravado sem ele, e o backend omite o campo
  // em vez de mandar 0 — que colidia como chave para o elenco inteiro.
  characters?: { id?: number | null; name: string; image: string; role: string }[]
  streamingEpisodes?: { title: string; thumbnail: string; url: string; site: string }[]
  nextAiringEpisode?: { airingAt: number; timeUntilAiring: number; episode: number }
}

// O que a tela guarda em memória de cada anime aberto (ver cacheDeTela.ts).
interface AnimeEmMemoria {
  anime: AnimeDetail
  stats: EstatisticasDaObra | null
}

const RELACOES_MOSTRADAS = ['PREQUEL', 'SEQUEL', 'SPIN_OFF', 'ADAPTATION', 'SIDE_STORY', 'PARENT']

function TituloDeBloco({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 select-none">
      <h2 className="font-anton text-[15px] uppercase tracking-wide m-0">{children}</h2>
      {extra}
    </div>
  )
}

export default function Detalhes() {
  const navigate = useNavigate()

  // Que promessa o botão pode fazer. Decidido uma vez, na montagem: depende do
  // ponto do histórico em que esta tela nasceu, e isso não muda enquanto ela vive.
  //   'fechar' — veio direto de uma lista cuja posição será devolvida
  //   'voltar' — veio de outro Detalhes, ou de origem sem posição a restaurar
  //   'raiz'   — link direto, aba nova ou refresh: não há para onde voltar
  const [modoVoltar] = useState<'fechar' | 'voltar' | 'raiz'>(() =>
    !temHistoriaNoApp() ? 'raiz' : veioDeListaRestauravel() ? 'fechar' : 'voltar'
  )

  const aoVoltar = () => {
    if (modoVoltar === 'raiz') navigate('/')
    else navigate(-1)
  }
  const { id } = useParams<{ id: string }>()
  const { session } = useSessao()
  const { alternarFavorito, ehFavorito } = useCartas()
  const { showToast } = useToast()
  const { reportarFalha, reportarSucesso } = useCatalogoStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const aba = abaDaUrl(searchParams.get('aba'), location.hash)
  const sentinelaAbas = useRef<HTMLDivElement>(null)
  const ehMonitor = useMidia('(min-width: 1024px)')

  // Com este anime já aberto nesta aba, a página nasce pronta (ver cacheDeTela.ts) e a
  // versão nova chega por trás. Anime e estatísticas não são dado pessoal, então a chave
  // não leva o usuário.
  const chaveDoAnime = id ? `detalhes:${id}` : null
  const [emMemoriaInicial] = useState(() => lerDaMemoria<AnimeEmMemoria>(chaveDoAnime))

  const [anime, setAnime] = useState<AnimeDetail | null>(emMemoriaInicial?.anime ?? null)
  const [stats, setStats] = useState<EstatisticasDaObra | null>(emMemoriaInicial?.stats ?? null)
  const [loading, setLoading] = useState(!emMemoriaInicial)
  type TipoErro = 'fonte-externa' | 'nao-encontrado' | 'generico'
  const [erro, setErro] = useState<TipoErro | null>(null)

  const [minhaEntrada, setMinhaEntrada] = useState<EntradaNoDeck | null>(null)
  const entradaAtual = useRef<EntradaNoDeck | null>(null)
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null)
  const [episodiosAssistidos, setEpisodiosAssistidos] = useState<number[]>([])
  const [comentariosNaObra, setComentariosNaObra] = useState(0)
  const [sinopseAberta, setSinopseAberta] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Lido de novo aqui, e não só no useState acima, porque ir de um Detalhes para outro
    // troca o id sem desmontar a página.
    const emMemoria = lerDaMemoria<AnimeEmMemoria>(chaveDoAnime)
    setSinopseAberta(false)

    // A entrada do usuário e os episódios assistidos não dependem da resposta do anime.
    // Antes, só saíam depois dela, e a página esperava as quatro requisições em fila.
    const buscarDadosDoUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setIsLoggedIn(true)

      const cabecalho = { 'Authorization': `Bearer ${session.access_token}` }
      const [resEntries, resEps, resAdmin] = await Promise.all([
        fetch('/api/entries', { headers: cabecalho }),
        fetch(`/api/entries/${id}/episodes`, { headers: cabecalho }).catch(() => null),
        fetch('/api/admin/verify', { headers: cabecalho }).catch(() => null),
      ])

      setIsAdmin(Boolean(resAdmin?.ok))

      if (resEntries.ok) {
        const entradas = await resEntries.json()
        // `?? null` limpa a entrada do anime anterior quando se vai de um Detalhes para
        // outro que não está no deck. Antes, ela ficava na tela.
        setMinhaEntrada(entradas?.find((e: EntradaNoDeck) => e.mal_id === Number(id)) ?? null)
      }
      if (resEps?.ok) {
        const epsData = await resEps.json()
        setEpisodiosAssistidos(Array.isArray(epsData) ? epsData : [])
      }
    }

    // Só a contagem pública, para o número na aba Conversa.
    fetch(`/api/anime/${id}/conversa`)
      .then(r => (r.ok ? (r.json() as Promise<{ comentarios: number }[]>) : []))
      .then(lista => setComentariosNaObra(lista.reduce((s, c) => s + (c.comentarios || 0), 0)))
      .catch(() => setComentariosNaObra(0))

    const fetchData = async () => {
      if (emMemoria) {
        setAnime(emMemoria.anime)
        setStats(emMemoria.stats)
        setLoading(false)
      } else {
        setLoading(true)
      }
      setErro(null)

      const doUsuario = buscarDadosDoUsuario().catch((e) => {
        console.error('Erro ao carregar progresso:', e)
      })

      try {
        // As estatísticas saem junto, mas a página NÃO espera por elas: são a parte
        // secundária e a que mais depende da AniList.
        const pedidoDeStats = fetch(`/api/anime/${id}/statistics`).catch(() => null)
        const resAnime = await fetch(`/api/anime/${id}`)

        if (!resAnime.ok) {
          // 5xx = a fonte externa (AniList) falhou. 404 = anime não existe.
          // Com o anime em memória, a falha da atualização não troca a página por erro.
          if (resAnime.status >= 500) reportarFalha()
          if (!emMemoria) {
            if (resAnime.status >= 500) setErro('fonte-externa')
            else if (resAnime.status === 404) setErro('nao-encontrado')
            else setErro('generico')
          }
          return
        }

        const animeNovo: AnimeDetail = (await resAnime.json()).data
        setAnime(animeNovo)
        reportarSucesso()

        guardarNaMemoria<AnimeEmMemoria>(chaveDoAnime, { anime: animeNovo, stats: emMemoria?.stats ?? null })
        setLoading(false)

        const resStats = await pedidoDeStats
        if (resStats?.ok) {
          const statsNovas: EstatisticasDaObra = (await resStats.json()).data
          setStats(statsNovas)
          guardarNaMemoria<AnimeEmMemoria>(chaveDoAnime, { anime: animeNovo, stats: statsNovas })
        }
      } catch {
        if (!emMemoria) setErro('generico')
      } finally {
        setLoading(false)
      }
      await doUsuario
    }
    if (id) fetchData()
    // reportarFalha/reportarSucesso vêm de useCallback(..., []) no CatalogoStatusContext:
    // a identidade nunca muda, então entram na lista sem alterar quando o efeito roda.
  }, [id, chaveDoAnime, reportarFalha, reportarSucesso])

  // Marcar ou desmarcar episódio em qualquer lugar (grade, painel, notificação) atualiza a
  // página inteira. O backend já promove "Quero Assistir" para "Assistindo"; aqui só a tela.
  useEffect(() => {
    entradaAtual.current = minhaEntrada
  }, [minhaEntrada])

  useEffect(() => {
    const aoAtualizar = (ev: Event) => {
      const d = (ev as CustomEvent<{ malId?: number; episodeNumber?: number; watched?: boolean }>).detail
      if (d?.malId !== Number(id) || typeof d.episodeNumber !== 'number') return
      const n = d.episodeNumber
      setEpisodiosAssistidos(prev => (d.watched ? (prev.includes(n) ? prev : [...prev, n]) : prev.filter(x => x !== n)))
      if (d.watched) {
        const atual = entradaAtual.current
        if (atual?.status === 'Quero Assistir') {
          setMinhaEntrada({ ...atual, status: 'Assistindo' })
          showToast('Movido para Assistindo!')
        }
        supabase.auth.getSession().then(({ data }) => invalidarCachesDoDeck(data.session?.user?.id))
      }
    }
    window.addEventListener('anideck:episodio-atualizado', aoAtualizar)
    return () => window.removeEventListener('anideck:episodio-atualizado', aoAtualizar)
  }, [id, showToast])

  const recarregarEpisodios = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !id) return
    try {
      const resEps = await fetch(`/api/entries/${id}/episodes`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (resEps.ok) {
        const epsData: number[] = await resEps.json()
        if (Array.isArray(epsData)) setEpisodiosAssistidos(epsData)
      }
    } catch (e) {
      console.error('Erro ao recarregar progresso:', e)
    }
  }

  // Troca a aba sem empilhar histórico (o voltar continua saindo da obra) e, se a barra já
  // grudou no topo, sobe só até ela: o conteúdo novo começa à vista.
  const trocarAba = (nova: AbaDetalhes) => {
    setSearchParams(prev => {
      const proximo = new URLSearchParams(prev)
      if (nova === 'sobre') proximo.delete('aba')
      else proximo.set('aba', nova)
      return proximo
    }, { replace: true })
    const marca = sentinelaAbas.current
    if (!marca) return
    const alturaDoTopo = window.innerWidth >= 768 ? 73 : 63
    const alvo = marca.getBoundingClientRect().top + window.scrollY - alturaDoTopo
    if (window.scrollY > alvo + 1) window.scrollTo({ top: alvo })
  }

  const traduzirStatus = (statusOriginal: string) => {
    if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
    if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em lançamento'
    if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em breve'
    return statusOriginal
  }

  const traduzirRelacao = (r: string) => {
    const map: Record<string, string> = {
      'PREQUEL': 'Prequela', 'SEQUEL': 'Sequência', 'SPIN_OFF': 'Spin-off',
      'ADAPTATION': 'Adaptação', 'SIDE_STORY': 'História paralela', 'PARENT': 'História principal'
    }
    return map[r] || r
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-line border-t-holo-3 animate-spin mb-4"></div>
        <p className="font-mono text-muted text-sm tracking-widest">Carregando anime...</p>
      </div>
    )
  }

  if (erro || !anime) {
    const mensagens = {
      'fonte-externa': {
        titulo: 'Catálogo indisponível',
        texto: 'A base de dados de anime não está respondendo no momento. Seu deck, suas notas e seu progresso continuam salvos — tente de novo daqui a pouco.',
      },
      'nao-encontrado': {
        titulo: 'Anime não encontrado',
        texto: 'Não achamos esse título no catálogo.',
      },
      'generico': {
        titulo: 'Algo deu errado',
        texto: 'Não foi possível carregar este anime.',
      },
    }
    const { titulo, texto } = mensagens[erro ?? 'generico']

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="text-coral mb-4" size={48} />
        <h2 className="font-anton text-2xl text-text uppercase mb-2">{titulo}</h2>
        <p className="text-muted mb-6 max-w-md">{texto}</p>
        <Link to="/" className="text-holo-3 font-bold hover:underline">Voltar para o início</Link>
      </div>
    )
  }

  const diaLancamentoSemanal = obterTextoDiaLancamento({
    status: anime.status,
    nextAiringEpisode: anime.nextAiringEpisode,
    firstAiredAt: anime.first_aired_at,
    startDate: anime.startDate,
  })
  const episodiosJaLancados = anime.nextAiringEpisode?.episode ? Math.max(0, anime.nextAiringEpisode.episode - 1) : 0
  const maxAssistido = episodiosAssistidos.length > 0 ? Math.max(...episodiosAssistidos) : 0
  const totalEpisodios = Math.max(
    anime.episodes || 0,
    anime.streamingEpisodes?.length || 0,
    episodiosJaLancados,
    maxAssistido
  )
  const naoLancado = anime.status === 'NOT_YET_RELEASED' || anime.status === 'Not yet aired' || anime.status === 'Em breve' || anime.status === 'Ainda não lançado'
  const ultimoDisponivel = naoLancado ? 0 : ultimoEpisodioDisponivel(totalEpisodios, anime.nextAiringEpisode?.episode, episodiosAssistidos)
  const obraTerminou = anime.status === 'FINISHED' || anime.status === 'Finished Airing'
  const semEpisodios = totalEpisodios <= 0 && !naoLancado
  const relacoes = (anime.relations ?? []).filter(r => RELACOES_MOSTRADAS.includes(r.relation) && r.entry[0])
  const sinopse = anime.synopsis?.replace(/&#34;/g, '"').replace(/&#39;/g, "'") ?? ''
  const sinopseLonga = sinopse.length > 420
  const capa = anime.images?.jpg?.image_url

  const abas: { id: AbaDetalhes; rotulo: string; contador?: string }[] = [
    { id: 'sobre', rotulo: 'Sobre' },
    { id: 'episodios', rotulo: 'Episódios', contador: totalEpisodios > 0 && isLoggedIn ? `${episodiosAssistidos.length}/${totalEpisodios}` : undefined },
    { id: 'conversa', rotulo: 'Conversa', contador: comentariosNaObra > 0 ? String(comentariosNaObra) : undefined },
    { id: 'numeros', rotulo: 'Números' },
  ]

  const painel = (compacto: boolean) => (
    <PainelMinhaLista
      compacto={compacto}
      malId={anime.mal_id}
      entrada={minhaEntrada}
      assistidos={episodiosAssistidos}
      ultimoDisponivel={ultimoDisponivel}
      obraTerminou={obraTerminou}
      onEpisodiosZerados={() => setEpisodiosAssistidos([])}
      onEntradaMudou={async (nova, anterior) => {
        setMinhaEntrada(nova)
        // Completo marca todos os episódios no backend; a grade espelha na hora.
        if (nova?.status === 'Completo' && anterior?.status !== 'Completo') {
          if (totalEpisodios > 0) setEpisodiosAssistidos(Array.from({ length: totalEpisodios }, (_, i) => i + 1))
          await recarregarEpisodios()
        }
      }}
    />
  )

  return (
    <div className="-mt-24 pb-24">
      {/* TOPO: banner, capa grande e a ficha da obra */}
      <div className="relative h-[230px] md:h-[400px] w-full overflow-hidden bg-panel-2">
        {anime.bannerImage ? (
          <div
            onClick={() => setImagemAmpliada(anime.bannerImage!)}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90 cursor-zoom-in"
            style={{ backgroundImage: `url(${anime.bannerImage})` }}
          />
        ) : capa ? (
          <div className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60" style={{ backgroundImage: `url(${capa})` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-holo-2/30 to-void" />
        )}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-void/95 via-void/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent z-10" />

        {/* Saída no canto, como em app de streaming: X quando a posição da lista de origem
            vai ser devolvida, seta quando só desfaz um passo da navegação. */}
        <button
          type="button"
          onClick={aoVoltar}
          aria-label={modoVoltar === 'fechar' ? 'Fechar e voltar para a lista' : 'Voltar'}
          title={modoVoltar === 'fechar' ? 'Fechar' : 'Voltar'}
          className="absolute top-[88px] left-4 md:left-6 z-30 w-10 h-10 rounded-full bg-void/70 border border-line text-text hover:text-holo-3 hover:border-holo-3 flex items-center justify-center backdrop-blur-md shadow-lg transition-colors cursor-pointer active:scale-90"
        >
          {modoVoltar === 'fechar' ? <X size={18} /> : <ArrowLeft size={18} />}
        </button>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 -mt-[150px] md:-mt-[210px] relative z-20">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 text-center md:text-left">
          <button
            type="button"
            onClick={() => capa && setImagemAmpliada(capa)}
            aria-label="Ampliar a capa"
            className={`relative shrink-0 w-[176px] md:w-[240px] aspect-[2/3] rounded-2xl overflow-hidden bg-panel-2 border-[3px] shadow-[0_24px_50px_-14px_rgba(0,0,0,0.85)] cursor-zoom-in ${
              minhaEntrada?.is_favorite ? 'border-gold/80 shadow-[0_0_28px_rgba(255,197,66,0.25)]' : 'border-panel'
            }`}
          >
            {capa && <img src={capa} alt={`Capa de ${anime.title}`} className="w-full h-full object-cover" />}
            {minhaEntrada?.is_favorite && (
              // A mesma coroa do card no Meu Deck: favorito é a "carta rara" do deck.
              <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-void/85 border border-gold/60 grid place-items-center text-sm shadow-[0_0_12px_rgba(255,197,66,0.45)]" title="Favorito (carta rara)">
                <span aria-hidden>👑</span>
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1 md:pb-2 w-full">
            <div className="flex items-start justify-center md:justify-start gap-2 group">
              <h1 className="font-anton text-[clamp(1.55rem,4.6vw,2.9rem)] uppercase leading-[1.04] tracking-wide drop-shadow-md break-words m-0">
                {anime.title}
              </h1>
              <BotaoCopiar texto={anime.title} className="mt-1 opacity-70 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0" />
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 mt-2.5 font-mono text-[11.5px] text-muted">
              <span className="text-holo-3 font-bold">{traduzirStatus(anime.status)}</span>
              <span className="text-muted-2">·</span>
              <span>{anime.episodes || '?'} episódios</span>
              {anime.studios?.length > 0 && (
                <>
                  <span className="text-muted-2">·</span>
                  <span>{anime.studios[0].name}</span>
                </>
              )}
              {anime.startDate?.year && (
                <>
                  <span className="text-muted-2">·</span>
                  <span>{anime.startDate.year}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              {anime.score > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel/90 border border-gold/40 text-[12.5px] font-bold">
                  <Star size={14} className="text-gold fill-gold" aria-hidden />
                  <span className="text-gold">{anime.score.toFixed(1)}</span>
                  <span className="text-muted-2 font-mono text-[10px] uppercase">AniList</span>
                </span>
              )}
              {anime.ranking ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel/90 border border-line text-[12.5px] font-bold text-text">
                  <Trophy size={13} className="text-gold" aria-hidden /> #{anime.ranking}
                </span>
              ) : null}
              {diaLancamentoSemanal && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-holo-3/10 border border-holo-3/35 text-[12px] font-bold text-holo-3">
                  <CalendarDays size={13} aria-hidden /> {diaLancamentoSemanal}
                </span>
              )}
            </div>

            {anime.genres?.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
                {anime.genres.slice(0, 5).map(g => (
                  <span key={g.name} className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border select-none ${getCategoryTheme(g.name)}`}>
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {isAdmin && (
          <div className="mt-6">
            <FerramentasCuradoria malId={anime.mal_id} curada={Boolean(anime.is_curated)} statusCuradoria={anime.curation_status} semEpisodios={semEpisodios} emBreve={naoLancado} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] gap-x-10 mt-6">
          <div className="min-w-0">
            {/* No celular o painel vem antes das abas; no monitor ele fica na coluna da direita. */}
            {!ehMonitor && <div className="mb-5">{painel(true)}</div>}

            <div ref={sentinelaAbas} aria-hidden />
            <nav
              role="tablist"
              aria-label="Seções do anime"
              className="sticky top-[63px] md:top-[73px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 bg-void/95 backdrop-blur-md border-b border-line"
            >
              <div className="flex">
                {abas.map(a => {
                  const ativa = a.id === aba
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="tab"
                      id={`aba-${a.id}`}
                      aria-selected={ativa}
                      aria-controls={`painel-${a.id}`}
                      onClick={() => trocarAba(a.id)}
                      className={`relative flex-1 sm:flex-none sm:px-6 py-3.5 text-[13px] font-bold transition-colors cursor-pointer select-none ${ativa ? 'text-text' : 'text-muted hover:text-text'}`}
                    >
                      {a.rotulo}
                      {a.contador && (
                        <span className={`ml-1.5 font-mono text-[10px] ${a.id === 'episodios' ? 'hidden sm:inline' : ''} ${ativa ? 'text-holo-3' : 'text-muted-2'}`}>
                          {a.contador}
                        </span>
                      )}
                      {ativa && <span className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-holo-1 to-holo-3" />}
                    </button>
                  )
                })}
              </div>
            </nav>

            <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="min-h-[50vh]">
              {aba === 'sobre' && (
                <div className="space-y-9">
                  <section>
                    <TituloDeBloco extra={!anime.is_curated && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-2">Tradução automática</span>}>
                      Sinopse
                    </TituloDeBloco>
                    <div className="relative">
                      <div
                        className={`text-muted text-[14.5px] leading-[1.75] ${sinopseLonga && !sinopseAberta ? 'max-h-[11.5rem] overflow-hidden md:max-h-none md:overflow-visible' : ''}`}
                      >
                        {sinopse ? (
                          <ReactMarkdown
                            components={{
                              /* eslint-disable @typescript-eslint/no-unused-vars -- `node` é
                                 destruturado justamente para NÃO entrar no ...props: sem isso ele
                                 seria espalhado no elemento e vazaria como atributo inválido no DOM. */
                              p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                              strong: ({ node, ...props }) => <strong className="font-extrabold text-text" {...props} />,
                              em: ({ node, ...props }) => <em className="italic text-holo-3" {...props} />
                              /* eslint-enable @typescript-eslint/no-unused-vars */
                            }}
                          >
                            {sinopse}
                          </ReactMarkdown>
                        ) : (
                          'Sinopse não disponível nesta base de dados.'
                        )}
                      </div>
                      {sinopseLonga && !sinopseAberta && (
                        <div className="md:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-void to-transparent pointer-events-none" />
                      )}
                    </div>
                    {sinopseLonga && (
                      <button
                        type="button"
                        onClick={() => setSinopseAberta(a => !a)}
                        aria-expanded={sinopseAberta}
                        className="md:hidden mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-holo-3 cursor-pointer"
                      >
                        {sinopseAberta ? 'Mostrar menos' : 'Ler tudo'}
                        <ChevronDown size={15} className={`transition-transform ${sinopseAberta ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                    )}
                  </section>

                  {(() => {
                    const linksStreaming = filtrarLinksStreaming(anime.streaming)
                    if (linksStreaming.length === 0) return null
                    return (
                      <section>
                        <TituloDeBloco>Onde assistir</TituloDeBloco>
                        <div className="flex flex-wrap gap-2">
                          {linksStreaming.map(st => (
                            <a
                              key={`${st.name}-${st.url}`}
                              href={st.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 bg-panel border border-line rounded-full pl-3 pr-4 py-2 text-[13px] font-bold hover:border-holo-1 hover:text-holo-1 transition-colors"
                            >
                              <PlayCircle size={16} className="shrink-0" aria-hidden />
                              {st.name}
                            </a>
                          ))}
                        </div>
                      </section>
                    )
                  })()}

                  {anime.characters && anime.characters.length > 0 && (
                    <section>
                      <TituloDeBloco>Personagens</TituloDeBloco>
                      <div className="flex gap-3 overflow-x-auto pb-2.5 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 custom-scrollbar snap-x">
                        {/* A chave cai para o nome quando o id falta: o elenco curado no Painel é
                            gravado sem id e chegaria com chaves repetidas. */}
                        {anime.characters.map(char => {
                          const favorito = char.id ? ehFavorito(char.id) : false
                          return (
                            <div key={char.id || char.name} className="flex-none w-[100px] sm:w-[120px] snap-start group relative">
                              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-1.5 bg-panel-2 border border-line">
                                <img src={char.image} alt={char.name} loading="lazy" className="w-full h-full object-cover" />
                                {session && char.id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      alternarFavorito({
                                        character_id: char.id!,
                                        mal_id: Number(id),
                                        nome: char.name,
                                        imagem_url: char.image,
                                        papel: char.role,
                                      })
                                    }
                                    title={favorito ? 'Remover dos favoritos' : 'Favoritar personagem'}
                                    aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar personagem'}
                                    className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                                      favorito
                                        ? 'bg-rose-500 text-void shadow-md scale-100'
                                        : 'bg-void/70 text-muted hover:text-rose-400 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:scale-110'
                                    }`}
                                  >
                                    <Heart size={12} className={favorito ? 'fill-void' : ''} />
                                  </button>
                                )}
                              </div>
                              <div className="font-bold text-[12px] leading-tight line-clamp-2 text-text">{char.name}</div>
                              <div className="font-mono text-[9px] text-muted uppercase tracking-wider truncate mt-0.5">{char.role === 'MAIN' ? 'Principal' : char.role === 'SUPPORTING' ? 'Coadjuvante' : char.role}</div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {relacoes.length > 0 && (
                    <section>
                      <TituloDeBloco>Da mesma história</TituloDeBloco>
                      <div className="flex gap-3 overflow-x-auto pb-2.5 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 custom-scrollbar snap-x">
                        {relacoes.map((rel, i) => {
                          const relacionado = rel.entry[0]
                          // Sem mal_id não existe página de destino: o card sai igual, só não vira link.
                          const conteudo = (
                            <>
                              <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-1.5 bg-panel-2 border border-line">
                                {relacionado.image ? (
                                  <img src={relacionado.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-2 text-xs">Sem capa</div>
                                )}
                                <span className="absolute top-2 left-2 bg-void/85 border border-line/50 font-mono text-[9px] text-holo-3 uppercase px-1.5 py-0.5 rounded">
                                  {traduzirRelacao(rel.relation)}
                                </span>
                              </div>
                              <div className="font-bold text-[12.5px] leading-tight text-text group-hover:text-holo-3 transition-colors line-clamp-2">{relacionado.name}</div>
                            </>
                          )
                          return relacionado.mal_id != null ? (
                            <Link key={i} to={`/anime/${relacionado.mal_id}`} className="flex-none w-[130px] sm:w-[150px] group snap-start">
                              {conteudo}
                            </Link>
                          ) : (
                            <div key={i} className="flex-none w-[130px] sm:w-[150px] snap-start">
                              {conteudo}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {aba === 'episodios' && (
                <EpisodeGrid
                  malId={anime.mal_id}
                  totalEpisodes={anime.episodes}
                  streamingEpisodes={anime.streamingEpisodes}
                  initialWatched={episodiosAssistidos}
                  isLoggedIn={isLoggedIn}
                  isAdmin={isAdmin}
                  status={anime.status}
                  nextAiringEpisode={anime.nextAiringEpisode}
                  startDate={anime.startDate}
                  firstAiredAt={anime.first_aired_at}
                />
              )}

              {aba === 'conversa' && (
                <ConversaDoAnime
                  malId={anime.mal_id}
                  totalEpisodes={naoLancado ? 0 : totalEpisodios}
                  proximoAoAr={naoLancado ? undefined : anime.nextAiringEpisode?.episode}
                  assistidosIniciais={episodiosAssistidos}
                  aoIrParaEpisodios={() => trocarAba('episodios')}
                />
              )}

              {aba === 'numeros' && <NumerosDaObra nota={anime.score} ranking={anime.ranking} stats={stats} minhaNota={minhaEntrada?.nota ?? null} />}
            </div>
          </div>

          {ehMonitor && (
            <aside>
              <div className="sticky top-[96px]">{painel(false)}</div>
            </aside>
          )}
        </div>
      </div>

      <ImagemAmpliada
        src={imagemAmpliada}
        alt={anime.title || 'Imagem do anime'}
        aoFechar={() => setImagemAmpliada(null)}
      />
    </div>
  )
}
