// client/src/lib/wrapped.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obterMeuWrapped, obterWrappedPublico, type AniDeckWrapped } from './wrapped'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('wrapped.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna null se não houver sessão ativa', async () => {
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const res = await obterMeuWrapped(2026)
    expect(res).toBeNull()
  })

  it('obterWrappedPublico retorna dados formatados quando a API responde 200', async () => {
    const mockData: AniDeckWrapped = {
      ano: 2026,
      usuario: { user_id: 'u-1', handle: 'teste', nome: 'Tester' },
      total_episodios: 120,
      horas_estimadas: 48,
      dias_ativos: 45,
      nota_media: 8.5,
      top_animes: [{ mal_id: 1, title: 'Cowboy Bebop', cover_url: '', total_eps: 26 }],
      top_generos: [{ genero: 'Sci-Fi', total: 30 }],
      total_comentarios: 15,
      total_reacoes: 40,
      reacao_favorita: '🔥',
      total_cartas: 8,
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const res = await obterWrappedPublico('teste', 2026)
    expect(res).toEqual(mockData)
    expect(res?.total_episodios).toBe(120)
    expect(res?.top_animes[0].title).toBe('Cowboy Bebop')
  })
})
