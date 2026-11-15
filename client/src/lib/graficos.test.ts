import { describe, it, expect } from 'vitest'
import { agruparNotas, caminhoSuave, passoDosRotulos, preencherAnos } from './graficos'

describe('passoDosRotulos', () => {
  it('mostra todos quando cabem e pula quando não cabem', () => {
    expect(passoDosRotulos(8, 400, 40)).toBe(1)
    expect(passoDosRotulos(21, 300, 40)).toBe(3)
    expect(passoDosRotulos(0, 300, 40)).toBe(1)
    expect(passoDosRotulos(10, 0, 40)).toBe(1)
  })
})

describe('agruparNotas', () => {
  it('junta as notas decimais na faixa da parte inteira', () => {
    const faixas = agruparNotas([
      { nota: 6.5, total: 1 }, { nota: 6.8, total: 1 }, { nota: 6.9, total: 1 },
      { nota: 7, total: 9 }, { nota: 7.5, total: 2 }, { nota: 10, total: 18 },
    ])
    expect(faixas.map(f => [f.faixa, f.total])).toEqual([[6, 3], [7, 11], [8, 0], [9, 0], [10, 18]])
    expect(faixas[0].notas).toEqual([6.5, 6.8, 6.9])
  })

  it('ignora nota sem anime e devolve vazio sem dados', () => {
    expect(agruparNotas([{ nota: 8, total: 0 }])).toEqual([])
    expect(agruparNotas([])).toEqual([])
  })
})

describe('preencherAnos', () => {
  it('inclui os anos sem anime no meio', () => {
    expect(preencherAnos([{ season_year: 2006, total: 1 }, { season_year: 2009, total: 2 }])).toEqual([
      { season_year: 2006, total: 1 }, { season_year: 2007, total: 0 },
      { season_year: 2008, total: 0 }, { season_year: 2009, total: 2 },
    ])
  })
})

describe('caminhoSuave', () => {
  it('começa no primeiro ponto e termina no último', () => {
    const d = caminhoSuave([{ x: 0, y: 10 }, { x: 10, y: 0 }])
    expect(d).toBe('M0,10 C5,10 5,0 10,0')
    expect(caminhoSuave([])).toBe('')
  })
})
