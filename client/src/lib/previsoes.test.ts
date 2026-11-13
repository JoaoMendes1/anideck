import { describe, it, expect } from 'vitest'
import { CLASSES_RPG, type ClasseRPG } from './previsoes'

describe('Classes RPG (Fase 17.4, #189)', () => {
  it('contém exatamente as três classes canônicas: bardo, ranger e paladino', () => {
    const chaves = Object.keys(CLASSES_RPG) as ClasseRPG[]
    expect(chaves).toContain('bardo')
    expect(chaves).toContain('ranger')
    expect(chaves).toContain('paladino')
    expect(chaves.length).toBe(3)
  })

  it('cada classe possui nome, icone, bonus e estilos de cor definidos', () => {
    for (const id of ['bardo', 'ranger', 'paladino'] as ClasseRPG[]) {
      const c = CLASSES_RPG[id]
      expect(c.id).toBe(id)
      expect(c.nome.length).toBeGreaterThan(0)
      expect(c.icone.length).toBeGreaterThan(0)
      expect(c.bonus.length).toBeGreaterThan(0)
      expect(c.cor.startsWith('text-')).toBe(true)
    }
  })
})
