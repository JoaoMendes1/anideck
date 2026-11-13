// client/src/lib/convites.ts
// Tipos e chamadas para o Sistema de Convites de Membros com Recompensas (Fase 17.5b, #191)
import { supabase } from './supabase'

export interface MeuConvite {
  codigo: string
  especial_admin: boolean
  usos_total: number
  anicoins_ganhos: number
  criado_em: string
}

export interface ResultadoResgateConvite {
  sucesso: boolean
  especial_admin?: boolean
  anicoins_ganhos?: number
  titulo_concedido?: string
  erro?: string
}

export interface RegrasConvites {
  anicoins_anfitriao: number
  xp_anfitriao: number
  anicoins_convidado: number
  anicoins_convidado_admin: number
  titulo_convidado_admin: string
}

export const REGRAS_CONVITES_PADRAO: RegrasConvites = {
  anicoins_anfitriao: 30,
  xp_anfitriao: 50,
  anicoins_convidado: 20,
  anicoins_convidado_admin: 50,
  titulo_convidado_admin: 'Convidado do Fundador',
}

/**
 * Busca o código de convite do membro atual.
 */
export async function obterMeuConvite(): Promise<MeuConvite | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const res = await fetch('/api/convites/meu', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return null
    return (await res.json()) as MeuConvite
  } catch {
    return null
  }
}

/**
 * Resgata um código de convite de outro usuário.
 */
export async function resgatarConvite(codigo: string): Promise<ResultadoResgateConvite> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { sucesso: false, erro: 'Faça login para resgatar o código de convite' }
    }

    const res = await fetch('/api/convites/resgatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ codigo }),
    })

    const json = await res.json()
    if (!res.ok || json.erro) {
      return { sucesso: false, erro: json.erro || 'Falha ao resgatar código' }
    }

    return json as ResultadoResgateConvite
  } catch {
    return { sucesso: false, erro: 'Erro de conexão ao processar convite' }
  }
}

/**
 * Busca as regras de convites (Admin).
 */
export async function obterConfigConvitesAdmin(): Promise<RegrasConvites | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const res = await fetch('/api/admin/convites/config', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return null
    return (await res.json()) as RegrasConvites
  } catch {
    return null
  }
}

/**
 * Salva as regras de convites (Admin).
 */
export async function salvarConfigConvitesAdmin(regras: RegrasConvites): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const res = await fetch('/api/admin/convites/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(regras),
    })
    return res.ok
  } catch {
    return false
  }
}
