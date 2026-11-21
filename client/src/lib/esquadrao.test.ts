// client/src/lib/esquadrao.test.ts
import { describe, expect, it } from 'vitest'
import { buscarReacaoElemental, preverMonstroParaEsquadrao, reacoesDoEsquadrao } from './esquadrao'

describe('esquadrão e reações elementais', () => {
  it('resolve reações simétricas e evita repetição', () => {
    expect(buscarReacaoElemental('fogo', 'agua')?.nome).toBe('Vaporização')
    expect(buscarReacaoElemental('agua', 'fogo')?.nome).toBe('Vaporização')
    expect(buscarReacaoElemental('fogo', 'fogo')).toBeNull()
    expect(buscarReacaoElemental('neutro', 'raio')).toBeNull()

    const reacoes = reacoesDoEsquadrao(['fogo', 'agua', 'raio'])
    expect(reacoes.map((r) => r.nome)).toEqual(['Vaporização', 'Sobrecarga Explosiva', 'Eletrochoque'])
  })

  it('prevê escala de monstro por tamanho do grupo e força do mundo', () => {
    const m = { vida: 1000, ataque: 80, defesa: 40, nivel: 10, tipo: 'comum', poder: 300 }
    expect(preverMonstroParaEsquadrao(m, [300]).multVidaPct).toBe(100)

    const dupla = preverMonstroParaEsquadrao(m, [300, 300])
    expect(dupla.vida).toBe(1750)
    expect(dupla.adaptadoAoMundo).toBe(false)

    const forte = preverMonstroParaEsquadrao(m, [900, 900, 900])
    expect(forte.adaptadoAoMundo).toBe(true)
    expect(forte.vida).toBeGreaterThan(2500)
  })
})
