// client/src/components/personagem/PainelEquipamentos.tsx
// Atributos e a troca de item, na tela do personagem.
//
// O estado vem da página, que o recebe na mesma chamada do personagem; os slots ficam sobre a
// arte (SlotsDoPersonagem). Este painel mostra os números e, com um slot aberto, a lista dos
// itens daquele slot com o ganho ou a perda de cada troca. A troca é conferida e gravada no
// servidor.
import { useEffect, useRef, useState } from 'react'
import { Lock, Shield, Swords, Heart, Zap, X } from 'lucide-react'
import {
  SLOTS_RPG,
  diferencaDaTroca,
  equiparItemRPG,
  estiloDaRaridade,
  porMilEmPorcento,
  resumoDoItem,
  type EstadoEquipamento,
  type SlotId,
} from '../../lib/rpg'

const ROTULO_DE_SECAO = 'font-mono text-xs font-semibold uppercase tracking-widest text-muted m-0'

function Diferenca({ valor, rotulo }: { valor: number; rotulo: string }) {
  if (valor === 0) return null
  return (
    <span className={valor > 0 ? 'text-green' : 'text-coral'}>
      {valor > 0 ? '+' : ''}
      {valor} {rotulo}
    </span>
  )
}

export default function PainelEquipamentos({
  estado,
  slotAberto,
  aoFecharSlot,
  aoAtualizar,
}: {
  /** undefined: ainda carregando; null: o servidor não respondeu. */
  estado: EstadoEquipamento | null | undefined
  slotAberto: SlotId | null
  aoFecharSlot: () => void
  aoAtualizar: (estado: EstadoEquipamento) => void
}) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const listaRef = useRef<HTMLDivElement>(null)

  // No celular a lista fica abaixo da arte: ao abrir um slot, ela é trazida para a tela.
  useEffect(() => {
    setErro('')
    if (slotAberto) listaRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [slotAberto])

  const trocar = async (slot: SlotId, itemId: string) => {
    if (salvando) return
    setErro('')
    setSalvando(true)
    const resultado = await equiparItemRPG(slot, itemId)
    setSalvando(false)
    if (resultado.dados) {
      aoAtualizar(resultado.dados)
      aoFecharSlot()
      return
    }
    setErro(resultado.erro ?? 'Não foi possível trocar o equipamento agora.')
  }

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
  const itemNoSlot = (slot: SlotId) => estado.slots.find((s) => s.slot === slot)?.item
  const opcoes = slotAberto ? estado.inventario.filter((i) => i.slot === slotAberto) : []
  const rotuloAberto = SLOTS_RPG.find((s) => s.id === slotAberto)?.rotulo ?? ''

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
        <span className="inline-flex items-center gap-1 rounded-full border border-holo-2/50 px-2.5 py-0.5 font-mono text-xs font-semibold text-text">
          <Zap size={12} className="text-holo-2" aria-hidden="true" />
          Poder {atributos.poder}
        </span>
      </div>

      <dl className="m-0 grid grid-cols-3 gap-2.5">
        {linhasDeAtributo.map(({ chave, rotulo, Icone, valor, bonus, cor }) => (
          <div key={chave} className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-panel p-3">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Icone size={13} className={cor} aria-hidden="true" />
              {rotulo}
            </dt>
            <dd className="m-0 font-anton text-2xl leading-none">{valor}</dd>
            <span className="font-mono text-xs text-muted">{bonus > 0 ? `+${bonus} itens` : 'base'}</span>
          </div>
        ))}
      </dl>

      {secundarios.length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-line bg-panel p-3 sm:grid-cols-3">
          {secundarios.map(({ rotulo, valor }) => (
            <div key={rotulo} className="flex min-w-0 items-baseline justify-between gap-2">
              <dt className="truncate text-xs text-muted">{rotulo}</dt>
              <dd className="m-0 font-mono text-sm font-semibold text-text">{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="m-0 text-xs text-muted">Toque num slot ao lado do personagem para trocar o item.</p>

      {slotAberto && (
        <div ref={listaRef} className="flex scroll-mt-4 flex-col gap-2 rounded-2xl border border-holo-3/40 bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-xs font-bold text-text">{rotuloAberto}</p>
            <button
              type="button"
              onClick={aoFecharSlot}
              aria-label="Fechar a lista de itens"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted hover:text-text"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {opcoes.length === 0 ? (
            <p className="m-0 text-xs text-muted">
              Você ainda não tem itens para este slot. Eles vêm de batalhas e da invocação.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {opcoes.map((item) => {
                const estilo = estiloDaRaridade(item.raridade)
                const dif = diferencaDaTroca(itemNoSlot(slotAberto), item)
                return (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 ${estilo.borda} ${estilo.fundo}`}
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className={`m-0 truncate text-sm font-bold ${estilo.texto}`}>
                        {item.nome}
                        {item.quantidade > 1 && <span className="ml-1 font-mono text-xs text-muted">×{item.quantidade}</span>}
                      </p>
                      <p className="m-0 text-xs text-muted">
                        {estilo.rotulo} · {resumoDoItem(item)}
                      </p>
                      {!item.equipado && (
                        <p className="m-0 flex flex-wrap gap-x-2 font-mono text-xs">
                          <Diferenca valor={dif.vida} rotulo="Vida" />
                          <Diferenca valor={dif.ataque} rotulo="Ataque" />
                          <Diferenca valor={dif.defesa} rotulo="Defesa" />
                        </p>
                      )}
                    </div>
                    {item.bloqueado ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                        <Lock size={12} aria-hidden="true" /> nível {item.nivel_minimo}
                      </span>
                    ) : item.equipado ? (
                      <button
                        type="button"
                        onClick={() => trocar(slotAberto, '')}
                        disabled={salvando}
                        className="h-11 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text disabled:cursor-wait disabled:opacity-60"
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => trocar(slotAberto, item.id)}
                        disabled={salvando}
                        className="h-11 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
                      >
                        Equipar
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {erro && (
            <p role="alert" className="m-0 text-xs font-bold text-coral">
              {erro}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
