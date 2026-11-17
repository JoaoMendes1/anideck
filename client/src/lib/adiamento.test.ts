import { describe, expect, it } from 'vitest'
import { adiarEpisodios, primeiroEpisodioFuturo } from './adiamento'

const eps = [
  { number: 1, aired_at: '2026-11-03T15:00:00.000Z' },
  { number: 2, aired_at: '2026-11-10T15:00:00.000Z' },
  { number: 3, aired_at: '2026-11-17T15:00:00.000Z' },
  { number: 4, aired_at: '2026-11-24T15:00:00.000Z' },
  { number: 5 },
]

describe('adiarEpisodios', () => {
  it('adia o episódio e os seguintes, e marca só o que atrasou', () => {
    const r = adiarEpisodios(eps, 3, 7)
    expect(r.map(e => e.aired_at)).toEqual([
      '2026-11-03T15:00:00.000Z', '2026-11-10T15:00:00.000Z',
      '2026-11-24T15:00:00.000Z', '2026-12-01T15:00:00.000Z', undefined,
    ])
    expect(r[2].adiado_de).toBe('2026-11-17T15:00:00.000Z')
    expect(r[3].adiado_de).toBeUndefined()
  })
  it('adiar de novo guarda a primeira data original', () => {
    const r = adiarEpisodios(adiarEpisodios(eps, 3, 7), 3, 7)
    expect(r[2].aired_at).toBe('2026-12-01T15:00:00.000Z')
    expect(r[2].adiado_de).toBe('2026-11-17T15:00:00.000Z')
  })
  it('antecipar de volta à data original tira a marca', () => {
    const r = adiarEpisodios(adiarEpisodios(eps, 3, 7), 3, -7)
    expect(r[2].aired_at).toBe('2026-11-17T15:00:00.000Z')
    expect(r[2].adiado_de).toBeUndefined()
  })
  it('entrada inválida não muda nada', () => {
    expect(adiarEpisodios(eps, 0, 7)).toBe(eps)
    expect(adiarEpisodios(eps, 3, 0)).toBe(eps)
  })
})

describe('primeiroEpisodioFuturo', () => {
  it('acha o primeiro episódio que ainda não saiu', () => {
    expect(primeiroEpisodioFuturo(eps, Date.parse('2026-11-12T00:00:00Z'))).toBe(3)
    expect(primeiroEpisodioFuturo(eps, Date.parse('2027-01-01T00:00:00Z'))).toBeNull()
  })
})
