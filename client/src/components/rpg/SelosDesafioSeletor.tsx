// client/src/components/rpg/SelosDesafioSeletor.tsx
// Seletor opcional de Selos de Desafio (#334) nas Expedições: o jogador aceita
// modificadores de risco em troca de materiais da Forja garantidos na vitória.
import { Flame, ShieldAlert } from 'lucide-react'
import type { SeloDesafio } from '../../lib/rpg'

interface Props {
  catalogo: SeloDesafio[]
  selecionados: string[]
  aoAlterar: (novos: string[]) => void
}

export default function SelosDesafioSeletor({ catalogo, selecionados, aoAlterar }: Props) {
  if (!catalogo || catalogo.length === 0) return null

  const alternar = (id: string) => {
    if (selecionados.includes(id)) {
      aoAlterar(selecionados.filter((s) => s !== id))
    } else {
      aoAlterar([...selecionados, id])
    }
  }

  return (
    <section
      aria-label="Selos de Desafio"
      className="flex flex-col gap-2.5 rounded-2xl border border-gold/30 bg-panel p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-gold" aria-hidden="true" />
          <h2 className="m-0 font-mono text-xs font-bold uppercase tracking-widest text-gold">
            Selos de Desafio ({selecionados.length} ativos)
          </h2>
        </div>
        <span className="text-xs text-muted">
          Mais risco na luta em troca de materiais extras na vitória
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {catalogo.map((s) => {
          const ativo = selecionados.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(s.id)}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                ativo
                  ? 'border-gold/70 bg-gold/15 text-fg'
                  : 'border-line bg-panel-2/60 text-muted hover:border-gold/40 hover:text-fg'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
                <ShieldAlert size={13} className={ativo ? 'text-gold' : 'text-muted'} aria-hidden="true" />
                {s.nome}
              </span>
              <span className="text-xs leading-snug text-coral">{s.risco}</span>
              <span className="text-xs font-semibold text-gold">{s.recompensa}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
