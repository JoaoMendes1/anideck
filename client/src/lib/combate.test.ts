import { describe, expect, it } from 'vitest'
import {
  calcularBonusFuria,
  calcularChanceBloqueioDinamica,
  calcularChanceCriticaDinamica,
  calcularChanceEsquivaDinamica,
  calcularEscalaAtributo,
  calcularIniciativaATB,
  calcularResistenciaElementalPorMil,
  estimarProbabilidadesCombate,
} from './combate'

describe('combate.ts', () => {
  it('aplica retorno decrescente apenas acima do limiar', () => {
    expect(calcularEscalaAtributo(40, 60)).toBe(40)
    expect(calcularEscalaAtributo(60, 60)).toBe(60)
    expect(calcularEscalaAtributo(100, 60)).toBeLessThan(100)
    expect(calcularEscalaAtributo(100, 60)).toBeGreaterThan(60)
  })

  it('calcula crítico e esquiva dinâmicos respeitando pisos e tetos', () => {
    expect(calcularChanceCriticaDinamica(150, 240, 60, 30, 10)).toBeGreaterThan(150)
    expect(calcularChanceCriticaDinamica(150, 40, 240, 10, 30)).toBeLessThan(150)
    expect(calcularChanceCriticaDinamica(0, 1, 999, 1, 999)).toBe(20)
    expect(calcularChanceCriticaDinamica(900, 999, 1, 999, 1)).toBe(850)

    expect(calcularChanceEsquivaDinamica(100, 35, 10)).toBeGreaterThan(100)
    expect(calcularChanceEsquivaDinamica(1000, 1, 99)).toBe(1000)
    expect(calcularChanceEsquivaDinamica(0, 10, 10)).toBe(0)
  })

  it('calcula bloqueio, resistência e fúria', () => {
    expect(calcularChanceBloqueioDinamica(80, 100)).toBeGreaterThan(0)
    expect(calcularChanceBloqueioDinamica(10, 200)).toBe(0)
    expect(calcularResistenciaElementalPorMil(100, 80)).toBeGreaterThan(0)
    expect(calcularBonusFuria(100, 100)).toBe(1)
    expect(calcularBonusFuria(40, 100)).toBeGreaterThan(1)
    expect(calcularBonusFuria(20, 100)).toBeGreaterThan(calcularBonusFuria(40, 100))
  })

  it('calcula ordem ATB pela velocidade dos combatentes', () => {
    const atb = calcularIniciativaATB(40, 10)
    expect(atb.primeiro).toBe('jogador')
    expect(atb.proxima_ordem).toHaveLength(6)
    expect(atb.proxima_ordem.filter((p) => p === 'jogador').length).toBeGreaterThan(3)
  })

  it('estima probabilidades completas para o painel de confronto', () => {
    const est = estimarProbabilidadesCombate(
      { ataque: 120, defesa: 80, magia: 40, velocidade: 30, critico_por_mil: 180, esquiva_por_mil: 140 },
      { nivel: 20, tipo: 'raro', ataque: 90, defesa: 50 },
    )
    expect(est.criticoJogadorPct).toBeGreaterThan(0)
    expect(est.esquivaJogadorPct).toBeGreaterThan(0)
    expect(est.bloqueioJogadorPct).toBeGreaterThan(0)
    expect(est.atb.primeiro).toBe('jogador')
  })
})
