import { describe, expect, it } from 'vitest'
import { abaDaUrl, ajustarNota, formatarNota, proximoEpisodio, rotuloDaNota } from './detalhes'

describe('abaDaUrl', () => {
  it('lê a aba da query e cai em Sobre quando não conhece', () => {
    expect(abaDaUrl('episodios', '')).toBe('episodios')
    expect(abaDaUrl('qualquer', '')).toBe('sobre')
    expect(abaDaUrl(null, '')).toBe('sobre')
  })
  it('aceita os links antigos com âncora', () => {
    expect(abaDaUrl(null, '#conversa')).toBe('conversa')
    expect(abaDaUrl(null, '#estatisticas')).toBe('numeros')
  })
})

describe('nota', () => {
  it('dá nome à faixa', () => {
    expect(rotuloDaNota(null)).toBe('Sem nota')
    expect(rotuloDaNota(10)).toBe('Obra-prima')
    expect(rotuloDaNota(8.5)).toBe('Ótimo')
    expect(rotuloDaNota(0)).toBe('Ruim')
  })
  it('formata com vírgula só quando tem meio ponto', () => {
    expect(formatarNota(8)).toBe('8')
    expect(formatarNota(8.5)).toBe('8,5')
  })
  it('ajusta para meio ponto entre 0 e 10', () => {
    expect(ajustarNota(8.26)).toBe(8.5)
    expect(ajustarNota(8.2)).toBe(8)
    expect(ajustarNota(12)).toBe(10)
    expect(ajustarNota(-1)).toBe(0)
    expect(ajustarNota(NaN)).toBe(0)
  })
})

describe('proximoEpisodio', () => {
  it('continua depois do maior marcado', () => {
    expect(proximoEpisodio([1, 2, 3], 12)).toBe(4)
    expect(proximoEpisodio([], 12)).toBe(1)
  })
  it('não oferece episódio que ainda não saiu', () => {
    expect(proximoEpisodio([1, 2, 3, 4, 5], 5)).toBeNull()
    expect(proximoEpisodio([], 0)).toBeNull()
  })
})
