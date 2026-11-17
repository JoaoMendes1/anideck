import { describe, expect, it } from 'vitest'
import { itemAtivo, itensDaConta, montarMenu, subitemAtivo, type ItemDoMenu } from './navegacao'

const todos = (ctx = {}) => montarMenu(ctx).flatMap((g) => g.itens)
const item = (rotulo: string, ctx = {}) => todos(ctx).find((i) => i.rotulo === rotulo) as ItemDoMenu

describe('montarMenu', () => {
  it('Meu Perfil leva ao perfil público, ou a Configurações quando ele não existe', () => {
    expect(item('Meu Perfil', { handle: 'ana' }).para).toBe('/u/ana')
    expect(item('Meu Perfil').para).toBe('/configuracoes#comunidade')
  })
  it('Painel Admin só para admin, e nenhum rótulo ou rota se repete', () => {
    expect(item('Painel Admin')).toBeUndefined()
    expect(item('Painel Admin', { isAdmin: true })).toBeDefined()
    const itens = todos({ isAdmin: true, handle: 'ana' })
    expect(new Set(itens.map((i) => i.rotulo)).size).toBe(itens.length)
    expect(new Set(itens.map((i) => i.para)).size).toBe(itens.length)
  })
  it('Wrapped usa o ano pedido', () => {
    expect(item('Meu Perfil', { ano: 2027 }).subitens?.[0]).toEqual({ para: '/wrapped/2027', rotulo: 'Wrapped 2027' })
    expect(itensDaConta({ ano: 2027 })[1].para).toBe('/wrapped/2027')
  })
})

describe('itemAtivo', () => {
  it('acende o Início só na raiz e não confunde rotas que só começam igual', () => {
    expect(itemAtivo(item('Início'), '/')).toBe(true)
    expect(itemAtivo(item('Início'), '/deck')).toBe(false)
    expect(itemAtivo(item('Meu Deck'), '/deckbuilder')).toBe(false)
  })
  it('acende nas subrotas, nas rotas associadas e nas dos subitens', () => {
    expect(itemAtivo(item('Clãs'), '/clas/abc')).toBe(true)
    expect(itemAtivo(item('Rankings'), '/membros')).toBe(true)
    expect(itemAtivo(item('Descobrir'), '/anime/123')).toBe(true)
    expect(itemAtivo(item('Meu Personagem'), '/expedicoes')).toBe(true)
    expect(itemAtivo(item('Guilda'), '/chefao')).toBe(true)
    expect(itemAtivo(item('Meu Perfil', { handle: 'ana' }), '/u/ana')).toBe(true)
    expect(itemAtivo(item('Meu Perfil', { handle: 'ana' }), '/u/beto')).toBe(false)
  })
})

describe('subitemAtivo', () => {
  it('confere âncora e parâmetros', () => {
    expect(subitemAtivo({ para: '/guilda#extrato', rotulo: '' }, { pathname: '/guilda', hash: '#extrato' })).toBe(true)
    expect(subitemAtivo({ para: '/guilda#extrato', rotulo: '' }, { pathname: '/guilda' })).toBe(false)
    expect(subitemAtivo({ para: '/personagem?aba=atributos', rotulo: '' }, { pathname: '/personagem', search: '?aba=atributos' })).toBe(true)
    expect(subitemAtivo({ para: '/personagem?aba=atributos', rotulo: '' }, { pathname: '/personagem', search: '?aba=habilidades' })).toBe(false)
    expect(subitemAtivo({ para: '/expedicoes', rotulo: '' }, { pathname: '/expedicoes' })).toBe(true)
  })
})
