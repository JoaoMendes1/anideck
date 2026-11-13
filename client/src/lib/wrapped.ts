// client/src/lib/wrapped.ts
// Tipos e chamadas para o AniDeck Wrapped (Fase 17.5a, #190): retrospectiva anual compartilhável
import { supabase } from './supabase'

export interface AnimeMaisVistoWrapped {
  mal_id: number
  title: string
  cover_url: string
  total_eps: number
}

export interface GeneroWrapped {
  genero: string
  total: number
}

export interface UsuarioWrapped {
  user_id: string
  handle: string
  nome: string
  avatar_url?: string
  classe?: string
  titulo_ativo?: string
}

export interface AniDeckWrapped {
  ano: number
  usuario: UsuarioWrapped
  total_episodios: number
  horas_estimadas: number
  dias_ativos: number
  nota_media: number
  top_animes: AnimeMaisVistoWrapped[]
  top_generos: GeneroWrapped[]
  total_comentarios: number
  total_reacoes: number
  reacao_favorita: string
  total_cartas: number
}

/**
 * Busca a retrospectiva do ano do usuário autenticado.
 */
export async function obterMeuWrapped(ano: number): Promise<AniDeckWrapped | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const res = await fetch(`/api/wrapped/${ano}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return null
    return (await res.json()) as AniDeckWrapped
  } catch {
    return null
  }
}

/**
 * Busca a retrospectiva pública de um membro pelo handle.
 */
export async function obterWrappedPublico(handle: string, ano: number): Promise<AniDeckWrapped | null> {
  try {
    const res = await fetch(`/api/u/${encodeURIComponent(handle)}/wrapped/${ano}`)
    if (!res.ok) return null
    return (await res.json()) as AniDeckWrapped
  } catch {
    return null
  }
}
