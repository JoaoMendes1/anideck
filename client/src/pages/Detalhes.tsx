import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PlayCircle, Star, AlertCircle, Bookmark, Trophy, X, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useCatalogoStatus } from '../contexts/CatalogoStatusContext'
import BotaoCopiar from '../components/BotaoCopiar'
import ReactMarkdown from 'react-markdown'
import EpisodeGrid from '../components/EpisodeGrid'
import EditarEntradaModal from '../components/EditarEntradaModal'
import { getCategoryTheme } from '../lib/filters'
import { temHistoriaNoApp, veioDeListaRestauravel } from '../lib/posicaoDeLista'
import { motion } from 'framer-motion'

interface AnimeDetail {
  mal_id: number
  title: string
  status: string
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

interface AnimeStats {
  scores: { score: number; votes: number; percentage: number }[]
  statuses: { status: string; amount: number }[]
}

interface MinhaEntrada {
  id: string
  status: string
  mal_id: number
  tipo: string
  nota?: number | null
  anotacao?: string
  is_favorite?: boolean
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
  const { showToast } = useToast()
  const { reportarFalha, reportarSucesso } = useCatalogoStatus()

  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [stats, setStats] = useState<AnimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  type TipoErro = 'fonte-externa' | 'nao-encontrado' | 'generico'
  const [erro, setErro] = useState<TipoErro | null>(null)

