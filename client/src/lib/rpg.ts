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

// ---------------------------------------------------------------------------------------
// Expedições (combate)
// ---------------------------------------------------------------------------------------

export type TipoMonstro = 'comum' | 'raro' | 'chefe'
export type Dificuldade = 'facil' | 'equilibrada' | 'dificil' | 'perigosa'

export interface MonstroRPG {
  id: string
  nome: string
  descricao: string
  tipo: TipoMonstro
  nivel: number
  vida: number
  ataque: number
  defesa: number
  bilhetes: number
  chance_item: number
  raridade_item: Raridade
}

export interface MonstroNaLista extends MonstroRPG {
  poder: number
  dificuldade: Dificuldade
}

export interface HojeRPG {
  feitas: number
  limite: number
  bilhetes: number
}

export interface EstadoExpedicoes {
  atributos: AtributosRPG
  hoje: HojeRPG
  monstros: MonstroNaLista[]
}

export interface TurnoBatalha {
  atacante: 'jogador' | 'monstro'
  dano: number
  critico: boolean
  vida_jogador: number
  vida_monstro: number
}

export interface RespostaBatalha {
  monstro: MonstroRPG
  jogador: AtributosRPG
  resultado: { venceu: boolean; rodadas: number; turnos: TurnoBatalha[] }
  recompensa: { bilhetes: number; item?: ItemRPG }
  hoje: HojeRPG
}

export const ROTULO_DA_DIFICULDADE: Record<Dificuldade, { rotulo: string; classe: string }> = {
  facil: { rotulo: 'Fácil', classe: 'text-green border-green/50' },
  equilibrada: { rotulo: 'Equilibrada', classe: 'text-holo-3 border-holo-3/50' },
  dificil: { rotulo: 'Difícil', classe: 'text-gold border-gold/50' },
  perigosa: { rotulo: 'Perigosa', classe: 'text-coral border-coral/50' },
}

export function rotuloDaDificuldade(d: string | undefined) {
  return ROTULO_DA_DIFICULDADE[(d ?? 'equilibrada') as Dificuldade] ?? ROTULO_DA_DIFICULDADE.equilibrada
}

/** Quantas batalhas ainda cabem hoje (nunca negativo). */
export function batalhasRestantes(hoje: HojeRPG | undefined): number {
  if (!hoje) return 0
  return Math.max(0, hoje.limite - hoje.feitas)
}

export async function obterExpedicoes(): Promise<{ dados?: EstadoExpedicoes; erro?: string; semPersonagem?: boolean }> {
  try {
    const res = await fetch('/api/rpg/batalhas', { headers: await cabecalhoDeAutenticacao() })
    if (res.status === 404) return { semPersonagem: true }
    const json = (await res.json().catch(() => null)) as (EstadoExpedicoes & { error?: string }) | null
    if (!res.ok || !json || !Array.isArray(json.monstros)) return { erro: json?.error || 'Expedições indisponíveis no momento.' }
    return { dados: json }
  } catch {
    return { erro: 'Expedições indisponíveis no momento.' }
  }
}

export async function batalhar(monstroId: string): Promise<{ dados?: RespostaBatalha; erro?: string }> {
  const falha = 'Não foi possível batalhar agora.'
  try {
    const res = await fetch('/api/rpg/batalhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await cabecalhoDeAutenticacao()) },
      body: JSON.stringify({ monstro_id: monstroId }),
    })
    const json = (await res.json().catch(() => null)) as (RespostaBatalha & { error?: string }) | null
    if (!res.ok) return { erro: json?.error || falha }
    if (!json || !json.resultado || !Array.isArray(json.resultado.turnos)) return { erro: falha }
    return { dados: json }
  } catch {
    return { erro: falha }
  }
}
