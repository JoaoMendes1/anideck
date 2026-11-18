// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { intervaloDaVelocidade, lerVelocidade, salvarVelocidade } from './velocidadeBatalha'

afterEach(() => window.localStorage.clear())

describe('velocidade da batalha', () => {
  it('lembra a escolha e ignora valor estranho', () => {
    expect(lerVelocidade()).toBe(1)
    salvarVelocidade(4)
    expect(lerVelocidade()).toBe(4)
    window.localStorage.setItem('anideck:velocidade-batalha', '9')
    expect(lerVelocidade()).toBe(1)
  })
  it('intervalo encurta com a velocidade', () => {
    expect(intervaloDaVelocidade(1)).toBe(380)
    expect(intervaloDaVelocidade(2)).toBe(190)
    expect(intervaloDaVelocidade(4)).toBe(95)
  })
})
