import { describe, expect, it } from 'vitest'
import { faltaParaForjar, nomeDoMaterial, textoDosMateriais, valorDeVenda } from './forja'

describe('forja', () => {
  it('diz o que falta para forjar', () => {
    const receita = { ouro: 450, materiais: { cristal_de_gelo: 4, garra_de_fera: 4, cranio_de_fera: 1 } }
    expect(faltaParaForjar(receita, { ouro: 500, materiais: { cristal_de_gelo: 4, garra_de_fera: 4, cranio_de_fera: 1 } })).toEqual({ ouro: 0, materiais: {} })
    expect(faltaParaForjar(receita, { ouro: 100, materiais: { cristal_de_gelo: 1 } })).toEqual({
      ouro: 350,
      materiais: { cristal_de_gelo: 3, garra_de_fera: 4, cranio_de_fera: 1 },
    })
  })

  it('escreve materiais na ordem da tela e ignora zero', () => {
    expect(textoDosMateriais({ cranio_de_fera: 1, garra_de_fera: 2, pena_celeste: 0 })).toBe('2 Garra de Fera, 1 Crânio de Fera')
    expect(textoDosMateriais(undefined)).toBe('')
    expect(nomeDoMaterial('nao_existe')).toBe('nao_existe')
  })

  it('valor de venda segue o banco', () => {
    expect([valorDeVenda('comum'), valorDeVenda('raro'), valorDeVenda('epico'), valorDeVenda('lendario')]).toEqual([10, 40, 120, 400])
  })
})
