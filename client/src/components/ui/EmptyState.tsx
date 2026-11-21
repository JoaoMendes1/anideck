// client/src/components/ui/EmptyState.tsx
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel/80 p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-3 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-panel-2 border border-line flex items-center justify-center text-holo-3">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <h2 className="text-base sm:text-lg font-extrabold text-text m-0">{title}</h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted leading-relaxed m-0">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
