import { describe, expect, it } from 'vitest'
import { quebrarLinhas, rotulosDoCard } from './cardDeGosto'

// Mede cada caractere como 10 unidades: basta para testar a quebra sem navegador.
const medir = (t: string) => t.length * 10

describe('quebrarLinhas', () => {
  it('quebra entre palavras sem passar da largura', () => {
    const linhas = quebrarLinhas('Isekai lidera o seu gosto com 60%', 130, medir)
    expect(linhas).toEqual(['Isekai lidera', 'o seu gosto', 'com 60%'])
    linhas.forEach(l => expect(medir(l)).toBeLessThanOrEqual(130))
  })

  it('palavra maior que a largura fica sozinha na linha, sem sumir', () => {
    expect(quebrarLinhas('a Superpalavraenorme b', 50, medir)).toEqual(['a', 'Superpalavraenorme', 'b'])
  })

  it('texto vazio não gera linha', () => {
    expect(quebrarLinhas('   ', 100, medir)).toEqual([])
  })
})

describe('rotulosDoCard', () => {
  it('pega os três mais assistidos, sem tag temática', () => {
    const r = rotulosDoCard([
      { genre: 'Escolar', tier: 'tag_tematica', total_watched: 50 },
      { genre: 'Isekai', tier: 'demografia', total_watched: 5 },
      { genre: 'Ação', tier: 'genero', total_watched: 3 },
      { genre: 'Drama', tier: 'genero', total_watched: 1 },
      { genre: 'Mecha', tier: 'genero', total_watched: 1 },
    ])
    expect(r).toEqual([{ nome: 'Isekai', pct: 50 }, { nome: 'Ação', pct: 30 }, { nome: 'Drama', pct: 10 }])
  })

  it('sem dado, nenhum rótulo', () => {
    expect(rotulosDoCard([])).toEqual([])
  })
})
