// client/src/components/personagem/CamadaDaAura.tsx
// Camada de luz da aura, desenhada atrás da ilustração do personagem. Ocupa todo o palco
// (o pai precisa ser `relative`) e não recebe clique. Pulsa devagar, e fica parada para
// quem pediu movimento reduzido.
import { obterEstiloDaAura } from '../../lib/cosmeticos'

export default function CamadaDaAura({ estilo }: { estilo?: string | null }) {
  const aura = obterEstiloDaAura(estilo)
  if (!aura) return null

  return (
    <div
      aria-hidden="true"
      data-aura={estilo}
      className="pointer-events-none absolute inset-0 motion-safe:animate-pulse"
      style={{
        backgroundImage: aura.fundo,
        maskImage: aura.mascara,
        WebkitMaskImage: aura.mascara,
      }}
    />
  )
}
