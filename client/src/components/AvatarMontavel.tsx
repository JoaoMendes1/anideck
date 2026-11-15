// client/src/components/AvatarMontavel.tsx
// Avatar montável: um busto em estilo anime desenhado em camadas (cabelo de trás, ombros,
// rosto, olhos, boca, franja, acessório). As opções e as cores vêm de lib/avatar.ts; o
// desenho não guarda nada além do que o usuário escolheu, então avatar salvo antes continua válido.
import { useId, useMemo } from 'react'
import { normalizarAvatar, type AvatarCustom, OPCOES_FUNDO } from '../lib/avatar'

interface Props {
  avatar?: AvatarCustom | null
  url?: string | null
  nome?: string | null
  tamanho?: number
  className?: string
}

export default function AvatarMontavel({
  avatar,
  url,
  nome = 'A',
  tamanho = 48,
  className = '',
}: Props) {
  const c = useMemo(() => normalizarAvatar(avatar), [avatar])
  const idLuz = useId()
  const fundoItem = OPCOES_FUNDO.find(f => f.id === c.fundo) || OPCOES_FUNDO[0]

  // Se não houver avatar customizado, mas houver url externa (ex: Google OAuth ou gravatar)
  if (!avatar && url) {
    return (
      <img
        src={url}
        alt={nome || 'Avatar'}
        width={tamanho}
        height={tamanho}
        className={`rounded-full object-cover border border-line ${className}`}
        style={{ width: tamanho, height: tamanho }}
      />
    )
  }

  // Se não houver nem avatar nem url, renderiza inicial minimalista
  if (!avatar && !url) {
    const inicial = (nome || 'A').trim().charAt(0).toUpperCase()
    return (
      <div
        className={`rounded-full bg-panel-2 border border-line flex items-center justify-center font-bold text-holo-2 select-none ${className}`}
        style={{ width: tamanho, height: tamanho, fontSize: Math.max(12, Math.floor(tamanho * 0.42)) }}
      >
        {inicial}
      </div>
    )
  }

  const sobrancelha = c.cabelo === 'careca' ? '#2a2440' : c.cor_cabelo
  const TRACO = '#1a1530'

  // Um olho aberto, no estilo anime: branco, íris com a parte de cima escurecida pela
  // pálpebra, pupila, dois brilhos e o cílio de cima. `lado` vira o cílio para fora.
  const olhoAberto = (x: number, lado: 1 | -1, altura = 5.6) => (
    <g>
      <ellipse cx={x} cy="49.6" rx="5.3" ry={altura} fill="#ffffff" />
      <ellipse cx={x} cy="50" rx="4.1" ry={Math.min(5, altura)} fill={c.cor_olhos} />
      <ellipse cx={x} cy="47.6" rx="4.1" ry="2.6" fill="#000000" opacity="0.28" />
      <ellipse cx={x} cy="50.2" rx="1.7" ry="2.5" fill="#0b1020" />
      <circle cx={x - 1.6} cy="47.8" r="1.5" fill="#ffffff" />
      <circle cx={x + 1.7} cy="52.6" r="0.8" fill="#ffffff" opacity="0.9" />
      <path d={`M${x - 6.2 * lado} 47.4 Q${x} ${49.6 - altura - 2.2} ${x + 6.4 * lado} 46.6 l${1.7 * lado} -1.3`} fill="none" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${x - 3.4} 55.4 Q${x} 56.4 ${x + 3.4} 55.4`} fill="none" stroke={TRACO} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    </g>
  )
  const olhoFechado = (x: number, paraCima: boolean) => (
    <path
      d={paraCima ? `M${x - 5.5} 50.5 Q${x} 45.2 ${x + 5.5} 50.5` : `M${x - 5.5} 48.6 Q${x} 53.2 ${x + 5.5} 48.6`}
      fill="none" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round"
    />
  )

  return (
    <div
      className={`relative inline-block overflow-hidden select-none border border-white/15 ${
        c.base === 'quadrado' ? 'rounded-2xl' : c.base === 'losango' ? 'rounded-xl rotate-45' : 'rounded-full'
      } ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
        background: fundoItem.gradiente,
      }}
    >
      <div className={c.base === 'losango' ? '-rotate-45 scale-[1.3] w-full h-full' : 'w-full h-full'}>
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={nome ? `Avatar de ${nome}` : 'Avatar'}
        >
          <defs>
            <radialGradient id={idLuz} cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Luz de fundo atrás da cabeça. */}
          <rect x="0" y="0" width="100" height="100" fill={`url(#${idLuz})`} />

          {/* O busto é aproximado para o rosto ocupar o quadro: em 36 px ainda se lê. */}
          <g transform="translate(50 53) scale(1.2) translate(-50 -48)">

          {/* 1. Cabelo de trás */}
          {c.cabelo === 'longo' && (
            <path d="M24 44 C18 18 82 18 76 44 C82 62 84 82 79 100 L21 100 C16 82 18 62 24 44 Z" fill={c.cor_cabelo} />
          )}
          {(c.cabelo === 'curto' || c.cabelo === 'espigado') && (
            <path d="M25.5 46 C22 20 78 20 74.5 46 L73.5 57 L26.5 57 Z" fill={c.cor_cabelo} />
          )}
          {c.cabelo === 'coque' && (
            <g>
              <circle cx="50" cy="14" r="9.5" fill={c.cor_cabelo} />
              <path d="M43.5 12 Q50 7.5 56.5 12" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.25" />
              <path d="M26 46 C23 22 77 22 74 46 L73 54 L27 54 Z" fill={c.cor_cabelo} />
            </g>
          )}
          {c.cabelo !== 'careca' && (
            <path d="M24 44 C18 18 82 18 76 44 L76 100 L24 100 Z" fill="#000000" opacity={c.cabelo === 'longo' ? 0.22 : 0} />
          )}

          {/* 2. Ombros, gola e pescoço */}
          <path d="M43 60 L43 81 Q50 87 57 81 L57 60 Z" fill={c.pele} />
          <path d="M43 64 Q50 74 57 64 L57 60 L43 60 Z" fill="#000000" opacity="0.2" />
          <path d="M13 100 C15 87 29 82 43 79 L50 90 L57 79 C71 82 85 87 87 100 Z" fill="#191634" />
          <path d="M13 100 C15 87 29 82 43 79 L46.5 84.5 C34 86 24 91 21 100 Z" fill="#ffffff" opacity="0.06" />
          <path d="M43 79 L50 90 L57 79" fill="none" stroke={c.cor_olhos} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

          {/* 3. Orelhas e rosto */}
          <ellipse cx="27.6" cy="50" rx="4" ry="5.6" fill={c.pele} />
          <ellipse cx="72.4" cy="50" rx="4" ry="5.6" fill={c.pele} />
          <ellipse cx="27.9" cy="50.3" rx="1.8" ry="3" fill="#000000" opacity="0.14" />
          <ellipse cx="72.1" cy="50.3" rx="1.8" ry="3" fill="#000000" opacity="0.14" />
          <path d="M28 42 C28 23 72 23 72 42 C72 54 66 64.5 57 69.2 Q50 72.6 43 69.2 C34 64.5 28 54 28 42 Z" fill={c.pele} />
          {/* Sombra que a franja faz na testa e contorno suave do queixo. */}
          {c.cabelo !== 'careca' && <path d="M28 42 C28 23 72 23 72 42 C66 35.5 34 35.5 28 42 Z" fill="#000000" opacity="0.12" />}
          <path d="M33 60 C36.5 66 43 70.6 50 70.9 C57 70.6 63.5 66 67 60 C64.5 67 57.5 72.4 50 72.4 C42.5 72.4 35.5 67 33 60 Z" fill="#000000" opacity="0.08" />

          {/* 4. Sobrancelhas */}
          {c.olhos === 'determinado' ? (
            <g stroke={sobrancelha} strokeWidth="2.3" strokeLinecap="round">
              <path d="M33.5 40.6 L46 43.6" />
              <path d="M66.5 40.6 L54 43.6" />
            </g>
          ) : (
            <g fill="none" stroke={sobrancelha} strokeWidth="1.6" strokeLinecap="round" opacity="0.92">
              <path d="M34.5 41.6 Q40 39.4 45.6 41.2" />
              <path d="M65.5 41.6 Q60 39.4 54.4 41.2" />
            </g>
          )}

          {/* 5. Olhos */}
          {c.olhos === 'brilho' && <g>{olhoAberto(40, -1)}{olhoAberto(60, 1)}</g>}
          {c.olhos === 'determinado' && (
            <g>
              {olhoAberto(40, -1, 4)}
              {olhoAberto(60, 1, 4)}
              {/* A pálpebra desce em direção ao nariz: é o que dá o olhar firme. */}
              <path d="M33.6 46.2 L46.6 48.4 L46.6 44 L33.6 43 Z" fill={c.pele} />
              <path d="M66.4 46.2 L53.4 48.4 L53.4 44 L66.4 43 Z" fill={c.pele} />
              <path d="M33.6 46.2 L46.6 48.4" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round" />
              <path d="M66.4 46.2 L53.4 48.4" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round" />
            </g>
          )}
          {c.olhos === 'tranquilo' && <g>{olhoFechado(40, true)}{olhoFechado(60, true)}</g>}
          {c.olhos === 'piscada' && <g>{olhoAberto(40, -1)}{olhoFechado(60, false)}</g>}
          {c.olhos === 'dorminhoco' && (
            <g>
              {olhoAberto(40, -1, 4.4)}
              {olhoAberto(60, 1, 4.4)}
              <path d="M33.4 49.2 L33.4 43 L46.8 43 L46.8 49.2 Z" fill={c.pele} />
              <path d="M53.2 49.2 L53.2 43 L66.6 43 L66.6 49.2 Z" fill={c.pele} />
              <path d="M33.8 49.2 L46.4 49.2" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round" />
              <path d="M53.6 49.2 L66.2 49.2" stroke={TRACO} strokeWidth="2.1" strokeLinecap="round" />
            </g>
          )}

          {/* 6. Nariz, bochechas e boca */}
          <path d="M49.2 57.6 Q50 58.8 51.1 57.9" fill="none" stroke="#000000" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
          <ellipse cx="34.6" cy="57.4" rx="3.6" ry="1.9" fill="#ff5c7a" opacity="0.26" />
          <ellipse cx="65.4" cy="57.4" rx="3.6" ry="1.9" fill="#ff5c7a" opacity="0.26" />
          {c.boca === 'sorriso' && <path d="M45.4 62.4 Q50 66 54.6 62.4" fill="none" stroke="#3a1f2b" strokeWidth="1.6" strokeLinecap="round" />}
          {c.boca === 'alegre' && (
            <g>
              <path d="M44.8 61.8 Q50 69 55.2 61.8 Z" fill="#7a1f35" stroke="#3a1f2b" strokeWidth="1" strokeLinejoin="round" />
              <ellipse cx="50" cy="65.3" rx="2.2" ry="1.1" fill="#f0708a" />
            </g>
          )}
          {c.boca === 'neutro' && <path d="M46.6 63.4 L53.4 63.4" stroke="#3a1f2b" strokeWidth="1.6" strokeLinecap="round" />}
          {c.boca === 'foco' && <path d="M46 64 Q50 62.4 54 63.6" fill="none" stroke="#3a1f2b" strokeWidth="1.6" strokeLinecap="round" />}
          {c.boca === 'gato' && <path d="M45.4 62.2 Q47.8 65.4 50 62.8 Q52.2 65.4 54.6 62.2" fill="none" stroke="#3a1f2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* 7. Franja, com um reflexo de luz por cima */}
          {c.cabelo === 'curto' && (
            <path d="M26.5 45.5 C23.5 21 76.5 21 73.5 45.5 C71.5 39 68 35.5 64 33.6 C63 38 60 41.2 57 42.6 C57.6 39.2 56.6 36.6 55 34.6 C52 39.2 47 42.2 42 43.2 C43 40.2 43 37.2 42 34.6 C39 38.2 34 40.2 30.5 40.8 C28.5 41.8 27 43.4 26.5 45.5 Z" fill={c.cor_cabelo} />
          )}
          {c.cabelo === 'espigado' && (
            <path d="M26 46.5 C24 37 25 29 21.5 20.5 L33 27.5 L36 13 L45 24.5 L52 9 L58 24.5 L67 14 L68 28.5 L79.5 22 C75.5 30 76 38 74 46.5 C72 40.5 69 36.5 65 34.4 L62 42.4 L57 34.4 L52 43.4 L47 34.4 L42 42.4 L37 34.4 C32 36.5 28 40.5 26 46.5 Z" fill={c.cor_cabelo} />
          )}
          {c.cabelo === 'longo' && (
            <g fill={c.cor_cabelo}>
              <path d="M26.5 46 C23 21 77 21 73.5 46 C72 39.2 68 35.2 63 33.6 C60 39.2 54 42.6 47 43.2 C49 40.2 49.6 37.2 49 34.6 C44 39.2 36 41.2 30 41.2 C28 42.2 27 44 26.5 46 Z" />
              <path d="M26.6 43 C23.5 56 24.5 69 28.5 80 L33 77.5 C30 67 29.6 55 30.8 43 Z" />
              <path d="M73.4 43 C76.5 56 75.5 69 71.5 80 L67 77.5 C70 67 70.4 55 69.2 43 Z" />
            </g>
          )}
          {c.cabelo === 'coque' && (
            <g>
              <path d="M27 44.5 C25 23 75 23 73 44.5 C70 36.5 62 31.4 50 30.9 C38 31.4 30 36.5 27 44.5 Z" fill={c.cor_cabelo} />
              <rect x="45.5" y="21.2" width="9" height="2.6" rx="1.3" fill={c.cor_olhos} />
            </g>
          )}
          {c.cabelo !== 'careca' && (
            <path d="M33.5 31.5 Q46 24.6 61 28.8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.26" />
          )}

          {/* 8. Acessórios */}
          {c.acessorio === 'oculos' && (
            <g fill="rgba(160, 215, 255, 0.14)" stroke="#e6e9ff" strokeWidth="1.4">
              <circle cx="40" cy="49.6" r="7.2" />
              <circle cx="60" cy="49.6" r="7.2" />
              <path d="M47.2 49 Q50 47.4 52.8 49" fill="none" />
              <path d="M32.8 48.6 L28 47.4 M67.2 48.6 L72 47.4" fill="none" strokeLinecap="round" />
            </g>
          )}
          {c.acessorio === 'bandana' && (
            <g>
              <path d="M74 37.5 L82 41.5 L80.5 45.5 L74 41.5 Z M74 39 L80 48 L76.5 49.5 L72.5 41.5 Z" fill="#b3123a" />
              <path d="M26.6 36.6 Q50 30.6 73.4 36.6 L73.6 42.4 Q50 36.6 26.4 42.4 Z" fill="#e11d48" />
              <rect x="43" y="33" width="14" height="5.4" rx="1.2" fill="#d5dbe6" stroke="#475569" strokeWidth="0.7" />
              <path d="M47.4 35.7 h5.2" stroke="#475569" strokeWidth="0.8" strokeLinecap="round" />
            </g>
          )}
          {c.acessorio === 'fone' && (
            <g>
              <path d="M24 46 C21.5 10.5 78.5 10.5 76 46" fill="none" stroke="#22d3ee" strokeWidth="3.4" strokeLinecap="round" />
              <rect x="19.5" y="42" width="8" height="16" rx="4" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.2" />
              <rect x="72.5" y="42" width="8" height="16" rx="4" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.2" />
            </g>
          )}
          {c.acessorio === 'coroa' && (
            <g>
              <path d="M35.5 23 L38.5 9.5 L45 17.5 L50 6.5 L55 17.5 L61.5 9.5 L64.5 23 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" strokeLinejoin="round" />
              <path d="M35.5 23 L64.5 23" stroke="#b45309" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="50" cy="16.5" r="1.7" fill="#ef4444" />
              <circle cx="41.5" cy="18.6" r="1.2" fill="#38bdf8" />
              <circle cx="58.5" cy="18.6" r="1.2" fill="#38bdf8" />
            </g>
          )}
          </g>
        </svg>
      </div>
    </div>
  )
}
