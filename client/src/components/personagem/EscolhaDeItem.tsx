// client/src/components/personagem/EscolhaDeItem.tsx
// A lista de itens de um slot, aberta no lugar do toque, sem rolar a página.
//
// Desktop: um painel flutuante sobre a arte, ao lado da coluna do slot tocado.
// Celular: uma folha que sobe da base da tela, por cima de tudo (portal no body, para nenhum
// ancestral com transform ou overflow mudar a referência do `fixed`).
// Fecha no X, no Esc e no toque fora. A troca é conferida e gravada no servidor.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X } from 'lucide-react'
import {
  SLOTS_RPG,
  diferencaDaTroca,
  equiparItemRPG,
  estiloDaRaridade,
  resumoDoItem,
  type EstadoEquipamento,
  type SlotId,
} from '../../lib/rpg'

// Arma, armadura e capa ficam na coluna da esquerda; o painel abre à direita delas.
const SLOTS_DA_ESQUERDA: SlotId[] = ['arma', 'armadura', 'capa']
const CONSULTA_DESKTOP = '(min-width: 1024px)'

function useDesktop(): boolean {
  const consultar = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA_DESKTOP).matches
  const [desktop, setDesktop] = useState(consultar)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(CONSULTA_DESKTOP)
    const mudar = () => setDesktop(mq.matches)
    mq.addEventListener('change', mudar)
    return () => mq.removeEventListener('change', mudar)
  }, [])
  return desktop
}

function Diferenca({ valor, rotulo }: { valor: number; rotulo: string }) {
  if (valor === 0) return null
  return (
    <span className={valor > 0 ? 'text-green' : 'text-coral'}>
      {valor > 0 ? '+' : ''}
      {valor} {rotulo}
    </span>
  )
}

export default function EscolhaDeItem({
  estado,
  slot,
  aoFechar,
  aoAtualizar,
}: {
  estado: EstadoEquipamento
  slot: SlotId
  aoFechar: () => void
  aoAtualizar: (estado: EstadoEquipamento) => void
}) {
  const desktop = useDesktop()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const painelRef = useRef<HTMLDivElement>(null)

  // Desktop: tocar fora do painel fecha. O toque num slot fica de fora: ele troca o slot aberto.
  useEffect(() => {
    if (!desktop) return
    const aoTocar = (e: PointerEvent) => {
      const alvo = e.target as Element | null
      if (!alvo || painelRef.current?.contains(alvo) || alvo.closest('[data-slot-rpg]')) return
      aoFechar()
    }
    document.addEventListener('pointerdown', aoTocar)
    return () => document.removeEventListener('pointerdown', aoTocar)
  }, [desktop, aoFechar])

  useEffect(() => {
    setErro('')
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [slot, aoFechar])

  const trocar = async (itemId: string) => {
    if (salvando) return
    setErro('')
    setSalvando(true)
    const resultado = await equiparItemRPG(slot, itemId)
    setSalvando(false)
    if (resultado.dados) {
      aoAtualizar(resultado.dados)
      aoFechar()
      return
    }
    setErro(resultado.erro ?? 'Não foi possível trocar o equipamento agora.')
  }

  const rotulo = SLOTS_RPG.find((s) => s.id === slot)?.rotulo ?? ''
  const noSlot = estado.slots.find((s) => s.slot === slot)?.item
  const opcoes = estado.inventario.filter((i) => i.slot === slot)
  const lado = SLOTS_DA_ESQUERDA.includes(slot) ? 'left-20 lg:left-24' : 'right-20 lg:right-24'

  const conteudo = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 font-mono text-xs font-semibold uppercase tracking-widest text-muted">{rotulo}</p>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar a lista de itens"
          className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {opcoes.length === 0 ? (
        <p className="m-0 text-xs text-muted">Você ainda não tem itens para este slot. Eles vêm de batalhas e da invocação.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {opcoes.map((item) => {
            const estilo = estiloDaRaridade(item.raridade)
            const dif = diferencaDaTroca(noSlot, item)
            return (
              <li key={item.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${estilo.borda} ${estilo.fundo}`}>
                <div className="min-w-0 flex-1">
                  <p className={`m-0 truncate text-sm font-bold ${estilo.texto}`}>
                    {item.nome}
                    {item.quantidade > 1 && <span className="ml-1 font-mono text-xs text-muted">×{item.quantidade}</span>}
                  </p>
                  <p className="m-0 text-xs text-muted">
                    {estilo.rotulo} · {resumoDoItem(item)}
                  </p>
                  {!item.equipado && !item.bloqueado && (
                    <p className="m-0 flex flex-wrap gap-x-2 font-mono text-xs">
                      <Diferenca valor={dif.vida} rotulo="Vida" />
                      <Diferenca valor={dif.ataque} rotulo="Ataque" />
                      <Diferenca valor={dif.defesa} rotulo="Defesa" />
                    </p>
                  )}
                </div>
                {item.bloqueado ? (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted">
                    <Lock size={12} aria-hidden="true" /> nível {item.nivel_minimo}
                  </span>
                ) : item.equipado ? (
                  <button
                    type="button"
                    onClick={() => trocar('')}
                    disabled={salvando}
                    className="h-11 shrink-0 cursor-pointer rounded-full border border-line px-4 text-xs font-bold text-muted hover:text-text disabled:cursor-wait disabled:opacity-60"
                  >
                    Remover
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => trocar(item.id)}
                    disabled={salvando}
                    className="h-11 shrink-0 cursor-pointer rounded-full bg-gradient-to-r from-holo-1 to-holo-3 px-4 text-xs font-extrabold text-void disabled:cursor-wait disabled:opacity-60"
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
  )

  if (desktop) {
    // Dentro da arte (que é `relative`): o painel fica ao lado da coluna do slot.
    return (
      <div
        ref={painelRef}
        role="dialog"
        aria-label={`Itens de ${rotulo}`}
        className={`absolute top-16 z-20 max-h-[calc(100%-6rem)] w-80 overflow-y-auto rounded-2xl border border-holo-3/50 bg-void/95 p-3 shadow-2xl backdrop-blur-md lg:top-20 ${lado}`}
      >
        {conteudo}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Fechar a lista de itens" onClick={aoFechar} className="absolute inset-0 cursor-default bg-void/70" />
      <div
        role="dialog"
        aria-label={`Itens de ${rotulo}`}
        className="relative max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-holo-3/50 bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {conteudo}
      </div>
    </div>,
    document.body,
  )
}
