// client/src/lib/mercado.ts
// Mercado da Loja (sql/119): equipamentos vendidos por Ouro. Nível, posse e saldo são
// conferidos no banco; aqui só a leitura, a compra e a conta de quanto a troca melhora.
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'
import type { Raridade, SlotId } from './rpg'

export interface ItemDoMercado {
  id: string
  slot: SlotId
  nome: string
  descricao: string
  raridade: Raridade
  vida: number
  ataque: number
  defesa: number
  nivel_minimo: number
  preco_ouro: number
  possui: boolean
  bloqueado: boolean
}

type Atributos = { vida: number; ataque: number; defesa: number }

export interface EstadoMercado {
  nivel: number
  ouro: number
  itens: ItemDoMercado[]
  equipados: Partial<Record<SlotId, Atributos & { nome: string }>>
}

export async function lerMercado(): Promise<EstadoMercado | null> {
  const { data, error } = await supabase.rpc('rpg_mercado')
  if (error || !data || typeof data !== 'object' || 'erro' in data) return null
  const bruto = data as Partial<EstadoMercado>
  return {
    nivel: Number(bruto.nivel) || 1,
    ouro: Number(bruto.ouro) || 0,
    itens: Array.isArray(bruto.itens) ? bruto.itens : [],
    equipados: bruto.equipados ?? {},
  }
}

export async function comprarNoMercado(itemId: string): Promise<{ ok: true; ouro: number } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc('rpg_comprar_item', { p_item_id: itemId })
  if (error) return { ok: false, erro: 'Não foi possível comprar agora. Tente de novo.' }
  const r = (data ?? {}) as { ok?: boolean; erro?: string; ouro?: number }
  if (r.erro || !r.ok) return { ok: false, erro: r.erro ?? 'Não foi possível comprar agora.' }
  avisarOuroMudou()
  return { ok: true, ouro: Number(r.ouro) || 0 }
}

/** Quanto o item melhora (ou piora) em relação ao que está no slot. Positivo é ganho. */
export function ganhoDaCompra(item: Atributos, noSlot: Atributos | undefined): Atributos {
  const atual = noSlot ?? { vida: 0, ataque: 0, defesa: 0 }
  return { vida: item.vida - atual.vida, ataque: item.ataque - atual.ataque, defesa: item.defesa - atual.defesa }
}

/** O que mostrar no botão do item: a ordem das checagens é a mesma do banco. */
export function situacaoDaCompra(item: ItemDoMercado, ouro: number): 'possui' | 'bloqueado' | 'sem_ouro' | 'pode' {
  if (item.possui) return 'possui'
  if (item.bloqueado) return 'bloqueado'
  if (ouro < item.preco_ouro) return 'sem_ouro'
  return 'pode'
}
