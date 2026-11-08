// client/src/components/comunidade/ConversaDoAnime.tsx
// Conversa por episódio na página da obra: reações de um toque e comentários com escudo
// de spoiler. Quem não marcou o episódio vê só quantas pessoas falaram dele; o conteúdo
// nem sai do banco (RLS do sql/041), então esconder aqui é só a forma, não a proteção.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, MessageCircle, Heart, Flag, Trash2, Ban, ChevronLeft, ChevronRight, Clock, Droplet, Send, Check } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import { useComunidade, avisarComunidadeAtualizada } from '../../hooks/useComunidade'
import SeloEquipe from './SeloEquipe'
import {
  REACOES,
  MOTIVOS_DENUNCIA,
  climaDoEpisodio,
  MAX_TEXTO_COMENTARIO,
  episodioInicial,
  formatarMomento,
  lerMomento,
  tempoRelativo,
  totalDeReacoes,
  ultimoEpisodioDisponivel,
  type ComentarioDaConversa,
  type ContagemEpisodio,
  type ConversaDoEpisodio,
} from '../../lib/comunidade'

interface Props {
  malId: number
  totalEpisodes: number
  proximoAoAr?: number
  assistidosIniciais: number[]
  /** Leva para a aba de episódios (a página da obra decide como). */
  aoIrParaEpisodios?: () => void
}

const CHIPS_MAXIMOS = 60

async function lerErro(res: Response, padrao: string): Promise<string> {
  try {
    const texto = (await res.text()).trim()
    return texto || padrao
  } catch {
    return padrao
  }
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-anton text-sm text-void bg-gradient-to-br from-holo-2 to-holo-3"
    >
      {(nome || '?').charAt(0).toUpperCase()}
    </span>
  )
}

