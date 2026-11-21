// client/src/components/ui/PageHeader.tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  actions?: ReactNode
  /** Usa Anton apenas para títulos de destaque Hero; padrão usa Manrope alinhada para leitura limpa. */
  display?: boolean
  className?: string
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel = 'Voltar',
  actions,
  display = false,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0 space-y-1.5">
        {(backTo || eyebrow) && (
          <div className="flex flex-wrap items-center gap-2.5">
            {backTo && (
              <Link
                to={backTo}
                aria-label={backLabel}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-panel-2 px-3 text-xs font-bold text-text transition-colors hover:border-holo-3/60 hover:text-holo-3"
              >
                <ChevronLeft size={15} aria-hidden="true" />
                <span>{backLabel}</span>
              </Link>
            )}
            {eyebrow && (
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-holo-3 m-0">
                {eyebrow}
              </p>
            )}
          </div>
        )}
        <h1
          className={
            display
              ? 'font-anton text-2xl sm:text-4xl uppercase tracking-wide leading-none text-text m-0'
              : 'font-manrope text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-text m-0'
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted leading-relaxed m-0 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
