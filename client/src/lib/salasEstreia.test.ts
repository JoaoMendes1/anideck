// client/src/lib/salasEstreia.test.ts
import { describe, it, expect } from 'vitest'
import { formatarContagemRegressiva } from './salasEstreia'

describe('salasEstreia - formatarContagemRegressiva', () => {
  it('retorna "Encerrada" para segundos <= 0', () => {
    expect(formatarContagemRegressiva(0)).toBe('Encerrada')
    expect(formatarContagemRegressiva(-10)).toBe('Encerrada')
  })

  it('formata horas e minutos quando segundos >= 3600', () => {
    // 2 horas, 45 minutos e 30 segundos
    const segs = 2 * 3600 + 45 * 60 + 30
    expect(formatarContagemRegressiva(segs)).toBe('2h 45m')

    // 1 hora exata
    expect(formatarContagemRegressiva(3600)).toBe('1h 00m')
  })

  it('formata minutos e segundos quando segundos < 3600', () => {
    // 12 minutos e 34 segundos
    expect(formatarContagemRegressiva(12 * 60 + 34)).toBe('12:34')

    // 59 segundos
    expect(formatarContagemRegressiva(59)).toBe('00:59')

    // 5 segundos
    expect(formatarContagemRegressiva(5)).toBe('00:05')
  })
})
