// client/src/pages/Inicio.tsx
// A home de quem está logado: responde "o que eu faço agora" antes de mostrar a coleção.
// Tudo sai de rotas que o app já usa (deck, progresso, trilhas, estatísticas, ranking em
// cache); a única busca é só na curadoria, sem chamada à AniList.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Compass, Play, Sparkles, Trophy } from 'lucide-react'
import { getCategoryTheme } from '../lib/filters'
import VitrineDestaques from '../components/VitrineDestaques'
import { useSessao } from '../contexts/SessaoContext'
import { chaveDoUsuario, guardarNaMemoria, lerDaMemoria } from '../lib/cacheDeTela'
import { gradienteDoCard } from '../lib/deckHelpers'
import { miniatura } from '../lib/miniatura'
import {
  continuarAssistindo, estreiasDeHoje,
  type AnimeResumido, type EntradaDoDeck, type ProgressoDoAnime,
} from '../lib/inicio'
import { encontrarLacuna, type AfinidadeComNota } from '../lib/lacuna'
import type { AnimeDaApi } from '../types/anime'

interface Cartaz {
  mal_id: number
  titulo: string
  imagem: string
  legenda?: string
}

interface TrilhaDaHome {
  id: string
  nome: string
  subtitulo: string
  nota: string
  animes: { mal_id: number; titulo: string; image_url: string }[]
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
  lacuna: { rotulo: string; nota: number; vistos: number; mediaPessoal: number; sugestoes: Cartaz[] } | null
}

const VAZIO: DadosDaInicio = { entradas: [], animes: {}, progresso: [], trilhas: [], ranking: [], lacuna: null }

const lerJson = async <T,>(res: Response, padrao: T): Promise<T> => (res.ok ? ((await res.json()) as T) : padrao)

