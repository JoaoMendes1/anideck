// client/src/components/loja/Mercado.tsx
// Seção Mercado da Loja: equipamentos comprados com Ouro. A vitrine é separada pelo que o
// jogador pode fazer com cada item (comprar, juntar Ouro, esperar o nível, já tem), para o
// trancado não se misturar com o que está à venda. Comprar leva o item ao inventário;
// equipar fica no Personagem, onde está a comparação completa.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, FlaskConical, Lock, ShoppingCart } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  agruparMercado,
  comprarNoMercado,
  ganhoDaCompra,
  lerMercado,
  situacaoDaCompra,
  type EstadoMercado,
  type ItemDoMercado,
} from '../../lib/mercado'
import { SLOTS_RPG, estiloDaRaridade, resumoDoItem, type SlotId } from '../../lib/rpg'
import IconeDoItem from '../rpg/IconeDoItem'
import IconeOuro from '../IconeOuro'

const TITULO_DO_GRUPO = 'm-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted'
const GRADE = 'm-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3'

function Ganho({ valor, rotulo }: { valor: number; rotulo: string }) {
  if (valor === 0) return null
  return (
    <span className={valor > 0 ? 'text-green' : 'text-coral'}>
      {valor > 0 ? '+' : ''}
      {valor} {rotulo}
    </span>
  )
}

const ROTULO_CLASSE_MERCADO: Record<string, string> = {
  espadachim: 'Espadachim',
  lanceiro: 'Lanceiro',
  assassina: 'Assassina',
  maga: 'Maga',
  guerreiro: 'Guerreiro',
  paladina: 'Paladina',
}

function CartaoDoItem({
  item,
  estado,
  comprando,
  aoComprar,
}: {
  item: ItemDoMercado
  estado: EstadoMercado
  comprando: string | null
  aoComprar: (id: string, nome: string) => void
}) {
  const estilo = estiloDaRaridade(item.raridade)
  const noSlot = estado.equipados[item.slot]
  const ganho = ganhoDaCompra(item, noSlot)
  const situacao = situacaoDaCompra(item, estado.ouro)
  const rotuloSlot = SLOTS_RPG.find((s) => s.id === item.slot)?.rotulo ?? ''
  const classesTexto = Array.isArray(item.classes) && item.classes.length > 0
    ? item.classes.map((c) => ROTULO_CLASSE_MERCADO[c] ?? c).join(' · ')
    : null
  return (
    <li className={`flex flex-col gap-2.5 rounded-2xl border p-3 ${estilo.borda} ${estilo.fundo}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-void/60 ${estilo.texto}`}>
          <IconeDoItem id={item.id} slot={item.slot} tamanho={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`m-0 text-sm font-bold leading-tight ${estilo.texto}`}>{item.nome}</p>
          <p className="m-0 mt-0.5 text-xs text-muted">
            {estilo.rotulo} · {rotuloSlot} · nível {item.nivel_minimo}
          </p>
          {classesTexto && (
            <p className={`m-0 mt-0.5 text-xs font-semibold ${item.serve === false ? 'text-coral' : 'text-holo-3'}`}>
              {classesTexto}{item.serve === false ? ' (outra classe)' : ''}
            </p>
          )}
          <p className="m-0 mt-0.5 text-xs text-text">{resumoDoItem(item)}</p>
        </div>
      </div>

      {!item.possui && (
        <p className="m-0 flex flex-wrap gap-x-2 font-mono text-xs">
          <span className="text-muted">{noSlot ? `Comparado ao equipado (${noSlot.nome}):` : `Você está sem ${rotuloSlot.toLowerCase()}:`}</span>
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
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-4 text-xs font-bold text-muted">
            <Lock size={13} aria-hidden="true" /> Libera no nível {item.nivel_minimo}
          </span>
        ) : situacao === 'sem_ouro' ? (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gold/30 px-4 text-xs font-bold text-gold/80">
            Faltam {item.preco_ouro - estado.ouro} de Ouro
          </span>
        ) : (
          <button
            type="button"
            onClick={() => aoComprar(item.id, item.nome)}
            disabled={comprando !== null}
            aria-label={`Comprar ${item.nome} por ${item.preco_ouro} de Ouro`}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-gold to-coral px-4 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
          >
            <ShoppingCart size={14} aria-hidden="true" />
            {comprando === item.id ? 'Comprando…' : 'Comprar'}
          </button>
        )}
      </div>
    </li>
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

  // Só os tipos que têm item à venda: filtro que leva a uma lista vazia só confunde.
  const filtros = useMemo(() => {
    const comItem = new Set((estado?.itens ?? []).map((i) => i.slot))
    return [{ id: 'todos' as const, rotulo: 'Todos' }, ...SLOTS_RPG.filter((s) => comItem.has(s.id)).map((s) => ({ id: s.id, rotulo: s.rotulo }))]
  }, [estado])

  const grupos = useMemo(
    () => agruparMercado((estado?.itens ?? []).filter((i) => slot === 'todos' || i.slot === slot), estado?.ouro ?? 0),
    [estado, slot],
  )

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

  const cartoes = (lista: ItemDoMercado[]) => (
    <ul className={GRADE}>
      {lista.map((item) => (
        <CartaoDoItem key={item.id} item={item} estado={estado} comprando={comprando} aoComprar={comprar} />
      ))}
    </ul>
  )
  const vazio = grupos.podeComprar.length + grupos.junteOuro.length + grupos.liberaDepois.length + grupos.noInventario.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-2 font-anton text-xl leading-none text-gold">
            <IconeOuro size={18} /> {estado.ouro.toLocaleString('pt-BR')}
            <span className="font-mono text-xs font-bold text-muted">de Ouro · você está no nível {estado.nivel}</span>
          </span>
          <span className="text-xs text-muted">Ganhe Ouro vencendo expedições, masmorras e duelos.</span>
        </div>
        <Link to="/expedicoes" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-xs font-bold text-text">
          <FlaskConical size={13} className="text-mana" aria-hidden="true" /> Poções, Pousada e Fonte
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filtrar por tipo de equipamento">
        {filtros.map((f) => {
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

      {vazio && <p className="m-0 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">Nada à venda neste tipo por enquanto.</p>}

      {grupos.podeComprar.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Pode comprar">
          <h2 className={TITULO_DO_GRUPO}>Pode comprar agora</h2>
          {cartoes(grupos.podeComprar)}
        </section>
      )}

      {grupos.junteOuro.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Junte Ouro">
          <h2 className={TITULO_DO_GRUPO}>Junte Ouro para comprar</h2>
          {cartoes(grupos.junteOuro)}
        </section>
      )}

      {grupos.liberaDepois.length > 0 && (
        <details className="group rounded-2xl border border-line bg-panel/60 p-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} aria-hidden="true" /> Libera em níveis mais altos ({grupos.liberaDepois.length})
            </span>
            <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3">{cartoes(grupos.liberaDepois)}</div>
        </details>
      )}

      {grupos.noInventario.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="No inventário">
          <h2 className={TITULO_DO_GRUPO}>Você já tem</h2>
          {cartoes(grupos.noInventario)}
        </section>
      )}
    </div>
  )
}
