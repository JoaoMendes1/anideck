// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CartaoEcoPersonagem from './CartaoEcoPersonagem'
import type { EstadoEquipamento } from '../../lib/rpg'

afterEach(cleanup)

const mockObter = vi.fn()
const mockEquipar = vi.fn()

vi.mock('../../lib/rpg', async (orig) => {
  const real = await orig<typeof import('../../lib/rpg')>()
  return {
    ...real,
    obterEcosDoAnime: (...args: unknown[]) => mockObter(...args),
    equiparEcoDoAnime: (...args: unknown[]) => mockEquipar(...args),
  }
})

const estadoBase: EstadoEquipamento = {
  nivel: 20,
  base: { vida: 400, ataque: 40, defesa: 25, poder: 170 },
  atributos: { vida: 400, ataque: 40, defesa: 25, poder: 170 },
  slots: [],
  inventario: [],
}

describe('CartaoEcoPersonagem', () => {
  it('lista cartas Foil no seletor e equipa ao clicar', async () => {
    const novoEstado: EstadoEquipamento = {
      ...estadoBase,
      eco: {
        mal_id: 5114,
        titulo: 'Fullmetal Alchemist',
        raridade: 'rarissima',
        nota: 10,
        genero_principal: 'Ação',
        nome_efeito: 'Eco de Impacto',
        resumo: '+10 Ataque · +2 Velocidade',
      },
    }
    mockObter.mockResolvedValue({
      dados: { eco_mal_id: 0, cartas: [novoEstado.eco!] },
    })
    mockEquipar.mockResolvedValue({ dados: novoEstado })
    const aoAtualizar = vi.fn()

    render(
      <MemoryRouter>
        <CartaoEcoPersonagem estado={estadoBase} aoAtualizar={aoAtualizar} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Equipar Carta Foil' }))
    await waitFor(() => expect(screen.getByText('Fullmetal Alchemist')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }))
    await waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(novoEstado))
  })
})
