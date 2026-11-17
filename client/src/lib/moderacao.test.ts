import { describe, expect, it } from 'vitest'
import { descreverPunicao, PADRAO_POR_GRAVIDADE } from './moderacao'

describe('descreverPunicao', () => {
  it('multa lista AniCoins e XP', () => {
    expect(descreverPunicao({ tipo: 'multa', anicoins: 20, xp: 50 })).toBe('Você recebeu uma multa de 20 AniCoins e 50 XP.')
    expect(descreverPunicao({ tipo: 'multa', anicoins: 0, xp: 50 })).toBe('Você recebeu uma multa de 50 XP.')
  })
  it('silêncio com e sem prazo', () => {
    expect(descreverPunicao({ tipo: 'silenciar', ate: null })).toMatch(/^Sua conta está silenciada:/)
    expect(descreverPunicao({ tipo: 'silenciar', ate: '2026-11-25T15:00:00Z' })).toMatch(/silenciada até \d{2}\/11/)
  })
  it('advertência', () => {
    expect(descreverPunicao({ tipo: 'advertencia' })).toBe('Você recebeu uma advertência da moderação.')
  })
})

describe('PADRAO_POR_GRAVIDADE', () => {
  it('a gravidade sobe a punição', () => {
    expect(PADRAO_POR_GRAVIDADE.leve.tipo).toBe('multa')
    expect(PADRAO_POR_GRAVIDADE.media.tipo).toBe('silenciar')
    expect(PADRAO_POR_GRAVIDADE.grave).toEqual({ tipo: 'banir', anicoins: 0, xp: 0, dias: 30 })
    expect(PADRAO_POR_GRAVIDADE.gravissima.dias).toBeNull()
  })
})
