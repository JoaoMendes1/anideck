// client/src/lib/comunidadeAnimes.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { obterEmAltaComunidade, obterNumerosComunidadeAnime } from './comunidadeAnimes'

describe('comunidadeAnimes (#271)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('consulta números da comunidade sem cache e retorna contagens', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mal_id: 52991,
          assistindo: 3,
          completo: 8,
          dropado: 1,
          quero_assistir: 4,
          total: 16,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const res = await obterNumerosComunidadeAnime(52991)
    expect(res).toEqual({
      mal_id: 52991,
      assistindo: 3,
      completo: 8,
      dropado: 1,
      quero_assistir: 4,
      total: 16,
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/anime/52991/comunidade', { cache: 'no-store' })
  })

  it('hidrata capas faltantes via /api/anime/bulk mantendo itens curados intactos', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/rankings/em-alta')) {
        return new Response(
          JSON.stringify({
            dias: 14,
            itens: [
              {
                mal_id: 1,
                titulo: 'Curado',
                imagem_url: 'https://cdn/curado.webp',
                pontuacao: 40,
                usuarios_ativos: 4,
                episodios_recentes: 8,
                comentarios_recentes: 2,
                reacoes_recentes: 3,
                drops_recentes: 0,
              },
              {
                mal_id: 2,
                titulo: 'Anime #2',
                imagem_url: '',
                pontuacao: 19,
                usuarios_ativos: 2,
                episodios_recentes: 3,
                comentarios_recentes: 1,
                reacoes_recentes: 0,
                drops_recentes: 1,
              },
            ],
          }),
          { status: 200 },
        )
      }
      return new Response(
        JSON.stringify({
          data: [{ mal_id: 2, title: 'Frieren', images: { jpg: { image_url: 'https://anilist/2.jpg' } } }],
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await obterEmAltaComunidade(14, 10)
    expect(res.itens[0].imagem_url).toBe('https://cdn/curado.webp')
    expect(res.itens[1].titulo).toBe('Frieren')
    expect(res.itens[1].imagem_url).toBe('https://anilist/2.jpg')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/anime/bulk',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: [2] }),
      }),
    )
  })

  it('não quebra se /api/anime/bulk falhar quando a AniList estiver fora', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/rankings/em-alta')) {
        return new Response(
          JSON.stringify({
            dias: 14,
            itens: [
              {
                mal_id: 2,
                titulo: 'Obra em cache',
                imagem_url: '',
                pontuacao: 15,
                usuarios_ativos: 2,
                episodios_recentes: 2,
                comentarios_recentes: 0,
                reacoes_recentes: 0,
                drops_recentes: 0,
              },
            ],
          }),
          { status: 200 },
        )
      }
      return new Response('AniList indisponível', { status: 503 })
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await obterEmAltaComunidade()
    expect(res.itens).toHaveLength(1)
    expect(res.itens[0].titulo).toBe('Obra em cache')
  })
})
