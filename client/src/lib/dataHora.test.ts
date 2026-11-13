// client/src/lib/dataHora.test.ts
import { describe, it, expect } from 'vitest'
import { obterIntervaloSemanaISO, formatarSemanaISO, formatarTemporada } from './dataHora'

describe('dataHora', () => {
  describe('obterIntervaloSemanaISO', () => {
    it('calcula corretamente a semana 46 de 2026 (09/11 a 15/11)', () => {
      const res = obterIntervaloSemanaISO('2026-W46')
      expect(res).not.toBeNull()
      expect(res!.inicio.getUTCFullYear()).toBe(2026)
      expect(res!.inicio.getUTCMonth()).toBe(10) // Novembro é índice 10
      expect(res!.inicio.getUTCDate()).toBe(9)

      expect(res!.fim.getUTCFullYear()).toBe(2026)
      expect(res!.fim.getUTCMonth()).toBe(10)
      expect(res!.fim.getUTCDate()).toBe(15)
    })

    it('retorna null para formatos inválidos', () => {
      expect(obterIntervaloSemanaISO('')).toBeNull()
      expect(obterIntervaloSemanaISO('invalido')).toBeNull()
      expect(obterIntervaloSemanaISO('2026-W99')).toBeNull()
    })
  })

  describe('formatarSemanaISO', () => {
    it('formata como "Esta semana (09 a 15 de Nov)" quando hoje está na semana', () => {
      const hojeNaSemana = new Date(Date.UTC(2026, 10, 12, 12, 0, 0))
      const res = formatarSemanaISO('2026-W46', hojeNaSemana)
      expect(res).toBe('Esta semana (09 a 15 de Nov)')
    })

    it('formata como intervalo simples quando fora da semana atual', () => {
      const outraData = new Date(Date.UTC(2026, 9, 1, 12, 0, 0))
      const res = formatarSemanaISO('2026-W46', outraData)
      expect(res).toBe('09 a 15 de Nov')
    })

    it('formata semanas que cruzam a virada de mês', () => {
      // Semana 44 de 2026 vai de 26 de Out a 01 de Nov
      const outraData = new Date(Date.UTC(2026, 0, 1))
      const res = formatarSemanaISO('2026-W44', outraData)
      expect(res).toBe('26 de Out a 01 de Nov')
    })
  })

  describe('formatarTemporada', () => {
    it('formata códigos trimestrais de anime', () => {
      expect(formatarTemporada('2026-FALL')).toBe('Outono 2026 (Out–Dez)')
      expect(formatarTemporada('2026-WINTER')).toBe('Inverno 2026 (Jan–Mar)')
      expect(formatarTemporada('2026-SPRING')).toBe('Primavera 2026 (Abr–Jun)')
      expect(formatarTemporada('2026-SUMMER')).toBe('Verão 2026 (Jul–Set)')
    })

    it('fallback seguro para formato não reconhecido', () => {
      expect(formatarTemporada('2026')).toBe('2026')
      expect(formatarTemporada('')).toBe('')
    })
  })
})
