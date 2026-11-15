import { describe, it, expect } from 'vitest'
import { animaPorPadrao, detalhePorTamanho, diasDaSemanaDoStreak, normalizarRank, rotuloDoStreak } from './insignias'

describe('normalizarRank', () => {
  it('aceita os oito ranks, com caixa e espaço normalizados', () => {
    expect(normalizarRank('E')).toBe('E')
    expect(normalizarRank(' ss ')).toBe('SS')
  })

  it('cai no F quando o rank é desconhecido ou ausente', () => {
    expect(normalizarRank('Z')).toBe('F')
    expect(normalizarRank('')).toBe('F')
    expect(normalizarRank(undefined)).toBe('F')
    expect(normalizarRank(null)).toBe('F')
  })
})

describe('detalhePorTamanho e animaPorPadrao', () => {
  it('usa a versão compacta abaixo de 48 px', () => {
    expect(detalhePorTamanho(36)).toBe('compacta')
    expect(detalhePorTamanho(48)).toBe('completa')
  })

  it('só anima de 96 px para cima', () => {
    expect(animaPorPadrao(56)).toBe(false)
    expect(animaPorPadrao(96)).toBe(true)
  })
})

describe('diasDaSemanaDoStreak', () => {
  it('acende os dias mais recentes, à direita', () => {
    expect(diasDaSemanaDoStreak(3)).toEqual(['apagado', 'apagado', 'apagado', 'apagado', 'aceso', 'aceso', 'aceso'])
  })

  it('marca a semana inteira como completa a partir de sete dias', () => {
    expect(diasDaSemanaDoStreak(7).every(d => d === 'completo')).toBe(true)
    expect(diasDaSemanaDoStreak(31).every(d => d === 'completo')).toBe(true)
  })

  it('trata zero, negativo e valor inválido como nenhum dia', () => {
    expect(diasDaSemanaDoStreak(0).every(d => d === 'apagado')).toBe(true)
    expect(diasDaSemanaDoStreak(-2).every(d => d === 'apagado')).toBe(true)
    expect(diasDaSemanaDoStreak(Number.NaN).every(d => d === 'apagado')).toBe(true)
  })

  it('usa o singular só para um dia', () => {
    expect(rotuloDoStreak(1)).toBe('dia seguido')
    expect(rotuloDoStreak(3)).toBe('dias seguidos')
  })
})
