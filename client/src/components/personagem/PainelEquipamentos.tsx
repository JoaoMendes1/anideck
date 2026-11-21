// client/src/components/personagem/PainelEquipamentos.tsx
// Status de combate na tela do personagem: Vida, Ataque e Defesa com o ganho dos itens e o
// resto dos derivados. A troca de item abre sobre a arte (EscolhaDeItem), no lugar do slot.
import { Shield, Swords, Heart, Zap } from 'lucide-react'
import { porMilEmPorcento, type EstadoEquipamento } from '../../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

export default function PainelEquipamentos({
  estado,
}: {
  /** undefined: ainda carregando; null: o servidor não respondeu. */
  estado: EstadoEquipamento | null | undefined
}) {
  if (estado === undefined) {
    return <div className="h-40 animate-pulse rounded-2xl border border-line bg-panel" />
  }

  if (!estado) {
    return (
      <section aria-labelledby="titulo-dos-equipamentos" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-dos-equipamentos" className={ROTULO_DE_SECAO}>
            Status e equipamentos
          </h2>
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">indisponível</span>
        </div>
        <p className="m-0 text-xs text-muted">Não foi possível carregar os equipamentos agora.</p>
      </section>
    )
  }

  const { atributos, base } = estado

  const linhasDeAtributo = [
    { chave: 'vida', rotulo: 'Vida', Icone: Heart, valor: atributos.vida, bonus: atributos.vida - base.vida, cor: 'text-coral' },
    { chave: 'ataque', rotulo: 'Ataque', Icone: Swords, valor: atributos.ataque, bonus: atributos.ataque - base.ataque, cor: 'text-gold' },
    { chave: 'defesa', rotulo: 'Defesa', Icone: Shield, valor: atributos.defesa, bonus: atributos.defesa - base.defesa, cor: 'text-holo-3' },
  ]

  // O resto do status, quando o servidor já o calcula (sql/077).
  const secundarios =
    atributos.magia === undefined
      ? []
      : [
          { rotulo: 'Magia', valor: String(atributos.magia) },
          { rotulo: 'Éter', valor: String(atributos.eter ?? 0) },
          { rotulo: 'Velocidade', valor: String(atributos.velocidade ?? 0) },
          { rotulo: 'Crítico', valor: porMilEmPorcento(atributos.critico_por_mil) },
          { rotulo: 'Dano crítico', valor: `${atributos.dano_critico ?? 150}%` },
          { rotulo: 'Esquiva', valor: porMilEmPorcento(atributos.esquiva_por_mil) },
          { rotulo: 'Sorte de item', valor: `+${atributos.sorte_item ?? 0}%` },
        ]

  return (
    <section aria-labelledby="titulo-dos-equipamentos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-dos-equipamentos" className={ROTULO_DE_SECAO}>
          Status e equipamentos
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-holo-2/50 bg-holo-2/12 px-3 py-0.5 font-mono text-xs font-bold text-text">
          <Zap size={12} className="text-holo-2" aria-hidden="true" />
          Poder {atributos.poder}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        <dl className="m-0 grid grid-cols-3 gap-2 sm:gap-2.5">
          {linhasDeAtributo.map(({ chave, rotulo, Icone, valor, bonus, cor }) => (
            <div key={chave} className="flex min-w-0 flex-col justify-between gap-1 rounded-xl border border-line bg-panel p-2.5 sm:p-3.5">
              <dt className="flex items-center gap-1 text-xs font-semibold text-muted sm:gap-1.5">
                <Icone size={13} className={`shrink-0 ${cor}`} aria-hidden="true" />
                <span className="truncate">{rotulo}</span>
              </dt>
              <dd className="m-0 font-anton text-xl leading-none sm:text-3xl">{valor}</dd>
              <span className="truncate font-mono text-xs text-muted">{bonus > 0 ? `+${bonus} itens` : 'base'}</span>
            </div>
          ))}
        </dl>

        {secundarios.length > 0 && (
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-line bg-panel p-3 sm:grid-cols-3 sm:p-3.5 lg:content-center">
            {secundarios.map(({ rotulo, valor }) => (
              <div key={rotulo} className="flex min-w-0 items-baseline justify-between gap-2">
                <dt className="truncate text-xs text-muted">{rotulo}</dt>
                <dd className="m-0 font-mono text-sm font-semibold text-text">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <p className="m-0 text-xs text-muted">Toque num slot sobre o personagem para trocar o item.</p>
    </section>
  )
}
