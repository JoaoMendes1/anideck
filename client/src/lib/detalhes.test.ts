import { describe, expect, it } from 'vitest'
import { abaDaUrl, ajustarNota, formatarNota, lerNotaDigitada, proximoEpisodio, rotuloDaNota } from './detalhes'

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
    expect(formatarNota(7.3)).toBe('7,3')
    expect(formatarNota(7.25)).toBe('7,25')
  })
  it('ajusta para 0,1 entre 0 e 10, sem virar meio ponto', () => {
    expect(ajustarNota(7.3)).toBe(7.3)
    expect(ajustarNota(8.26)).toBe(8.3)
    expect(ajustarNota(7.25 + 0.1)).toBe(7.4)
    expect(ajustarNota(12)).toBe(10)
    expect(ajustarNota(-1)).toBe(0)
    expect(ajustarNota(NaN)).toBe(0)
  })
  it('lê a nota digitada como na folha antiga', () => {
    expect(lerNotaDigitada('7,3')).toBe(7.3)
    expect(lerNotaDigitada(' 8.25 ')).toBe(8.25)
    expect(lerNotaDigitada('10')).toBe(10)
    expect(lerNotaDigitada('')).toBeNull()
    expect(lerNotaDigitada('10,5')).toBeNaN()
    expect(lerNotaDigitada('7,333')).toBeNaN()
    expect(lerNotaDigitada('abc')).toBeNaN()
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
