// client/src/components/BuscaDoAniDeck.tsx
// Busca do AniDeck: acha telas e funções do site pelo nome ou por palavras do dia a dia
// ("pousada", "trocar arma", "quando sai"). Procurar anime fica como última opção.
// Abre pela lupa do topo ou por Ctrl+K / ⌘K.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, Search, Tv, X } from 'lucide-react'
import { DESTINOS, SUGESTOES_INICIAIS, buscarNoAniDeck, type Destino } from '../lib/buscaInterna'

export default function BuscaDoAniDeck({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const campo = useRef<HTMLInputElement>(null)

  const resultados = useMemo<Destino[]>(
    () => (termo.trim() ? buscarNoAniDeck(termo) : SUGESTOES_INICIAIS.map((c) => DESTINOS.find((d) => d.caminho === c)).filter((d): d is Destino => Boolean(d))),
    [termo],
  )
  // Última linha: procurar o termo como anime.
  const total = resultados.length + (termo.trim() ? 1 : 0)

  useEffect(() => {
    if (!aberta) return
    setTermo('')
    setAtivo(0)
    const t = window.setTimeout(() => campo.current?.focus(), 30)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = antes
    }
  }, [aberta])

  if (!aberta) return null

  const ir = (caminho: string) => {
    aoFechar()
    navigate(caminho)
  }
  const escolher = (i: number) => {
    if (i < resultados.length) ir(resultados[i].caminho)
    else if (termo.trim()) ir(`/descobrir?q=${encodeURIComponent(termo.trim())}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-void/80 p-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-sm sm:pt-[12vh]" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar no AniDeck"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={17} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={campo}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value)
              setAtivo(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') aoFechar()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setAtivo((a) => Math.min(total - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setAtivo((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                escolher(ativo)
              }
            }}
            placeholder="Buscar: pousada, arma, agenda…"
            aria-label="Buscar no AniDeck"
            className="h-12 min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted-2"
          />
          <button type="button" onClick={aoFechar} aria-label="Fechar busca" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <ul role="listbox" aria-label="Resultados" className="m-0 flex-1 list-none overflow-y-auto p-1.5">
          {!termo.trim() && <li className="px-2.5 pb-1 pt-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-2">Atalhos</li>}
          {resultados.map((d, i) => (
            <li key={d.caminho + d.titulo} role="option" aria-selected={ativo === i}>
              <button
                type="button"
                onClick={() => escolher(i)}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left ${ativo === i ? 'bg-panel-2' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-text">{d.titulo}</span>
                  <span className="block truncate text-xs text-muted">{d.descricao}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-muted-2">{d.grupo}</span>
                {ativo === i ? <CornerDownLeft size={14} className="shrink-0 text-muted" aria-hidden="true" /> : <ArrowRight size={14} className="shrink-0 text-muted-2" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {termo.trim() && resultados.length === 0 && <li className="px-2.5 py-2 text-xs text-muted">Nada no AniDeck com esse nome.</li>}
          {termo.trim() && (
            <li role="option" aria-selected={ativo === resultados.length}>
              <button
                type="button"
                onClick={() => escolher(resultados.length)}
                onMouseEnter={() => setAtivo(resultados.length)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left ${ativo === resultados.length ? 'bg-panel-2' : ''}`}
              >
                <Tv size={16} className="shrink-0 text-holo-3" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  Procurar anime: <strong>“{termo.trim()}”</strong>
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
