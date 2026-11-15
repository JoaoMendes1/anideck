// client/src/components/comunidade/BarrasVitais.tsx
// Vitalidade (HP) e Mana (MP). Compacta para cards laterais, completa para a Guilda,
// onde explica como cada barra sobe e desce.
import { Heart, Droplet, Zap } from 'lucide-react'
import { faixaDoHP, type EstadoComunidade } from '../../lib/comunidade'
import { minutosParaManaCheia, textoDoTempo, taxaRegenEfetiva } from '../../lib/hud'
import BarraVital from '../hud/BarraVital'

const FRASE_HP = {
  cheio: 'Vitalidade cheia: você está em dia com seus animes.',
  bom: 'Alguns dias sem episódio. Assista um para recuperar.',
  baixo: 'Faz tempo que você não aparece. Um episódio já começa a recuperar.',
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
        <div className="flex items-center justify-between font-mono text-xs mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Heart size={12} className="text-coral" aria-hidden /> Vitalidade
            {temBonusVitalidade && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-xs font-bold bg-green/15 text-green border border-green/30">
                <Zap size={11} aria-hidden /> +10% XP
              </span>
            )}
          </span>
          <span className="text-text font-bold" aria-label={`Vitalidade ${hp} de 100`}>
            {hp}
            <span className="text-muted-2">/100</span>
          </span>
        </div>
        <BarraVital tipo="hp" pct={hp} className="h-2 w-full" />
        {!compacta && (
          <p className="text-xs text-muted-2 mt-1.5 mb-0">
            {emDescanso
              ? 'Modo Descanso ativo: sua Vitalidade está congelada.'
              : temBonusVitalidade
              ? 'Vitalidade alta: você ganha até +10% de XP por episódio e sua Mana recarrega mais rápido!'
              : FRASE_HP[faixa]}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between font-mono text-xs mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-muted uppercase tracking-wider">
            <Droplet size={12} className="text-mana" aria-hidden /> Mana
            {temBonusVitalidade && (
              <span className="text-xs font-mono text-mana font-bold normal-case tracking-normal">
                (acelerada +25%)
              </span>
            )}
          </span>
          <span className="text-text font-bold" aria-label={`Mana ${mana} de ${regras.mp_max}`}>
            {mana}
            <span className="text-muted-2">/{regras.mp_max}</span>
          </span>
        </div>
        <BarraVital tipo="mp" pct={regras.mp_max > 0 ? (mana / regras.mp_max) * 100 : 0} className="h-2 w-full" />
        {!compacta && (
          <p className="text-xs text-muted-2 mt-1.5 mb-0">
            Cada comentário custa {regras.mp_custo_comentario} de Mana. Ela recarrega sozinha, {Math.round(taxaEfetiva)} por dia{faltam > 0 ? `: cheia ${textoDoTempo(faltam)}.` : ', e está cheia.'}
          </p>
        )}
      </div>
    </div>
  )
}
