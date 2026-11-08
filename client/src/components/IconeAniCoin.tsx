// client/src/components/IconeAniCoin.tsx
// Ícone vetorial oficial da moeda do AniDeck: AniCoin (₳).
interface IconeAniCoinProps {
  size?: number
  className?: string
  animar?: boolean
}

export default function IconeAniCoin({ size = 16, className = '', animar = false }: IconeAniCoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none align-middle ${animar ? 'hover:rotate-12 transition-transform duration-300' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Gradiente exterior da borda metálica da moeda */}
        <linearGradient id="anicoin-borda" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3FE0F0" />
          <stop offset="50%" stopColor="#7B5CFF" />
          <stop offset="100%" stopColor="#FF4FD8" />
        </linearGradient>

        {/* Gradiente de preenchimento com efeito de profundidade holográfica */}
        <linearGradient id="anicoin-fundo" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1638" />
          <stop offset="100%" stopColor="#0D091A" />
        </linearGradient>

        {/* Gradiente do glifo central ₳ */}
        <linearGradient id="anicoin-glifo" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3FE0F0" />
          <stop offset="45%" stopColor="#FFC542" />
          <stop offset="100%" stopColor="#FF4FD8" />
        </linearGradient>
      </defs>

      {/* Círculo externo metálico */}
      <circle cx="12" cy="12" r="10" stroke="url(#anicoin-borda)" strokeWidth="1.75" />

      {/* Fundo escuro com profundidade interna */}
      <circle cx="12" cy="12" r="8.75" fill="url(#anicoin-fundo)" />

      {/* Anel chanfrado interno */}
      <circle cx="12" cy="12" r="7.5" stroke="url(#anicoin-borda)" strokeWidth="0.6" strokeDasharray="1.5 1" opacity="0.6" />

      {/* Glifo estilizado da AniCoin (A maiúsculo chanfrado com traço de moeda atravessando) */}
      <path
        d="M12 6L7.5 17H9.8L10.9 14.2H13.1L14.2 17H16.5L12 6ZM11.4 12.3L12 10.3L12.6 12.3H11.4Z"
        fill="url(#anicoin-glifo)"
      />

      {/* Traço duplo horizontal característico de moeda (estilo ₳) */}
      <path
        d="M6 12.3H18M7 10.3H17"
        stroke="url(#anicoin-glifo)"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  )
}
