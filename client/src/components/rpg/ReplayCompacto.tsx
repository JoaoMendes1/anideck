// client/src/components/rpg/ReplayCompacto.tsx
// Reprodução curta de uma luta já decidida: os golpes aparecem um a um, na velocidade
// escolhida, e o desfecho só depois do último.
import { Flame, RotateCcw, Shield, Sparkles, Swords, Wind, Zap } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { EstadoATB } from '../../lib/combate'
import { descreverTurno, type TurnoBatalha } from '../../lib/rpg'
import { intervaloDaVelocidade, lerVelocidade, salvarVelocidade, type Velocidade } from '../../lib/velocidadeBatalha'
import BarraATB from './BarraATB'
import ControleDeVelocidade from './ControleDeVelocidade'

function querMovimentoReduzido(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function ReplayCompacto({
  turnos,
  nomeDoMonstro,
  desfecho,
  atb,
}: {
  turnos: TurnoBatalha[]
  nomeDoMonstro: string
  desfecho: ReactNode
  atb?: EstadoATB
}) {
  const total = turnos.length
  const [mostrados, setMostrados] = useState(() => (querMovimentoReduzido() ? total : 0))
  const [velocidade, setVelocidade] = useState<Velocidade>(lerVelocidade)
  const terminou = mostrados >= total

  useEffect(() => {
    if (terminou) return
    const id = window.setTimeout(() => setMostrados((n) => n + 1), intervaloDaVelocidade(velocidade))
    return () => window.clearTimeout(id)
  }, [mostrados, terminou, velocidade])

  const recentes = turnos.slice(Math.max(0, mostrados - 4), mostrados).reverse()
  return (
    <div className="flex flex-col gap-2">
      {atb && <BarraATB atb={atb} nomeMonstro={nomeDoMonstro} />}
      <ol aria-live="polite" className="m-0 flex min-h-24 list-none flex-col gap-1 p-0 text-xs">
        {recentes.map((t, i) => {
          const { texto, valor } = descreverTurno(t, nomeDoMonstro)
          const doHeroi = t.atacante === 'jogador'
          return (
            <li
              key={mostrados - i}
              className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-1.5 ${doHeroi ? 'border-holo-3/30 bg-holo-3/8' : 'border-coral/30 bg-coral/8'} ${i === 0 ? '' : 'opacity-75'}`}
            >
              <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-1 break-words leading-snug text-text">
                {t.esquiva ? (
                  <Wind size={12} className="shrink-0 text-holo-3" aria-hidden="true" />
                ) : t.bloqueio ? (
                  <Shield size={12} className="shrink-0 text-green" aria-hidden="true" />
                ) : t.habilidade ? (
                  <Sparkles size={12} className="shrink-0 text-holo-2" aria-hidden="true" />
                ) : (
                  <Swords size={12} className={`shrink-0 ${doHeroi ? 'text-holo-3' : 'text-coral'}`} aria-hidden="true" />
                )}
                <span>{texto}</span>
                {t.critico && (
                  <strong className="inline-flex items-center gap-0.5 text-gold">
                    <Zap size={11} aria-hidden="true" /> Crítico!
                  </strong>
                )}
                {t.furia && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-coral/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-coral">
                    <Flame size={10} aria-hidden="true" /> Fúria
                  </span>
                )}
                {(t.eter_gasto ?? 0) > 0 && (
                  <span className="rounded bg-mana/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-mana">
                    −{t.eter_gasto} Éter
                  </span>
                )}
                {(t.contra_ataque ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-green/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-green">
                    <RotateCcw size={10} aria-hidden="true" /> Contra
                  </span>
                )}
              </span>
              <span className={`shrink-0 font-mono font-bold ${doHeroi ? 'text-holo-3' : 'text-coral'}`}>{valor}</span>
            </li>
          )
        })}
      </ol>
      {terminou ? (
        desfecho
      ) : (
        <ControleDeVelocidade
          velocidade={velocidade}
          aoMudar={(v) => {
            setVelocidade(v)
            salvarVelocidade(v)
          }}
          aoPular={() => setMostrados(total)}
        />
      )}
    </div>
  )
}
