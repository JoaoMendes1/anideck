// client/src/components/gosto/Indicador.tsx
// Número de relance do topo do dashboard: ícone, valor grande e uma linha de contexto.
import type { ReactNode } from 'react'

export type TomDoIndicador = 'ciano' | 'rosa' | 'roxo' | 'ouro' | 'coral' | 'verde'

const TONS: Record<TomDoIndicador, { icone: string; brilho: string; valor: string }> = {
  ciano: { icone: 'bg-holo-3/15 text-holo-3', brilho: 'bg-holo-3', valor: 'text-text' },
  rosa: { icone: 'bg-holo-1/15 text-holo-1', brilho: 'bg-holo-1', valor: 'text-text' },
  roxo: { icone: 'bg-holo-2/20 text-holo-2', brilho: 'bg-holo-2', valor: 'text-text' },
  ouro: { icone: 'bg-gold/15 text-gold', brilho: 'bg-gold', valor: 'text-gold' },
  coral: { icone: 'bg-coral/15 text-coral', brilho: 'bg-coral', valor: 'text-text' },
  verde: { icone: 'bg-green/15 text-green', brilho: 'bg-green', valor: 'text-text' },
}

interface Props {
  rotulo: string
  valor: ReactNode
  contexto?: ReactNode
  icone: ReactNode
  tom: TomDoIndicador
}

export default function Indicador({ rotulo, valor, contexto, icone, tom }: Props) {
  const t = TONS[tom]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/80 p-3.5 sm:p-4 min-w-0">
      <span aria-hidden className={`pointer-events-none absolute -top-10 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 ${t.brilho}`} />
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`w-7 h-7 shrink-0 grid place-items-center rounded-lg ${t.icone}`}>{icone}</span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-2 truncate">{rotulo}</span>
      </div>
      <div className={`font-anton text-2xl sm:text-3xl leading-none tabular-nums truncate ${t.valor}`}>{valor}</div>
      {contexto && <div className="text-xs text-muted mt-1.5 truncate">{contexto}</div>}
    </div>
  )
}
