// client/src/components/detalhes/PainelMinhaLista.tsx
// "Na sua lista": status, nota, favorito, anotação e o próximo episódio, direto na página
// do anime. Cada mudança salva sozinha; antes, tudo passava pela folha "Editar entrada".
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Heart, Loader2, MoreHorizontal, NotebookPen, Play, Plus, Star, Trash2, X } from 'lucide-react'
import { useSessao } from '../../contexts/SessaoContext'
import { useToast } from '../../contexts/ToastContext'
import { invalidarCachesDoDeck } from '../../lib/cacheDeTela'
import { STATUS_DO_DECK, ajustarNota, formatarNota, proximoEpisodio, rotuloDaNota, type EntradaNoDeck } from '../../lib/detalhes'

interface Props {
  malId: number
  entrada: EntradaNoDeck | null
  assistidos: number[]
  ultimoDisponivel: number
  /** A obra terminou de ser exibida: quem está "Em Dia" recebe o convite para "Completo". */
  obraTerminou: boolean
  onEntradaMudou: (nova: EntradaNoDeck | null, anterior: EntradaNoDeck | null) => void
  onEpisodiosZerados: () => void
  /** Celular: uma linha de controles que abrem logo abaixo, em vez do painel inteiro. */
  compacto?: boolean
}

type Salvo = 'parado' | 'salvando' | 'salvo'
type Expansao = 'status' | 'nota' | 'mais'

