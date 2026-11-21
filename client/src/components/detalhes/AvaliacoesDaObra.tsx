// client/src/components/detalhes/AvaliacoesDaObra.tsx
// Avaliações públicas de obras completas na página do anime, separadas da anotação
// privada do deck e integradas à proteção contra spoiler e missões de avaliação.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BotaoDenunciar from '../moderacao/BotaoDenunciar'
import { Edit3, EyeOff, Lock, MessageSquareQuote, Send, Star, Trash2 } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import { avisarComunidadeAtualizada } from '../../hooks/useComunidade'
import { tempoRelativo } from '../../lib/comunidade'
import { formatarNota } from '../../lib/detalhes'
import { obterClasseCorNome, obterClasseMoldura, renderizarEmblema } from '../../lib/cosmeticos'
import { inserirMarcacaoSpoiler } from '../../lib/spoiler'
import {
  apagarReviewDaObra,
  lerNotaReview,
  listarReviewsDaObra,
  REVIEW_MAX_CARACTERES,
  REVIEW_MIN_CARACTERES,
  salvarReviewDaObra,
  validarTextoReview,
  type RespostaReviewsObra,
  type ReviewDaObra,
} from '../../lib/reviews'
import SeloEquipe from '../comunidade/SeloEquipe'
import TextoComSpoiler from '../comunidade/TextoComSpoiler'
import TagCla from '../TagCla'

interface Props {
  malId: number
  ehCompleto: boolean
  aoContarReviews?: (quantidade: number) => void
}

function AvatarAutor({ nome, moldura }: { nome: string; moldura?: string }) {
  const classeMoldura = obterClasseMoldura(moldura)
  return (
    <span
      aria-hidden
      className={`w-9 h-9 rounded-full shrink-0 grid place-items-center font-anton text-sm text-void bg-gradient-to-br from-holo-2 to-holo-3 ${classeMoldura}`}
    >
      {(nome || '?').charAt(0).toUpperCase()}
    </span>
  )
}

