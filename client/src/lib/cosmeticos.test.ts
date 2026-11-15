// client/src/lib/cosmeticos.test.ts
import { describe, it, expect } from 'vitest'
import { CENARIOS, obterFundoDoCenario } from './cosmeticos'

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
