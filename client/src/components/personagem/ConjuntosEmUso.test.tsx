// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ConjuntosEmUso from './ConjuntosEmUso'
import type { EstadoEquipamento } from '../../lib/rpg'

const atributos = { vida: 0, ataque: 0, defesa: 0, magia: 0, eter: 0, velocidade: 0, critico_por_mil: 0, dano_critico: 0, esquiva_por_mil: 0, sorte_item: 0, poder: 0 }
const estado = (conjuntos: EstadoEquipamento['conjuntos']): EstadoEquipamento => ({
  nivel: 30, base: atributos, atributos, slots: [], inventario: [], conjuntos,
})

describe('ConjuntosEmUso', () => {
  afterEach(cleanup)

  it('sem conjunto em uso não mostra nada', () => {
    const { container } = render(<ConjuntosEmUso estado={estado([])} />)
    expect(container.innerHTML).toBe('')
  })

  it('mostra as faixas e marca a que ainda não vale', () => {
    render(
      <ConjuntosEmUso
        estado={estado([{ id: 'carmesim', nome: 'Carmesim', pecas: 2, bonus_2: '+8 Ataque', bonus_4: '+25% Dano Crítico', ativo_2: true, ativo_4: false }])}
      />,
    )
    expect(screen.getByText('Carmesim')).toBeTruthy()
    expect(screen.getByText('2 em uso')).toBeTruthy()
    expect(screen.getByText(/\+8 Ataque/).className).toContain('text-green')
    expect(screen.getByText(/\+25% Dano Crítico/).closest('li')?.className).toContain('text-muted')
  })
})
