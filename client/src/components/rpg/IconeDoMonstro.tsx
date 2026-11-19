// client/src/components/rpg/IconeDoMonstro.tsx
// Arte do monstro, ou o ícone provisório quando a arte ainda não existe.
import type { MonstroRPG } from '../../lib/rpg'
import { arteDoMonstro } from '../../lib/artesRpg'
import { ESTILO_DO_TIPO, ICONE_DO_MONSTRO, ICONE_PADRAO_DO_MONSTRO } from '../../lib/monstrosVisual'

// Molduras por elemento (classes inteiras para o Tailwind gerar sem interpolação).
const AURA_DO_ELEMENTO: Record<string, string> = {
  fogo: 'border border-coral/40 bg-gradient-to-br from-coral/20 via-panel-2 to-void shadow-inner',
  agua: 'border border-holo-3/40 bg-gradient-to-br from-holo-3/20 via-panel-2 to-void shadow-inner',
  raio: 'border border-gold/40 bg-gradient-to-br from-gold/20 via-panel-2 to-void shadow-inner',
  terra: 'border border-green/40 bg-gradient-to-br from-green/20 via-panel-2 to-void shadow-inner',
  luz: 'border border-gold/50 bg-gradient-to-br from-gold/25 via-panel-2 to-void shadow-inner',
  trevas: 'border border-holo-2/40 bg-gradient-to-br from-holo-2/25 via-panel-2 to-void shadow-inner',
  eter: 'border border-holo-1/40 bg-gradient-to-br from-holo-1/20 via-panel-2 to-void shadow-inner',
}

export default function IconeDoMonstro({
  monstro,
  tamanho = 'h-14 w-14',
  destaque = false,
  iconeTamanho = 26,
}: {
  monstro: Pick<MonstroRPG, 'id' | 'tipo' | 'elemento'>
  tamanho?: string
  destaque?: boolean
  iconeTamanho?: number
}) {
  const Icone = ICONE_DO_MONSTRO[monstro.id] ?? ICONE_PADRAO_DO_MONSTRO
  const estilo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const arte = arteDoMonstro(monstro.id)
  const aura = destaque ? AURA_DO_ELEMENTO[monstro.elemento ?? ''] ?? 'border border-holo-1/35 bg-gradient-to-br from-panel-2 to-void' : ''
  const fundo = destaque ? aura : estilo.icone
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl p-1 ${tamanho} ${fundo}`}>
      {arte ? (
        <img src={arte} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain drop-shadow-md" />
      ) : (
        <Icone size={iconeTamanho} aria-hidden="true" />
      )}
    </span>
  )
}

