import { describe, expect, it } from 'vitest'
import { CARREGAR, carregadorDaRota } from './rotasPreguicosas'
import { montarMenu } from './navegacao'

describe('carregadorDaRota', () => {
  it('acha a página pela rota, ignorando parâmetros e âncora', () => {
    expect(carregadorDaRota('/guilda#extrato')).toBe(CARREGAR.guilda)
    expect(carregadorDaRota('/personagem?aba=atributos')).toBe(CARREGAR.personagem)
    expect(carregadorDaRota('/u/ana')).toBe(CARREGAR.perfilMembro)
    expect(carregadorDaRota('/clas/abc')).toBe(CARREGAR.claDetalhe)
    expect(carregadorDaRota('/')).toBe(CARREGAR.inicio)
  })
  it('página do bundle principal não tem carregador', () => {
    expect(carregadorDaRota('/deck')).toBeUndefined()
    expect(carregadorDaRota('/rota-que-nao-existe')).toBeUndefined()
  })
  it('todo item e subitem do menu, menos o Meu Deck, tem página para baixar antes', () => {
    const rotas = montarMenu({ handle: 'ana', isAdmin: true }).flatMap((g) => g.itens.flatMap((i) => [i.para, ...(i.subitens ?? []).map((s) => s.para)]))
    const sem = rotas.filter((r) => !carregadorDaRota(r))
    expect(sem).toEqual(['/deck'])
  })
})
