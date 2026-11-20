// client/src/components/rpg/ReplayCompacto.tsx
// Reprodução curta de uma luta já decidida: os golpes aparecem um a um, na velocidade
// escolhida, e o desfecho só depois do último.
import { useEffect, useState, type ReactNode } from 'react'
import { descreverTurno, type TurnoBatalha } from '../../lib/rpg'
import { intervaloDaVelocidade, lerVelocidade, salvarVelocidade, type Velocidade } from '../../lib/velocidadeBatalha'
import ControleDeVelocidade from './ControleDeVelocidade'

function querMovimentoReduzido(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function ReplayCompacto({ turnos, nomeDoMonstro, desfecho }: { turnos: TurnoBatalha[]; nomeDoMonstro: string; desfecho: ReactNode }) {
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
      <ol aria-live="polite" className="m-0 flex min-h-24 list-none flex-col gap-1 p-0 text-xs">
        {recentes.map((t, i) => {
          const { texto, valor } = descreverTurno(t, nomeDoMonstro)
          const doHeroi = t.atacante === 'jogador'
          return (
            <li
              key={mostrados - i}
              className={`flex justify-between gap-2 rounded-lg border px-2.5 py-1 ${doHeroi ? 'border-holo-3/30 bg-holo-3/5' : 'border-coral/30 bg-coral/5'} ${i === 0 ? '' : 'opacity-70'}`}
            >
              <span className="min-w-0 truncate">
                {texto}
                {t.critico && <strong className="ml-1 text-gold">Crítico!</strong>}
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
