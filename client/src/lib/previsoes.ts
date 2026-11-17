// client/src/lib/previsoes.ts
// Tipos, helpers e chamadas para Previsões e Títulos.
import { supabase } from './supabase'

export interface OpcaoPrevisao {
  id: number
  texto: string
}

export interface Previsao {
  id: string
  mal_id?: number
  titulo_anime?: string
  pergunta: string
  descricao?: string
  opcoes: OpcaoPrevisao[]
  limite_apostas: string
  status: 'aberta' | 'encerrada' | 'resolvida' | 'cancelada'
  opcao_vencedora_id?: number
  total_mana_apostada: number
  total_apostadores: number
  recompensa_anicoins: number
  criado_em: string
  minha_opcao?: number
  minha_mana_apostada?: number
  meu_resultado?: boolean
}

/**
 * Consulta a lista de previsões comunitárias ativas.
 */
export async function obterPrevisoes(): Promise<Previsao[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {}
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch('/api/previsoes', { headers })
    if (!res.ok) return []
    const json = await res.json()
    if (!Array.isArray(json)) return []
    return json
  } catch {
    return []
  }
}

/**
 * Registra uma aposta de Mana em uma previsão.
 */
export async function apostarPrevisao(
  previsaoId: string,
  opcaoId: number,
  mana: number
): Promise<{ ok: boolean; erro?: string; mana_restante?: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok: false, erro: 'Faça login para apostar Mana' }

    const res = await fetch(`/api/previsoes/${previsaoId}/apostar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ opcao_id: opcaoId, mana }),
    })

    const json = await res.json()
    if (!res.ok || json.erro) {
      return { ok: false, erro: json.erro || 'Não foi possível registrar sua aposta' }
    }

    return { ok: true, mana_restante: json.mana_restante }
  } catch {
    return { ok: false, erro: 'Erro de conexão ao enviar aposta' }
  }
}

/**
 * Equipa um dos títulos desbloqueados no perfil do usuário.
 */
export async function equiparTitulo(titulo: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok: false, erro: 'Não autenticado' }

    const res = await fetch('/api/perfil/titulo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ titulo }),
    })

    const json = await res.json()
    if (!res.ok || json.erro) {
      return { ok: false, erro: json.erro || 'Falha ao equipar título' }
    }
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro de conexão ao equipar título' }
  }
}