export default function AvaliacoesDaObra({ malId, ehCompleto, aoContarReviews }: Props) {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()

  const [dados, setDados] = useState<RespostaReviewsObra | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [notaTexto, setNotaTexto] = useState('')
  const [contemSpoiler, setContemSpoiler] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [agora] = useState(() => Date.now())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const resp = await listarReviewsDaObra(malId, token)
      setDados(resp)
      aoContarReviews?.(resp.reviews.length)
      if (resp.minha_review) {
        setTexto(resp.minha_review.texto)
        setNotaTexto(resp.minha_review.nota != null ? formatarNota(resp.minha_review.nota) : '')
        setContemSpoiler(Boolean(resp.minha_review.contem_spoiler))
      } else {
        setTexto('')
        setNotaTexto('')
        setContemSpoiler(false)
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as avaliações.')
    } finally {
      setCarregando(false)
    }
  }, [malId, token, aoContarReviews])

  useEffect(() => {
    carregar()
  }, [carregar, ehCompleto])

  useEffect(() => {
    const aoAtualizarDeck = () => carregar()
    window.addEventListener('anideck:entrada-atualizada', aoAtualizarDeck)
    window.addEventListener('anideck:episodio-atualizado', aoAtualizarDeck)
    return () => {
      window.removeEventListener('anideck:entrada-atualizada', aoAtualizarDeck)
      window.removeEventListener('anideck:episodio-atualizado', aoAtualizarDeck)
    }
  }, [carregar])

  const minha = dados?.minha_review ?? null
  const mostrarFormulario = Boolean(token && dados?.pode_avaliar && (!minha || editando))

  const validacaoTexto = validarTextoReview(texto)
  const notaLida = lerNotaReview(notaTexto)
  const podePublicar = validacaoTexto.valido && !notaLida.erro && !salvando

  const aplicarTrechoSpoiler = () => {
    const el = textareaRef.current
    const ini = el?.selectionStart ?? texto.length
    const fim = el?.selectionEnd ?? texto.length
    const res = inserirMarcacaoSpoiler(texto, ini, fim)
    setTexto(res.texto)
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(res.selecaoInicio, res.selecaoFim)
    })
  }

  const publicar = async () => {
    if (!token || !podePublicar) return
    setSalvando(true)
    try {
      await salvarReviewDaObra(
        malId,
        {
          nota: notaLida.nota,
          texto: validacaoTexto.texto,
          contem_spoiler: contemSpoiler,
        },
        token,
      )
      showToast(minha ? 'Avaliação pública atualizada!' : 'Avaliação pública publicada!', 'success')
      setEditando(false)
      avisarComunidadeAtualizada()
      await carregar()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Não foi possível salvar a avaliação.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const apagar = async () => {
    if (!token || apagando) return
    setApagando(true)
    try {
      await apagarReviewDaObra(malId, token)
      showToast('Avaliação removida.', 'success')
      setConfirmandoExclusao(false)
      setEditando(false)
      avisarComunidadeAtualizada()
      window.dispatchEvent(new CustomEvent('anideck:episodio-atualizado'))
      await carregar()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Não foi possível apagar a avaliação.', 'error')
    } finally {
      setApagando(false)
    }
  }

  if (carregando && !dados) {
    return (
      <div className="space-y-3">
        {[0, 1].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-panel border border-line animate-pulse" />
        ))}
      </div>
    )
  }

  if (erro && !dados) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5 text-center">
        <p className="text-sm text-coral font-bold m-0">{erro}</p>
        <button
          type="button"
          onClick={carregar}
          className="mt-3 px-4 py-1.5 rounded-full border border-line text-xs font-bold text-text hover:border-holo-3 cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const reviews: ReviewDaObra[] = dados?.reviews ?? []

  return (
    <section id="avaliacoes" className="space-y-5 scroll-mt-32">
      <div className="rounded-2xl surface-glass p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-base tracking-tight text-text m-0 flex items-center gap-2">
              <MessageSquareQuote size={16} className="text-holo-3" aria-hidden />
              Avaliações públicas da obra
            </h2>
            <p className="text-[12.5px] text-muted mt-1 mb-0 leading-relaxed">
              Quem já completou este anime pode compartilhar uma análise (mínimo de {REVIEW_MIN_CARACTERES} caracteres).
              A sua <strong>anotação privada do deck</strong> continua só para você.
            </p>
          </div>
          {minha && !editando && dados?.pode_avaliar && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTexto(minha.texto)
                  setNotaTexto(minha.nota != null ? formatarNota(minha.nota) : '')
                  setContemSpoiler(Boolean(minha.contem_spoiler))
                  setEditando(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs font-bold text-text hover:border-holo-3 cursor-pointer"
              >
                <Edit3 size={12} aria-hidden /> Editar minha avaliação
              </button>
            </div>
          )}
        </div>

        {!token ? (
          <div className="mt-4 pt-4 border-t border-line/70 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">Entre na sua conta para avaliar animes que você já completou.</span>
            <Link to="/login" className="px-4 py-1.5 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
              Entrar
            </Link>
          </div>
        ) : !dados?.pode_avaliar ? (
          <div className="mt-4 pt-4 border-t border-line/70 flex items-start gap-2.5 text-[12.5px] text-muted">
            <Lock size={14} className="text-holo-3 shrink-0 mt-0.5" aria-hidden />
            <span>
              {dados?.motivo_bloqueio || 'Marque este anime como Completo no seu deck (com episódio assistido) para escrever uma avaliação pública.'}
            </span>
          </div>
        ) : mostrarFormulario ? (
          <div className="mt-4 pt-4 border-t border-line/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-text">
                <span>Nota opcional (1 a 10):</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={notaTexto}
                  onChange={e => setNotaTexto(e.target.value)}
                  placeholder="ex.: 8,5"
                  aria-invalid={Boolean(notaLida.erro)}
                  className={`w-20 bg-panel-2 border rounded-lg px-2.5 py-1.5 text-xs font-bold text-text outline-none ${
                    notaLida.erro ? 'border-coral' : 'border-line focus:border-holo-3'
                  }`}
                />
              </label>
              {notaLida.erro && <span className="text-xs text-coral font-bold">{notaLida.erro}</span>}
            </div>

            <div>
              <label htmlFor="review-obra-texto" className="sr-only">Sua avaliação pública da obra</label>
              <textarea
                ref={textareaRef}
                id="review-obra-texto"
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={4}
                maxLength={REVIEW_MAX_CARACTERES}
                placeholder="Conte sem pressa o que funcionou, o ritmo, personagens e por que vale (ou não) assistir. Use ||trecho|| para esconder spoilers específicos."
                className="w-full bg-panel-2 border border-line rounded-xl px-4 py-3 text-[13.5px] leading-relaxed outline-none focus:border-holo-3 resize-y min-h-[112px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={aplicarTrechoSpoiler}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-line text-xs font-bold text-muted hover:text-text cursor-pointer"
                    title="Envolve o trecho selecionado com ||spoiler||"
                  >
                    <EyeOff size={12} aria-hidden /> ||spoiler||
                  </button>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-xs font-bold text-muted hover:text-text cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={contemSpoiler}
                      onChange={e => setContemSpoiler(e.target.checked)}
                      className="accent-coral cursor-pointer"
                    />
                    Contém spoiler
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${validacaoTexto.valido ? 'text-green' : 'text-muted-2'}`}>
                    {validacaoTexto.tamanho}/{REVIEW_MIN_CARACTERES} mín · máx {REVIEW_MAX_CARACTERES}
                  </span>
                  {minha && (
                    <button
                      type="button"
                      onClick={() => setEditando(false)}
                      className="px-3 py-1.5 rounded-full border border-line text-xs font-bold text-muted hover:text-text cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!podePublicar}
                    onClick={publicar}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={13} aria-hidden />
                    {salvando ? 'Salvando…' : minha ? 'Atualizar avaliação' : 'Publicar avaliação'}
                  </button>
                </div>
              </div>
              {!validacaoTexto.valido && texto.trim().length > 0 && (
                <p className="text-xs text-muted mt-1.5 mb-0">{validacaoTexto.erro}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
          <p className="font-bold text-text text-sm m-0">Nenhuma avaliação pública ainda</p>
          <p className="text-xs text-muted mt-1.5 mb-0">Quem completar esta obra pode abrir os comentários gerais por aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3 list-none m-0 p-0">
          {reviews.map(r => {
            const nome = r.autor.nome || 'Membro'
            return (
              <li
                key={r.id}
                className={`rounded-2xl border bg-panel p-4 sm:p-5 ${r.meu ? 'border-holo-3/40' : 'border-line'}`}
              >
                <div className="flex gap-3">
                  <AvatarAutor nome={nome} moldura={r.autor.moldura} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                        {r.autor.handle ? (
                          <Link to={`/u/${r.autor.handle}`} className={`font-bold text-[13.5px] transition-colors ${obterClasseCorNome(r.autor.cor_nome)}`}>
                            {nome}
                          </Link>
                        ) : (
                          <span className={`font-bold text-[13.5px] ${obterClasseCorNome(r.autor.cor_nome)}`}>{nome}</span>
                        )}
                        {r.autor.cla_tag && <TagCla tag={r.autor.cla_tag} />}
                        {renderizarEmblema(r.autor.emblema, 'sm')}
                        <SeloEquipe handle={r.autor.handle} />
                        {r.autor.handle && <span className="font-mono text-xs text-muted-2">@{r.autor.handle}</span>}
                        <span className="font-mono text-xs text-muted-2">· {tempoRelativo(r.updated_at || r.created_at, agora)}</span>
                        {r.meu && (
                          <span className="px-1.5 py-0.5 rounded bg-holo-3/15 border border-holo-3/30 font-mono text-[11px] font-bold text-holo-3">
                            sua avaliação
                          </span>
                        )}
                        {r.contem_spoiler && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-coral/12 border border-coral/35 font-mono text-xs text-coral">
                            <EyeOff size={10} aria-hidden /> spoiler
                          </span>
                        )}
                      </div>

                      {!r.meu && <BotaoDenunciar tipo="avaliacao" alvo={r.id} compacto />}
                      {r.nota !== null && r.nota !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/30 font-mono text-xs font-bold text-gold shrink-0">
                          <Star size={11} className="fill-gold" aria-hidden />
                          {formatarNota(r.nota)}
                        </span>
                      )}
                    </div>

                    <TextoComSpoiler texto={r.texto} contemSpoiler={Boolean(r.contem_spoiler)} className="mt-2" />

                    {r.meu && (
                      <div className="mt-3 pt-2 border-t border-line/60 flex flex-wrap items-center gap-2">
                        {confirmandoExclusao ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted">Apagar sua avaliação? Se cumpriu missão hoje, o XP será estornado.</span>
                            <button
                              type="button"
                              disabled={apagando}
                              onClick={apagar}
                              className="px-3 py-1 rounded-full bg-coral text-void font-extrabold cursor-pointer disabled:opacity-50"
                            >
                              {apagando ? 'Apagando…' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoExclusao(false)}
                              className="px-3 py-1 rounded-full border border-line text-muted font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmandoExclusao(true)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-muted-2 hover:text-coral cursor-pointer"
                          >
                            <Trash2 size={12} aria-hidden /> Apagar avaliação
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
