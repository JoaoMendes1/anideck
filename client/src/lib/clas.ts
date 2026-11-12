// client/src/lib/clas.ts
// Tipos, utilitários e API de Clãs (Fase 17, #180).
// PITFALLS item 17: classes do Tailwind explícitas e completas, sem interpolação.
import { createElement, type ReactNode } from 'react'
import { Shield, Flame, Zap, Swords, ShieldCheck, Moon, Sun, Sparkles } from 'lucide-react'
import { supabase } from './supabase'

export interface ClaSummary {
  id: string
  nome: string
  tag: string
  descricao: string
  emblema: string
  tipo: 'aberto' | 'convite'
  nivel_minimo: number
  criado_em: string
  total_membros: number
  xp_semana: number
}

export interface ClaMembro {
  user_id: string
  handle: string
  nome: string
  avatar_url?: string
  papel: 'lider' | 'vice' | 'membro'
  entrou_em: string
  nivel: number
  xp_semana: number
}

export interface ClaDetalhe {
  id: string
  nome: string
  tag: string
  descricao: string
  emblema: string
  tipo: 'aberto' | 'convite'
  nivel_minimo: number
  criador_id: string
  criado_em: string
  total_membros: number
  xp_semana: number
  membros: ClaMembro[]
}

export interface ClaConvite {
  id: string
  cla_id: string
  cla_nome: string
  cla_tag: string
  cla_emblema: string
  convidado_em: string
  convidado_por_nome: string
}

export interface MeuClaData {
  tem_cla: boolean
  cla_id?: string
  nome?: string
  tag?: string
  descricao?: string
  emblema?: string
  tipo?: 'aberto' | 'convite'
  nivel_minimo?: number
  ativo?: boolean
  criado_em?: string
  meu_papel?: 'lider' | 'vice' | 'membro'
  total_membros?: number
  xp_semana?: number
  cooldown_dias_restantes: number
  convites: ClaConvite[]
}

export interface EmblemaConfig {
  rotulo: string
  icone: React.ComponentType<{ size?: number; className?: string }>
  classePill: string
  classeIcone: string
  classeCard: string
}

export const EMBLEMAS_CLA: Record<string, EmblemaConfig> = {
  padrao: {
    rotulo: 'Vanguarda',
    icone: Shield,
    classePill: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    classeIcone: 'text-indigo-400',
    classeCard: 'from-indigo-950/40 via-panel to-panel border-indigo-500/20 hover:border-indigo-500/40',
  },
  chama: {
    rotulo: 'Chama Eterna',
    icone: Flame,
    classePill: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    classeIcone: 'text-amber-400',
    classeCard: 'from-amber-950/40 via-panel to-panel border-amber-500/20 hover:border-amber-500/40',
  },
  dragao: {
    rotulo: 'Raio Cósmico',
    icone: Zap,
    classePill: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    classeIcone: 'text-cyan-400',
    classeCard: 'from-cyan-950/40 via-panel to-panel border-cyan-500/20 hover:border-cyan-500/40',
  },
  espada: {
    rotulo: 'Espada Honrada',
    icone: Swords,
    classePill: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    classeIcone: 'text-rose-400',
    classeCard: 'from-rose-950/40 via-panel to-panel border-rose-500/20 hover:border-rose-500/40',
  },
  escudo: {
    rotulo: 'Bastião',
    icone: ShieldCheck,
    classePill: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    classeIcone: 'text-emerald-400',
    classeCard: 'from-emerald-950/40 via-panel to-panel border-emerald-500/20 hover:border-emerald-500/40',
  },
  lua: {
    rotulo: 'Eclipse Noturno',
    icone: Moon,
    classePill: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    classeIcone: 'text-purple-400',
    classeCard: 'from-purple-950/40 via-panel to-panel border-purple-500/20 hover:border-purple-500/40',
  },
  sol: {
    rotulo: 'Alvorada Dourada',
    icone: Sun,
    classePill: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    classeIcone: 'text-yellow-400',
    classeCard: 'from-yellow-950/40 via-panel to-panel border-yellow-500/20 hover:border-yellow-500/40',
  },
  sakura: {
    rotulo: 'Sakura Mística',
    icone: Sparkles,
    classePill: 'bg-pink-500/15 border-pink-500/30 text-pink-400',
    classeIcone: 'text-pink-400',
    classeCard: 'from-pink-950/40 via-panel to-panel border-pink-500/20 hover:border-pink-500/40',
  },
}

export function renderIconeEmblema(chave: string, tamanho = 16): ReactNode {
  const conf = EMBLEMAS_CLA[chave] || EMBLEMAS_CLA.padrao
  return createElement(conf.icone, { size: tamanho, className: conf.classeIcone })
}

