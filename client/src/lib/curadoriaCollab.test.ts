// client/src/lib/curadoriaCollab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submeterSugestaoCuradoria, listarSugestoesCollabAdmin } from './curadoriaCollab'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('curadoriaCollab.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('recusa submeter sugestão sem sessão autenticada', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const res = await submeterSugestaoCuradoria({
      mal_id: 1,
      campo: 'titulo_episodio',
      valor: 'Novo título',
    })

    expect(res.sucesso).toBe(false)
    expect(res.erro).toContain('login')
  })

  it('listarSugestoesCollabAdmin retorna lista quando API responde 200', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'fake-token',
          refresh_token: '',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'u1' } as never,
        },
      },
      error: null,
    })

    const dados = [
      { id: 'sug-1', mal_id: 1, campo: 'estreia', valor_sugerido: '2026-10-01', status: 'pendente' },
    ]

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(dados), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const lista = await listarSugestoesCollabAdmin()
    expect(lista).toHaveLength(1)
    expect(lista[0].campo).toBe('estreia')
  })
})
