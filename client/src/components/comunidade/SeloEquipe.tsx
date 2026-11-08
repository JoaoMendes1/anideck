// client/src/components/comunidade/SeloEquipe.tsx
// Selo ao lado do nome de quem é da equipe do AniDeck. Aparece só nos @ reservados, que o
// banco não deixa outra conta gravar (sql/042).
import { ShieldCheck } from 'lucide-react'
import { ehDaEquipe } from '../../lib/comunidade'

export default function SeloEquipe({ handle, grande = false }: { handle?: string | null; grande?: boolean }) {
  if (!ehDaEquipe(handle)) return null
  return (
    <span
      title="Equipe do AniDeck"
      className={`inline-flex items-center gap-1 rounded-full border border-holo-3/50 bg-holo-3/12 text-holo-3 font-mono font-bold uppercase shrink-0 ${
        grande ? 'px-2.5 py-0.5 text-[10px]' : 'px-1.5 py-px text-[9px]'
      }`}
    >
      <ShieldCheck size={grande ? 12 : 10} aria-hidden /> Equipe
    </span>
  )
}
