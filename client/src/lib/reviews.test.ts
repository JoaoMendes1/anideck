import { describe, expect, it } from 'vitest'
import { lerNotaReview, REVIEW_MAX_CARACTERES, REVIEW_MIN_CARACTERES, validarTextoReview } from './reviews'

describe('validarTextoReview', () => {
  it('rejeita textos menores que 100 caracteres considerando trim', () => {
    const res = validarTextoReview('   ' + 'a'.repeat(REVIEW_MIN_CARACTERES - 1) + '   ')
    expect(res.valido).toBe(false)
    expect(res.tamanho).toBe(REVIEW_MIN_CARACTERES - 1)
    expect(res.erro).toContain('Faltam 1 caracteres')
  })

  it('aceita exatamente entre 100 e 2000 caracteres', () => {
    const ok = validarTextoReview('a'.repeat(REVIEW_MIN_CARACTERES))
    expect(ok.valido).toBe(true)
    expect(ok.tamanho).toBe(REVIEW_MIN_CARACTERES)

    const longo = validarTextoReview('b'.repeat(REVIEW_MAX_CARACTERES + 1))
    expect(longo.valido).toBe(false)
    expect(longo.erro).toContain('limite de 2000')
  })
})

describe('lerNotaReview', () => {
  it('aceita vazio como opcional e valida faixa de 1 a 10', () => {
    expect(lerNotaReview('')).toEqual({ nota: null })
    expect(lerNotaReview('9,5')).toEqual({ nota: 9.5 })
    expect(lerNotaReview('10')).toEqual({ nota: 10 })
    expect(lerNotaReview('0.5').erro).toBeDefined()
    expect(lerNotaReview('10.5').erro).toBeDefined()
    expect(lerNotaReview('abc').erro).toBeDefined()
  })
})
