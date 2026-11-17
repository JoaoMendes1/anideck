import { describe, expect, it } from 'vitest'
import { inserirMarcacaoSpoiler, particionarTextoSpoiler, textoTemSpoilerInline } from './spoiler'

describe('spoiler helpers', () => {
  it('particiona texto comum e trechos ||spoiler|| na ordem', () => {
    expect(particionarTextoSpoiler('Antes ||segredo|| depois ||outro|| fim')).toEqual([
      { tipo: 'texto', conteudo: 'Antes ' },
      { tipo: 'spoiler', conteudo: 'segredo' },
      { tipo: 'texto', conteudo: ' depois ' },
      { tipo: 'spoiler', conteudo: 'outro' },
      { tipo: 'texto', conteudo: ' fim' },
    ])
  })

  it('mantém marcador vazio ou sem fechamento como texto normal', () => {
    expect(particionarTextoSpoiler('texto ||aberto sem fechar')).toEqual([
      { tipo: 'texto', conteudo: 'texto ||aberto sem fechar' },
    ])
    expect(particionarTextoSpoiler('vazio ||   || ok')).toEqual([
      { tipo: 'texto', conteudo: 'vazio ||   ||' },
      { tipo: 'texto', conteudo: ' ok' },
    ])
    expect(textoTemSpoilerInline('vazio |||| aqui')).toBe(false)
    expect(textoTemSpoilerInline('cuidado ||fim do arco||!')).toBe(true)
  })

  it('envolve seleção ou insere exemplo com ||spoiler||', () => {
    const sel = inserirMarcacaoSpoiler('O vilão vence no ep 12', 2, 13)
    expect(sel.texto).toBe('O ||vilão vence|| no ep 12')
    expect(sel.texto.slice(sel.selecaoInicio, sel.selecaoFim)).toBe('vilão vence')

    const cursor = inserirMarcacaoSpoiler('Oi ', 3, 3)
    expect(cursor.texto).toBe('Oi ||spoiler||')
    expect(cursor.texto.slice(cursor.selecaoInicio, cursor.selecaoFim)).toBe('spoiler')
  })
})
