// client/src/lib/contasSalvas.ts
// Troca rápida de conta neste aparelho. Cada conta que entra tem a sessão lembrada (o mesmo
// par de tokens que o Supabase já guarda no navegador); trocar ativa a sessão guardada da
// outra conta, sem pedir senha.
//
// Trocar e adicionar conta nunca chamam signOut: ele encerra a sessão no servidor, e o token
// guardado deixaria de valer. Só o "Sair" encerra de verdade, e tira a conta da lista.
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ContaSalva {
  user_id: string
  email: string
  nome: string
  access_token: string
  refresh_token: string
}

const CHAVE = 'anideck:contas-salvas'
const LIMITE = 5

export function lerContas(): ContaSalva[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    const lista = bruto ? (JSON.parse(bruto) as ContaSalva[]) : []
    return Array.isArray(lista) ? lista.filter((c) => c && c.user_id && c.refresh_token) : []
  } catch {
    return []
  }
}

function gravar(lista: ContaSalva[]): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, LIMITE)))
  } catch {
    // Sem armazenamento: a troca rápida simplesmente não lembra contas.
  }
}

/** Guarda (ou atualiza) a sessão da conta ativa, com os tokens mais novos. */
export function lembrarSessao(sessao: Session | null): void {
  if (!sessao?.user?.id || !sessao.refresh_token) return
  const meta = (sessao.user.user_metadata ?? {}) as Record<string, unknown>
  const nome = String(meta.full_name ?? meta.name ?? '')
  const conta: ContaSalva = {
    user_id: sessao.user.id,
    email: sessao.user.email ?? '',
    nome,
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
  }
  gravar([conta, ...lerContas().filter((c) => c.user_id !== conta.user_id)])
}

export function esquecerConta(userId: string): void {
  gravar(lerContas().filter((c) => c.user_id !== userId))
}

/** Chave em que o Supabase guarda a sessão ativa neste navegador. */
function chaveDaSessaoAtiva(): string {
  return (supabase.auth as unknown as { storageKey?: string }).storageKey ?? ''
}

/** Ativa a sessão guardada da conta. Se ela não vale mais, a conta sai da lista. */
export async function trocarPara(conta: ContaSalva): Promise<{ erro?: string }> {
  const { data, error } = await supabase.auth.setSession({ access_token: conta.access_token, refresh_token: conta.refresh_token })
  if (error || !data.session) {
    esquecerConta(conta.user_id)
    return { erro: 'A sessão dessa conta expirou. Entre nela de novo para voltar a trocar com um toque.' }
  }
  lembrarSessao(data.session)
  return {}
}

/** Deixa a conta ativa guardada e abre o login para entrar em outra, sem encerrar a sessão. */
export function prepararNovaConta(sessaoAtual: Session | null): void {
  lembrarSessao(sessaoAtual)
  const chave = chaveDaSessaoAtiva()
  try {
    if (chave) window.localStorage.removeItem(chave)
  } catch {
    // Sem armazenamento: o login abre com a conta atual, e basta sair dela.
  }
}
