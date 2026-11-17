// client/src/components/IconeOuro.tsx
// Ícone vetorial do Ouro do RPG: duas moedas douradas empilhadas, com borda serrilhada e um
// brilho de quatro pontas. Fica ao lado do AniCoin na barra do topo, então as duas moedas
// precisam ser reconhecíveis de longe: o AniCoin é holográfico (ciano e rosa), o Ouro é
// metal amarelo.
import { useId } from 'react'

interface Props {
  size?: number
  className?: string
}

export default function IconeOuro({ size = 16, className = '' }: Props) {
  // Ids únicos por ícone, pelo mesmo motivo do IconeAniCoin: com id fixo, todos os ícones
  // apontariam para o gradiente do primeiro e sumiriam quando ele estivesse oculto.
  const p = `ouro-${useId().replace(/:/g, '')}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none align-middle ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${p}-face`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="45%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#C77A0A" />
        </radialGradient>
        <linearGradient id={`${p}-borda`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE58A" />
          <stop offset="100%" stopColor="#8A4F05" />
        </linearGradient>
        <linearGradient id={`${p}-tras`} x1="6" y1="8" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9A21F" />
          <stop offset="100%" stopColor="#7A4304" />
        </linearGradient>
      </defs>

      {/* Moeda de trás, deslocada para baixo e à direita: dá volume sem ocupar mais espaço. */}
      <circle cx="14.5" cy="14.5" r="7.5" fill={`url(#${p}-tras)`} />
      <circle cx="14.5" cy="14.5" r="7.5" stroke="#5C3303" strokeWidth="0.8" opacity="0.6" />

      {/* Moeda da frente */}
      <circle cx="10" cy="10" r="8" fill={`url(#${p}-face)`} />
      <circle cx="10" cy="10" r="8" stroke={`url(#${p}-borda)`} strokeWidth="1.2" />
      {/* Serrilhado da borda */}
      <circle cx="10" cy="10" r="6.6" stroke="#9C5A06" strokeWidth="0.7" strokeDasharray="1 1.1" opacity="0.55" />

      {/* Brilho de quatro pontas no centro */}
      <path d="M10 5.2 L11.1 8.9 L14.8 10 L11.1 11.1 L10 14.8 L8.9 11.1 L5.2 10 L8.9 8.9 Z" fill="#FFF8D6" />
      <path d="M10 5.2 L11.1 8.9 L14.8 10 L11.1 11.1 L10 14.8 L8.9 11.1 L5.2 10 L8.9 8.9 Z" stroke="#B86E08" strokeWidth="0.5" strokeLinejoin="round" opacity="0.7" />

      {/* Reflexo no alto da moeda */}
      <path d="M5.2 7.2 A5.6 5.6 0 0 1 8.4 4.4" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
    </svg>
  )
}
