// client/src/components/AvatarMontavel.tsx
// Avatar do jogador: o retrato do personagem dele (recorte da ilustração do estágio atual)
// sobre o fundo e no formato que ele escolheu. Substitui o rosto montado por peças em SVG,
// que não chegava perto do traço das ilustrações do app. Do avatar salvo só valem `fundo` e
// `base`; os outros campos de um avatar antigo são ignorados.
import { useMemo } from 'react'
import { normalizarAvatar, type AvatarCustom, OPCOES_FUNDO } from '../lib/avatar'
import { ARTES, PERSONAGEM_BASE_PADRAO, ORDEM_DOS_ESTAGIOS } from '../lib/personagem'

interface Props {
  avatar?: AvatarCustom | null
  url?: string | null
  nome?: string | null
  tamanho?: number
  className?: string
  /** Retrato do estágio atual do personagem. Sem ele, usa o do primeiro estágio. */
  retrato?: string
}

const RETRATO_PADRAO = ARTES[PERSONAGEM_BASE_PADRAO]?.[ORDEM_DOS_ESTAGIOS[0]]?.retrato

export default function AvatarMontavel({ avatar, url, nome = 'A', tamanho = 48, className = '', retrato }: Props) {
  const c = useMemo(() => normalizarAvatar(avatar), [avatar])
  const fundoItem = OPCOES_FUNDO.find(f => f.id === c.fundo) || OPCOES_FUNDO[0]

  // Sem avatar escolhido, vale a foto da conta (Google, por exemplo).
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

  const imagem = retrato ?? RETRATO_PADRAO

  // Sem avatar e sem foto (ou sem ilustração disponível): a inicial do nome.
  if ((!avatar && !url) || !imagem) {
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
      className={`relative inline-block overflow-hidden select-none border border-white/15 ${
        c.base === 'quadrado' ? 'rounded-2xl' : c.base === 'losango' ? 'rounded-xl rotate-45' : 'rounded-full'
      } ${className}`}
      style={{ width: tamanho, height: tamanho, background: fundoItem.gradiente }}
    >
      {/* Escurece o fundo embaixo, para o retrato se destacar de qualquer gradiente. */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-void/70 via-void/20 to-transparent" />
      <img
        src={imagem}
        alt={nome ? `Avatar de ${nome}` : 'Avatar'}
        width={tamanho}
        height={tamanho}
        draggable={false}
        className={`relative w-full h-full object-cover ${c.base === 'losango' ? '-rotate-45 scale-[1.35]' : ''}`}
      />
    </div>
  )
}
