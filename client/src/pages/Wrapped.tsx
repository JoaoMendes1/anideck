// client/src/pages/Wrapped.tsx
// AniDeck Wrapped (Fase 17.5a, #190): retrospectiva anual interativa estilo stories
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { obterMeuWrapped, obterWrappedPublico, type AniDeckWrapped } from '../lib/wrapped'
import { useToast } from '../contexts/ToastContext'
import { 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Sparkles, 
  Film, 
  Clock, 
  Calendar, 
  Star, 
  MessageSquare, 
  Heart, 
  Award, 
  ArrowLeft 
} from 'lucide-react'

export default function Wrapped() {
  const { ano: anoParam, handle: handleParam } = useParams<{ ano: string; handle?: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const ano = Number(anoParam) || new Date().getFullYear()
  const [dados, setDados] = useState<AniDeckWrapped | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [slideAtual, setSlideAtual] = useState(0)

  const TOTAL_SLIDES = 6

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        let resultado: AniDeckWrapped | null = null
        if (handleParam) {
          resultado = await obterWrappedPublico(handleParam, ano)
        } else {
          resultado = await obterMeuWrapped(ano)
        }

        if (!resultado) {
          setErro(handleParam ? 'Retrospectiva não encontrada ou perfil privado.' : 'Faça login para ver sua retrospectiva anual.')
        } else {
          setDados(resultado)
        }
      } catch {
        setErro('Não foi possível carregar o Wrapped no momento.')
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [ano, handleParam])

  // Navegação pelos slides
  const proximo = () => {
    setSlideAtual(s => Math.min(TOTAL_SLIDES - 1, s + 1))
  }

  const anterior = () => {
    setSlideAtual(s => Math.max(0, s - 1))
  }

  // Teclado
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        proximo()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        anterior()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const copiarLink = () => {
    const url = handleParam
      ? window.location.href
      : dados?.usuario?.handle
        ? `${window.location.origin}/u/${dados.usuario.handle}/wrapped/${ano}`
        : window.location.href

    navigator.clipboard.writeText(url)
    showToast('Link da retrospectiva copiado!')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-void text-text flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-holo-2/20 border-t-holo-2 animate-spin mb-4" />
        <p className="font-mono text-sm text-muted animate-pulse">Preparando seu AniDeck Wrapped {ano}…</p>
      </div>
    )
  }

  if (erro || !dados) {
    return (
      <div className="min-h-screen bg-void text-text flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md p-6 rounded-2xl bg-panel border border-coral/30">
          <h1 className="font-anton text-2xl text-coral mb-2">WRAPPED INDISPONÍVEL</h1>
          <p className="text-sm text-muted mb-6">{erro || 'Dados indisponíveis para este ano.'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panel-2 border border-line text-sm font-bold text-text hover:border-holo-3 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-void text-text flex flex-col items-center justify-center p-0 sm:p-4 select-none overflow-hidden relative">
      {/* Botão flutuante Voltar */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 p-2.5 rounded-full bg-panel/80 backdrop-blur border border-line text-muted hover:text-text transition-colors cursor-pointer"
        aria-label="Voltar"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Container Story */}
      <div className="w-full h-[100dvh] sm:h-[820px] sm:max-w-[420px] bg-panel-2 sm:rounded-3xl border sm:border-line/70 flex flex-col shadow-2xl relative overflow-hidden">
        {/* Barras de Progresso dos Stories */}
        <div className="absolute top-3 inset-x-3 z-40 flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  i < slideAtual
                    ? 'w-full bg-holo-3'
                    : i === slideAtual
                      ? 'w-full bg-gradient-to-r from-holo-1 to-holo-3 animate-pulse'
                      : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Áreas de clique para avançar/voltar na tela */}
        <div className="absolute inset-0 z-30 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={anterior} title="Voltar" />
          <div className="w-2/3 h-full cursor-pointer" onClick={proximo} title="Avançar" />
        </div>

        {/* CONTEÚDO DOS SLIDES */}
        <div className="flex-1 p-6 pt-12 flex flex-col justify-between relative z-10">
          {/* SLIDE 0: CAPA */}
          {slideAtual === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center text-center animate-fadeIn">
              <div className="px-3.5 py-1 rounded-full bg-holo-1/15 border border-holo-1/40 text-holo-1 text-xs font-mono font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Sparkles size={13} /> Retrospectiva Anual
              </div>
              <h1 className="font-anton text-5xl sm:text-6xl uppercase tracking-wide leading-tight bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 bg-clip-text text-transparent">
                ANIDECK WRAPPED
              </h1>
              <div className="font-mono text-3xl font-black text-gold mt-1 tracking-widest">
                {dados.ano}
              </div>
              <p className="text-sm text-muted max-w-[260px] mt-6 leading-relaxed">
                Olá, <strong className="text-text">{dados.usuario?.nome || 'Membro'}</strong> (@{dados.usuario?.handle}). Confira tudo o que você marcou e viveu este ano.
              </p>
              <div className="mt-8 text-xs font-mono text-holo-3/80 animate-bounce">
                Toque para começar →
              </div>
            </div>
          )}

          {/* SLIDE 1: TEMPO E MARATONA */}
          {slideAtual === 1 && (
            <div className="flex-1 flex flex-col justify-center animate-fadeIn">
              <span className="font-mono text-xs uppercase tracking-widest text-holo-3 mb-2 flex items-center gap-1.5">
                <Clock size={14} /> Dedicação às Telas
              </span>
              <h2 className="font-anton text-3xl uppercase leading-none mb-6">
                Quantas horas você viajou por outros mundos?
              </h2>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-panel border border-line shadow-lg">
                  <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase">
                    <Film size={15} className="text-holo-2" /> Episódios marcados
                  </div>
                  <div className="font-anton text-5xl text-holo-2 mt-1">
                    {dados.total_episodios}
                  </div>
                  <p className="text-xs text-muted-2 mt-1">episódios devorados no ano</p>
                </div>

                <div className="p-5 rounded-2xl bg-panel border border-line shadow-lg">
                  <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase">
                    <Clock size={15} className="text-holo-3" /> Tempo de tela estimado
                  </div>
                  <div className="font-anton text-4xl text-holo-3 mt-1">
                    ~{dados.horas_estimadas}h
                  </div>
                  <p className="text-xs text-muted-2 mt-1">de histórias acompanhadas</p>
                </div>

                <div className="p-4 rounded-xl bg-panel/70 border border-line flex items-center justify-between">
                  <span className="text-xs text-muted font-mono flex items-center gap-1.5">
                    <Calendar size={13} /> Dias ativos no ano
                  </span>
                  <span className="font-mono text-sm font-bold text-text">
                    {dados.dias_ativos} dias
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: TOP 5 ANIMES */}
          {slideAtual === 2 && (
            <div className="flex-1 flex flex-col justify-center animate-fadeIn">
              <span className="font-mono text-xs uppercase tracking-widest text-gold mb-2 flex items-center gap-1.5">
                <Star size={14} /> Obras Marcantes
              </span>
              <h2 className="font-anton text-3xl uppercase leading-none mb-5">
                Seus Animes Mais Assistidos em {dados.ano}
              </h2>

              {dados.top_animes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-panel border border-line text-sm text-muted">
                  Nenhum episódio registrado durante este ano.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dados.top_animes.map((anime, idx) => (
                    <div
                      key={anime.mal_id}
                      className="p-3 rounded-xl bg-panel border border-line flex items-center gap-3 shadow-md"
                    >
                      <span className={`font-anton text-xl w-6 text-center ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-muted'}`}>
                        #{idx + 1}
                      </span>
                      {anime.cover_url ? (
                        <img
                          src={anime.cover_url}
                          alt={anime.title}
                          className="w-10 h-14 object-cover rounded-md shrink-0 bg-void"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded-md bg-void flex items-center justify-center shrink-0 text-muted">
                          🎬
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <strong className="text-xs font-bold text-text truncate block">
                          {anime.title}
                        </strong>
                        <span className="text-[11px] font-mono text-muted">
                          {anime.total_eps} episódios no ano
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SLIDE 3: GÊNEROS FAVORITOS */}
          {slideAtual === 3 && (
            <div className="flex-1 flex flex-col justify-center animate-fadeIn">
              <span className="font-mono text-xs uppercase tracking-widest text-holo-1 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} /> Seu Gosto Pessoal
              </span>
              <h2 className="font-anton text-3xl uppercase leading-none mb-6">
                Os Gêneros que Dominaram o seu Ano
              </h2>

              {dados.top_generos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-panel border border-line text-sm text-muted">
                  Sem dados suficientes de gêneros.
                </div>
              ) : (
                <div className="space-y-3">
                  {dados.top_generos.map((g, idx) => {
                    const maior = dados.top_generos[0]?.total || 1
                    const pct = Math.round((g.total / maior) * 100)
                    return (
                      <div key={g.genero} className="p-3.5 rounded-xl bg-panel border border-line">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="flex items-center gap-1.5 text-text">
                            <span className="text-holo-1 font-mono text-xs font-extrabold">#{idx + 1}</span> {g.genero}
                          </span>
                          <span className="font-mono text-muted-2 text-[11px]">{g.total} eps</span>
                        </div>
                        <div className="h-2 rounded-full bg-void overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-holo-1 to-holo-2 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {dados.nota_media > 0 && (
                <div className="mt-5 p-3 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-between text-xs">
                  <span className="text-gold font-bold">Nota média atribuída às obras:</span>
                  <span className="font-anton text-lg text-gold">{dados.nota_media} ★</span>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 4: GUILDA E COMUNIDADE */}
          {slideAtual === 4 && (
            <div className="flex-1 flex flex-col justify-center animate-fadeIn">
              <span className="font-mono text-xs uppercase tracking-widest text-green mb-2 flex items-center gap-1.5">
                <Award size={14} /> Presença na Comunidade
              </span>
              <h2 className="font-anton text-3xl uppercase leading-none mb-6">
                Sua Marca na Comunidade AniDeck
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-panel border border-line text-center">
                  <MessageSquare size={20} className="mx-auto text-holo-3 mb-1" />
                  <div className="font-anton text-3xl text-text mt-1">{dados.total_comentarios}</div>
                  <span className="text-[11px] text-muted uppercase font-mono">Comentários</span>
                </div>

                <div className="p-4 rounded-2xl bg-panel border border-line text-center">
                  <Heart size={20} className="mx-auto text-rose-400 mb-1" />
                  <div className="font-anton text-3xl text-text mt-1">{dados.total_reacoes}</div>
                  <span className="text-[11px] text-muted uppercase font-mono">Reações</span>
                </div>

                <div className="p-4 rounded-2xl bg-panel border border-line text-center col-span-2">
                  <Award size={22} className="mx-auto text-gold mb-1" />
                  <div className="font-anton text-3xl text-gold mt-1">{dados.total_cartas}</div>
                  <span className="text-[11px] text-muted uppercase font-mono">Cartas Colecionadas em {dados.ano}</span>
                </div>
              </div>

              {dados.reacao_favorita && (
                <div className="mt-5 p-3.5 rounded-xl bg-panel-2 border border-line text-center">
                  <span className="text-xs text-muted block mb-1">Sua reação mais usada:</span>
                  <span className="text-3xl">{dados.reacao_favorita}</span>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 5: CARD FINAL COMPARTILHÁVEL */}
          {slideAtual === 5 && (
            <div className="flex-1 flex flex-col justify-between animate-fadeIn py-2">
              <div className="p-5 rounded-2xl bg-gradient-to-b from-panel via-panel-2 to-panel border border-holo-2/50 shadow-[0_0_30px_rgba(123,92,255,0.15)] relative">
                <div className="flex items-center justify-between border-b border-line/60 pb-3 mb-3">
                  <div>
                    <h3 className="font-anton text-xl tracking-wider text-text uppercase m-0">ANIDECK WRAPPED</h3>
                    <span className="font-mono text-xs text-gold font-bold">{dados.ano}</span>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-holo-2/20 border border-holo-2/40 text-holo-3 font-bold">
                    @{dados.usuario?.handle}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-center my-3">
                  <div className="p-2.5 rounded-xl bg-void/50 border border-line/60">
                    <span className="text-[10px] text-muted font-mono uppercase block">Episódios</span>
                    <strong className="font-anton text-2xl text-holo-2">{dados.total_episodios}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-void/50 border border-line/60">
                    <span className="text-[10px] text-muted font-mono uppercase block">Horas</span>
                    <strong className="font-anton text-2xl text-holo-3">~{dados.horas_estimadas}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-void/50 border border-line/60">
                    <span className="text-[10px] text-muted font-mono uppercase block">Dias Ativos</span>
                    <strong className="font-anton text-xl text-text">{dados.dias_ativos}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-void/50 border border-line/60">
                    <span className="text-[10px] text-muted font-mono uppercase block">Cartas</span>
                    <strong className="font-anton text-xl text-gold">{dados.total_cartas}</strong>
                  </div>
                </div>

                {dados.top_animes[0] && (
                  <div className="text-xs text-muted-2 mt-2 pt-2 border-t border-line/50 text-center">
                    Top 1 do ano: <strong className="text-text">{dados.top_animes[0].title}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-4 relative z-40">
                <button
                  type="button"
                  onClick={copiarLink}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-holo-1 to-holo-2 text-void text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:opacity-90 transition-opacity"
                >
                  <Share2 size={15} /> Compartilhar Retrospectiva
                </button>

                <Link
                  to="/"
                  className="w-full py-2.5 rounded-xl bg-panel-2 border border-line hover:border-holo-3 text-text text-xs font-bold text-center block transition-colors"
                >
                  Voltar ao AniDeck
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Navegação */}
        <div className="p-3 bg-panel border-t border-line flex items-center justify-between text-xs text-muted relative z-40">
          <button
            type="button"
            onClick={anterior}
            disabled={slideAtual === 0}
            className="p-1.5 rounded-lg hover:bg-panel-2 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono text-[11px] font-bold">
            {slideAtual + 1} / {TOTAL_SLIDES}
          </span>
          <button
            type="button"
            onClick={proximo}
            disabled={slideAtual === TOTAL_SLIDES - 1}
            className="p-1.5 rounded-lg hover:bg-panel-2 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
