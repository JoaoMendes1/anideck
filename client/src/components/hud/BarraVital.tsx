// client/src/components/hud/BarraVital.tsx
// Barra de progresso dos indicadores do jogador. Uma cor por indicador, igual em todo o
// app: XP dourado, Vitalidade coral e Mana azul (ver docs/DESIGN_TOKENS.md).

export type TipoDeBarra = 'xp' | 'hp' | 'mp'

const COR_DA_BARRA: Record<TipoDeBarra, string> = {
  xp: 'bg-gold',
  hp: 'bg-coral',
  mp: 'bg-mana',
}

interface Props {
  tipo: TipoDeBarra
  /** De 0 a 100; valores fora da faixa são ajustados. */
  pct: number
  /** Classes de tamanho, como "h-1.5 w-full". */
  className?: string
}

export default function BarraVital({ tipo, pct, className = 'h-1.5 w-full' }: Props) {
  const largura = Math.min(100, Math.max(0, pct))
  return (
    <span className={`block rounded-full bg-void/70 overflow-hidden ${className}`}>
      <span
        className={`block h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${COR_DA_BARRA[tipo]} ${largura > 0 ? 'min-w-2' : ''}`}
        style={{ width: `${largura}%` }}
      />
    </span>
  )
}
