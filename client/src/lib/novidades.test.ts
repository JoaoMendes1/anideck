import { describe, expect, it } from 'vitest'
import { caminhoInterno, dataHoraDaNovidade, validarRascunho, type RascunhoNovidade } from './novidades'

const base: RascunhoNovidade = {
  id: null, titulo: 'HP único', resumo: 'Uma vida só.', categoria: 'novidade',
  links: [{ rotulo: 'Ver Expedições', caminho: '/expedicoes' }],
  publicado_em: '2026-11-17T21:45', no_meio_da_tela: true, ativo: true,
}

describe('novidades', () => {
  it('aceita só caminho interno', () => {
    expect(caminhoInterno('/expedicoes')).toBe(true)
    expect(caminhoInterno('https://x.com')).toBe(false)
    expect(caminhoInterno('//x.com')).toBe(false)
  })

  it('valida o rascunho', () => {
    expect(validarRascunho(base)).toBeNull()
    expect(validarRascunho({ ...base, titulo: 'a' })).toMatch(/título/)
    expect(validarRascunho({ ...base, links: [{ rotulo: 'Fora', caminho: 'https://x.com' }] })).toMatch(/começar com \//)
    expect(validarRascunho({ ...base, links: [{ rotulo: '', caminho: '/deck' }] })).toMatch(/nome/)
    expect(validarRascunho({ ...base, links: [{ rotulo: '', caminho: '' }] })).toBeNull()
    expect(validarRascunho({ ...base, links: Array(7).fill({ rotulo: 'a', caminho: '/a' }) })).toMatch(/6/)
  })

  it('mostra data e hora de Brasília', () => {
    expect(dataHoraDaNovidade('2026-11-18T00:45:00Z')).toBe('17/11/2026 às 21:45')
    expect(dataHoraDaNovidade('lixo')).toBe('')
  })
})
