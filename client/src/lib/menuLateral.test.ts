import { describe, it, expect } from 'vitest'
import { ITENS_GUILDA, ITENS_JORNADA, guardarMenuAberto, itemAtivo, lerMenuAberto } from './menuLateral'

const item = (para: string) => [...ITENS_JORNADA, ...ITENS_GUILDA].find((i) => i.para === para)!

describe('itemAtivo', () => {
  it('acende o Início só na raiz', () => {
    expect(itemAtivo(item('/'), '/')).toBe(true)
    expect(itemAtivo(item('/'), '/deck')).toBe(false)
  })

  it('acende o item nas subrotas e nas rotas associadas', () => {
    expect(itemAtivo(item('/clas'), '/clas/abc')).toBe(true)
    expect(itemAtivo(item('/rankings'), '/membros')).toBe(true)
    expect(itemAtivo(item('/descobrir'), '/anime/123')).toBe(true)
  })

  it('não confunde rotas que só começam igual', () => {
    expect(itemAtivo(item('/deck'), '/deckbuilder')).toBe(false)
  })
})

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
