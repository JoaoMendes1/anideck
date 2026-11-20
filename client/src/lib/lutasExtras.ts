// client/src/lib/lutasExtras.ts
// Lutas extras compradas com Ouro depois do limite do dia (sql/128). O banco confere tudo
// (limite usado, máximo do dia, Ouro); aqui só a leitura e a chamada.
import { supabase } from './supabase'
import { avisarOuroMudou } from './hud'

export type TipoLutaExtra = 'expedicao' | 'masmorra'

export interface OfertaLutaExtra {
  compradas: number
  maximo: number
  /** Preço da próxima compra: sobe 50% a cada compra no mesmo dia. */
  preco: number
}

export interface LutasExtrasHoje {
  expedicao: OfertaLutaExtra
  masmorra: OfertaLutaExtra
  ouro: number
}

/** Sem o sql/128 aplicado, a função não existe: devolve null e a tela não mostra a compra. */
export async function lerLutasExtras(): Promise<LutasExtrasHoje | null> {
  const { data, error } = await supabase.rpc('rpg_lutas_extras_hoje')
  if (error || !data || typeof data !== 'object' || 'erro' in data) return null
  const d = data as Partial<LutasExtrasHoje>
  if (!d.expedicao || !d.masmorra) return null
  return { expedicao: d.expedicao, masmorra: d.masmorra, ouro: Number(d.ouro) || 0 }
}

export async function comprarLutaExtra(tipo: TipoLutaExtra): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc('rpg_comprar_luta_extra', { p_tipo: tipo })
  if (error) return { ok: false, erro: 'Não foi possível comprar agora. Tente de novo.' }
  const r = (data ?? {}) as { ok?: boolean; erro?: string }
  if (!r.ok) return { ok: false, erro: r.erro ?? 'Não foi possível comprar agora.' }
  avisarOuroMudou()
  return { ok: true }
}