// =============================================================================
// REQUISIÇÕES DE API DO BACKEND
// =============================================================================

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export async function listarClas(busca = '', limite = 50, offset = 0): Promise<ClaSummary[]> {
  const params = new URLSearchParams()
  if (busca) params.set('busca', busca)
  if (limite) params.set('limite', String(limite))
  if (offset) params.set('offset', String(offset))

  const res = await fetch(`/api/clas?${params.toString()}`)
  if (!res.ok) throw new Error('Falha ao listar clãs')
  return res.json()
}

export async function obterClaPorTag(tag: string): Promise<ClaDetalhe> {
  const res = await fetch(`/api/clas/${encodeURIComponent(tag)}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Clã não encontrado')
    throw new Error('Falha ao carregar clã')
  }
  return res.json()
}

export async function obterMeuCla(): Promise<MeuClaData> {
  const headers = await authHeaders()
  const res = await fetch('/api/me/cla', { headers })
  if (!res.ok) throw new Error('Falha ao carregar dados do seu clã')
  return res.json()
}

export async function criarCla(payload: {
  nome: string
  tag: string
  descricao: string
  emblema: string
  tipo: string
  nivel_minimo: number
}): Promise<{ sucesso: boolean; cla_id: string; tag: string }> {
  const headers = await authHeaders()
  const res = await fetch('/api/clas', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao fundar clã')
  return json
}

export async function entrarCla(claId: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/entrar`, {
    method: 'POST',
    headers,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao entrar no clã')
}

export async function sairCla(): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch('/api/clas/sair', {
    method: 'POST',
    headers,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao sair do clã')
}

export async function expulsarMembro(claId: string, userId: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/membros/${userId}/expulsar`, {
    method: 'POST',
    headers,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao expulsar membro')
}

export async function transferirLideranca(claId: string, novoLiderId: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/transferir`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ novo_lider_id: novoLiderId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao transferir liderança')
}

export async function alterarPapel(claId: string, userId: string, novoPapel: 'vice' | 'membro'): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/membros/${userId}/papel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ novo_papel: novoPapel }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao alterar papel')
}

export async function convidarMembro(claId: string, convidadoUserId: string): Promise<{ sucesso: boolean; convite_id: string }> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/convites`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ convidado_user_id: convidadoUserId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao enviar convite')
  return json
}

export async function responderConvite(conviteId: string, aceitar: boolean): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/convites/${conviteId}/responder`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ aceitar }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao responder convite')
}

export async function denunciarCla(claId: string, motivo: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`/api/clas/${claId}/denunciar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ motivo }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.erro || json.message || 'Falha ao enviar denúncia')
}

// -----------------------------------------------------------------------------
// DESAFIO SEMANAL DO CLÃ (Fase 17 · 17.1b, #181)
// -----------------------------------------------------------------------------

export interface MembroContribuicaoDesafio {
  user_id: string
  handle: string
  nome: string
  avatar_url?: string | null
  papel: 'lider' | 'vice' | 'membro'
  contribuicao: number
  elegivel: boolean
  entrou_em: string
}

export interface DesafioCla {
  id: string
  cla_id: string
  semana: string
  tipo: 'episodios' | 'reacoes' | 'animes_terminados' | 'comentarios'
  titulo: string
  descricao: string
  unidade: string
  icone: string
  meta: number
  progresso_total: number
  progresso_pct: number
  recompensa_anicoins: number
  concluido: boolean
  concluido_em: string | null
  fechado: boolean
  pago: boolean
  inicio_semana: string
  fim_semana: string
  contribuicoes: MembroContribuicaoDesafio[]
}

export interface MeuDesafioClaResumo {
  tem_cla: boolean
  cla_id?: string
  cla_nome?: string
  cla_tag?: string
  cla_emblema?: string
  desafio_id?: string
  semana?: string
  tipo?: 'episodios' | 'reacoes' | 'animes_terminados' | 'comentarios'
  titulo?: string
  descricao?: string
  unidade?: string
  icone?: string
  meta?: number
  progresso_total?: number
  progresso_pct?: number
  recompensa_anicoins?: number
  concluido?: boolean
  fechado?: boolean
  minha_contribuicao?: number
  minha_elegivel?: boolean
}

export async function obterDesafioCla(tag: string, semana?: string): Promise<DesafioCla> {
  const query = semana ? `?semana=${encodeURIComponent(semana)}` : ''
  const res = await fetch(`/api/clas/${encodeURIComponent(tag)}/desafio${query}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.erro || err.message || 'Falha ao carregar desafio do clã')
  }
  return res.json()
}

export async function obterMeuDesafioClaResumo(): Promise<MeuDesafioClaResumo> {
  const headers = await authHeaders()
  const res = await fetch('/api/me/cla/desafio', { headers })
  if (!res.ok) {
    return { tem_cla: false }
  }
  return res.json()
}
