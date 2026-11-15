// client/src/lib/cosmeticos.test.ts
import { describe, it, expect } from 'vitest'
import { AURAS, CENARIOS, obterEstiloDaAura, obterFundoDoCenario } from './cosmeticos'

describe('cosmeticos - cenários', () => {
  it('devolve o fundo dos cenários do catálogo', () => {
    // As chaves são os `estilo` gravados em store_items pelo sql/069.
    for (const estilo of ['cenario-ceu-de-eter', 'cenario-aurora', 'cenario-crepusculo', 'cenario-abismo']) {
      expect(obterFundoDoCenario(estilo)).toBe(CENARIOS[estilo])
      expect(obterFundoDoCenario(estilo)).toContain('gradient(')
    }
  })

  it('estilo ausente ou desconhecido não tem fundo', () => {
    expect(obterFundoDoCenario(undefined)).toBeUndefined()
    expect(obterFundoDoCenario(null)).toBeUndefined()
    expect(obterFundoDoCenario('')).toBeUndefined()
    expect(obterFundoDoCenario('cenario-que-nao-existe')).toBeUndefined()
    expect(obterFundoDoCenario('toString')).toBeUndefined()
  })
})

describe('cosmeticos - auras', () => {
  it('devolve o estilo das auras do catálogo', () => {
    // As chaves são os `estilo` gravados em store_items pelo sql/070.
    for (const estilo of ['aura-chama-azul', 'aura-sombra-violeta', 'aura-raios-dourados']) {
      expect(obterEstiloDaAura(estilo)).toBe(AURAS[estilo])
      expect(obterEstiloDaAura(estilo)?.fundo).toContain('gradient(')
    }
  })

  it('estilo ausente ou desconhecido não tem aura', () => {
    expect(obterEstiloDaAura(undefined)).toBeUndefined()
    expect(obterEstiloDaAura(null)).toBeUndefined()
    expect(obterEstiloDaAura('')).toBeUndefined()
    expect(obterEstiloDaAura('aura-que-nao-existe')).toBeUndefined()
    expect(obterEstiloDaAura('constructor')).toBeUndefined()
  })
})
