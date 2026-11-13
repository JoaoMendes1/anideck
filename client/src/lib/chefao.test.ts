// client/src/lib/chefao.test.ts
import { describe, it, expect } from 'vitest'
import { calcularPorcentagemHP, obterClasseBarraHP } from './chefao'

describe('chefao - funções utilitárias', () => {
  describe('calcularPorcentagemHP', () => {
    it('retorna 0 para valores zerados ou negativos', () => {
      expect(calcularPorcentagemHP(0, 2500)).toBe(0)
      expect(calcularPorcentagemHP(-10, 2500)).toBe(0)
      expect(calcularPorcentagemHP(100, 0)).toBe(0)
      expect(calcularPorcentagemHP(100, -500)).toBe(0)
    })

    it('calcula porcentagem com precisão de 1 casa decimal', () => {
      expect(calcularPorcentagemHP(1250, 2500)).toBe(50.0)
      expect(calcularPorcentagemHP(500, 2500)).toBe(20.0)
      expect(calcularPorcentagemHP(2500, 2500)).toBe(100.0)
    })

    it('limita no máximo em 100', () => {
      expect(calcularPorcentagemHP(3000, 2500)).toBe(100.0)
    })
  })

  describe('obterClasseBarraHP', () => {
    it('retorna muted para 0%', () => {
      const estilo = obterClasseBarraHP(0)
      expect(estilo.texto).toBe('text-muted-2')
    })

    it('retorna coral para <= 20%', () => {
      const estilo = obterClasseBarraHP(15)
      expect(estilo.texto).toBe('text-coral')
    })

    it('retorna gold para <= 50%', () => {
      const estilo = obterClasseBarraHP(40)
      expect(estilo.texto).toBe('text-gold')
    })

    it('retorna holo para > 50%', () => {
      const estilo = obterClasseBarraHP(75)
      expect(estilo.texto).toBe('text-holo-3')
    })
  })
})
