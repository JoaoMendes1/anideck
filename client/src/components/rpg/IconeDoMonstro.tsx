// client/src/components/rpg/IconeDoMonstro.tsx
// Arte do monstro, ou o ícone provisório quando a arte ainda não existe.
import type { MonstroRPG } from '../../lib/rpg'
import { arteDoMonstro } from '../../lib/artesRpg'
import { ESTILO_DO_TIPO, ICONE_DO_MONSTRO, ICONE_PADRAO_DO_MONSTRO } from '../../lib/monstrosVisual'

export default function IconeDoMonstro({ monstro, tamanho = 'h-14 w-14' }: { monstro: Pick<MonstroRPG, 'id' | 'tipo'>; tamanho?: string }) {
  const Icone = ICONE_DO_MONSTRO[monstro.id] ?? ICONE_PADRAO_DO_MONSTRO
  const estilo = ESTILO_DO_TIPO[monstro.tipo] ?? ESTILO_DO_TIPO.comum
  const arte = arteDoMonstro(monstro.id)
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${tamanho} ${estilo.icone}`}>
      {arte ? (
        <img src={arte} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
      ) : (
        <Icone size={26} aria-hidden="true" />
      )}
    </span>
  )
}
