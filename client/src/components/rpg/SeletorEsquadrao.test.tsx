// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SeletorEsquadrao from './SeletorEsquadrao'

afterEach(cleanup)

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('../../lib/personagem', async (orig) => {
  const atual = await orig<typeof import('../../lib/personagem')>()
  return { ...atual, salvarEsquadrao: vi.fn().mockResolvedValue({ dados: ['maga_agua'] }) }
})

const elencoBase = [
  { id: 'lanceiro_fogo', nome: 'Haruto', classe: 'lanceiro', elemento: 'fogo', poder: 320, vida: 900, ativo: true, no_grupo: true },
  { id: 'maga_agua', nome: 'Mizuki', classe: 'maga', elemento: 'agua', poder: 300, vida: 820, ativo: false, no_grupo: false },
  { id: 'assassina_raio', nome: 'Rin', classe: 'assassina', elemento: 'raio', poder: 290, vida: 780, ativo: false, no_grupo: false },
]

describe('SeletorEsquadrao', () => {
  it('exibe reações elementais ativas ao combinar aliados e permite alternar', () => {
    const aoMudar = vi.fn()
    render(
      <MemoryRouter>
        <SeletorEsquadrao elenco={elencoBase} aliadosSelecionados={['maga_agua']} aoMudarAliados={aoMudar} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Formação de Esquadrão \(2\/3\)/)).toBeTruthy()
    expect(screen.getByText(/Vaporização/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Rin/ }))
    expect(aoMudar).toHaveBeenCalledWith(['maga_agua', 'assassina_raio'])
  })

  it('orienta a desbloquear outro herói quando há apenas um no elenco', () => {
    render(
      <MemoryRouter>
        <SeletorEsquadrao elenco={[elencoBase[0]]} aliadosSelecionados={[]} aoMudarAliados={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ver Elenco' })).toBeTruthy()
  })
})
