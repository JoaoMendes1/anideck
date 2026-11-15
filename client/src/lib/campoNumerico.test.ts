import { describe, it, expect } from 'vitest'
import { casasDoPasso, darPasso, dentroDosLimites, interpretarNumero, limitar } from './campoNumerico'

describe('interpretarNumero', () => {
  it('lê inteiros e decimais, com vírgula ou ponto', () => {
    expect(interpretarNumero('25', 0)).toBe(25)
    expect(interpretarNumero(' 1,5 ', 1)).toBe(1.5)
    expect(interpretarNumero('1.25', 2)).toBe(1.25)
  })

  it('devolve null para vazio e para o que não é número, em vez de zero', () => {
    expect(interpretarNumero('', 0)).toBeNull()
    expect(interpretarNumero('-', 0)).toBeNull()
    expect(interpretarNumero('abc', 0)).toBeNull()
  })

  it('recusa decimal em campo inteiro', () => {
    expect(interpretarNumero('2.5', 0)).toBeNull()
  })
})

describe('limites e passo', () => {
  it('confere e aplica mínimo e máximo', () => {
    expect(dentroDosLimites(5, 1, 10)).toBe(true)
    expect(dentroDosLimites(0, 1, 10)).toBe(false)
    expect(dentroDosLimites(999)).toBe(true)
    expect(limitar(0, 1, 10)).toBe(1)
    expect(limitar(11, 1, 10)).toBe(10)
    expect(limitar(7, 1, 10)).toBe(7)
  })

  it('conta as casas do passo', () => {
    expect(casasDoPasso(1)).toBe(0)
    expect(casasDoPasso(0.5)).toBe(1)
    expect(casasDoPasso(0.25)).toBe(2)
  })

  it('dá o passo sem resíduo de ponto flutuante e para nos limites', () => {
    expect(darPasso(0.1, 1, 0.1)).toBe(0.2)
    expect(darPasso(0.2, 1, 0.1)).toBe(0.3)
    expect(darPasso(10, 1, 1, 0, 10)).toBe(10)
    expect(darPasso(0, -1, 1, 0, 10)).toBe(0)
    expect(darPasso(5, -1, 5, 0)).toBe(0)
  })
})
