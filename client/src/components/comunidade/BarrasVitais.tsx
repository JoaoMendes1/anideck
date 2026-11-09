// client/src/components/comunidade/BarrasVitais.tsx
// Vitalidade (HP) e Mana (MP). Compacta para cards laterais, completa para a Guilda,
// onde explica como cada barra sobe e desce.
import { Heart, Droplet, Zap } from 'lucide-react'
import { faixaDoHP, type EstadoComunidade } from '../../lib/comunidade'
import { minutosParaManaCheia, textoDoTempo, taxaRegenEfetiva } from '../../lib/hud'

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
  const { hp, regras, em_descanso: emDescanso } = estado
  // A Mana chega fracionada (recarga contínua); a tela mostra a parte inteira.
  const mana = Math.floor(estado.mana)
  const taxaEfetiva = taxaRegenEfetiva(regras.mp_regen_dia, hp)
  const faltam = minutosParaManaCheia(estado.mana, regras.mp_max, taxaEfetiva)
  const faixa = faixaDoHP(hp)
  const temBonusVitalidade = hp >= 80

  return (
    <div className={compacta ? 'space-y-2' : 'space-y-4'}>
      <div>
        <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Heart size={12} className="text-coral" aria-hidden /> Vitalidade
            {temBonusVitalidade && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-green/15 text-green border border-green/30">
                <Zap size={9} /> +10% XP
              </span>
            )}
          </span>
          <span className="text-text font-bold" aria-label={`Vitalidade ${hp} de 100`}>
            {hp}
            <span className="text-muted-2">/100</span>
          </span>
        </div>
        <Barra
          valor={hp}
          maximo={100}
          classe={
            faixa === 'baixo'
              ? 'bg-gradient-to-r from-rose-600/70 to-coral/70'
              : 'bg-gradient-to-r from-rose-500 via-coral to-amber-500 shadow-[0_0_8px_rgba(255,107,107,0.45)]'
          }
        />
        {!compacta && (
          <p className="text-[11.5px] text-muted-2 mt-1.5 mb-0">
            {emDescanso
              ? 'Modo Descanso ativo: sua Vitalidade está congelada.'
              : temBonusVitalidade
              ? 'Vitalidade alta: você ganha até +10% de XP por episódio e sua Mana recarrega mais rápido!'
              : FRASE_HP[faixa]}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Droplet size={12} className="text-holo-3" aria-hidden /> Mana
            {temBonusVitalidade && (
              <span className="text-[9.5px] font-mono text-holo-3 font-bold">
                (acelerada +25%)
              </span>
            )}
          </span>
          <span className="text-text font-bold" aria-label={`Mana ${mana} de ${regras.mp_max}`}>
            {mana}
            <span className="text-muted-2">/{regras.mp_max}</span>
          </span>
        </div>
        <Barra
          valor={mana}
          maximo={regras.mp_max}
          classe="bg-gradient-to-r from-sky-500 via-cyan-400 to-holo-3 shadow-[0_0_8px_rgba(34,211,238,0.45)]"
        />
        {!compacta && (
          <p className="text-[11.5px] text-muted-2 mt-1.5 mb-0">
            Cada comentário custa {regras.mp_custo_comentario} de Mana. Ela recarrega sozinha, {Math.round(taxaEfetiva)} por dia{faltam > 0 ? `: cheia ${textoDoTempo(faltam)}.` : ', e está cheia.'}
          </p>
        )}
      </div>
    </div>
  )
}
