// client/src/lib/forja.ts
// Forja do Brokk (sql/122): materiais, receitas, forjar e o destino das cópias repetidas
// (vender por Ouro ou desmontar em materiais). Tudo é conferido no banco; aqui só a leitura,
// as chamadas e as contas que a tela mostra antes de o jogador decidir.
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'
import type { ItemRPG, Raridade } from './rpg'

/** Nome de cada material, na ordem da tela. Repete o CHECK de rpg_materiais e o Go (rpg_forja.go). */
export const MATERIAIS: { id: string; nome: string }[] = [
  { id: 'garra_de_fera', nome: 'Garra de Fera' },
  { id: 'chifre_de_fera', nome: 'Chifre de Fera' },
  { id: 'cranio_de_fera', nome: 'Crânio de Fera' },
  { id: 'escama_de_dragao', nome: 'Escama de Dragão' },
  { id: 'cristal_de_gelo', nome: 'Cristal de Gelo' },
  { id: 'cristal_de_fogo', nome: 'Cristal de Fogo' },
  { id: 'cristal_de_luz', nome: 'Cristal de Luz' },
  { id: 'cristal_do_vazio', nome: 'Cristal do Vazio' },
  { id: 'nucleo_da_tempestade', nome: 'Núcleo da Tempestade' },
  { id: 'gema_silvestre', nome: 'Gema Silvestre' },
  { id: 'pena_celeste', nome: 'Pena Celeste' },
]

export function nomeDoMaterial(id: string): string {
  return MATERIAIS.find((m) => m.id === id)?.nome ?? id
}

/** "2 Garra de Fera, 1 Chifre de Fera", na ordem da tela. */
export function textoDosMateriais(materiais: Record<string, number> | undefined): string {
  if (!materiais) return ''
  return MATERIAIS.filter((m) => (materiais[m.id] ?? 0) > 0)
    .map((m) => `${materiais[m.id]} ${m.nome}`)
    .join(', ')
}

/** Ouro da venda de uma cópia repetida. Repete rpg_valor_de_venda (sql/122). */
export function valorDeVenda(raridade: Raridade | string): number {
  return raridade === 'lendario' ? 400 : raridade === 'epico' ? 120 : raridade === 'raro' ? 40 : 10
}

export interface ReceitaDaForja extends ItemRPG {
  ouro: number
  materiais: Record<string, number>
  possui: boolean
  bloqueado: boolean
}

export interface EstadoForja {
  nivel: number
  ouro: number
  personagem_base: string
  materiais: Record<string, number>
  receitas: ReceitaDaForja[]
}

export async function lerForja(): Promise<EstadoForja | null> {
  const { data, error } = await supabase.rpc('rpg_forja')
  if (error || !data || typeof data !== 'object' || 'erro' in data) return null
  const b = data as Partial<EstadoForja>
  return {
    nivel: Number(b.nivel) || 1,
    ouro: Number(b.ouro) || 0,
    personagem_base: b.personagem_base ?? '',
    materiais: b.materiais ?? {},
    receitas: Array.isArray(b.receitas) ? b.receitas : [],
  }
}

/** O que falta para forjar: Ouro e cada material. Vazio é pronto para forjar. */
export function faltaParaForjar(r: Pick<ReceitaDaForja, 'ouro' | 'materiais'>, estado: Pick<EstadoForja, 'ouro' | 'materiais'>) {
  const materiais: Record<string, number> = {}
  for (const [id, precisa] of Object.entries(r.materiais)) {
    const falta = precisa - (estado.materiais[id] ?? 0)
    if (falta > 0) materiais[id] = falta
  }
  return { ouro: Math.max(0, r.ouro - estado.ouro), materiais }
}

type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string }

async function chamar<T>(funcao: string, itemId: string): Promise<Resposta<T>> {
  const { data, error } = await supabase.rpc(funcao, { p_item_id: itemId })
  if (error) return { ok: false, erro: 'Não foi possível agora. Tente de novo.' }
  const r = (data ?? {}) as { ok?: boolean; erro?: string; faltam?: string } & T
  if (r.erro || !r.ok) return { ok: false, erro: r.erro ?? 'Não foi possível agora.' }
  return { ok: true, dados: r }
}

export async function forjar(itemId: string) {
  const r = await chamar<{ ouro: number }>('rpg_forjar', itemId)
  if (r.ok) avisarOuroMudou()
  return r
}

export async function venderRepetido(itemId: string) {
  const r = await chamar<{ ouro_ganho: number; ouro: number }>('rpg_vender_repetido', itemId)
  if (r.ok) avisarOuroMudou()
  return r
}

export function desmontarRepetido(itemId: string) {
  return chamar<{ materiais: Record<string, number> }>('rpg_desmontar_repetido', itemId)
}
