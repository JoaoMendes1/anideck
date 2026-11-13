// client/src/components/AvatarMontavel.tsx
// Renderizador de avatar vetorial em camadas geométricas (Fase 17.6, #192)
import { useMemo } from 'react'
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

  return (
    <div
      className={`relative inline-block overflow-hidden select-none border border-line/60 shadow-inner ${
        c.base === 'quadrado' ? 'rounded-2xl' : c.base === 'losango' ? 'rounded-xl rotate-45' : 'rounded-full'
      } ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
        background: fundoItem.gradiente,
      }}
    >
      <div className={c.base === 'losango' ? '-rotate-45 w-full h-full' : 'w-full h-full'}>
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id={`sombra-${c.pele}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 1. Cabelo Traseiro (Longo / Coque) */}
          {c.cabelo === 'longo' && (
            <path
              d="M 22 45 C 15 70, 15 90, 25 98 C 30 100, 70 100, 75 98 C 85 90, 85 70, 78 45 Z"
              fill={c.cor_cabelo}
            />
          )}
          {c.cabelo === 'coque' && (
            <circle cx="50" cy="18" r="14" fill={c.cor_cabelo} />
          )}

          {/* 2. Base da Cabeça / Rosto */}
          <ellipse
            cx="50"
            cy="54"
            rx="27"
            ry="29"
            fill={c.pele}
            filter={`url(#sombra-${c.pele})`}
          />

          {/* Orelhas */}
          <circle cx="23" cy="54" r="5.5" fill={c.pele} />
          <circle cx="77" cy="54" r="5.5" fill={c.pele} />

          {/* 3. Olhos */}
          {c.olhos === 'brilho' && (
            <g>
              {/* Esquerdo */}
              <ellipse cx="40" cy="52" rx="5.5" ry="7" fill="#0f172a" />
              <ellipse cx="40" cy="53" rx="4.5" ry="5.5" fill={c.cor_olhos} />
              <circle cx="38" cy="50" r="2.2" fill="#ffffff" />
              <circle cx="42" cy="55" r="1.1" fill="#ffffff" />

              {/* Direito */}
              <ellipse cx="60" cy="52" rx="5.5" ry="7" fill="#0f172a" />
              <ellipse cx="60" cy="53" rx="4.5" ry="5.5" fill={c.cor_olhos} />
              <circle cx="58" cy="50" r="2.2" fill="#ffffff" />
              <circle cx="62" cy="55" r="1.1" fill="#ffffff" />
            </g>
          )}

          {c.olhos === 'determinado' && (
            <g>
              {/* Sobrancelhas afiadas */}
              <path d="M 32 44 L 46 47" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 68 44 L 54 47" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {/* Olhos angulados */}
              <polygon points="34,49 46,51 43,56 35,55" fill={c.cor_olhos} />
              <circle cx="40" cy="52" r="2.2" fill="#ffffff" />
              <polygon points="66,49 54,51 57,56 65,55" fill={c.cor_olhos} />
              <circle cx="60" cy="52" r="2.2" fill="#ffffff" />
            </g>
          )}

          {c.olhos === 'tranquilo' && (
            <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M 34 53 Q 40 48 46 53" />
              <path d="M 54 53 Q 60 48 66 53" />
            </g>
          )}

          {c.olhos === 'piscada' && (
            <g>
              {/* Esquerdo aberto */}
              <ellipse cx="40" cy="52" rx="5.5" ry="7" fill="#0f172a" />
              <ellipse cx="40" cy="53" rx="4.5" ry="5.5" fill={c.cor_olhos} />
              <circle cx="38" cy="50" r="2.2" fill="#ffffff" />
              {/* Direito piscando */}
              <path d="M 54 53 Q 60 57 66 53" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {c.olhos === 'dorminhoco' && (
            <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M 34 52 L 46 52" />
              <path d="M 54 52 L 66 52" />
            </g>
          )}

          {/* 4. Boca */}
          {c.boca === 'sorriso' && (
            <path d="M 44 65 Q 50 71 56 65" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}
          {c.boca === 'alegre' && (
            <path d="M 43 64 Q 50 75 57 64 Z" fill="#e11d48" stroke="#1e293b" strokeWidth="1.5" />
          )}
          {c.boca === 'neutro' && (
            <path d="M 45 66 L 55 66" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          )}
          {c.boca === 'foco' && (
            <path d="M 44 67 L 56 65" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          )}
          {c.boca === 'gato' && (
            <path d="M 44 65 Q 47 69 50 66 Q 53 69 56 65" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}

          {/* Bochechinhas coradas sutis */}
          <circle cx="33" cy="59" r="3.5" fill="#f43f5e" opacity="0.3" />
          <circle cx="67" cy="59" r="3.5" fill="#f43f5e" opacity="0.3" />

          {/* 5. Cabelo Frontal */}
          {c.cabelo === 'curto' && (
            <path
              d="M 23 48 C 22 28, 78 28, 77 48 C 72 40, 64 38, 55 42 C 48 38, 40 40, 32 46 C 28 42, 25 45, 23 48 Z"
              fill={c.cor_cabelo}
            />
          )}
          {c.cabelo === 'espigado' && (
            <path
              d="M 23 50 L 20 32 L 32 35 L 36 20 L 50 30 L 64 20 L 68 35 L 80 32 L 77 50 C 70 42, 60 40, 50 44 C 40 40, 30 42, 23 50 Z"
              fill={c.cor_cabelo}
            />
          )}
          {c.cabelo === 'longo' && (
            <path
              d="M 23 48 C 22 26, 78 26, 77 48 C 74 38, 65 38, 55 43 C 45 38, 36 38, 33 46 L 27 68 L 22 55 Z"
              fill={c.cor_cabelo}
            />
          )}
          {c.cabelo === 'coque' && (
            <path
              d="M 24 46 C 24 30, 76 30, 76 46 C 70 38, 58 37, 50 41 C 42 37, 30 38, 24 46 Z"
              fill={c.cor_cabelo}
            />
          )}

          {/* 6. Acessórios */}
          {c.acessorio === 'oculos' && (
            <g stroke="#38bdf8" strokeWidth="2.2" fill="rgba(56, 189, 248, 0.2)">
              <rect x="31" y="47" width="16" height="11" rx="3" />
              <rect x="53" y="47" width="16" height="11" rx="3" />
              <line x1="47" y1="52" x2="53" y2="52" strokeWidth="2" />
            </g>
          )}

          {c.acessorio === 'bandana' && (
            <g>
              <path d="M 23 37 Q 50 39 77 37 L 76 45 Q 50 47 24 45 Z" fill="#e11d48" />
              <rect x="42" y="39" width="16" height="6" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
            </g>
          )}

          {c.acessorio === 'fone' && (
            <g>
              {/* Arco */}
              <path d="M 22 50 C 20 22, 80 22, 78 50" fill="none" stroke="#0ea5e9" strokeWidth="4.5" strokeLinecap="round" />
              {/* Conchas */}
              <rect x="18" y="46" width="6" height="16" rx="3" fill="#0284c7" />
              <rect x="76" y="46" width="6" height="16" rx="3" fill="#0284c7" />
            </g>
          )}

          {c.acessorio === 'coroa' && (
            <polygon
              points="34,26 40,33 50,22 60,33 66,26 64,36 36,36"
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth="1.2"
            />
          )}
        </svg>
      </div>
    </div>
  )
}
