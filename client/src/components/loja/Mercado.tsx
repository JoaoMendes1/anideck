// client/src/components/loja/Mercado.tsx
// Seção Mercado da Loja: equipamentos comprados com Ouro, com filtro por slot, o ganho em
// relação ao item equipado e o que falta para comprar. Comprar leva o item ao inventário;
// equipar fica no Personagem, onde está a comparação completa.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, FlaskConical, Lock, ShoppingCart } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { comprarNoMercado, ganhoDaCompra, lerMercado, situacaoDaCompra, type EstadoMercado } from '../../lib/mercado'
import { SLOTS_RPG, estiloDaRaridade, resumoDoItem, type SlotId } from '../../lib/rpg'
import IconeDoItem from '../rpg/IconeDoItem'
import IconeOuro from '../IconeOuro'

function Ganho({ valor, rotulo }: { valor: number; rotulo: string }) {
  if (valor === 0) return null
  return (
    <span className={valor > 0 ? 'text-green' : 'text-coral'}>
      {valor > 0 ? '+' : ''}
      {valor} {rotulo}
    </span>
  )
}

export default function Mercado() {
  const { showToast } = useToast()
  const [estado, setEstado] = useState<EstadoMercado | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [slot, setSlot] = useState<SlotId | 'todos'>('todos')
  const [comprando, setComprando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const lido = await lerMercado()
    setFalhou(!lido)
    if (lido) setEstado(lido)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const visiveis = useMemo(() => (estado?.itens ?? []).filter((i) => slot === 'todos' || i.slot === slot), [estado, slot])

  const comprar = async (id: string, nome: string) => {
    if (comprando) return
    setComprando(id)
    const r = await comprarNoMercado(id)
    setComprando(null)
    if (!r.ok) {
      showToast(r.erro, 'error')
      return
    }
    showToast(`${nome} está no seu inventário. Equipe pelo Personagem.`, 'success')
    carregar()
  }

  if (falhou && !estado) {
    return <p className="m-0 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">O Mercado não abriu agora. Tente de novo em instantes.</p>
  }
  if (!estado) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-line bg-panel shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3">
        <span className="inline-flex items-center gap-2 font-anton text-xl leading-none text-gold">
          <IconeOuro size={18} /> {estado.ouro.toLocaleString('pt-BR')}
          <span className="font-mono text-xs font-bold text-muted">de Ouro</span>
        </span>
        <Link to="/expedicoes" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-xs font-bold text-text">
          <FlaskConical size={13} className="text-mana" aria-hidden="true" /> Poções, Pousada e Fonte
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filtrar por tipo de equipamento">
        {[{ id: 'todos' as const, rotulo: 'Todos' }, ...SLOTS_RPG.map((s) => ({ id: s.id, rotulo: s.rotulo }))].map((f) => {
          const ativo = slot === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setSlot(f.id)}
              className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3.5 font-mono text-xs font-bold ${
                ativo ? 'bg-gold text-void' : 'border border-line bg-panel text-muted hover:text-text'
              }`}
            >
              {f.rotulo}
            </button>
          )
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">Nada à venda neste tipo por enquanto.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((item) => {
            const estilo = estiloDaRaridade(item.raridade)
            const noSlot = estado.equipados[item.slot]
            const ganho = ganhoDaCompra(item, noSlot)
            const situacao = situacaoDaCompra(item, estado.ouro)
            const rotuloSlot = SLOTS_RPG.find((s) => s.id === item.slot)?.rotulo ?? ''
            return (
              <li key={item.id} className={`flex flex-col gap-2.5 rounded-2xl border p-3 ${estilo.borda} ${estilo.fundo}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-void/60 ${estilo.texto}`}>
                    <IconeDoItem id={item.id} slot={item.slot} tamanho={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`m-0 text-sm font-bold leading-tight ${estilo.texto}`}>{item.nome}</p>
                    <p className="m-0 mt-0.5 text-xs text-muted">
                      {estilo.rotulo} · {rotuloSlot} · nível {item.nivel_minimo}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-text">{resumoDoItem(item)}</p>
                  </div>
                </div>

                {!item.possui && (
                  <p className="m-0 flex flex-wrap gap-x-2 font-mono text-xs">
                    <span className="text-muted">{noSlot ? `vs ${noSlot.nome}:` : 'Slot vazio:'}</span>
                    <Ganho valor={ganho.vida} rotulo="Vida" />
                    <Ganho valor={ganho.ataque} rotulo="Ataque" />
                    <Ganho valor={ganho.defesa} rotulo="Defesa" />
                    {ganho.vida === 0 && ganho.ataque === 0 && ganho.defesa === 0 && <span className="text-muted">igual</span>}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-gold">
                    <IconeOuro size={14} /> {item.preco_ouro}
                  </span>
                  {situacao === 'possui' ? (
                    <Link to="/personagem" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-green/40 px-4 text-xs font-bold text-green">
                      <Check size={14} aria-hidden="true" /> No inventário
                    </Link>
                  ) : situacao === 'bloqueado' ? (
                    <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-xs font-bold text-muted">
                      <Lock size={13} aria-hidden="true" /> Nível {item.nivel_minimo}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => comprar(item.id, item.nome)}
                      disabled={situacao === 'sem_ouro' || comprando !== null}
                      aria-label={`Comprar ${item.nome} por ${item.preco_ouro} de Ouro`}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-gold to-coral px-4 text-xs font-extrabold text-void disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ShoppingCart size={14} aria-hidden="true" />
                      {comprando === item.id ? 'Comprando…' : situacao === 'sem_ouro' ? `Faltam ${item.preco_ouro - estado.ouro}` : 'Comprar'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
