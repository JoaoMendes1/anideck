import { describe, expect, it } from 'vitest'
import { precisaDaConfiguracaoInicial, sugerirHandle } from './bemVindo'

describe('sugerirHandle', () => {
  it('limpa acento, espaço e símbolo', () => {
    expect(sugerirHandle('João Víctor!')).toBe('joao_victor')
    expect(sugerirHandle('  Ana  ')).toBe('ana')
  })
  it('curto demais não sugere, longo é cortado em 20', () => {
    expect(sugerirHandle('Jo')).toBe('')
    expect(sugerirHandle('Um nome muito comprido demais').length).toBe(20)
  })
})

describe('precisaDaConfiguracaoInicial', () => {
  it('só a marca pendente leva à configuração inicial', () => {
    expect(precisaDaConfiguracaoInicial({ configuracao_inicial: 'pendente' })).toBe(true)
    expect(precisaDaConfiguracaoInicial({ configuracao_inicial: 'concluida' })).toBe(false)
    expect(precisaDaConfiguracaoInicial({ display_name: 'Conta antiga' })).toBe(false)
    expect(precisaDaConfiguracaoInicial(undefined)).toBe(false)
  })
})