  const [minhaEntrada, setMinhaEntrada] = useState<MinhaEntrada | null>(null)
  const [episodiosAssistidos, setEpisodiosAssistidos] = useState<number[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErro(null)
      try {
        const [resAnime, resStats] = await Promise.all([
          fetch(`/api/anime/${id}`),
          fetch(`/api/anime/${id}/statistics`)
        ])

        if (!resAnime.ok) {
          // 5xx = a fonte externa (AniList) falhou. 404 = anime não existe.
          if (resAnime.status >= 500) { reportarFalha(); setErro('fonte-externa') }
          else if (resAnime.status === 404) setErro('nao-encontrado')
          else setErro('generico')
          return
        }
        if (!resAnime.ok) {
          // 5xx = a fonte externa (AniList) falhou. 404 = anime não existe.
          if (resAnime.status >= 500) { reportarFalha(); setErro('fonte-externa') }
          else if (resAnime.status === 404) setErro('nao-encontrado')
          else setErro('generico')
          return
        }

        setAnime((await resAnime.json()).data)
        reportarSucesso()

        // Estatística é secundária: se falhar, a página continua de pé.
        if (resStats.ok) {
          setStats((await resStats.json()).data)
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsLoggedIn(true)

          const resEntries = await fetch('/api/entries', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (resEntries.ok) {
            const entradas = await resEntries.json()
            const entrada = entradas?.find((e: MinhaEntrada) => e.mal_id === Number(id))
            if (entrada) setMinhaEntrada(entrada)
          }
          try {
            const resEps = await fetch(`/api/entries/${id}/episodes`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            if (resEps.ok) {
              const epsData = await resEps.json()
              setEpisodiosAssistidos(epsData || [])
            }
          } catch (e) {
            console.error('Erro ao carregar progresso:', e)
          }
        }
      } catch {
        setErro('generico')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
    // reportarFalha/reportarSucesso vêm de useCallback(..., []) no CatalogoStatusContext:
    // a identidade nunca muda, então entram na lista sem alterar quando o efeito roda.
  }, [id, reportarFalha, reportarSucesso])

  const handleAtualizarEntradaRapida = async (novoStatus: string) => {
    setSalvandoStatus(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      showToast('Você precisa estar logado para salvar.', 'error')
      setSalvandoStatus(false)
      return
    }

    const payload = {
      mal_id: Number(id),
      tipo: 'anime',
      status: novoStatus,
      nota: minhaEntrada?.nota || null,
      anotacao: minhaEntrada?.anotacao || '',
      is_favorite: minhaEntrada?.is_favorite || false
    }

    try {
      const url = minhaEntrada ? `/api/entries/${minhaEntrada.id}` : '/api/entries'
      const method = minhaEntrada ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error()
      const atualizada = await response.json()
      setMinhaEntrada(Array.isArray(atualizada) ? atualizada[0] : atualizada)
      showToast('Parabéns! Movido para os Completos.', 'success')
    } catch {
      showToast('Erro ao atualizar. Tente novamente.', 'error')
    } finally {
      setSalvandoStatus(false)
    }
  }

  const traduzirStatus = (statusOriginal: string) => {
    if (statusOriginal === 'FINISHED' || statusOriginal === 'Finished Airing') return 'Finalizado'
    if (statusOriginal === 'RELEASING' || statusOriginal === 'Currently Airing') return 'Em Lançamento'
    if (statusOriginal === 'NOT_YET_RELEASED' || statusOriginal === 'Not yet aired') return 'Em Breve'
    return statusOriginal
  }

  const traduzirRelacao = (r: string) => {
    const map: Record<string, string> = {
      'PREQUEL': 'Prequela', 'SEQUEL': 'Sequência', 'SPIN_OFF': 'Spin-off',
      'ADAPTATION': 'Adaptação', 'SIDE_STORY': 'História Paralela', 'PARENT': 'História Principal'
    }
    return map[r] || r
  }

  const notaDisplay = minhaEntrada?.nota !== null && minhaEntrada?.nota !== undefined ? minhaEntrada.nota : 'N/A'
  const temNotaDisplay = notaDisplay !== 'N/A'

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

  const maxPercentage = stats?.scores ? Math.max(...stats.scores.map(s => s.percentage)) : 100
  const totalStatus = stats?.statuses?.reduce((acc, curr) => acc + curr.amount, 0) || 1
  const completedStatus = stats?.statuses?.find(s => s.status === 'COMPLETED')?.amount || 0
  const droppedStatus = stats?.statuses?.find(s => s.status === 'DROPPED')?.amount || 0

  const novaEntrada = {
    mal_id: anime.mal_id,
    tipo: 'anime',
    status: 'Quero Assistir',
  }

  return (
    <div className="-mt-24 pb-20">

      <div className="relative h-[300px] md:h-[450px] w-full overflow-hidden bg-panel-2">
        {anime.bannerImage ? (
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90" style={{ backgroundImage: `url(${anime.bannerImage})` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a1a4a] to-[#0A0714]" />
        )}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-void/95 via-void/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent z-10" />

        {/*
          Saída no canto da capa, como em app de streaming. A forma promete o que
          o destino cumpre: X é "fechar e voltar ao que eu fazia", e só aparece
          quando a posição de origem vai mesmo ser devolvida. Nos outros casos a
          seta é honesta — ela só desfaz um passo da navegação.
        */}
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

      <div className="max-w-[1040px] mx-auto px-5 -mt-[120px] md:-mt-[160px] relative z-20 pb-2">

        <div className="flex flex-col sm:flex-row gap-5 sm:items-end mb-8 text-center sm:text-left items-center">
          <div className="relative">
            {minhaEntrada?.is_favorite && (
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-void/80 border border-gold/50 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,197,66,0.4)] z-30">👑</div>
            )}
            <img
              src={anime.images?.jpg?.image_url}
              alt={`Poster de ${anime.title}`}
              className={`w-[140px] md:w-[170px] h-[198px] md:h-[240px] rounded-xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)] border-[3px] shrink-0 object-cover bg-panel-2 transition-colors ${minhaEntrada?.is_favorite ? 'border-gold' : 'border-panel'}`}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            {anime.ranking && (
              <div className="inline-flex items-center gap-1.5 mb-2 font-anton text-[11px] px-2 py-0.5 rounded-md border bg-gold/20 text-gold border-gold/40 shadow-[0_0_8px_rgba(255,197,66,0.2)]">
                <Trophy size={12} /> #{anime.ranking} GLOBAL
              </div>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 group">
              <h1 className="font-anton text-[clamp(1.4rem,3.5vw,2.4rem)] uppercase leading-[1.05] tracking-wide drop-shadow-md break-words">
                {anime.title}
              </h1>
              <BotaoCopiar texto={anime.title} className="opacity-70 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0" />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start font-mono text-[11px] text-muted mb-3">
              <span className="text-holo-3">{traduzirStatus(anime.status)}</span>
              <span className="text-muted-2">•</span>
              <span>{anime.episodes || '?'} EP</span>
              {anime.studios?.length > 0 && (
                <><span className="text-muted-2">•</span><span>{anime.studios[0].name}</span></>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
              {anime.genres?.map(g => (
                <span key={g.name} className={`text-[10px] font-bold px-3 py-1 rounded-full border select-none ${getCategoryTheme(g.name)}`}>
                  {g.name}
                </span>
              ))}
            </div>

            <div className="bg-panel border border-line rounded-xl px-5 py-3 inline-flex items-center gap-5 shrink-0 shadow-lg mt-1 select-none">
              <div className="flex items-center gap-3">
                <Star className="text-gold fill-gold w-6 h-6" />
                <div className="text-left">
                  <div className="font-anton text-[22px] text-gold leading-none">{anime.score ? anime.score.toFixed(1) : 'N/A'}</div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Nota Geral</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-line"></div>

              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                <Star className={`w-6 h-6 transition-colors ${temNotaDisplay ? 'text-holo-3 fill-holo-3' : 'text-muted-2 group-hover:text-text'}`} />
                <div className="text-left">
                  <div className={`font-anton text-[22px] leading-none transition-colors ${temNotaDisplay ? 'text-holo-3' : 'text-muted-2 group-hover:text-text'}`}>
                    {notaDisplay}
                  </div>
                  <div className="text-[10px] font-bold text-muted-2 mt-1 uppercase tracking-wide">Sua Nota</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky top-[63px] md:top-[73px] z-40 bg-void/95 backdrop-blur-sm border-b border-line overflow-x-auto whitespace-nowrap py-3 mb-8 scrollbar-hide">
          <div className="flex gap-2.5">
            <a href="#visao-geral" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Visão Geral</a>
            {anime.characters && anime.characters.length > 0 && <a href="#personagens" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Personagens</a>}
            <a href="#onde-assistir" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Onde Assistir</a>
            <a href="#estatisticas" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Estatísticas</a>
            {anime.relations?.length > 0 && <a href="#relacionados" className="select-none text-[13px] font-bold text-muted hover:text-text hover:border-holo-3 px-3.5 py-1.5 rounded-full border border-line transition-colors">Relacionados</a>}
          </div>
        </div>

        {minhaEntrada?.status === 'Em Dia' && (anime.status === 'Finished Airing' || anime.status === 'FINISHED') && (
          <div className="bg-gradient-to-r from-holo-1/20 to-holo-2/20 border border-holo-2/40 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg mb-8 backdrop-blur-md">
            <div className="text-center md:text-left">
              <h3 className="font-anton uppercase text-holo-1 text-xl mb-1">Anime Finalizado!</h3>
              <p className="font-bold text-sm text-text">A AniList detectou que esta obra acabou. Deseja mover da sua lista de "Em Dia" para "Completo"?</p>
            </div>
            <button
              onClick={() => handleAtualizarEntradaRapida('Completo')}
              disabled={salvandoStatus}
              className="select-none bg-gradient-to-r from-holo-1 to-holo-2 text-void px-6 py-3 rounded-full font-extrabold text-sm shrink-0 transition-transform cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {salvandoStatus ? 'Atualizando...' : 'Marcar como Completo ✓'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10" id="visao-geral">
          <div className="space-y-10 min-w-0">

            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                <span className="font-mono text-[11px] text-holo-3">01</span> Sinopse
              </h2>
              <div className="text-muted text-[14.5px] leading-[1.7] bg-panel border border-line rounded-2xl p-6">
                {anime.synopsis ? (
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
                    {anime.synopsis.replace(/&#34;/g, '"').replace(/&#39;/g, "'")}
                  </ReactMarkdown>
                ) : ('Sinopse não disponível nesta base de dados.')}
              </div>
            </section>

            {anime.characters && anime.characters.length > 0 && (
              <section id="personagens">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">02</span> Personagens
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {/* A chave cai para o nome quando o id é 0.
                      Personagem vindo da AniList tem id próprio, mas o elenco curado no
                      Painel é gravado como {name, image, role} — sem id — e o Go desserializa
                      isso em Character{ID: 0}. Resultado: TODO o elenco curado chegava aqui
                      com key={0}, e o React reaproveitava o componente errado ao atualizar. */}
                  {anime.characters.map(char => (
                    <div key={char.id || char.name} className="flex-none w-[110px] sm:w-[130px] snap-start group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-panel-2 border border-line">
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="font-bold text-[12px] md:text-[13px] leading-tight truncate text-text group-hover:text-holo-3 transition-colors">{char.name}</div>
                      <div className="font-mono text-[9px] text-muted uppercase tracking-wider truncate mt-0.5">{char.role}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(anime.episodes > 0 || (anime.streamingEpisodes?.length ?? 0) > 0) && (
              <EpisodeGrid
                malId={anime.mal_id}
                totalEpisodes={anime.episodes}
                streamingEpisodes={anime.streamingEpisodes}
                initialWatched={episodiosAssistidos}
                isLoggedIn={isLoggedIn}
                nextAiringEpisode={anime.nextAiringEpisode}
                startDate={anime.startDate}
                firstAiredAt={anime.first_aired_at}
              />
            )}

            {anime.streaming?.length > 0 && (
              <section id="onde-assistir">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">03</span> Onde Assistir Oficial
                </h2>
                <div className="flex flex-wrap gap-3">
                  {anime.streaming.map(st => (
                    <a key={`${st.name}-${st.url}`} href={st.url} target="_blank" rel="noreferrer" className="select-none flex items-center gap-2 bg-panel border border-line rounded-xl px-5 py-3 text-[13px] font-bold hover:border-holo-1 hover:text-holo-1 transition-colors">
                      <PlayCircle size={16} />
                      {st.name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {anime.relations?.length > 0 && (
              <section id="relacionados">
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">04</span> Títulos Relacionados
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {anime.relations
                    .filter(rel => ['PREQUEL', 'SEQUEL', 'SPIN_OFF', 'ADAPTATION', 'SIDE_STORY', 'PARENT'].includes(rel.relation))
                    .map((rel, i) => {
                      const relationAnime = rel.entry[0]
                      if (!relationAnime) return null

                      // Sem mal_id não existe página de destino: o card sai igual, só não vira
                      // link. A informação "existe uma continuação" continua verdadeira e útil,
                      // e mandar para /anime/0 mostrava um erro de catálogo ao usuário.
                      const classeCartao = 'flex-none w-[160px] md:w-[180px] group snap-start'

                      const conteudo = (
                        <>
                          <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-panel-2 border border-line">
                            {relationAnime.image ? (
                              <img src={relationAnime.image} alt={relationAnime.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-2 text-xs">Sem foto</div>
                            )}
                            <div className="absolute top-2 left-2 bg-void/80 backdrop-blur-sm border border-line/50 font-mono text-[9px] text-holo-3 uppercase px-2 py-0.5 rounded shadow-lg">
                              {traduzirRelacao(rel.relation)}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-transparent to-transparent opacity-60"></div>
                          </div>

                          <div className="font-bold text-[13px] md:text-[14px] leading-tight text-text group-hover:text-holo-3 transition-colors line-clamp-2">
                            {relationAnime.name}
                          </div>
                        </>
                      )

                      return relationAnime.mal_id != null ? (
                        <Link key={i} to={`/anime/${relationAnime.mal_id}`} className={`${classeCartao} cursor-pointer`}>
                          {conteudo}
                        </Link>
                      ) : (
                        <div key={i} className={classeCartao}>
                          {conteudo}
                        </div>
                      )
                    })}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-10 min-w-0" id="estatisticas">

            <section>
              <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                <span className="font-mono text-[11px] text-holo-3">MEU DECK</span>
              </h2>
              {minhaEntrada ? (
                <div className="bg-gradient-to-br from-panel to-panel-2 border border-holo-3/30 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs font-bold text-muted uppercase mb-1 select-none">Status Atual</div>
                  <div className="font-anton text-2xl text-text mb-4 tracking-wide flex items-center gap-2">
                    {minhaEntrada.status}
                  </div>

                  {minhaEntrada.anotacao && (
                    <div className="mb-4 p-3 bg-void/50 border border-line rounded-lg">
                      <p className="font-mono text-[9px] text-muted-2 uppercase mb-1">Sua Anotação:</p>
                      <p className="text-[13px] text-muted italic break-words leading-relaxed">"{minhaEntrada.anotacao}"</p>
                    </div>
                  )}

                  <button onClick={() => setIsModalOpen(true)} className="select-none block text-center w-full py-2.5 rounded-xl border border-line text-sm font-bold bg-panel-2 hover:bg-holo-3/20 hover:text-holo-3 hover:border-holo-3 transition-colors cursor-pointer">
                    Editar Avaliação
                  </button>
                </div>
              ) : (
                <div className="bg-panel border border-dashed border-line rounded-2xl p-6 text-center">
                  <Bookmark size={24} className="mx-auto mb-3 text-muted-2" />
                  <p className="text-sm font-bold text-text mb-4">Ainda não está no seu Deck.</p>
                  <button onClick={() => setIsModalOpen(true)} className="select-none bg-gradient-to-r from-holo-1 to-holo-3 text-void w-full py-2.5 rounded-xl font-extrabold text-sm hover:opacity-90 transition-opacity cursor-pointer">
                    + Adicionar ao Deck
                  </button>
                </div>
              )}
            </section>

            {stats && stats.scores && (
              <section>
                <h2 className="font-anton text-base uppercase mb-4 flex items-center gap-2 select-none">
                  <span className="font-mono text-[11px] text-holo-3">ESTATÍSTICAS</span> Comunidade
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-panel border border-line rounded-xl p-4">
                    <div className="font-mono text-[9px] text-green mb-1 font-bold">COMPLETARAM</div>
                    <div className="font-anton text-xl">{(completedStatus / totalStatus * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-panel border border-line rounded-xl p-4">
                    <div className="font-mono text-[9px] text-coral mb-1 font-bold">DROPARAM</div>
                    <div className="font-anton text-xl">{(droppedStatus / totalStatus * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="bg-panel border border-line rounded-2xl p-5">
                  <div className="flex items-end gap-1.5 h-[120px] mb-2">
                    {stats.scores.slice().reverse().map(s => {
                      const heightPct = maxPercentage > 0 ? (s.percentage / maxPercentage) * 100 : 0
                      const isUserScore = notaDisplay !== 'N/A' && Math.round(Number(notaDisplay)) === s.score

                      return (
                        <div key={s.score} className="flex-1 flex flex-col justify-end h-full group relative">
                          <motion.div
                            initial={{ height: 0 }}
                            whileInView={{ height: `${heightPct}%` }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`rounded-t-sm w-full transition-colors relative ${isUserScore ? 'bg-holo-3 border border-holo-3/50' : 'bg-gradient-to-t from-holo-2/50 to-holo-2 opacity-80 group-hover:opacity-100'}`}
                          >
                            {isUserScore && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-holo-3 text-void text-[8px] font-black px-1 rounded">VOCÊ</div>
                            )}
                          </motion.div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-muted-2 px-1 select-none">
                    <span>10</span><span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-line">
                    <b className="font-anton text-lg text-text block leading-none mb-1 select-none">
                      {stats.scores.reduce((acc, curr) => acc + curr.votes, 0).toLocaleString()}
                    </b>
                    <span className="font-mono text-[10.5px] text-muted tracking-wider select-none">AVALIAÇÕES</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <EditarEntradaModal
        entrada={isModalOpen ? (minhaEntrada || novaEntrada) : null}
        onFechar={() => setIsModalOpen(false)}
        onSalvar={(atualizada) => {
          setMinhaEntrada(atualizada)
          setIsModalOpen(false)
        }}
        onExcluir={() => {
          setMinhaEntrada(null)
          showToast('Removido do Deck.', 'success')
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}