export function LogoMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div className={`${className} rounded-[10px] overflow-hidden flex-shrink-0`}>
      <svg width="100%" height="100%" viewBox="0 0 84 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hG_mark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4FD8"/><stop offset="35%" stopColor="#7B5CFF"/><stop offset="65%" stopColor="#3FE0F0"/><stop offset="100%" stopColor="#8be9ff"/>
          </linearGradient>
          <pattern id="hx_mark" width="6" height="10.3923" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
            <path d="M3 0 L6 1.732 L6 5.196 L3 6.928 L0 5.196 L0 1.732 Z" fill="none" stroke="#7B5CFF" strokeWidth="0.3" opacity="0.4"/>
            <circle cx="3" cy="3.464" r="0.5" fill="#3FE0F0" opacity="0.3"/>
          </pattern>
          <clipPath id="cI_mark"><rect x="6" y="8" width="50" height="72" rx="6"/></clipPath>
        </defs>
        <g transform="translate(11,4)">
          <g opacity="0.55">
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-12 28 50)"/>
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(12 28 50)"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG_mark)"/>
          <g clipPath="url(#cI_mark)">
            <rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
            <rect x="8" y="10" width="46" height="68" fill="url(#hx_mark)"/>
            <rect x="-20" y="0" width="30" height="90" fill="url(#hG_mark)" opacity="0" className="sheen-anim-subtle" style={{mixBlendMode: 'screen'}}/>
            <g stroke="url(#hG_mark)" strokeWidth="1.2" fill="none" opacity="0.9">
              <path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
            </g>
            <g transform="translate(31,44)">
              <g className="spin-anim-slow"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" strokeWidth="0.6" transform="rotate(45)" opacity="0.6"/></g>
              <g className="spin-anim-slow-rev"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#FF4FD8" strokeWidth="0.6" transform="rotate(-45)" opacity="0.6"/></g>
              <circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG_mark)" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" className="spin-anim-slow"/>
              <circle cx="0" cy="0" r="12" fill="#05030A"/>
              <circle cx="0" cy="0" r="6" fill="#3FE0F0" className="breathe-anim"/>
              <polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
              <polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
            </g>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG_mark)" strokeWidth="1" opacity="0.9"/>
        </g>
      </svg>
    </div>
  )
}

export function FullLogo({ className = "w-full max-w-[340px]" }: { className?: string }) {
  return (
    <div className={`${className} mx-auto`}>
      <svg width="100%" viewBox="0 0 450 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hG_full" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4FD8"/><stop offset="35%" stopColor="#7B5CFF"/><stop offset="65%" stopColor="#3FE0F0"/><stop offset="100%" stopColor="#8be9ff"/>
          </linearGradient>
          <filter id="dS_full" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.7"/>
          </filter>
        </defs>

        {/* Renderiza o icone usando os mesmos paths do LogoMark */}
        <g transform="translate(20,24)">
          <g opacity="0.55">
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#3FE0F0" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-12 28 50)"/>
            <rect x="4" y="16" width="48" height="68" rx="5" fill="#140d26" stroke="#FF4FD8" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(12 28 50)"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="url(#hG_full)"/>
          <rect x="8" y="10" width="46" height="68" rx="4" fill="#0A0714" opacity="0.97"/>
          <g stroke="url(#hG_full)" strokeWidth="1.2" fill="none" opacity="0.9">
             <path d="M12 24 v-6 a2 2 0 0 1 2-2 h6"/><path d="M50 64 v6 a2 2 0 0 1 -2 2 h-6"/>
          </g>
          <g transform="translate(31,44)">
             <g className="spin-anim-slow"><ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#3FE0F0" strokeWidth="0.6" transform="rotate(45)" opacity="0.6"/></g>
             <circle cx="0" cy="0" r="14" fill="none" stroke="url(#hG_full)" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" className="spin-anim-slow"/>
             <circle cx="0" cy="0" r="12" fill="#05030A"/>
             <circle cx="0" cy="0" r="6" fill="#3FE0F0" className="breathe-anim"/>
             <polygon points="0,-11 4,-4 0,-1 -4,-4" fill="#8be9ff"/><polygon points="4,-4 9,0 0,-1" fill="#3FE0F0"/><polygon points="9,0 4,5 0,-1" fill="#2fb8c9"/><polygon points="4,5 0,11 0,3" fill="#5a3fd6"/><polygon points="0,11 -4,5 0,3" fill="#7B5CFF"/><polygon points="-4,5 -9,0 0,-1" fill="#FF4FD8"/><polygon points="-9,0 -4,-4 0,-1" fill="#ff8de8"/>
             <polygon points="0,-4 3,-1 0,3 -3,-1" fill="#ffffff" opacity="0.9"/>
          </g>
          <rect x="6" y="8" width="50" height="72" rx="6" fill="none" stroke="url(#hG_full)" strokeWidth="1" opacity="0.9"/>
        </g>

        {/* Texto AniDeck */}
        <g transform="translate(110,70)">
          <text x="0" y="0" fontFamily="Anton" fontSize="44" fill="#F1EEFA" filter="url(#dS_full)">Ani<tspan fill="url(#hG_full)">Deck</tspan></text>
          <text x="2" y="24" fontFamily="JetBrains Mono" fontWeight="700" fontSize="11.5" fill="#8C7DBB" letterSpacing="1.5">SEU DECK DE ANIMES, DO SEU JEITO</text>
          <path d="M 2 32 L 15 32 L 20 36 L 270 36" fill="none" stroke="url(#hG_full)" strokeWidth="1.5" opacity="0.5"/>
          <circle cx="2" cy="32" r="2.5" fill="#3FE0F0" className="breathe-anim" />
          <circle cx="270" cy="36" r="2.5" fill="#FF4FD8" className="breathe-anim" />
        </g>
      </svg>
    </div>
  )
}