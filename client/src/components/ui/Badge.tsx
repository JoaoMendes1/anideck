// client/src/components/ui/Badge.tsx
import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'holo' | 'cyan' | 'gold' | 'green' | 'coral' | 'mana'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-panel-2 border-line text-muted',
  holo: 'bg-holo-1/12 border-holo-1/35 text-holo-1',
  cyan: 'bg-holo-3/12 border-holo-3/35 text-holo-3',
  gold: 'bg-gold/12 border-gold/40 text-gold',
  green: 'bg-green/12 border-green/40 text-green',
  coral: 'bg-coral/12 border-coral/40 text-coral',
  mana: 'bg-mana/12 border-mana/40 text-mana',
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}

export default function Badge({ variant = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums leading-tight whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
