// client/src/components/personagem/ConjuntosEmUso.tsx
// Os conjuntos com peças em uso e o bônus de cada faixa (2, 4 e 6 peças). A conta é do servidor:
// a tela só mostra o que já vale e o que falta.
import { Layers } from 'lucide-react'
import type { EstadoEquipamento } from '../../lib/rpg'

function Faixa({ pecas, bonus, ativo }: { pecas: number; bonus: string; ativo: boolean }) {
  return (
    <li className={`m-0 text-xs ${ativo ? 'text-green' : 'text-muted'}`}>
      <span className="font-mono font-bold">{pecas} peças:</span> {bonus}
      {!ativo && <span className="sr-only"> (ainda não vale)</span>}
    </li>
  )
}

export default function ConjuntosEmUso({ estado }: { estado: EstadoEquipamento }) {
  const conjuntos = estado.conjuntos ?? []
  if (conjuntos.length === 0) return null

  return (
    <section aria-labelledby="titulo-dos-conjuntos" className="flex flex-col gap-2">
      <h2 id="titulo-dos-conjuntos" className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
        Conjuntos
      </h2>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {conjuntos.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 rounded-xl border border-holo-2/40 bg-holo-2/5 p-3">
            <p className="m-0 inline-flex items-center gap-1.5 text-sm font-bold text-holo-2">
              <Layers size={14} aria-hidden="true" />
              {c.nome}
              <span className="ml-auto font-mono text-xs text-muted">{c.pecas} em uso</span>
            </p>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              <Faixa pecas={2} bonus={c.bonus_2} ativo={c.ativo_2} />
              {c.bonus_4 && <Faixa pecas={4} bonus={c.bonus_4} ativo={c.ativo_4} />}
              {c.bonus_6 && <Faixa pecas={6} bonus={c.bonus_6} ativo={Boolean(c.ativo_6)} />}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
