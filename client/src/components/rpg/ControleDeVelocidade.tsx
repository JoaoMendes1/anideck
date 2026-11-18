// client/src/components/rpg/ControleDeVelocidade.tsx
// 1x, 2x, 4x e Pular, para a reprodução das batalhas.
import { FastForward } from 'lucide-react'
import { VELOCIDADES, type Velocidade } from '../../lib/velocidadeBatalha'

export default function ControleDeVelocidade({
  velocidade,
  aoMudar,
  aoPular,
}: {
  velocidade: Velocidade
  aoMudar: (v: Velocidade) => void
  aoPular: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Velocidade da batalha">
      <div className="inline-flex rounded-full border border-line bg-panel p-0.5">
        {VELOCIDADES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => aoMudar(v)}
            aria-pressed={velocidade === v}
            className={`h-9 min-w-11 cursor-pointer rounded-full px-3 font-mono text-xs font-bold ${
              velocidade === v ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
            }`}
          >
            {v}x
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={aoPular}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text"
      >
        <FastForward size={14} aria-hidden="true" /> Pular
      </button>
    </div>
  )
}
