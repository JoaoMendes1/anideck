import { describe, expect, it } from 'vitest'
import { avisosDaMudanca, manaNaTela, minutosParaManaCheia, textoDoTempo } from './hud'

const HORA = 60 * 60 * 1000

describe('manaNaTela', () => {
  it('recarrega 20 por dia de forma contínua', () => {
    expect(manaNaTela(30, 50, 20, 0, 12 * HORA)).toBeCloseTo(40)
    expect(manaNaTela(30, 50, 20, 0, 0)).toBe(30)
  })
  it('para no máximo e não anda para trás', () => {
    expect(manaNaTela(45, 50, 20, 0, 24 * HORA)).toBe(50)
    expect(manaNaTela(30, 50, 20, 10 * HORA, 0)).toBe(30)
  })
  it('valor estranho não quebra a tela', () => {
    expect(manaNaTela(NaN, 50, 20, 0, HORA)).toBe(0)
    expect(manaNaTela(60, 50, 20, 0, HORA)).toBe(50)
  })
})

describe('tempo até encher', () => {
  it('conta os minutos e escreve curto', () => {
    expect(minutosParaManaCheia(49, 50, 20)).toBe(72)
    expect(minutosParaManaCheia(50, 50, 20)).toBe(0)
    expect(textoDoTempo(45)).toBe('em 45 min')
    expect(textoDoTempo(72)).toBe('em 1 h')
    expect(textoDoTempo(60 * 30)).toBe('em 1 dia')
  })
})

describe('avisosDaMudanca', () => {
  const base = { xp: 1000, nivel: 14, hp: 60, mp: 49 }
  it('primeira leitura não avisa nada', () => {
    expect(avisosDaMudanca(null, base)).toEqual([])
  })
  it('episódio marcado: XP, nível e Vitalidade', () => {
    expect(avisosDaMudanca(base, { xp: 1012, nivel: 15, hp: 68, mp: 49 }).map(a => a.texto)).toEqual(['+12 XP', 'Nível 15!', '+8 HP'])
  })
  it('comentário: só a Mana gasta; a recarga não vira aviso', () => {
    expect(avisosDaMudanca(base, { ...base, mp: 44 }).map(a => a.texto)).toEqual(['−5 MP'])
    expect(avisosDaMudanca(base, { ...base, mp: 50 })).toEqual([])
  })
  it('Vitalidade que cai também aparece; sem comunidade, nada de HP e MP', () => {
    expect(avisosDaMudanca(base, { ...base, hp: 52 }).map(a => a.texto)).toEqual(['−8 HP'])
    expect(avisosDaMudanca({ ...base, hp: null, mp: null }, { ...base, hp: 70, mp: 10 })).toEqual([])
  })
  it('ganho ou gasto de AniCoins avisa com símbolo ₳', () => {
    expect(avisosDaMudanca({ ...base, cristais: 100 }, { ...base, cristais: 115 }).map(a => a.texto)).toEqual(['+15 ₳'])
    expect(avisosDaMudanca({ ...base, cristais: 100 }, { ...base, cristais: 60 }).map(a => a.texto)).toEqual(['−40 ₳'])
  })
})
