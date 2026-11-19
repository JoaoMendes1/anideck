import { describe, expect, it } from 'vitest'
import { DESTINOS, buscarNoAniDeck, normalizar } from './buscaInterna'

const titulos = (t: string) => buscarNoAniDeck(t).map((d) => d.titulo)

describe('busca do AniDeck', () => {
  it('ignora acento e caixa', () => {
    expect(normalizar('Poção de MANA')).toBe('pocao de mana')
  })
  it('acha pela palavra que o jogador usa', () => {
    expect(titulos('pousada')[0]).toBe('Recuperar HP e Mana')
    expect(titulos('poção')[0]).toBe('Recuperar HP e Mana')
    expect(titulos('trocar arma')).toContain('Personagem')
    expect(titulos('gacha')[0]).toBe('Invocação')
    expect(titulos('quando sai')[0]).toBe('Agenda')
  })
  it('título exato vem primeiro', () => {
    expect(titulos('masmorras')[0]).toBe('Masmorras')
  })
  it('sem resultado e termo vazio', () => {
    expect(titulos('xyzabc')).toEqual([])
    expect(titulos('   ')).toEqual([])
  })
  it('todo destino leva a um caminho interno e as palavras já vêm normalizadas', () => {
    for (const d of DESTINOS) {
      expect(d.caminho.startsWith('/')).toBe(true)
      for (const p of d.palavras) expect(p).toBe(normalizar(p))
    }
  })
})
