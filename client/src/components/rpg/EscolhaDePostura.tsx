// client/src/components/rpg/EscolhaDePostura.tsx
// A decisão antes da luta: três posturas num controle compacto e a explicação da escolhida.
import { useState } from 'react'
import { POSTURAS, lerPostura, salvarPostura, type Postura } from '../../lib/postura'

export default function EscolhaDePostura({ aoMudar }: { aoMudar?: (p: Postura) => void }) {
  const [postura, setPostura] = useState<Postura>(lerPostura)
  const atual = POSTURAS.find((p) => p.id === postura) ?? POSTURAS[1]
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label="Postura na luta" className="flex rounded-full border border-line bg-void/60 p-0.5">
        {POSTURAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={postura === p.id}
            onClick={() => {
              setPostura(p.id)
              salvarPostura(p.id)
              aoMudar?.(p.id)
            }}
            className={`h-8 flex-1 cursor-pointer rounded-full px-2 text-xs font-bold ${
              postura === p.id ? 'bg-holo-2 text-void' : 'text-muted hover:text-text'
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>
      <p className="m-0 text-xs leading-snug text-muted">{atual.resumo}</p>
    </div>
  )
}
