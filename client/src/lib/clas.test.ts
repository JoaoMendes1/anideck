import { describe, expect, it } from 'vitest'
import { bloqueioDaFundacao, REGRAS_FUNDACAO_PADRAO } from './clas'

describe('bloqueioDaFundacao', () => {
  const regras = REGRAS_FUNDACAO_PADRAO
  it('nível abaixo do mínimo explica o nível que falta', () => {
    expect(bloqueioDaFundacao(14, 1000, regras)).toBe('Fundar um clã pede nível 15. Você está no nível 14.')
  })
  it('nível certo e saldo curto diz quanto falta', () => {
    expect(bloqueioDaFundacao(15, 290, regras)).toBe('Fundar um clã custa 300 AniCoins. Você tem 290; faltam 10.')
  })
  it('nível e saldo suficientes liberam', () => {
    expect(bloqueioDaFundacao(15, 300, regras)).toBeNull()
  })
  it('custo zero não pede saldo', () => {
    expect(bloqueioDaFundacao(20, 0, { nivel_minimo: 15, custo: 0 })).toBeNull()
  })
})
