// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import type { EstadoEquipamento, ItemRPG } from '../../lib/rpg'

vi.mock('../../lib/rpg', async (original) => {
  const real = await original<typeof import('../../lib/rpg')>()
  return { ...real, obterEquipamentos: vi.fn(), equiparItemRPG: vi.fn() }
})

import PainelEquipamentos from './PainelEquipamentos'
import { equiparItemRPG, obterEquipamentos } from '../../lib/rpg'

const espada = { id: 'espada_de_ferro', slot: 'arma' as const, nome: 'Espada de Ferro', descricao: '', raridade: 'comum' as const, vida: 0, ataque: 4, defesa: 0, nivel_minimo: 1 }
const lamina = { id: 'lamina_de_eter', slot: 'arma' as const, nome: 'Lâmina de Éter', descricao: '', raridade: 'raro' as const, vida: 0, ataque: 10, defesa: 0, nivel_minimo: 10 }
const primordial = { id: 'lamina_primordial', slot: 'arma' as const, nome: 'Lâmina Primordial', descricao: '', raridade: 'lendario' as const, vida: 0, ataque: 45, defesa: 0, nivel_minimo: 55 }

function estado(armaEquipada: ItemRPG = espada): EstadoEquipamento {
  return {
    nivel: 12,
    base: { vida: 320, ataque: 43, defesa: 27, poder: 172 },
    atributos: { vida: 320, ataque: 43 + armaEquipada.ataque, defesa: 27, poder: 180 },
    slots: [{ slot: 'arma', item: armaEquipada }, { slot: 'armadura' }, { slot: 'capa' }, { slot: 'botas' }, { slot: 'joia' }],
    inventario: [
      { ...espada, quantidade: 1, equipado: armaEquipada.id === espada.id, bloqueado: false },
      { ...lamina, quantidade: 2, equipado: armaEquipada.id === lamina.id, bloqueado: false },
      { ...primordial, quantidade: 1, equipado: false, bloqueado: true },
    ],
  }
}

beforeEach(() => {
  vi.mocked(obterEquipamentos).mockReset()
  vi.mocked(equiparItemRPG).mockReset()
})
afterEach(cleanup)

describe('PainelEquipamentos', () => {
  it('mostra atributos, poder e o item de cada slot', async () => {
    vi.mocked(obterEquipamentos).mockResolvedValue(estado())
    render(<PainelEquipamentos />)

    await screen.findByText('Poder 180')
    expect(screen.getByText('47')).toBeTruthy()
    expect(screen.getByText('+4 itens')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Arma: Espada de Ferro. Trocar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Botas: vazio. Equipar' })).toBeTruthy()
  })

  it('abre o slot, mostra o ganho da troca e equipa', async () => {
    vi.mocked(obterEquipamentos).mockResolvedValue(estado())
    vi.mocked(equiparItemRPG).mockResolvedValue({ dados: estado(lamina) })
    render(<PainelEquipamentos />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    expect(screen.getByText('+6 Ataque')).toBeTruthy()
    expect(screen.getByText('nível 55')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Equipar' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }))
    await screen.findByRole('button', { name: 'Arma: Lâmina de Éter. Trocar' })
    expect(equiparItemRPG).toHaveBeenCalledWith('arma', 'lamina_de_eter')
  })

  it('remover envia o slot vazio', async () => {
    vi.mocked(obterEquipamentos).mockResolvedValue(estado())
    vi.mocked(equiparItemRPG).mockResolvedValue({ dados: estado() })
    render(<PainelEquipamentos />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(equiparItemRPG).toHaveBeenCalledWith('arma', ''))
  })

  it('mostra o erro do servidor', async () => {
    vi.mocked(obterEquipamentos).mockResolvedValue(estado())
    vi.mocked(equiparItemRPG).mockResolvedValue({ erro: 'Este item exige o nível 10.' })
    render(<PainelEquipamentos />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Este item exige o nível 10.'))
  })

  it('sem resposta do servidor, mostra os slots vazios de antes', async () => {
    vi.mocked(obterEquipamentos).mockResolvedValue(null)
    render(<PainelEquipamentos />)

    await screen.findByText('em breve')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
