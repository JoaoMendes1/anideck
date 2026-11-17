import { describe, it, expect } from 'vitest'
import { guardarMenuAberto, lerMenuAberto } from './menuLateral'

describe('preferência do menu', () => {
  it('abre por padrão e lembra a escolha', () => {
    const mapa = new Map<string, string>()
    const armazenamento = { getItem: (k: string) => mapa.get(k) ?? null, setItem: (k: string, v: string) => void mapa.set(k, v) }
    expect(lerMenuAberto(armazenamento)).toBe(true)
    guardarMenuAberto(false, armazenamento)
    expect(lerMenuAberto(armazenamento)).toBe(false)
    guardarMenuAberto(true, armazenamento)
    expect(lerMenuAberto(armazenamento)).toBe(true)
  })

  it('não quebra quando o armazenamento recusa o acesso', () => {
    const recusa = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(lerMenuAberto(recusa)).toBe(true)
    expect(() => guardarMenuAberto(false, recusa)).not.toThrow()
  })
})
