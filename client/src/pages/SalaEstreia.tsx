// client/src/pages/SalaEstreia.tsx
// Sala de Estreia — Chat ao vivo nas 3 horas depois do lançamento (Fase 17, #183 e #184)
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Radio,
  Clock,
  Send,
  Heart,
  Flag,
  ChevronLeft,
  Flame,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import TagCla from '../components/TagCla'
import {
  obterSala,
  listarMensagensSala,
  enviarMensagemSala,
  curtirMensagemSala,
  denunciarMensagemSala,
  formatarContagemRegressiva,
  type SalaEstreia as SalaEstreiaTipo,
  type SalaMensagem,
} from '../lib/salasEstreia'
import { supabase } from '../lib/supabase'

export default function SalaEstreia() {
  const { id } = useParams<{ id: string }>()
  const { session } = useSessao()

  const [sala, setSala] = useState<SalaEstreiaTipo | null>(null)
  const [mensagens, setMensagens] = useState<SalaMensagem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [conteudo, setConteudo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [segundosRestantes, setSegundosRestantes] = useState(0)

  // Modal de denúncia
  const [msgDenunciar, setMsgDenunciar] = useState<SalaMensagem | null>(null)
  const [motivoDenuncia, setMotivoDenuncia] = useState('')
  const [denunciando, setDenunciando] = useState(false)
  const [avisoFeedback, setAvisoFeedback] = useState<string | null>(null)

  const fimMensagensRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  // 1. Carrega sala inicial
  useEffect(() => {
    if (!id) return
    let ativo = true

    async function carregar() {
      try {
        setCarregando(true)
        const [dadosSala, listaMsgs] = await Promise.all([
          obterSala(id!),
          listarMensagensSala(id!),
        ])
        if (!ativo) return

        if (!dadosSala) {
          setErro('Sala de estreia não encontrada.')
          return
        }

        setSala(dadosSala)
        setSegundosRestantes(dadosSala.segundos_restantes)
        setMensagens(listaMsgs)
      } catch {
        if (ativo) setErro('Erro ao carregar sala de estreia.')
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [id])

  // 2. Temporizador da contagem regressiva
  useEffect(() => {
    if (segundosRestantes <= 0) return

    const timer = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Atualiza estado da sala quando encerra
          setSala(s => (s ? { ...s, ao_vivo: false, encerrada: true, segundos_restantes: 0 } : null))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [segundosRestantes])

  // 3. Cooldown de envio de 3s
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // 4. Inscrição no Supabase Realtime + Polling fallback
  useEffect(() => {
    if (!id) return

    // Realtime broadcast/changes
    const canal = supabase
      .channel(`sala_realtime:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sala_mensagens', filter: `sala_id=eq.${id}` },
        async () => {
          // Recarrega mensagens para obter perfis e molduras hidratados
          const atualizadas = await listarMensagensSala(id)
          setMensagens(atualizadas)
        }
      )
      .subscribe()

    // Polling resiliente a cada 5 segundos
    const pollingTimer = setInterval(async () => {
      if (!sala?.ao_vivo) return
      const atualizadas = await listarMensagensSala(id)
      setMensagens(atualizadas)
    }, 5000)

    return () => {
      supabase.removeChannel(canal)
      clearInterval(pollingTimer)
    }
  }, [id, sala?.ao_vivo])

  // 5. Scroll automático suave ao receber novas mensagens
  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  // Enviar mensagem
  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !conteudo.trim() || enviando || cooldown > 0) return

    const texto = conteudo.trim()
    setEnviando(true)
    try {
      const nova = await enviarMensagemSala(id, texto)
      setMensagens(prev => [...prev, nova])
      setConteudo('')
      setCooldown(3) // 3 segundos de taxa
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
      setAvisoFeedback(msg)
      setTimeout(() => setAvisoFeedback(null), 4000)
    } finally {
      setEnviando(false)
    }
  }

  // Curtir mensagem
  async function handleCurtir(msgId: string) {
    if (!id || !session) {
      setAvisoFeedback('Faça login para curtir mensagens.')
      setTimeout(() => setAvisoFeedback(null), 3000)
      return
    }

    // Atualização otimista
    setMensagens(prev =>
      prev.map(m => {
        if (m.id !== msgId) return m
        const novoCurtido = !m.curtido_por_mim
        const novasCurtidas = novoCurtido ? m.curtidas + 1 : Math.max(0, m.curtidas - 1)
        return {
          ...m,
          curtido_por_mim: novoCurtido,
          curtidas: novasCurtidas,
          destaque: novasCurtidas >= 1,
        }
      })
    )

    try {
      const res = await curtirMensagemSala(id, msgId)
      setMensagens(prev =>
        prev.map(m => (m.id === msgId ? { ...m, curtido_por_mim: res.curtido, curtidas: res.curtidas, destaque: res.destaque } : m))
      )
    } catch {
      // Reverte em caso de falha silenciosa
    }
  }

  // Confirmar denúncia
  async function handleConfirmarDenuncia() {
    if (!id || !msgDenunciar || !motivoDenuncia.trim() || denunciando) return
    setDenunciando(true)
    try {
      await denunciarMensagemSala(id, msgDenunciar.id, motivoDenuncia.trim())
      setMsgDenunciar(null)
      setMotivoDenuncia('')
      setAvisoFeedback('Mensagem denunciada. A moderação irá avaliar.')
      setTimeout(() => setAvisoFeedback(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao denunciar.'
      setAvisoFeedback(msg)
    } finally {
      setDenunciando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-holo-3 border-t-transparent animate-spin mb-3" />
        <p className="text-muted text-sm font-mono">Entrando na Sala de Estreia...</p>
      </div>
    )
  }

  if (erro || !sala) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-2xl mx-auto text-center">
        <div className="p-6 rounded-2xl bg-panel border border-line">
          <AlertTriangle className="text-coral mx-auto mb-3" size={32} />
          <h1 className="font-anton text-xl uppercase mb-2">Sala Indisponível</h1>
          <p className="text-muted text-sm mb-6">{erro || 'A sala de estreia solicitada não existe ou já foi expurgada.'}</p>
          <Link
            to="/descobrir"
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-holo-3/20 border border-holo-3/40 text-holo-3 hover:bg-holo-3/30 transition-colors inline-block"
          >
            Voltar ao Descobrir
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-3 sm:px-4 max-w-4xl mx-auto flex flex-col h-[100dvh]">
      {/* CABEÇALHO DA SALA */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-panel border border-line mb-3 shrink-0 shadow-lg relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-coral/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              to={`/anime/${sala.mal_id}`}
              className="w-8 h-8 rounded-full bg-panel-2 border border-line text-muted hover:text-text flex items-center justify-center transition-colors shrink-0"
              title="Voltar para a página do anime"
            >
              <ChevronLeft size={18} />
            </Link>

            {sala.imagem_anime && (
              <img
                src={sala.imagem_anime}
                alt={sala.titulo_anime}
                className="w-10 h-14 rounded-lg object-cover border border-line shrink-0 hidden sm:block"
              />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-holo-2/15 border border-holo-2/30 text-holo-2">
                  Episódio {sala.episodio}
                </span>
                {sala.ao_vivo ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-coral/20 border border-coral/40 text-coral text-[10px] font-mono font-bold uppercase animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-coral animate-ping" />
                    Ao Vivo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-panel-2 border border-line text-muted text-[10px] font-mono font-bold uppercase">
                    Encerrada
                  </span>
                )}
              </div>
              <h1 className="font-anton text-lg sm:text-xl text-text truncate m-0 mt-0.5">
                {sala.titulo_anime}
              </h1>
            </div>
          </div>

          {/* Temporizador / Status */}
          <div className="flex flex-col items-end shrink-0">
            {sala.ao_vivo ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel-2 border border-coral/30 text-coral">
                <Clock size={14} className="animate-spin text-coral" />
                <div className="text-right">
                  <span className="block text-[9px] font-mono uppercase tracking-wider text-muted">Encerra em</span>
                  <span className="font-mono text-xs sm:text-sm font-bold tracking-tight">
                    {formatarContagemRegressiva(segundosRestantes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-right text-muted text-xs font-mono">
                Sala encerrada
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Spoiler Discreto */}
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between gap-2 text-[11px] text-muted">
          <div className="flex items-center gap-1.5">
            <Radio size={13} className="text-holo-3 shrink-0" />
            <span>Chat de estreia · As mensagens comentam os acontecimentos do episódio em tempo real.</span>
          </div>
          <span className="font-mono text-[10px] text-muted-2 hidden sm:inline">
            Janela de 3h
          </span>
        </div>
      </div>

      {/* FEED DE MENSAGENS */}
      <div
        ref={feedRef}
        className="flex-1 bg-void/60 rounded-2xl border border-line/80 p-3 sm:p-4 overflow-y-auto no-scrollbar flex flex-col gap-2.5 mb-3"
      >
        {mensagens.length === 0 ? (
          <div className="m-auto text-center py-12 px-4 max-w-sm">
            <Radio size={32} className="text-holo-3/40 mx-auto mb-2" />
            <p className="font-bold text-text text-sm mb-1">A sala está aberta!</p>
            <p className="text-xs text-muted leading-relaxed">
              Seja a primeira pessoa a mandar uma mensagem sobre a estreia do episódio {sala.episodio}.
            </p>
          </div>
        ) : (
          mensagens.map(m => (
            <div
              key={m.id}
              className={`p-3 rounded-xl border transition-all ${
                m.destaque
                  ? 'bg-gradient-to-r from-panel-2 to-holo-3/5 border-holo-3/30 shadow-[0_0_12px_rgba(63,224,240,0.06)]'
                  : 'bg-panel/75 border-line/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {/* Avatar com Moldura */}
                  <div className="relative w-6 h-6 rounded-full bg-panel-2 border border-line flex items-center justify-center shrink-0 text-[10px] font-bold text-holo-3">
                    {m.autor_avatar ? (
                      <img src={m.autor_avatar} alt={m.autor_nome} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      m.autor_nome.charAt(0).toUpperCase()
                    )}
                    {m.autor_moldura && (
                      <span className="absolute -top-1.5 -right-1.5 text-[10px]" title="Moldura">
                        {m.autor_moldura}
                      </span>
                    )}
                  </div>

                  <span className="font-bold text-xs text-text truncate max-w-[140px] sm:max-w-[200px]">
                    {m.autor_nome}
                  </span>

                  {m.autor_cla_tag && <TagCla tag={m.autor_cla_tag} />}

                  {m.destaque && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gold/15 border border-gold/30 text-gold text-[9.5px] font-mono font-bold">
                      <Flame size={10} /> Destaque
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted text-[10.5px] font-mono shrink-0">
                  <span>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Texto da Mensagem */}
              <p className="text-sm text-text/95 leading-relaxed m-0 break-words font-sans">
                {m.conteudo}
              </p>

              {/* Barra de Ações da Mensagem */}
              <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-line/40 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleCurtir(m.id)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                    m.curtido_por_mim
                      ? 'bg-coral/20 text-coral border border-coral/30'
                      : 'text-muted hover:text-text hover:bg-panel-2'
                  }`}
                  title={m.curtido_por_mim ? 'Descurtir' : 'Curtir mensagem'}
                >
                  <Heart size={12} className={m.curtido_por_mim ? 'fill-coral' : ''} />
                  <span className="font-mono text-xs">{m.curtidas > 0 ? m.curtidas : ''}</span>
                </button>

                {session && (
                  <button
                    type="button"
                    onClick={() => setMsgDenunciar(m)}
                    className="text-muted hover:text-coral transition-colors p-1 rounded-full cursor-pointer opacity-70 hover:opacity-100"
                    title="Denunciar mensagem para moderação"
                  >
                    <Flag size={11} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={fimMensagensRef} />
      </div>

      {/* AVISO DE FEEDBACK */}
      {avisoFeedback && (
        <div className="mb-2 p-2.5 rounded-xl bg-panel-2 border border-holo-3/40 text-holo-3 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0" />
            <span>{avisoFeedback}</span>
          </div>
          <button type="button" onClick={() => setAvisoFeedback(null)} className="text-muted hover:text-text">
            <X size={14} />
          </button>
        </div>
      )}

      {/* BARRA DE ENVIO */}
      <div className="shrink-0">
        {!session ? (
          <div className="p-3.5 rounded-2xl bg-panel border border-line text-center">
            <p className="text-xs text-muted mb-2">Faça login para interagir e enviar mensagens na sala de estreia.</p>
            <Link
              to="/login"
              className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-holo-1 to-holo-3 text-void hover:opacity-90 transition-opacity inline-block"
            >
              Entrar na Conta
            </Link>
          </div>
        ) : !sala.ao_vivo ? (
          <div className="p-3.5 rounded-2xl bg-panel border border-line text-center text-xs text-muted">
            <span>Esta sala de estreia foi encerrada. Os comentários em destaque foram migrados para a </span>
            <Link to={`/anime/${sala.mal_id}`} className="text-holo-3 font-bold hover:underline">
              conversa do anime
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="flex items-center gap-2 p-1.5 rounded-2xl bg-panel border border-line shadow-lg">
            <input
              type="text"
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              placeholder={`Comente sobre o episódio ${sala.episodio}...`}
              maxLength={280}
              disabled={enviando || cooldown > 0}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none disabled:opacity-60"
            />

            <span className="text-[10px] font-mono text-muted-2 px-1">
              {conteudo.length}/280
            </span>

            <button
              type="submit"
              disabled={!conteudo.trim() || enviando || cooldown > 0}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-holo-1 to-holo-3 text-void flex items-center justify-center font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 shrink-0"
              title={cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar mensagem'}
            >
              {cooldown > 0 ? (
                <span className="text-xs font-mono font-bold text-void">{cooldown}s</span>
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        )}
      </div>

      {/* MODAL DE DENÚNCIA */}
      {msgDenunciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-panel border border-line rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-coral">
                <AlertTriangle size={18} />
                <h2 className="font-anton text-lg uppercase tracking-wide text-text m-0">Denunciar Mensagem</h2>
              </div>
              <button
                type="button"
                onClick={() => setMsgDenunciar(null)}
                className="text-muted hover:text-text p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted mb-2">Mensagem a ser denunciada:</p>
            <div className="p-2.5 rounded-xl bg-panel-2 border border-line text-xs text-text/80 mb-4 line-clamp-3">
              &quot;{msgDenunciar.conteudo}&quot;
            </div>

            <label className="block text-xs font-bold text-text uppercase tracking-wider mb-1.5">
              Motivo da denúncia
            </label>
            <textarea
              value={motivoDenuncia}
              onChange={e => setMotivoDenuncia(e.target.value)}
              placeholder="Ex.: Conteúdo ofensivo, assédio, spam ou spoiler maldoso de episódio futuro..."
              rows={3}
              className="w-full bg-void/70 border border-line rounded-xl p-2.5 text-xs text-text placeholder:text-muted focus:outline-none focus:border-holo-3 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMsgDenunciar(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-muted hover:text-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDenuncia}
                disabled={!motivoDenuncia.trim() || denunciando}
                className="px-4 py-2 rounded-full text-xs font-bold bg-coral text-void hover:opacity-90 disabled:opacity-50"
              >
                {denunciando ? 'Enviando...' : 'Confirmar Denúncia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
