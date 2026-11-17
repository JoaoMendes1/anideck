// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AvaliacoesDaObra from './AvaliacoesDaObra'

vi.mock('../../contexts/SessaoContext', () => ({
  useSessao: () => ({
    session: { access_token: 'tok-teste', user: { id: 'u1' } },
  }),
}))

const showToastMock = vi.fn()
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  showToastMock.mockReset()
})

describe('AvaliacoesDaObra', () => {
  it('renderiza avaliações com proteção de spoiler e libera formulário para quem completou', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          pode_avaliar: true,
          reviews: [
            {
              id: 'r1',
              mal_id: 21,
              autor: { handle: 'levi', nome: 'Levi' },
              nota: 9.5,
              texto: 'Uma obra muito consistente do começo ao fim, especialmente quando ||o protagonista retorna para salvar o esquadrão|| na batalha final.',
              contem_spoiler: false,
              created_at: '2026-11-17T10:00:00Z',
              updated_at: '2026-11-17T10:00:00Z',
              meu: false,
            },
          ],
        }),
        { status: 200 },
      ),
    )

    render(
      <MemoryRouter>
        <AvaliacoesDaObra malId={21} ehCompleto={true} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Levi')).toBeTruthy()
    })

    expect(screen.getByText(/anotação privada do deck/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Revelar spoiler' })).toBeTruthy()

    const textarea = screen.getByPlaceholderText(/Conte sem pressa/i) as HTMLTextAreaElement
    const botao = screen.getByRole('button', { name: /Publicar avaliação/i }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)

    fireEvent.change(textarea, { target: { value: 'a'.repeat(105) } })
    expect(botao.disabled).toBe(false)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('mostra orientação quando a obra ainda não está completa no deck', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          pode_avaliar: false,
          motivo_bloqueio: 'Marque este anime como Completo no seu deck para publicar uma avaliação pública.',
          reviews: [],
        }),
        { status: 200 },
      ),
    )

    render(
      <MemoryRouter>
        <AvaliacoesDaObra malId={21} ehCompleto={false} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Marque este anime como Completo no seu deck/i)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Publicar avaliação/i })).toBeNull()
  })
})