const horaLocal = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function Secao({ titulo, icone, link, children }: { titulo: string; icone: ReactNode; link?: { para: string; texto: string }; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 select-none">
        <h2 className="font-anton text-[17px] uppercase m-0 flex items-center gap-2">{icone}{titulo}</h2>
        {link && (
          <Link to={link.para} className="font-mono text-[10px] text-muted-2 uppercase tracking-widest hover:text-holo-3 transition-colors">
            {link.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Trilho({ cartazes }: { cartazes: Cartaz[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
      {cartazes.map((c, i) => (
        <Link key={c.mal_id} to={`/anime/${c.mal_id}`} className="group shrink-0 w-[144px] sm:w-[164px] lg:w-[184px] snap-start">
          <div className={`relative aspect-[2/3] rounded-[14px] overflow-hidden border border-line bg-panel ${gradienteDoCard(i)} transition-transform group-hover:-translate-y-1`}>
            {c.imagem && (
              <img
                src={miniatura(c.imagem)}
                alt={c.titulo}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          <h3 className="mt-2.5 text-[12.5px] font-bold leading-tight line-clamp-2 text-text group-hover:text-holo-3 transition-colors">{c.titulo}</h3>
          {c.legenda && <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-2">{c.legenda}</p>}
        </Link>
      ))}
    </div>
  )
}

export default function Inicio() {
  const { session } = useSessao()
  const chave = chaveDoUsuario(session?.user.id, 'inicio')
  const [emMemoria] = useState(() => lerDaMemoria<DadosDaInicio>(chave))
  const [dados, setDados] = useState<DadosDaInicio>(emMemoria ?? VAZIO)
  const [carregando, setCarregando] = useState(!emMemoria)
  const [agora] = useState(() => new Date())

  useEffect(() => {
    if (!session) return
    let ativo = true
    const auth = { headers: { Authorization: `Bearer ${session.access_token}` } }
    const chaveStats = chaveDoUsuario(session.user.id, 'estatisticas')

    const carregar = async () => {
      try {
        const [entradas, progresso, trilhas, rankingResp, stats] = await Promise.all([
          fetch('/api/entries', auth).then(r => lerJson<EntradaDoDeck[]>(r, [])),
          fetch('/api/entries/progresso', auth).then(r => lerJson<ProgressoDoAnime[]>(r, [])),
          fetch('/api/trilhas').then(r => lerJson<TrilhaDaHome[]>(r, [])).catch(() => []),
          fetch('/api/ranking?page=1&perPage=6').then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] })),
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
              episodes: m.episodes || 0,
              genres: m.genres?.slice(0, 3).map(g => g.name),
              streaming: m.streaming ?? undefined,
              nextAiringEpisode: m.nextAiringEpisode,
            }
          }
        }

        let lacuna: DadosDaInicio['lacuna'] = null
        const achada = encontrarLacuna(stats.genres ?? [], stats.overview?.[0]?.nota_media ?? 0)
        if (achada) {
          const noDeck = new Set(entradas.map(e => e.mal_id))
          const params = new URLSearchParams({ rotulo: achada.rotulo, so_curadoria: '1', perPage: '30' })
          const busca = await fetch(`/api/search?${params}`).then(r => lerJson<{ data?: AnimeDaApi[] }>(r, {})).catch(() => ({ data: [] }))
          const sugestoes = (busca.data ?? [])
            .filter(a => !noDeck.has(a.mal_id))
            .slice(0, 8)
            .map(a => ({ mal_id: a.mal_id, titulo: a.title, imagem: a.images?.jpg?.image_url || '' }))
          if (sugestoes.length > 0) lacuna = { ...achada, sugestoes }
        }

        const ranking = (rankingResp.data ?? []).map((a, i) => ({
          mal_id: a.mal_id,
          titulo: a.title,
          imagem: a.images?.jpg?.image_url || '',
          legenda: `#${a.current_rank || i + 1}`,
        }))

        const novos = { entradas, animes, progresso, trilhas, ranking, lacuna }
        guardarNaMemoria(chave, novos)
        if (ativo) setDados(novos)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => { ativo = false }
  }, [session, chave])

  const nome = (session?.user.user_metadata?.display_name as string | undefined) || ''
  const hoje = estreiasDeHoje(dados.entradas, dados.animes, agora)
  const continuar = continuarAssistindo(dados.progresso, dados.entradas, dados.animes)
  const deckVazio = !carregando && dados.entradas.length === 0
  const dataDeHoje = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-24">
      <header className="mb-8 select-none">
        <p className="font-mono text-[10px] text-muted-2 uppercase tracking-widest mb-1">{dataDeHoje}</p>
        <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase m-0">{nome ? `Olá, ${nome}` : 'Olá'}</h1>
        <Link to="/meu-gosto" className="inline-block mt-2 text-sm font-bold text-holo-2 hover:text-holo-3 transition-colors">
          Ver o meu gosto →
        </Link>
      </header>

      {carregando && (
        <div className="flex gap-4 overflow-hidden mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[144px] sm:w-[164px] lg:w-[184px] aspect-[2/3] rounded-[14px] shimmer" />
          ))}
        </div>
      )}

      {deckVazio && (
        <section className="mb-10 bg-gradient-to-br from-holo-1/10 to-holo-3/10 border border-holo-3/30 rounded-2xl p-6">
          <h2 className="font-anton text-xl uppercase mb-2">Seu deck está vazio</h2>
          <p className="text-muted text-sm mb-4">Adicione os animes que você assiste para ver aqui o que estreia hoje e onde você parou.</p>
          <Link to="/descobrir" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-bold text-sm">
            <Compass size={16} /> Descobrir animes
          </Link>
        </section>
      )}

      {!carregando && !deckVazio && (
        <Secao titulo="Hoje no seu deck" icone={<CalendarDays size={16} className="text-holo-3" />} link={{ para: '/calendario', texto: 'Agenda' }}>
          {hoje.length === 0 ? (
            <p className="text-muted text-sm">Nada do seu deck vai ao ar hoje.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {hoje.map(e => (
                <li key={e.anime.mal_id}>
                  <div className="flex items-center gap-3 bg-panel border border-line rounded-xl p-3 hover:border-holo-3 transition-colors">
                    {e.anime.image_url
                      ? <img src={miniatura(e.anime.image_url)} alt="" className="w-16 h-20 rounded-lg object-cover shrink-0" />
                      : <div className="w-16 h-20 rounded-lg bg-panel-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <Link to={`/anime/${e.anime.mal_id}`} className="font-bold text-sm line-clamp-2 hover:text-holo-3 transition-colors">{e.anime.title}</Link>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {e.anime.genres?.map(g => (
                          <span key={g} className={`px-1.5 py-0.5 rounded border font-mono text-[8px] uppercase ${getCategoryTheme(g)}`}>{g}</span>
                        ))}
                      </div>
                      <p className="font-mono text-[11px] text-muted-2 uppercase tracking-wider mt-1">Episódio {e.episodio}</p>
                    </div>
                    <span className="font-anton text-lg text-holo-3 tabular-nums">{horaLocal(e.quando)}</span>
                    {e.anime.streaming?.[0] && (
                      <a href={e.anime.streaming[0].url} target="_blank" rel="noreferrer" aria-label={`Assistir ${e.anime.title}`} className="shrink-0 w-8 h-8 rounded-full bg-panel-2 border border-line text-muted hover:text-holo-3 hover:border-holo-3 flex items-center justify-center transition-colors">
                        <Play size={13} fill="currentColor" className="ml-0.5" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      )}

      {continuar.length > 0 && (
        <Secao titulo="Continue de onde parou" icone={<Play size={16} className="text-holo-1" />} link={{ para: '/deck', texto: 'Meu deck' }}>
          <Trilho cartazes={continuar.map(c => ({
            mal_id: c.anime.mal_id, titulo: c.anime.title, imagem: c.anime.image_url, legenda: `Episódio ${c.proximoEpisodio}`,
          }))} />
        </Secao>
      )}

      {dados.lacuna && (
        <Secao titulo="O buraco no seu gosto" icone={<Sparkles size={16} className="text-gold" />} link={{ para: `/descobrir?rotulo=${encodeURIComponent(dados.lacuna.rotulo)}`, texto: 'Ver tudo' }}>
          <p className="text-sm text-muted mb-4 max-w-[600px]">
            Você dá em média <strong className="text-text">{dados.lacuna.nota.toFixed(1)}</strong> para{' '}
            <strong className="text-text">{dados.lacuna.rotulo}</strong>, acima da sua média de {dados.lacuna.mediaPessoal.toFixed(1)}, e só viu{' '}
            {dados.lacuna.vistos}. Alguns do catálogo que ainda não estão no seu deck:
          </p>
          <Trilho cartazes={dados.lacuna.sugestoes} />
        </Secao>
      )}

      {dados.trilhas.map(t => (
        <Secao key={t.id} titulo={t.nome} icone={<Compass size={16} className="text-holo-2" />}>
          {t.subtitulo && <p className="text-sm text-muted -mt-2 mb-2">{t.subtitulo}</p>}
          {t.nota && <p className="text-[13px] text-text/80 italic border-l-2 border-holo-2/50 pl-3 mb-4 max-w-[600px]">{t.nota}</p>}
          <Trilho cartazes={t.animes.map(a => ({ mal_id: a.mal_id, titulo: a.titulo, imagem: a.image_url }))} />
        </Secao>
      ))}

      <VitrineDestaques />

      {dados.ranking.length > 0 && (
        <Secao titulo="Topo do ranking" icone={<Trophy size={16} className="text-gold" />} link={{ para: '/rankings', texto: 'Ranking completo' }}>
          <Trilho cartazes={dados.ranking} />
        </Secao>
      )}
    </div>
  )
}
