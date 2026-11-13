// client/src/lib/previsoes.ts
// Tipos, helpers e chamadas para Previsões, Classes e Títulos (Fase 17.4, #186, #187, #189)
import { supabase } from './supabase'

export type ClasseRPG = 'bardo' | 'ranger' | 'paladino'

export interface DetalhesClasse {
  id: ClasseRPG
  nome: string
  icone: string
  papel: string
  bonus: string
  descricao: string
  cor: string
  borda: string
  fundo: string
}

export const CLASSES_RPG: Record<ClasseRPG, DetalhesClasse> = {
  bardo: {
    id: 'bardo',
    nome: 'Bardo',
    icone: '🎭',
    papel: 'Voz da Comunidade',
    bonus: '-40% Custo de Mana em Comentários · +1 ₳ bônus',
    descricao: 'Especialista em debate e engajamento. Gasta apenas 3 MP por comentário nas salas e episódios, e ganha AniCoins ao enriquecer as conversas.',
    cor: 'text-holo-3',
    borda: 'border-holo-3/40',
    fundo: 'bg-holo-3/15',
  },
  ranger: {
    id: 'ranger',
    nome: 'Ranger',
    icone: '🏹',
    papel: 'Explorador de Obras Obscuras',
    bonus: '+20% XP em Animes Fora do Radar',
    descricao: 'Desbravador do desconhecido. Ganha XP bônus ao descobrir e assistir animes pouco populares e raridades do catálogo.',
    cor: 'text-green',
    borda: 'border-green/40',
    fundo: 'bg-green/15',
  },
  paladino: {
    id: 'paladino',
    nome: 'Paladino',
    icone: '🛡️',
    papel: 'Guardião da Constância',
    bonus: 'Vitalidade Protegida · +5 MP diário',
    descricao: 'Baluarte inabalável. Sua Vitalidade decai 50% mais devagar durante o Modo Descanso e sua Mana máxima recarrega com maior vigor.',
    cor: 'text-gold',
    borda: 'border-gold/40',
    fundo: 'bg-gold/15',
  },
}

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
 * Salva a classe de RPG escolhida pelo usuário.
 */
export async function escolherClasse(classe: ClasseRPG): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok: false, erro: 'Não autenticado' }

    const res = await fetch('/api/perfil/classe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ classe }),
    })

    const json = await res.json()
    if (!res.ok || json.erro) {
      return { ok: false, erro: json.erro || 'Falha ao escolher classe' }
    }
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro de conexão ao salvar classe' }
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