export default function PainelMinhaLista({ malId, entrada, assistidos, ultimoDisponivel, obraTerminou, onEntradaMudou, onEpisodiosZerados, compacto = false }: Props) {
  const { session } = useSessao()
  const token = session?.access_token
  const { showToast } = useToast()
  const [salvo, setSalvo] = useState<Salvo>('parado')
  const [statusPendente, setStatusPendente] = useState<string | null>(null)
  const [confirmarQueroAssistir, setConfirmarQueroAssistir] = useState(false)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)
  const [editandoAnotacao, setEditandoAnotacao] = useState(false)
  const [anotacao, setAnotacao] = useState(entrada?.anotacao ?? '')
  const [marcandoEp, setMarcandoEp] = useState(false)
  const [aberto, setAberto] = useState<Expansao | null>(null)
  const temporizadorSalvo = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(temporizadorSalvo.current), [])

  if (!token) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-panel p-4 text-center">
        <p className="text-sm font-bold text-text m-0">Guarde este anime no seu deck</p>
        <p className="text-[12.5px] text-muted mt-1 mb-3">Status, nota, progresso por episódio e a conversa da comunidade.</p>
        <Link to="/login" className="inline-block px-5 py-2 rounded-full text-xs font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2">
          Entrar
        </Link>
      </div>
    )
  }

  const cabecalho = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const marcarSalvo = () => {
    setSalvo('salvo')
    window.clearTimeout(temporizadorSalvo.current)
    temporizadorSalvo.current = window.setTimeout(() => setSalvo('parado'), 1800)
  }

  // Grava a entrada inteira com as mudanças: o PUT do backend substitui todos os campos.
  const salvar = async (mudancas: Partial<EntradaNoDeck>, mensagemNova?: string) => {
    const anterior = entrada
    const corpo = {
      mal_id: malId,
      tipo: anterior?.tipo || 'anime',
      status: mudancas.status ?? anterior?.status ?? 'Quero Assistir',
      nota: mudancas.nota !== undefined ? mudancas.nota : anterior?.nota ?? null,
      anotacao: mudancas.anotacao ?? anterior?.anotacao ?? '',
      is_favorite: mudancas.is_favorite ?? anterior?.is_favorite ?? false,
    }
    setSalvo('salvando')
    try {
      const res = await fetch(anterior ? `/api/entries/${anterior.id}` : '/api/entries', {
        method: anterior ? 'PUT' : 'POST',
        headers: cabecalho,
        body: JSON.stringify(corpo),
      })
      if (!res.ok) throw new Error()
      const resposta = await res.json()
      const nova = (Array.isArray(resposta) ? resposta[0] : resposta) as EntradaNoDeck
      invalidarCachesDoDeck(session?.user.id)
      onEntradaMudou(nova, anterior)
      if (mensagemNova) showToast(mensagemNova)
      marcarSalvo()
      return true
    } catch {
      setSalvo('parado')
      showToast('Não foi possível salvar. Tente de novo.', 'error')
      return false
    }
  }

  const escolherStatus = async (status: string, zerar?: boolean) => {
    if (entrada?.status === status) return
    // Voltar para "Quero Assistir" com episódios marcados pede uma escolha: manter o
    // histórico (rever depois) ou apagar o que foi marcado por engano.
    if (status === 'Quero Assistir' && entrada && assistidos.length > 0 && zerar === undefined) {
      setConfirmarQueroAssistir(true)
      return
    }
    setConfirmarQueroAssistir(false)
    setStatusPendente(status)
    if (zerar) {
      const res = await fetch(`/api/entries/${malId}/episodes`, { method: 'DELETE', headers: cabecalho }).catch(() => null)
      if (!res || !res.ok) {
        showToast('Não foi possível zerar os episódios.', 'error')
        setStatusPendente(null)
        return
      }
      onEpisodiosZerados()
    }
    await salvar({ status }, entrada ? undefined : `Adicionado como ${status}!`)
    setStatusPendente(null)
  }

  const remover = async () => {
    if (!entrada) return
    setSalvo('salvando')
    const res = await fetch(`/api/entries/${entrada.id}`, { method: 'DELETE', headers: cabecalho }).catch(() => null)
    if (!res || !res.ok) {
      setSalvo('parado')
      showToast('Não foi possível remover agora.', 'error')
      return
    }
    invalidarCachesDoDeck(session?.user.id)
    setConfirmarRemocao(false)
    setSalvo('parado')
    onEntradaMudou(null, entrada)
    showToast('Removido do seu deck.')
  }

  const marcarProximo = async (episodio: number) => {
    setMarcandoEp(true)
    try {
      const res = await fetch(`/api/entries/${malId}/episodes/${episodio}`, { method: 'POST', headers: cabecalho })
      if (!res.ok) throw new Error()
      try {
        const corpo = (await res.json()) as { xp_earned?: number; reason?: string }
        showToast(corpo.xp_earned ? `Ep ${episodio} visto · +${corpo.xp_earned} XP na Guilda` : `Ep ${episodio} marcado como visto`)
      } catch {
        showToast(`Ep ${episodio} marcado como visto`)
      }
      window.dispatchEvent(new CustomEvent('anideck:episodio-atualizado', { detail: { malId, episodeNumber: episodio, watched: true } }))
    } catch {
      showToast('Não foi possível marcar o episódio.', 'error')
    } finally {
      setMarcandoEp(false)
    }
  }

  // Fora do deck: um toque no status já adiciona.
  if (!entrada) {
    return (
      <div className="rounded-2xl border border-holo-3/30 bg-gradient-to-br from-panel to-panel-2 p-4">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-text m-0 mb-3">
          <Plus size={15} className="text-holo-3" aria-hidden /> Adicionar ao deck como
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_DO_DECK.map(s => (
            <button
              key={s}
              type="button"
              disabled={statusPendente !== null}
              onClick={() => escolherStatus(s)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12.5px] font-bold cursor-pointer transition-colors disabled:opacity-60 ${
                s === 'Quero Assistir' ? 'border-holo-3 bg-holo-3/10 text-text' : 'border-line bg-panel-2 text-muted hover:text-text hover:border-holo-3/50'
              }`}
            >
              {statusPendente === s && <Loader2 size={13} className="animate-spin" aria-hidden />}
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const proximo = proximoEpisodio(assistidos, ultimoDisponivel)
  const mostrarProximo = proximo !== null && entrada.status !== 'Completo' && entrada.status !== 'Dropado'
  const nota = entrada.nota ?? null

  const indicadorSalvo = (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10.5px] transition-opacity ${salvo === 'parado' ? 'opacity-0' : 'opacity-100'} ${salvo === 'salvo' ? 'text-green' : 'text-muted-2'}`}
      aria-live="polite"
    >
      {salvo === 'salvando' ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Check size={11} aria-hidden />}
      {salvo === 'salvando' ? 'salvando' : 'salvo'}
    </span>
  )

  const botaoFavorito = (
    <button
      type="button"
      onClick={() => salvar({ is_favorite: !entrada.is_favorite }, entrada.is_favorite ? undefined : 'Agora é uma carta rara do seu deck!')}
      aria-pressed={!!entrada.is_favorite}
      aria-label={entrada.is_favorite ? 'Tirar dos favoritos' : 'Marcar como favorito'}
      title={entrada.is_favorite ? 'Tirar dos favoritos' : 'Favorito'}
      className={`w-10 h-10 shrink-0 grid place-items-center rounded-full border cursor-pointer transition-colors ${
        entrada.is_favorite ? 'border-holo-1/60 bg-holo-1/15 text-holo-1' : 'border-line bg-panel-2 text-muted hover:text-text'
      }`}
    >
      <Heart size={16} fill={entrada.is_favorite ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )

  // Chips quebram linha em vez de rolar: os cinco status ficam à vista, sem nenhum escondido.
  const chipsDeStatus = (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status no deck">
      {STATUS_DO_DECK.map(s => {
        const ativo = entrada.status === s
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={statusPendente !== null}
            onClick={async () => {
              await escolherStatus(s)
              if (s !== 'Quero Assistir' || assistidos.length === 0) setAberto(null)
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12.5px] font-bold cursor-pointer transition-colors disabled:cursor-wait ${
              ativo ? 'border-holo-2 bg-holo-2/20 text-text shadow-[0_0_12px_rgba(123,92,255,0.25)]' : 'border-line bg-panel-2 text-muted hover:text-text hover:border-holo-2/50'
            }`}
          >
            {statusPendente === s ? <Loader2 size={13} className="animate-spin" aria-hidden /> : ativo && <Check size={13} aria-hidden />}
            {s}
          </button>
        )
      })}
    </div>
  )

  const confirmacaoQueroAssistir = confirmarQueroAssistir && (
    <div className="mt-3 p-3 rounded-xl bg-void/40 border border-line text-[12.5px]">
      <p className="m-0 text-text">
        Você tem <b>{assistidos.length}</b> {assistidos.length === 1 ? 'episódio marcado' : 'episódios marcados'}. O que fazer com eles?
      </p>
      <div className="flex flex-wrap gap-2 mt-2.5">
        <button type="button" onClick={() => { escolherStatus('Quero Assistir', false); setAberto(null) }} className="px-3 py-1.5 rounded-full border border-line font-bold text-text hover:border-holo-3 cursor-pointer">
          Manter (vou rever)
        </button>
        <button type="button" onClick={() => { escolherStatus('Quero Assistir', true); setAberto(null) }} className="px-3 py-1.5 rounded-full border border-coral/50 text-coral font-bold hover:bg-coral/10 cursor-pointer">
          Zerar (marquei por engano)
        </button>
        <button type="button" onClick={() => setConfirmarQueroAssistir(false)} className="px-2 py-1.5 text-muted font-bold cursor-pointer">
          Cancelar
        </button>
      </div>
    </div>
  )

  const avisoCompleto = obraTerminou && entrada.status === 'Em Dia' && (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-holo-1/10 border border-holo-1/35 text-[12.5px]">
      <span className="text-text">A obra terminou. Você está em dia, então já completou.</span>
      <button type="button" onClick={() => escolherStatus('Completo')} className="px-3 py-1.5 rounded-full text-[12px] font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2 cursor-pointer">
        Mover para Completo
      </button>
    </div>
  )

  const botaoContinuar = mostrarProximo && (
    <button
      type="button"
      onClick={() => proximo !== null && marcarProximo(proximo)}
      disabled={marcandoEp}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-holo-3/10 border border-holo-3/40 text-left cursor-pointer hover:bg-holo-3/15 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block font-mono text-[10px] text-holo-3 uppercase tracking-widest">Continuar</span>
        <span className="block text-[13.5px] font-bold text-text">Marcar o episódio {proximo} como visto</span>
      </span>
      <span className="w-9 h-9 shrink-0 rounded-full bg-holo-3 text-void grid place-items-center">
        {marcandoEp ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={15} fill="currentColor" className="ml-0.5" aria-hidden />}
      </span>
    </button>
  )

  const blocoAnotacao = editandoAnotacao ? (
    <div>
      <label htmlFor="anotacao-deck" className="sr-only">Anotação</label>
      <textarea
        id="anotacao-deck"
        autoFocus
        value={anotacao}
        onChange={e => setAnotacao(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="O que achou deste anime? Só você vê."
        className="w-full bg-void/40 border border-line rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-holo-3 resize-y"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={() => { setAnotacao(entrada.anotacao ?? ''); setEditandoAnotacao(false) }} className="px-3 py-1.5 rounded-full text-[12px] font-bold text-muted cursor-pointer">
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => {
            if (await salvar({ anotacao: anotacao.trim() })) setEditandoAnotacao(false)
          }}
          className="px-4 py-1.5 rounded-full text-[12px] font-extrabold text-void bg-gradient-to-r from-holo-1 to-holo-2 cursor-pointer"
        >
          Salvar anotação
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => {
        setAnotacao(entrada.anotacao ?? '')
        setEditandoAnotacao(true)
      }}
      className="w-full flex items-start gap-2.5 text-left cursor-pointer group"
    >
      <NotebookPen size={15} className="text-muted-2 mt-0.5 shrink-0 group-hover:text-holo-3" aria-hidden />
      {entrada.anotacao ? (
        <span className="text-[13px] text-muted italic line-clamp-2 break-words">“{entrada.anotacao}”</span>
      ) : (
        <span className="text-[13px] text-muted-2 group-hover:text-text">Adicionar anotação pessoal</span>
      )}
    </button>
  )

  const blocoRemover = confirmarRemocao ? (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
      <span className="text-muted">Remover do deck? Nota e anotação somem junto.</span>
      <button type="button" onClick={remover} className="px-3 py-1.5 rounded-full bg-coral text-void font-extrabold cursor-pointer">
        Remover
      </button>
      <button type="button" onClick={() => setConfirmarRemocao(false)} className="p-1.5 text-muted cursor-pointer" aria-label="Cancelar">
        <X size={14} aria-hidden />
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setConfirmarRemocao(true)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-2 hover:text-coral cursor-pointer">
      <Trash2 size={13} aria-hidden /> Remover do deck
    </button>
  )

  // Celular: uma linha com status, nota, favorito e "mais"; cada um abre logo abaixo, sem
  // folha por cima da página. O "continuar" fica sempre à vista, porque é o toque mais comum.
  if (compacto) {
    const alternar = (qual: Expansao) => setAberto(atual => (atual === qual ? null : qual))
    return (
      <div className="rounded-2xl border border-holo-3/30 bg-gradient-to-br from-panel to-panel-2 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alternar('status')}
            aria-expanded={aberto === 'status'}
            className={`flex-1 min-w-0 h-10 inline-flex items-center justify-between gap-1.5 pl-3.5 pr-2.5 rounded-full border text-[13px] font-bold cursor-pointer ${
              aberto === 'status' ? 'border-holo-2 bg-holo-2/20 text-text' : 'border-holo-2/50 bg-holo-2/10 text-text'
            }`}
          >
            <span className="truncate">{statusPendente ?? entrada.status}</span>
            {statusPendente ? <Loader2 size={14} className="animate-spin shrink-0" aria-hidden /> : <ChevronDown size={15} className={`shrink-0 transition-transform ${aberto === 'status' ? 'rotate-180' : ''}`} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => alternar('nota')}
            aria-expanded={aberto === 'nota'}
            aria-label={nota === null ? 'Dar nota' : `Sua nota: ${formatarNota(nota)}. Alterar`}
            className={`h-10 shrink-0 inline-flex items-center gap-1.5 px-3.5 rounded-full border text-[13px] font-bold cursor-pointer ${
              aberto === 'nota' ? 'border-holo-3 bg-holo-3/15 text-text' : nota === null ? 'border-line bg-panel-2 text-muted' : 'border-holo-3/50 bg-holo-3/10 text-holo-3'
            }`}
          >
            <Star size={14} className={nota === null ? '' : 'fill-holo-3'} aria-hidden />
            {nota === null ? 'Nota' : formatarNota(nota)}
          </button>
          {botaoFavorito}
          <button
            type="button"
            onClick={() => alternar('mais')}
            aria-expanded={aberto === 'mais'}
            aria-label="Anotação e remover do deck"
            className={`w-10 h-10 shrink-0 grid place-items-center rounded-full border cursor-pointer ${aberto === 'mais' ? 'border-holo-3 text-text' : 'border-line bg-panel-2 text-muted hover:text-text'}`}
          >
            <MoreHorizontal size={17} aria-hidden />
          </button>
        </div>

        {aberto === 'status' && (
          <div>
            {chipsDeStatus}
            {confirmacaoQueroAssistir}
          </div>
        )}
        {aberto === 'nota' && <ReguaDeNota nota={nota} onSalvar={n => salvar({ nota: n })} />}
        {aberto === 'mais' && (
          <div className="space-y-3 pt-1">
            {blocoAnotacao}
            <div className="pt-3 border-t border-line/70">{blocoRemover}</div>
          </div>
        )}

        {avisoCompleto}
        {botaoContinuar}
        <div className="flex justify-end -mt-1 h-3">{indicadorSalvo}</div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-holo-3/30 bg-gradient-to-br from-panel to-panel-2 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] text-muted-2 uppercase tracking-widest">Na sua lista</span>
        <div className="flex items-center gap-2">
          {indicadorSalvo}
          {botaoFavorito}
        </div>
      </div>

      <div>
        {chipsDeStatus}
        {confirmacaoQueroAssistir}
      </div>

      {avisoCompleto}
      <ReguaDeNota nota={nota} onSalvar={n => salvar({ nota: n })} />
      {botaoContinuar}
      {blocoAnotacao}
      <div className="pt-3 border-t border-line/70">{blocoRemover}</div>
    </div>
  )
}

// Régua de 0 a 10 com meio ponto. Salva sozinha um instante depois de soltar; sem nota,
// a régua aparece apagada e o primeiro toque já define o valor.
function ReguaDeNota({ nota, onSalvar }: { nota: number | null; onSalvar: (nota: number | null) => void }) {
  const [valor, setValor] = useState<number | null>(nota)
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => {
    setValor(nota)
  }, [nota])
  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const agendar = (novo: number | null) => {
    setValor(novo)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      if (novo !== nota) onSalvar(novo)
    }, 700)
  }

  const pct = valor === null ? 0 : (valor / 10) * 100

  return (
    <div>
      <div className="flex items-end justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`font-anton text-[32px] leading-none ${valor === null ? 'text-muted-2' : 'text-holo-3'}`}>
            {valor === null ? '–' : formatarNota(valor)}
          </span>
          <span className="text-[12.5px] font-bold text-muted">{rotuloDaNota(valor)}</span>
        </div>
        {valor !== null && (
          <button type="button" onClick={() => agendar(null)} className="font-mono text-[10.5px] text-muted-2 uppercase tracking-wider hover:text-coral cursor-pointer">
            Limpar
          </button>
        )}
      </div>
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-void/50 border border-line overflow-hidden">
          <div className="h-full bg-gradient-to-r from-holo-2 to-holo-3 transition-[width] duration-150" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={valor ?? 0}
          aria-label="Sua nota de 0 a 10"
          aria-valuetext={valor === null ? 'Sem nota' : `${formatarNota(valor)}, ${rotuloDaNota(valor)}`}
          onChange={e => agendar(ajustarNota(Number(e.target.value)))}
          className={`regua-nota relative w-full appearance-none bg-transparent cursor-pointer ${valor === null ? 'opacity-50' : ''}`}
        />
      </div>
      <div className="flex justify-between font-mono text-[9.5px] text-muted-2 px-0.5 select-none" aria-hidden>
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}
