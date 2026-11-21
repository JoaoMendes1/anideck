// client/src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 text-void font-extrabold shadow-[0_8px_24px_-8px_rgba(255,79,216,0.45)] hover:brightness-110 active:scale-[0.98]',
  secondary:
    'bg-panel-2 border border-line text-text font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-holo-3/60 hover:bg-panel-3 active:scale-[0.98]',
  ghost:
    'bg-transparent border border-transparent text-muted font-bold hover:text-text hover:bg-panel-2/70 active:scale-[0.98]',
  danger:
    'bg-coral/12 border border-coral/45 text-coral font-bold hover:bg-coral hover:text-void active:scale-[0.98]',
  gold:
    'bg-gold/15 border border-gold/45 text-gold font-extrabold hover:bg-gold/25 active:scale-[0.98]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-xl gap-1.5',
  md: 'h-10 px-4 text-xs sm:text-sm rounded-full gap-2',
  lg: 'h-11 px-5 text-sm rounded-full gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
