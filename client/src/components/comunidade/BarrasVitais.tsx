// client/src/components/comunidade/BarrasVitais.tsx
// Vitalidade (HP) e Mana (MP). Compacta para cards laterais, completa para a Guilda,
// onde explica como cada barra sobe e desce.
import { Heart, Droplet } from 'lucide-react'
import { faixaDoHP, type EstadoComunidade } from '../../lib/comunidade'

const FRASE_HP = {
  cheio: 'Vitalidade cheia: você está em dia com seus animes.',
  bom: 'Alguns dias sem episódio. Assista um para recuperar.',
  baixo: 'Faz tempo que você não aparece. Um episódio já começa a recuperar.',
}

function Barra({ valor, maximo, classe }: { valor: number; maximo: number; classe: string }) {
  const pct = maximo > 0 ? Math.min(100, Math.max(0, Math.round((valor / maximo) * 100))) : 0
  return (
    <div className="h-2 rounded-full bg-panel-2 overflow-hidden border border-line/60" role="presentation">
      <div className={`h-full rounded-full transition-all duration-700 ${classe}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function BarrasVitais({ estado, compacta = false }: { estado: EstadoComunidade; compacta?: boolean }) {
  const { hp, mana, regras, em_descanso: emDescanso } = estado
  const faixa = faixaDoHP(hp)

  return (
    <div className={compacta ? 'space-y-2' : 'space-y-4'}>
      <div>
        <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Heart size={12} className="text-coral" aria-hidden /> Vitalidade
          </span>
          <span className="text-text font-bold" aria-label={`Vitalidade ${hp} de 100`}>
            {hp}
            <span className="text-muted-2">/100</span>
          </span>
        </div>
        <Barra valor={hp} maximo={100} classe={faixa === 'baixo' ? 'bg-coral/60' : 'bg-coral'} />
        {!compacta && (
          <p className="text-[11.5px] text-muted-2 mt-1.5 mb-0">
            {emDescanso ? 'Modo Descanso ativo: sua Vitalidade está congelada.' : FRASE_HP[faixa]}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Droplet size={12} className="text-holo-3" aria-hidden /> Mana
          </span>
          <span className="text-text font-bold" aria-label={`Mana ${mana} de ${regras.mp_max}`}>
            {mana}
            <span className="text-muted-2">/{regras.mp_max}</span>
          </span>
        </div>
        <Barra valor={mana} maximo={regras.mp_max} classe="bg-holo-3" />
        {!compacta && (
          <p className="text-[11.5px] text-muted-2 mt-1.5 mb-0">
            Cada comentário custa {regras.mp_custo_comentario} de Mana. Ela recarrega sozinha, {regras.mp_regen_dia} por dia.
          </p>
        )}
      </div>
    </div>
  )
}
