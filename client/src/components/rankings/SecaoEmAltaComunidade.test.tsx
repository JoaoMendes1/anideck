// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SecaoEmAltaComunidade from './SecaoEmAltaComunidade'

describe('SecaoEmAltaComunidade (#271 + #272)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza obras em alta com atividade agregada e indicador de drops sem expor perfis', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dias: 14,
          itens: [
            {
              mal_id: 52991,
              titulo: 'Frieren',
              imagem_url: 'https://cdn/frieren.webp',
              pontuacao: 48,
              usuarios_ativos: 5,
              episodios_recentes: 12,
              comentarios_recentes: 3,
              reacoes_recentes: 4,
              drops_recentes: 3,
            },
            {
              mal_id: 1,
              titulo: 'Cowboy Bebop',
              imagem_url: 'https://cdn/bebop.webp',
              pontuacao: 18,
              usuarios_ativos: -1,
              episodios_recentes: 4,
              comentarios_recentes: 0,
              reacoes_recentes: 0,
              drops_recentes: -1,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    render(
      <MemoryRouter>
        <SecaoEmAltaComunidade />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Frieren')).toBeTruthy())
    expect(screen.getByText('5 ativos')).toBeTruthy()
    expect(screen.getByText('12 ep')).toBeTruthy()
    expect(screen.getByText('3 drops recentes')).toBeTruthy()
    expect(screen.getByText('Menos de 3 ativos')).toBeTruthy()
    expect(screen.getByText('Menos de 3 drops recentes')).toBeTruthy()
  })

  it('mostra aviso acolhedor quando ainda não há atividade recente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ dias: 14, itens: [] }), { status: 200 })),
    )

    render(
      <MemoryRouter>
        <SecaoEmAltaComunidade />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText(/Ainda não há atividade suficiente/i)).toBeTruthy())
  })
})
