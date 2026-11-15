// client/src/components/gosto/Painel.tsx
// Moldura dos blocos do dashboard do Meu Gosto: mesmo cabeçalho, mesmo respiro.
import type { ReactNode, Ref } from 'react'

interface Props {
  titulo: string
  descricao?: ReactNode
  icone?: ReactNode
  /** Controle à direita do título: abas, selo de variação. */
  acao?: ReactNode
  className?: string
  children: ReactNode
  ref?: Ref<HTMLElement>
}

export default function Painel({ titulo, descricao, icone, acao, className = '', children, ref }: Props) {
  return (
    <section ref={ref} className={`reveal relative flex flex-col rounded-2xl border border-line bg-panel/80 p-4 sm:p-6 overflow-hidden ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-holo-2/60 to-transparent" />
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-4 sm:mb-5">
        <div className="min-w-0">
          <h2 className="font-anton uppercase text-base sm:text-lg tracking-wide flex items-center gap-2 m-0">
            {icone}
            <span>{titulo}</span>
          </h2>
          {descricao && <p className="text-xs text-muted-2 mt-1 leading-relaxed">{descricao}</p>}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </header>
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </section>
  )
}
