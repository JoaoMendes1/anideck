// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BarraATB from './BarraATB'

describe('BarraATB', () => {
  it('exibe velocidades, quem abre a rodada e a ordem de turnos', () => {
    render(
      <BarraATB
        nomeMonstro="Dragão Glacial"
        atb={{
          velocidade_jogador: 32,
          velocidade_monstro: 18,
          ritmo_jogador: 37,
          ritmo_monstro: 23,
          atb_jogador: 100,
          atb_monstro: 62,
          primeiro: 'jogador',
          proxima_ordem: ['jogador', 'monstro', 'jogador', 'jogador', 'monstro', 'jogador'],
        }}
      />,
    )
    expect(screen.getByText('Iniciativa ATB')).toBeTruthy()
    expect(screen.getByText('Você (Vel 32)')).toBeTruthy()
    expect(screen.getByText('Dragão Glacial (Vel 18)')).toBeTruthy()
    expect(screen.getByText('1. Você')).toBeTruthy()
    expect(screen.getByText('2. Inimigo')).toBeTruthy()
  })
})
