// client/src/lib/curadoriaCollab.ts
// Tipos e chamadas para a Curadoria Colaborativa (Fase 17.7, #188)
import { supabase } from './supabase'

export interface SugestaoCollab {
  id: string
  user_id: string
  mal_id: number
  campo: 'titulo_episodio' | 'estreia' | 'link_streaming' | 'sinopse'
  episodio_numero: number
  valor_sugerido: string
  motivo: string
  status: 'pendente' | 'aprovada' | 'recusada'
  created_at: string
  autor_nome?: string
  autor_handle?: string
  titulo_anime?: string
}

export interface ReqSubmeterSugestao {
  mal_id: number
  campo: string
  episodio_numero?: number
  valor: string
  motivo?: string
}

/**
 * Envia uma sugestão de curadoria/correção de anime.
 */
export async function submeterSugestaoCuradoria(dados: ReqSubmeterSugestao): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { sucesso: false, erro: 'Faça login para sugerir correções.' }
    }

    const res = await fetch('/api/curation/sugerir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(dados),
    })

    if (!res.ok) {
      const msg = (await res.text()).trim()
      return { sucesso: false, erro: msg || 'Falha ao enviar sugestão.' }
    }

    return { sucesso: true }
  } catch {
    return { sucesso: false, erro: 'Erro de conexão ao enviar sugestão.' }
  }
}

/**
 * Lista sugestões pendentes da comunidade (Admin).
 */
export async function listarSugestoesCollabAdmin(): Promise<SugestaoCollab[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return []

    const res = await fetch('/api/admin/curation/sugestoes-collab', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) return []
    return (await res.json()) as SugestaoCollab[]
  } catch {
    return []
  }
}

/**
 * Aprova ou recusa uma sugestão da comunidade (Admin).
 */
export async function revisarSugestaoCollabAdmin(id: string, aprovar: boolean, justificativa = ''): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const res = await fetch(`/api/admin/curation/sugestoes-collab/${id}/revisar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ aprovar, justificativa }),
    })

    return res.ok
  } catch {
    return false
  }
}
