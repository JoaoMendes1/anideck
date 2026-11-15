// client/src/components/personagem/PainelEquipamentos.tsx
// Atributos, os cinco slots e a troca de item, na tela do personagem.
//
// Os números vêm prontos do servidor. Tocar num slot abre a lista dos itens daquele slot,
// com o ganho ou a perda de cada troca; a troca em si é conferida e gravada no servidor.
import { useEffect, useState } from 'react'
import { Lock, Shield, Swords, Heart, Zap, X } from 'lucide-react'
import {
  SLOTS_RPG,
  diferencaDaTroca,
  equiparItemRPG,
  estiloDaRaridade,
  obterEquipamentos,
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

export default function PainelEquipamentos() {
  const [estado, setEstado] = useState<EstadoEquipamento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [slotAberto, setSlotAberto] = useState<SlotId | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    obterEquipamentos().then((resposta) => {
      if (!ativo) return
      setEstado(resposta)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  const trocar = async (slot: SlotId, itemId: string) => {
    if (salvando) return
    setErro('')
    setSalvando(true)
    const resultado = await equiparItemRPG(slot, itemId)
    setSalvando(false)
    if (resultado.dados) {
      setEstado(resultado.dados)
      setSlotAberto(null)
      return
    }
    setErro(resultado.erro ?? 'Não foi possível trocar o equipamento agora.')
  }

  if (carregando) {
    return <div className="h-48 animate-pulse rounded-2xl border border-line bg-panel" />
  }

  // Sem resposta (servidor sem o sql/071, ou fora do ar): os slots aparecem vazios, como antes.
  if (!estado) {
    return (
      <section aria-labelledby="titulo-dos-equipamentos" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-dos-equipamentos" className={ROTULO_DE_SECAO}>
            Equipamentos
          </h2>
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">em breve</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-5 gap-2.5 p-0">
          {SLOTS_RPG.map(({ id, rotulo, Icone }) => (
            <li key={id} className="flex min-w-0 flex-col items-center gap-1.5">
              <span className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-line text-muted">
                <Icone size={22} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate text-xs font-semibold text-muted">{rotulo}</span>
            </li>
          ))}
        </ul>
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

  return (
    <section aria-labelledby="titulo-dos-equipamentos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-dos-equipamentos" className={ROTULO_DE_SECAO}>
          Atributos e equipamentos
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

      <ul className="m-0 grid list-none grid-cols-5 gap-2.5 p-0">
        {SLOTS_RPG.map(({ id, rotulo, Icone }) => {
          const item = itemNoSlot(id)
          const estilo = estiloDaRaridade(item?.raridade)
          const aberto = slotAberto === id
          return (
            <li key={id} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setSlotAberto(aberto ? null : id)
                }}
                aria-expanded={aberto}
                aria-label={item ? `${rotulo}: ${item.nome}. Trocar` : `${rotulo}: vazio. Equipar`}
                className="flex w-full min-w-0 cursor-pointer flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-16 w-full items-center justify-center rounded-xl border-2 ${
                    aberto ? 'border-holo-3' : item ? estilo.borda : 'border-dashed border-line'
                  } ${item ? estilo.fundo : ''} ${item ? estilo.texto : 'text-muted'}`}
                >
                  <Icone size={22} aria-hidden="true" />
                </span>
                <span className="max-w-full truncate text-xs font-semibold text-muted">{rotulo}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {slotAberto && (
        <div className="flex flex-col gap-2 rounded-2xl border border-holo-3/40 bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-xs font-bold text-text">{rotuloAberto}</p>
            <button
              type="button"
              onClick={() => setSlotAberto(null)}
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
