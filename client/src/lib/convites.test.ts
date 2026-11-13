// client/src/lib/convites.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obterMeuConvite, resgatarConvite } from './convites'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('convites.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('obterMeuConvite retorna null se não houver sessão ativa', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const res = await obterMeuConvite()
    expect(res).toBeNull()
  })

  it('resgatarConvite retorna erro se o usuário não estiver autenticado', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const res = await resgatarConvite('amigo-123')
    expect(res.sucesso).toBe(false)
    expect(res.erro).toContain('Faça login')
  })
})
