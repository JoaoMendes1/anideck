// client/src/components/ui/Tabs.tsx
import type { ReactNode } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
  badge?: string | number
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  ariaLabel: string
  className?: string
}

export default function Tabs<T extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  className = '',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 p-1 rounded-2xl bg-panel border border-line w-fit max-w-full overflow-x-auto scrollbar-none select-none ${className}`}
    >
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void font-extrabold shadow-[0_6px_18px_-6px_rgba(123,92,255,0.55)]'
                : 'text-muted hover:text-text hover:bg-panel-2/80'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full font-mono text-xs tabular-nums leading-none ${
                  active ? 'bg-void/20 text-void' : 'bg-panel-2 text-muted-2'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
