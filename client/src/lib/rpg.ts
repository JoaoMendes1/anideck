// client/src/lib/rpg.ts
// Tipos e chamadas das rotas de jogo do personagem (Fase 18): equipamentos e atributos.
//
// Os números de combate (Vida, Ataque, Defesa) são calculados no servidor a partir do nível
// e dos itens equipados. A tela só mostra; nada daqui é enviado de volta como atributo.
import { Footprints, Gem, Shield, Shirt, Sword, type LucideIcon } from 'lucide-react'
import { supabase } from './supabase'

export interface AtributosRPG {
  vida: number
  ataque: number
  defesa: number
  poder: number
}

export type SlotId = 'arma' | 'armadura' | 'capa' | 'botas' | 'joia'
export type Raridade = 'comum' | 'raro' | 'epico' | 'lendario'

export interface ItemRPG {
  id: string
  slot: SlotId
  nome: string
  descricao: string
  raridade: Raridade
  vida: number
  ataque: number
  defesa: number
  nivel_minimo: number
}

export interface ItemDoInventario extends ItemRPG {
  quantidade: number
  equipado: boolean
  bloqueado: boolean
}

export interface SlotRPG {
  slot: SlotId
  item?: ItemRPG
}

export interface EstadoEquipamento {
  nivel: number
  base: AtributosRPG
  atributos: AtributosRPG
  slots: SlotRPG[]
  inventario: ItemDoInventario[]
}

// Arte provisória: o slot dá o ícone e a raridade dá a cor. A ilustração de cada item entra
// depois, por id, sem mudar regra.
export const SLOTS_RPG: { id: SlotId; rotulo: string; Icone: LucideIcon }[] = [
  { id: 'arma', rotulo: 'Arma', Icone: Sword },
  { id: 'armadura', rotulo: 'Armadura', Icone: Shield },
  { id: 'capa', rotulo: 'Capa', Icone: Shirt },
  { id: 'botas', rotulo: 'Botas', Icone: Footprints },
  { id: 'joia', rotulo: 'Joia', Icone: Gem },
]

// Classes inteiras, para o Tailwind gerar cada uma.
export const ESTILO_DA_RARIDADE: Record<Raridade, { rotulo: string; texto: string; borda: string; fundo: string }> = {
  comum: { rotulo: 'Comum', texto: 'text-muted', borda: 'border-line', fundo: 'bg-panel' },
  raro: { rotulo: 'Raro', texto: 'text-holo-3', borda: 'border-holo-3/60', fundo: 'bg-holo-3/10' },
  epico: { rotulo: 'Épico', texto: 'text-holo-2', borda: 'border-holo-2/70', fundo: 'bg-holo-2/10' },
  lendario: { rotulo: 'Lendário', texto: 'text-gold', borda: 'border-gold/70', fundo: 'bg-gold/10' },
}

export function estiloDaRaridade(raridade: string | undefined) {
  return ESTILO_DA_RARIDADE[(raridade ?? 'comum') as Raridade] ?? ESTILO_DA_RARIDADE.comum
}

/** Texto curto dos atributos de um item, só com os que ele dá ("+4 Ataque · +2 Defesa"). */
export function resumoDoItem(item: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa'>): string {
  const partes: string[] = []
  if (item.vida > 0) partes.push(`+${item.vida} Vida`)
  if (item.ataque > 0) partes.push(`+${item.ataque} Ataque`)
  if (item.defesa > 0) partes.push(`+${item.defesa} Defesa`)
  return partes.length ? partes.join(' · ') : 'Sem atributos'
}

/**
 * Diferença de atributos ao trocar o item do slot pelo candidato. Positivo é ganho.
 * Item bloqueado pelo nível não soma, então a troca para ele mostra só a perda.
 */
export function diferencaDaTroca(
  atual: Pick<ItemRPG, 'vida' | 'ataque' | 'defesa'> | undefined,
  candidato: Pick<ItemDoInventario, 'vida' | 'ataque' | 'defesa' | 'bloqueado'>,
): { vida: number; ataque: number; defesa: number } {
  const somaDoCandidato = candidato.bloqueado ? { vida: 0, ataque: 0, defesa: 0 } : candidato
  return {
    vida: somaDoCandidato.vida - (atual?.vida ?? 0),
    ataque: somaDoCandidato.ataque - (atual?.ataque ?? 0),
    defesa: somaDoCandidato.defesa - (atual?.defesa ?? 0),
  }
}

async function cabecalhoDeAutenticacao(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

/** Lê atributos, slots e inventário. Devolve null quando a leitura falha. */
export async function obterEquipamentos(): Promise<EstadoEquipamento | null> {
  try {
    const res = await fetch('/api/personagem/equipamentos', { headers: await cabecalhoDeAutenticacao() })
    if (!res.ok) return null
    const json = (await res.json()) as EstadoEquipamento
    if (!json || !Array.isArray(json.slots) || !json.atributos) return null
    return json
  } catch {
    return null
  }
}

/** Equipa um item no slot; com itemId vazio, esvazia o slot. */
export async function equiparItemRPG(
  slot: SlotId,
  itemId: string,
): Promise<{ dados?: EstadoEquipamento; erro?: string }> {
  const falha = 'Não foi possível trocar o equipamento agora.'
  try {
    const res = await fetch('/api/personagem/equipamentos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ slot, item_id: itemId }),
    })
    const json = (await res.json().catch(() => null)) as (EstadoEquipamento & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !Array.isArray(json.slots)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
