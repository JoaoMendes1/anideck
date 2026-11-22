// client/src/components/rpg/BarraATB.tsx
// Barra visual de iniciativa (ATB) baseada na Velocidade de cada lado e ordem dos próximos turnos.
import { Gauge, Wind } from 'lucide-react'
import type { EstadoATB } from '../../lib/combate'

export default function BarraATB({
  atb,
  nomeMonstro,
}: {
  atb: EstadoATB
  nomeMonstro: string
}) {
  return (
    <section
      aria-label="Iniciativa e barra ATB"
      className="flex flex-col gap-2 rounded-2xl border border-line bg-void/50 p-3 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider text-holo-3">
          <Gauge size={14} aria-hidden="true" />
          Iniciativa ATB
        </span>
        <span className="font-mono text-muted">
          Abre a rodada:{' '}
          <strong className={atb.primeiro === 'jogador' ? 'text-holo-3' : 'text-coral'}>
            {atb.primeiro === 'jogador' ? 'Você' : nomeMonstro}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-holo-3">Você (Vel {atb.velocidade_jogador})</span>
            <span className="text-muted">Ritmo {atb.ritmo_jogador}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-holo-2 to-holo-3 transition-[width] duration-300"
              style={{ width: `${Math.max(10, Math.min(100, atb.atb_jogador))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="truncate font-bold text-coral">{nomeMonstro} (Vel {atb.velocidade_monstro})</span>
            <span className="text-muted">Ritmo {atb.ritmo_monstro}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-coral to-gold transition-[width] duration-300"
              style={{ width: `${Math.max(10, Math.min(100, atb.atb_monstro))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
          <Wind size={12} className="text-holo-3" aria-hidden="true" />
          Ordem:
        </span>
        {atb.proxima_ordem.map((lado, idx) => (
          <span
            key={idx}
            className={`rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${
              lado === 'jogador'
                ? 'border-holo-3/45 bg-holo-3/12 text-holo-3'
                : 'border-coral/45 bg-coral/12 text-coral'
            }`}
          >
            {idx + 1}. {lado === 'jogador' ? 'Você' : 'Inimigo'}
          </span>
        ))}
      </div>
    </section>
  )
}