export default function ConversaDoAnime({ malId, totalEpisodes, proximoAoAr, assistidosIniciais, aoIrParaEpisodios }: Props) {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()
  const { estado } = useComunidade()

  const [assistidos, setAssistidos] = useState<number[]>(assistidosIniciais)
  const [contagens, setContagens] = useState<ContagemEpisodio[]>([])
  const [contagensProntas, setContagensProntas] = useState(false)
  const [episodio, setEpisodio] = useState<number | null>(null)
  const [conversa, setConversa] = useState<ConversaDoEpisodio | null>(null)
  const [carregandoConversa, setCarregandoConversa] = useState(false)
  const [ordem, setOrdem] = useState<'recentes' | 'populares'>('recentes')
  const [marcando, setMarcando] = useState(false)
  const [agora] = useState(() => Date.now())
  const trilhoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAssistidos(assistidosIniciais)
  }, [assistidosIniciais])

  // Marcar ou desmarcar em qualquer lugar da página abre ou fecha a conversa na hora.
  useEffect(() => {
    const aoAtualizar = (ev: Event) => {
      const d = (ev as CustomEvent<{ malId?: number; episodeNumber?: number; watched?: boolean }>).detail
      if (d?.malId !== malId || typeof d.episodeNumber !== 'number') return
      const n = d.episodeNumber
      setAssistidos(prev => (d.watched ? (prev.includes(n) ? prev : [...prev, n]) : prev.filter(x => x !== n)))
    }
    window.addEventListener('anideck:episodio-atualizado', aoAtualizar)
    return () => window.removeEventListener('anideck:episodio-atualizado', aoAtualizar)
  }, [malId])

  const carregarContagens = useCallback(async () => {
    try {
      const res = await fetch(`/api/anime/${malId}/conversa`)
      if (!res.ok) throw new Error()
      setContagens((await res.json()) as ContagemEpisodio[])
    } catch {
      setContagens([])
    } finally {
      setContagensProntas(true)
    }
  }, [malId])

  useEffect(() => {
    carregarContagens()
  }, [carregarContagens])

  const ultimo = ultimoEpisodioDisponivel(totalEpisodes, proximoAoAr, assistidos)
  const porEpisodio = useMemo(() => new Map(contagens.map(c => [c.episode_number, c])), [contagens])
  const episodioAtual = episodio ?? (contagensProntas ? Math.min(Math.max(1, episodioInicial(assistidos, contagens)), Math.max(1, ultimo)) : null)
  const assistiu = episodioAtual !== null && assistidos.includes(episodioAtual)
  const contagemAtual = episodioAtual !== null ? porEpisodio.get(episodioAtual) : undefined

  const carregarConversa = useCallback(async () => {
    if (!token || episodioAtual === null || !assistiu) {
      setConversa(null)
      return
    }
    setCarregandoConversa(true)
    try {
      const res = await fetch(`/api/anime/${malId}/episodios/${episodioAtual}/conversa?ordem=${ordem}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setConversa((await res.json()) as ConversaDoEpisodio)
    } catch {
      setConversa(null)
    } finally {
      setCarregandoConversa(false)
    }
  }, [token, malId, episodioAtual, assistiu, ordem])

  useEffect(() => {
    carregarConversa()
  }, [carregarConversa])

  // Centraliza o episódio escolhido no trilho sem rolar a página.
  useEffect(() => {
    const trilho = trilhoRef.current
    if (!trilho || episodioAtual === null) return
    const chip = trilho.querySelector<HTMLElement>(`[data-ep="${episodioAtual}"]`)
    if (chip) trilho.scrollLeft = chip.offsetLeft - trilho.clientWidth / 2 + chip.clientWidth / 2
  }, [episodioAtual, contagensProntas])

  if (ultimo < 1) {
    return (
      <section id="conversa" className="text-center py-10 px-4 rounded-2xl bg-panel border border-line">
        <MessageCircle size={22} className="mx-auto text-muted-2 mb-3" aria-hidden />
        <p className="font-bold text-text m-0">A conversa abre com o primeiro episódio</p>
        <p className="text-[13px] text-muted mt-1.5 mb-0">Cada episódio ganha a própria conversa assim que é lançado.</p>
      </section>
    )
  }

  const totalComentarios = contagens.reduce((s, c) => s + c.comentarios, 0)
  const maisComentados = [...contagens].filter(c => c.comentarios > 0).sort((a, b) => b.comentarios - a.comentarios).slice(0, 8)
  const autorizacao = token ? { Authorization: `Bearer ${token}` } : undefined

  const alternarReacao = async (reacao: string) => {
    if (!token || episodioAtual === null || !conversa) return
    const ligada = conversa.minhas_reacoes.includes(reacao)
    const delta = ligada ? -1 : 1
    setConversa({ ...conversa, minhas_reacoes: ligada ? conversa.minhas_reacoes.filter(r => r !== reacao) : [...conversa.minhas_reacoes, reacao] })
    setContagens(prev => {
      const existe = prev.some(c => c.episode_number === episodioAtual)
      const base = existe ? prev : [...prev, { episode_number: episodioAtual, comentarios: 0, reacoes: {} }]
      return base.map(c =>
        c.episode_number === episodioAtual ? { ...c, reacoes: { ...c.reacoes, [reacao]: Math.max(0, (c.reacoes?.[reacao] ?? 0) + delta) } } : c
      )
    })
    const res = await fetch(`/api/anime/${malId}/episodios/${episodioAtual}/reacoes/${reacao}`, { method: ligada ? 'DELETE' : 'PUT', headers: autorizacao }).catch(() => null)
    if (!res || !res.ok) {
      showToast(res ? await lerErro(res, 'Não foi possível registrar a reação.') : 'Sem conexão.', 'error')
      carregarConversa()
      carregarContagens()
    }
  }

  // "Já assisti": marca o episódio pela mesma rota da grade e avisa o resto da página.
  const marcarEpisodio = async (n: number) => {
    if (!token) return
    setMarcando(true)
    try {
      const res = await fetch(`/api/entries/${malId}/episodes/${n}`, { method: 'POST', headers: autorizacao })
      if (!res.ok) throw new Error()
      window.dispatchEvent(new CustomEvent('anideck:episodio-atualizado', { detail: { malId, episodeNumber: n, watched: true } }))
    } catch {
      showToast('Não foi possível marcar o episódio.', 'error')
    } finally {
      setMarcando(false)
    }
  }

  const aoComentar = (novo: ComentarioDaConversa) => {
    if (!conversa || episodioAtual === null) return
    setConversa({ ...conversa, comentarios: [novo, ...conversa.comentarios] })
    setContagens(prev => {
      const existe = prev.some(c => c.episode_number === episodioAtual)
      const base = existe ? prev : [...prev, { episode_number: episodioAtual, comentarios: 0, reacoes: {} }]
      return base.map(c => (c.episode_number === episodioAtual ? { ...c, comentarios: c.comentarios + 1 } : c))
    })
    avisarComunidadeAtualizada()
  }

  const aoRemover = (id: string) => {
    if (!conversa || episodioAtual === null) return
    setConversa({ ...conversa, comentarios: conversa.comentarios.filter(c => c.id !== id) })
    setContagens(prev => prev.map(c => (c.episode_number === episodioAtual ? { ...c, comentarios: Math.max(0, c.comentarios - 1) } : c)))
  }

  const aoBloquear = (handle: string) => {
    if (!conversa) return
    setConversa({ ...conversa, comentarios: conversa.comentarios.filter(c => c.autor.handle !== handle) })
  }

  const aoCurtir = (id: string, curtido: boolean) => {
    if (!conversa) return
    setConversa({
      ...conversa,
      comentarios: conversa.comentarios.map(c => (c.id === id ? { ...c, curtido_por_mim: curtido, curtidas: Math.max(0, c.curtidas + (curtido ? 1 : -1)) } : c)),
    })
  }

  return (
    <section id="conversa" className="scroll-mt-32">
      <p className="flex items-start gap-2 text-[12.5px] text-muted-2 mb-3">
        <Lock size={13} className="shrink-0 mt-0.5 text-holo-3" aria-hidden />
        <span>
          Sem spoiler: cada episódio abre só para quem já marcou.
          {totalComentarios > 0 && ` ${totalComentarios} ${totalComentarios === 1 ? 'comentário' : 'comentários'} na obra.`}
        </span>
      </p>

      {/* Seletor de episódio */}
      {ultimo <= CHIPS_MAXIMOS ? (
        <div ref={trilhoRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 mb-3 scroll-smooth" role="tablist" aria-label="Episódios">
          {Array.from({ length: ultimo }, (_, i) => i + 1).map(n => {
            const c = porEpisodio.get(n)
            const visto = assistidos.includes(n)
            const ativo = n === episodioAtual
            return (
              <button
                key={n}
                data-ep={n}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setEpisodio(n)}
                className={`shrink-0 min-w-[64px] h-12 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  ativo ? 'border-holo-3 bg-holo-3/10' : 'border-line bg-panel hover:border-holo-3/50'
                }`}
              >
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-2 uppercase">
                  {!visto && <Lock size={9} aria-label="não assistido" />}Ep
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`font-anton text-[15px] leading-none ${ativo ? 'text-holo-3' : 'text-text'}`}>{n}</span>
                  {(c?.comentarios ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-mono text-[9.5px] text-muted">
                      <MessageCircle size={9} aria-hidden />
                      {c?.comentarios}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1 bg-panel border border-line rounded-xl p-1">
            <button type="button" aria-label="Episódio anterior" disabled={(episodioAtual ?? 1) <= 1} onClick={() => setEpisodio(Math.max(1, (episodioAtual ?? 1) - 1))} className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-text disabled:opacity-30 cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <label className="flex items-center gap-1 font-mono text-[11px] text-muted-2">
              Ep
              <input
                type="number"
                min={1}
                max={ultimo}
                value={episodioAtual ?? 1}
                onChange={e => {
                  const n = Number(e.target.value)
                  if (Number.isInteger(n) && n >= 1 && n <= ultimo) setEpisodio(n)
                }}
                className="w-16 bg-panel-2 border border-line rounded-lg px-2 py-1.5 text-sm text-text font-bold outline-none focus:border-holo-3"
              />
            </label>
            <button type="button" aria-label="Próximo episódio" disabled={(episodioAtual ?? 1) >= ultimo} onClick={() => setEpisodio(Math.min(ultimo, (episodioAtual ?? 1) + 1))} className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-text disabled:opacity-30 cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
          {maisComentados.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {maisComentados.map(c => (
                <button key={c.episode_number} type="button" onClick={() => setEpisodio(c.episode_number)} className="shrink-0 px-2.5 py-1.5 rounded-full border border-line bg-panel font-mono text-[10.5px] text-muted hover:border-holo-3/50 cursor-pointer">
                  Ep {c.episode_number} · {c.comentarios} 💬
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-5">
        {episodioAtual === null ? (
          <div className="h-24 rounded-xl bg-panel-2 animate-pulse" />
        ) : !token || !assistiu ? (
          <EscudoDeSpoiler
            episodio={episodioAtual}
            contagem={contagemAtual}
            logado={!!token}
            marcando={marcando}
            onMarcar={() => marcarEpisodio(episodioAtual)}
            aoIrParaEpisodios={aoIrParaEpisodios}
          />
        ) : (
          <>
            <TermometroDoEpisodio
              episodio={episodioAtual}
              reacoes={contagemAtual?.reacoes}
              minhas={conversa?.minhas_reacoes ?? []}
              habilitado={!!conversa}
              onAlternar={alternarReacao}
            />

            {estado && !estado.perfil.existe ? (
              <div className="rounded-xl border border-dashed border-holo-3/40 bg-holo-3/5 p-4 mb-5 text-[13px]">
                <p className="m-0 text-text font-bold">Escolha seu @ para comentar</p>
                <p className="m-0 mt-1 text-muted">É o nome que aparece nos seus comentários e no ranking de membros.</p>
                <Link to="/configuracoes#comunidade" className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
                  Criar perfil público
                </Link>
              </div>
            ) : (
              estado && (
                <Compositor
                  key={`${malId}-${episodioAtual}`}
                  malId={malId}
                  episodio={episodioAtual}
                  token={token}
                  mana={Math.floor(estado.mana)}
                  custo={estado.regras.mp_custo_comentario}
                  onComentar={aoComentar}
                />
              )
            )}

            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="font-mono text-[10.5px] text-muted-2 uppercase tracking-wider">
                {conversa?.comentarios.length ?? 0} {conversa?.comentarios.length === 1 ? 'comentário' : 'comentários'} no ep. {episodioAtual}
              </span>
              <div className="flex gap-1 p-0.5 rounded-full bg-panel-2 border border-line">
                {(['recentes', 'populares'] as const).map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrdem(o)}
                    aria-pressed={ordem === o}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize cursor-pointer ${ordem === o ? 'bg-panel text-text' : 'text-muted-2 hover:text-text'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {carregandoConversa && !conversa ? (
              <div className="space-y-3">
                {[0, 1].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-panel-2 animate-pulse" />
                ))}
              </div>
            ) : conversa && conversa.comentarios.length > 0 ? (
              <ul className="divide-y divide-line list-none m-0 p-0">
                {conversa.comentarios.map(c => (
                  <ItemComentario
                    key={c.id}
                    comentario={c}
                    agora={agora}
                    token={token}
                    onRemover={aoRemover}
                    onBloquear={aoBloquear}
                    onCurtir={aoCurtir}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted text-center py-6 m-0">
                Ninguém comentou o episódio {episodioAtual} ainda. Abra a conversa.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function EscudoDeSpoiler({ episodio, contagem, logado, marcando, onMarcar, aoIrParaEpisodios }: {
  episodio: number
  contagem?: ContagemEpisodio
  logado: boolean
  marcando: boolean
  onMarcar: () => void
  aoIrParaEpisodios?: () => void
}) {
  const comentarios = contagem?.comentarios ?? 0
  const reacoes = totalDeReacoes(contagem)
  return (
    <div className="text-center py-6 px-2">
      <span className="w-11 h-11 mx-auto rounded-full grid place-items-center bg-panel-2 border border-line mb-3">
        <Lock size={18} className="text-muted" aria-hidden />
      </span>
      <p className="font-bold text-[14px] text-text m-0">
        {comentarios > 0 || reacoes > 0
          ? `${comentarios} ${comentarios === 1 ? 'comentário' : 'comentários'} e ${reacoes} ${reacoes === 1 ? 'reação' : 'reações'} no episódio ${episodio}`
          : `A conversa do episódio ${episodio} ainda está vazia`}
      </p>
      <p className="text-[12.5px] text-muted mt-1.5 mb-0 max-w-sm mx-auto">
        {logado
          ? 'Fica escondida até você marcar o episódio como visto. Assim ninguém leva spoiler.'
          : 'Entre na sua conta e marque o episódio como visto para participar.'}
      </p>
      {logado ? (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={onMarcar}
            disabled={marcando}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2 cursor-pointer disabled:opacity-60"
          >
            <Check size={14} aria-hidden /> {marcando ? 'Marcando…' : `Já vi o ep. ${episodio}`}
          </button>
          {aoIrParaEpisodios && (
            <button type="button" onClick={aoIrParaEpisodios} className="px-4 py-2 rounded-full text-xs font-bold border border-line text-muted hover:text-text cursor-pointer">
              Ver episódios
            </button>
          )}
        </div>
      ) : (
        <Link to="/login" className="inline-block mt-4 px-5 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
          Entrar
        </Link>
      )}
    </div>
  )
}

// Reação de um toque, em grade compacta, e o termômetro: a mistura das reações da comunidade
// numa barra, com o veredito de quem lidera. Mostra como o episódio foi sentido, não só
// quantos botões foram apertados.
function TermometroDoEpisodio({ episodio, reacoes, minhas, habilitado, onAlternar }: {
  episodio: number
  reacoes?: Record<string, number>
  minhas: string[]
  habilitado: boolean
  onAlternar: (id: string) => void
}) {
  const { total, fatias } = climaDoEpisodio(reacoes)
  const lider = fatias[0]
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[13px] font-bold text-text">Como foi o ep. {episodio}?</span>
        {total > 0 && <span className="font-mono text-[10.5px] text-muted-2">{total} {total === 1 ? 'reação' : 'reações'}</span>}
      </div>
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden bg-void/50 border border-line/60 mb-1.5" role="img" aria-label={fatias.map(f => `${f.rotulo} ${f.pct}%`).join(', ')}>
          {fatias.map(f => (
            <span key={f.id} className={`h-full ${f.cor}`} style={{ width: `${f.pct}%` }} />
          ))}
        </div>
      )}
      {lider && (
        <p className="text-[11.5px] text-muted mt-0 mb-2.5">
          {lider.emoji} Para quem viu, este episódio {lider.veredito} ({lider.pct}%).
        </p>
      )}
      {/* Celular e tablet: grade de 8 por linha, só emoji e contagem (o nome vai no título e no
          leitor de tela). Monitor: grade de 4 por linha, com o nome ao lado. */}
      <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-4 lg:gap-2" role="group" aria-label="Reagir ao episódio">
        {REACOES.map(r => {
          const ligada = minhas.includes(r.id)
          const n = reacoes?.[r.id] ?? 0
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={ligada}
              aria-label={`${r.rotulo}${n > 0 ? `, ${n}` : ''}`}
              title={r.rotulo}
              disabled={!habilitado}
              onClick={() => onAlternar(r.id)}
              className={`h-11 lg:h-10 lg:px-3 min-w-0 rounded-xl border flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-0.5 lg:gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
                ligada ? 'border-holo-1 bg-holo-1/12 shadow-[0_0_12px_rgba(255,79,216,0.18)]' : 'border-line bg-panel-2 hover:border-holo-1/50'
              }`}
            >
              <span className={`text-[18px] lg:text-[15px] leading-none ${ligada ? '' : 'grayscale-[35%]'}`} aria-hidden>
                {r.emoji}
              </span>
              <span className={`hidden lg:inline min-w-0 truncate text-[12.5px] font-bold ${ligada ? 'text-text' : 'text-muted'}`}>{r.rotulo}</span>
              <span className={`block h-[10px] lg:h-auto lg:ml-auto font-mono text-[9px] lg:text-[11px] leading-[10px] lg:leading-none ${ligada ? 'text-holo-1' : 'text-muted-2'}`}>{n > 0 ? n : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Compositor({ malId, episodio, token, mana, custo, onComentar }: {
  malId: number
  episodio: number
  token: string
  mana: number
  custo: number
  onComentar: (c: ComentarioDaConversa) => void
}) {
  const { showToast } = useToast()
  const [texto, setTexto] = useState('')
  const [momento, setMomento] = useState('')
  const [mostrarMomento, setMostrarMomento] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const segundos = lerMomento(momento)
  const momentoInvalido = segundos !== null && Number.isNaN(segundos)
  const semMana = mana < custo
  const restante = MAX_TEXTO_COMENTARIO - texto.length
  const podeEnviar = texto.trim().length > 0 && restante >= 0 && !momentoInvalido && !semMana && !enviando

  const enviar = async () => {
    if (!podeEnviar) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/anime/${malId}/episodios/${episodio}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto, momento_seg: segundos }),
      })
      if (!res.ok) {
        showToast(await lerErro(res, 'Não foi possível publicar.'), 'error')
        return
      }
      onComentar((await res.json()) as ComentarioDaConversa)
      setTexto('')
      setMomento('')
      setMostrarMomento(false)
    } catch {
      showToast('Sem conexão. Tente de novo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mb-5">
      <label htmlFor={`comentario-${episodio}`} className="sr-only">
        Comentar o episódio {episodio}
      </label>
      <textarea
        id={`comentario-${episodio}`}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar()
        }}
        maxLength={MAX_TEXTO_COMENTARIO}
        rows={3}
        placeholder={`O que achou do episódio ${episodio}?`}
        className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-holo-3 transition-colors resize-y min-h-[84px]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <div className="flex flex-wrap items-center gap-2">
          {mostrarMomento ? (
            <label className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
              <Clock size={12} aria-hidden /> Minuto
              <input
                value={momento}
                onChange={e => setMomento(e.target.value)}
                placeholder="12:30"
                inputMode="numeric"
                aria-invalid={momentoInvalido}
                className={`w-20 bg-panel-2 border rounded-lg px-2 py-1 text-[12px] text-text outline-none ${momentoInvalido ? 'border-coral' : 'border-line focus:border-holo-3'}`}
              />
            </label>
          ) : (
            <button type="button" onClick={() => setMostrarMomento(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-[11px] font-bold text-muted hover:text-text cursor-pointer">
              <Clock size={12} aria-hidden /> Marcar o minuto da cena
            </button>
          )}
          <span className={`font-mono text-[10.5px] ${semMana ? 'text-coral' : 'text-muted-2'}`}>
            <Droplet size={11} className="inline -mt-0.5 mr-0.5 text-holo-3" aria-hidden />
            {semMana ? `Mana insuficiente (${mana}/${custo})` : `Custa ${custo} · você tem ${mana}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {restante < 150 && <span className={`font-mono text-[10.5px] ${restante < 0 ? 'text-coral' : 'text-muted-2'}`}>{restante}</span>}
          <button
            type="button"
            onClick={enviar}
            disabled={!podeEnviar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={13} aria-hidden /> {enviando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemComentario({ comentario: c, agora, token, onRemover, onBloquear, onCurtir }: {
  comentario: ComentarioDaConversa
  agora: number
  token: string
  onRemover: (id: string) => void
  onBloquear: (handle: string) => void
  onCurtir: (id: string, curtido: boolean) => void
}) {
  const { showToast } = useToast()
  const [painel, setPainel] = useState<'nenhum' | 'denunciar' | 'apagar' | 'bloquear'>('nenhum')
  const [motivo, setMotivo] = useState<string>('spoiler')
  const [ocupado, setOcupado] = useState(false)
  const auth = { Authorization: `Bearer ${token}` }

  const curtir = async () => {
    const novo = !c.curtido_por_mim
    onCurtir(c.id, novo)
    const res = await fetch(`/api/comunidade/comentarios/${c.id}/curtida`, { method: novo ? 'POST' : 'DELETE', headers: auth }).catch(() => null)
    if (!res || !res.ok) {
      onCurtir(c.id, !novo)
      showToast('Não foi possível curtir agora.', 'error')
    }
  }

  const executar = async (url: string, metodo: string, corpo: unknown, sucesso: string, depois: () => void) => {
    setOcupado(true)
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: corpo ? JSON.stringify(corpo) : undefined,
      })
      if (!res.ok) {
        showToast(await lerErro(res, 'Não foi possível concluir.'), 'error')
        return
      }
      showToast(sucesso, 'success')
      setPainel('nenhum')
      depois()
    } catch {
      showToast('Sem conexão. Tente de novo.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  const nome = c.autor.nome || 'Membro'

  return (
    <li className="py-4 first:pt-1 last:pb-1">
      <div className="flex gap-3">
        <Avatar nome={nome} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {c.autor.handle ? (
              <Link to={`/u/${c.autor.handle}`} className="font-bold text-[13.5px] text-text hover:text-holo-3 transition-colors">
                {nome}
              </Link>
            ) : (
              <span className="font-bold text-[13.5px] text-text">{nome}</span>
            )}
            <SeloEquipe handle={c.autor.handle} />
            {c.autor.handle && <span className="font-mono text-[10.5px] text-muted-2">@{c.autor.handle}</span>}
            <span className="font-mono text-[10.5px] text-muted-2">· {tempoRelativo(c.created_at, agora)}</span>
            {c.momento_seg !== null && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-holo-3/10 border border-holo-3/30 font-mono text-[10px] text-holo-3">
                <Clock size={9} aria-hidden /> {formatarMomento(c.momento_seg)}
              </span>
            )}
            {c.oculto && (
              <span className="px-1.5 py-0.5 rounded bg-coral/12 border border-coral/40 font-mono text-[10px] text-coral">
                oculto pela moderação
              </span>
            )}
          </div>
          <p className="text-[14px] text-text/90 leading-relaxed mt-1 mb-0 whitespace-pre-wrap break-words">{c.texto}</p>

          <div className="flex flex-wrap items-center gap-1 mt-2 -ml-2">
            <button
              type="button"
              onClick={curtir}
              disabled={c.meu}
              aria-pressed={c.curtido_por_mim}
              title={c.meu ? 'Seu comentário' : c.curtido_por_mim ? 'Tirar curtida' : 'Curtir'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11.5px] font-bold transition-colors cursor-pointer disabled:cursor-default ${
                c.curtido_por_mim ? 'text-holo-1' : 'text-muted-2 hover:text-text'
              }`}
            >
              <Heart size={13} fill={c.curtido_por_mim ? 'currentColor' : 'none'} aria-hidden />
              {c.curtidas > 0 ? c.curtidas : c.meu ? '' : 'Curtir'}
            </button>
            {c.meu ? (
              <button type="button" onClick={() => setPainel(painel === 'apagar' ? 'nenhum' : 'apagar')} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11.5px] font-bold text-muted-2 hover:text-coral cursor-pointer">
                <Trash2 size={12} aria-hidden /> Apagar
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setPainel(painel === 'denunciar' ? 'nenhum' : 'denunciar')} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11.5px] font-bold text-muted-2 hover:text-text cursor-pointer">
                  <Flag size={12} aria-hidden /> Denunciar
                </button>
                {c.autor.handle && (
                  <button type="button" onClick={() => setPainel(painel === 'bloquear' ? 'nenhum' : 'bloquear')} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11.5px] font-bold text-muted-2 hover:text-text cursor-pointer">
                    <Ban size={12} aria-hidden /> Bloquear
                  </button>
                )}
              </>
            )}
          </div>

          {painel === 'apagar' && (
            <div className="mt-2 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-panel-2 border border-line text-[12.5px]">
              <span className="text-muted">Apagar este comentário? A Mana gasta não volta.</span>
              <button type="button" disabled={ocupado} onClick={() => executar(`/api/comunidade/comentarios/${c.id}`, 'DELETE', null, 'Comentário apagado.', () => onRemover(c.id))} className="px-3 py-1 rounded-full bg-coral text-void font-extrabold text-[11.5px] cursor-pointer disabled:opacity-50">
                Apagar
              </button>
              <button type="button" onClick={() => setPainel('nenhum')} className="px-3 py-1 rounded-full border border-line text-muted font-bold text-[11.5px] cursor-pointer">
                Cancelar
              </button>
            </div>
          )}

          {painel === 'bloquear' && (
            <div className="mt-2 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-panel-2 border border-line text-[12.5px]">
              <span className="text-muted">Esconder os comentários de @{c.autor.handle} para você? Dá para desfazer no perfil dele.</span>
              <button type="button" disabled={ocupado} onClick={() => executar(`/api/comunidade/bloqueios/${c.autor.handle}`, 'POST', null, `@${c.autor.handle} bloqueado.`, () => onBloquear(c.autor.handle))} className="px-3 py-1 rounded-full bg-text text-void font-extrabold text-[11.5px] cursor-pointer disabled:opacity-50">
                Bloquear
              </button>
              <button type="button" onClick={() => setPainel('nenhum')} className="px-3 py-1 rounded-full border border-line text-muted font-bold text-[11.5px] cursor-pointer">
                Cancelar
              </button>
            </div>
          )}

          {painel === 'denunciar' && (
            <div className="mt-2 p-3 rounded-xl bg-panel-2 border border-line">
              <p className="text-[12px] font-bold text-text m-0 mb-2">O que há de errado?</p>
              <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup" aria-label="Motivo da denúncia">
                {MOTIVOS_DENUNCIA.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={motivo === m.id}
                    onClick={() => setMotivo(m.id)}
                    className={`px-2.5 py-1 rounded-full border text-[11.5px] font-bold cursor-pointer ${motivo === m.id ? 'border-holo-3 bg-holo-3/10 text-text' : 'border-line text-muted'}`}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={ocupado} onClick={() => executar(`/api/comunidade/comentarios/${c.id}/denuncia`, 'POST', { motivo }, 'Denúncia enviada. A moderação vai avaliar.', () => undefined)} className="px-3 py-1 rounded-full bg-gradient-to-r from-holo-1 to-holo-2 text-void font-extrabold text-[11.5px] cursor-pointer disabled:opacity-50">
                  Enviar denúncia
                </button>
                <button type="button" onClick={() => setPainel('nenhum')} className="px-3 py-1 rounded-full border border-line text-muted font-bold text-[11.5px] cursor-pointer">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
