// client/src/components/ui/Card.tsx
import type { HTMLAttributes, ReactNode } from 'react'

export type CardVariant = 'default' | 'glass' | 'elevated' | 'accent' | 'danger'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'bg-panel border border-line shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  glass:
    'surface-glass',
  elevated:
    'bg-panel-2 border border-line shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_32px_-12px_rgba(0,0,0,0.65)]',
  accent:
    'bg-panel border border-holo-3/35 shadow-[inset_0_1px_0_rgba(63,224,240,0.08),0_16px_36px_-14px_rgba(0,0,0,0.7)]',
  danger:
    'bg-panel border border-coral/40 shadow-[inset_0_1px_0_rgba(255,92,108,0.08)]',
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  children: ReactNode
}

export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
