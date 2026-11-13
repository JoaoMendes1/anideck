// client/src/lib/chefao.ts
// Tipos e chamadas para o Chefão da Temporada (Fase 17.3, #185)
import { supabase } from './supabase'

export interface TopAtacanteChefao {
  user_id: string
  nome: string
  handle: string
  avatar_url?: string
  cla_tag?: string
  dano: number
}

export interface StatusChefao {
  ativo: boolean
  id?: string
  temporada: string
  nome?: string
  titulo?: string
  descricao?: string
  arte_url?: string
  hp_total?: number
  hp_restante?: number
  dano_total?: number
  porcentagem_hp?: number
  inicio?: string
  fim?: string
  status?: 'ativo' | 'derrotado' | 'escapou'
  derrotado?: boolean
  recompensas_pagas?: boolean
  recompensa_anicoins?: number
  titulo_recompensa?: string
  dano_minimo?: number
  meu_dano?: number
  elegivel_recompensa?: boolean
  top_atacantes?: TopAtacanteChefao[]
}

/**
 * Consulta o status do chefão da temporada ativa ou informada.
 */
export async function obterStatusChefao(temporada?: string): Promise<StatusChefao | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {}
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const query = temporada ? `?temporada=${encodeURIComponent(temporada)}` : ''
    const res = await fetch(`/api/chefao${query}`, { headers })
    if (!res.ok) return null
    const json = await res.json()
    if (!json || typeof json !== 'object' || json.code) return null
    return json
  } catch {
    return null
  }
}

/**
 * Calcula a porcentagem de vida restante com clamp entre 0 e 100.
 */
export function calcularPorcentagemHP(hpRestante?: number, hpTotal?: number): number {
  if (!hpTotal || hpTotal <= 0) return 0
  if (!hpRestante || hpRestante <= 0) return 0
  const pct = (hpRestante / hpTotal) * 100
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10))
}

/**
 * Retorna a classe de cor da barra de vida com base na porcentagem.
 */
export function obterClasseBarraHP(porcentagem: number): { barra: string; texto: string; glow: string } {
  if (porcentagem <= 0) {
    return {
      barra: 'bg-muted-2',
      texto: 'text-muted-2',
      glow: 'shadow-none',
    }
  }
  if (porcentagem <= 20) {
    return {
      barra: 'bg-coral shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse',
      texto: 'text-coral',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    }
  }
  if (porcentagem <= 50) {
    return {
      barra: 'bg-gold shadow-[0_0_12px_rgba(245,158,11,0.5)]',
      texto: 'text-gold',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    }
  }
  return {
    barra: 'bg-gradient-to-r from-holo-1 to-holo-3 shadow-[0_0_12px_rgba(63,224,240,0.5)]',
    texto: 'text-holo-3',
    glow: 'shadow-[0_0_15px_rgba(63,224,240,0.2)]',
  }
}
