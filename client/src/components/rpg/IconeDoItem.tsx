// client/src/components/rpg/IconeDoItem.tsx
// O desenho de um item: a arte quando existe, senão o ícone do slot.
import { Sparkles } from 'lucide-react'
import { SLOTS_RPG, type SlotId } from '../../lib/rpg'
import { arteDoItem } from '../../lib/artesRpg'

export default function IconeDoItem({
  id,
  slot,
  tamanho,
  className = '',
}: {
  id?: string
  slot: SlotId
  /** Tamanho do ícone provisório, em px. A arte ocupa a caixa de quem chama. */
  tamanho: number
  className?: string
}) {
  const arte = arteDoItem(id)
  if (arte) {
    return <img src={arte} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className={`h-full w-full object-contain p-0.5 ${className}`} />
  }
  const Icone = SLOTS_RPG.find((s) => s.id === slot)?.Icone ?? Sparkles
  return <Icone size={tamanho} aria-hidden="true" className={className} />
}
