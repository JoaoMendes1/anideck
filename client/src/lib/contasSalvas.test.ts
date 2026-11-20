// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

const setSession = vi.fn()
vi.mock('./supabase', () => ({ supabase: { auth: { setSession: (...a: unknown[]) => setSession(...a), storageKey: 'sb-teste-auth-token' } } }))

import { esquecerConta, lembrarSessao, lerContas, prepararNovaConta, trocarPara } from './contasSalvas'

const sessao = (id: string, refresh = 'r-' + id) =>
  ({ access_token: 'a-' + id, refresh_token: refresh, user: { id, email: `${id}@x.com`, user_metadata: { full_name: 'Nome ' + id } } }) as unknown as Session

describe('contas salvas', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSession.mockReset()
  })

  it('lembra cada conta uma vez, com os tokens mais novos e a ativa primeiro', () => {
    lembrarSessao(sessao('a'))
    lembrarSessao(sessao('b'))
    lembrarSessao(sessao('a', 'r-novo'))
    const contas = lerContas()
    expect(contas.map((c) => c.user_id)).toEqual(['a', 'b'])
    expect(contas[0].refresh_token).toBe('r-novo')
    expect(contas[0].nome).toBe('Nome a')
    esquecerConta('a')
    expect(lerContas().map((c) => c.user_id)).toEqual(['b'])
  })

  it('troca pela sessão guardada e esquece a conta cuja sessão expirou', async () => {
    lembrarSessao(sessao('a'))
    setSession.mockResolvedValueOnce({ data: { session: sessao('a', 'r-renovado') }, error: null })
    expect(await trocarPara(lerContas()[0])).toEqual({})
    expect(setSession).toHaveBeenCalledWith({ access_token: 'a-a', refresh_token: 'r-a' })
    expect(lerContas()[0].refresh_token).toBe('r-renovado')

    setSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('expirou') })
    const r = await trocarPara(lerContas()[0])
    expect(r.erro).toBeTruthy()
    expect(lerContas()).toEqual([])
  })

  it('adicionar conta guarda a ativa e limpa só a sessão local', () => {
    window.localStorage.setItem('sb-teste-auth-token', '{}')
    prepararNovaConta(sessao('a'))
    expect(window.localStorage.getItem('sb-teste-auth-token')).toBeNull()
    expect(lerContas().map((c) => c.user_id)).toEqual(['a'])
  })
})
