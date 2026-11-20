// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SintoniaElemental from './SintoniaElemental'
import type { EstadoEquipamento } from '../../lib/rpg'

const atributos = { vida: 0, ataque: 0, defesa: 0, magia: 0, eter: 0, velocidade: 0, critico_por_mil: 0, dano_critico: 0, esquiva_por_mil: 0, sorte_item: 0, poder: 0 }
const estado = (extra: Partial<EstadoEquipamento>): EstadoEquipamento => ({ nivel: 20, base: atributos, atributos, slots: [], inventario: [], ...extra })

describe('SintoniaElemental', () => {
  afterEach(cleanup)

  it('mostra quantas peças faltam para a Ressonância', () => {
    render(<SintoniaElemental estado={estado({ elemento: 'agua', pecas_em_sintonia: 3, ressonancia: false })} />)
    expect(screen.getByText('3/4 peças')).toBeTruthy()
    expect(screen.getByText(/faltam 1/)).toBeTruthy()
  })

  it('avisa a Ressonância ativa', () => {
    render(<SintoniaElemental estado={estado({ elemento: 'agua', pecas_em_sintonia: 4, ressonancia: true })} />)
    expect(screen.getByText(/Ressonância ativa/)).toBeTruthy()
  })

  it('sem elemento não mostra nada (servidor antigo)', () => {
    const { container } = render(<SintoniaElemental estado={estado({})} />)
    expect(container.innerHTML).toBe('')
  })
})
