import { describe, expect, it } from 'vitest'
import { ganhoDaCompra, situacaoDaCompra, type ItemDoMercado } from './mercado'

const item: ItemDoMercado = {
  id: 'anel_de_prata', slot: 'joia', nome: 'Anel de Prata', descricao: '', raridade: 'raro',
  vida: 25, ataque: 6, defesa: 0, nivel_minimo: 13, preco_ouro: 280, possui: false, bloqueado: false,
}

describe('mercado', () => {
  it('compara com o item do slot', () => {
    expect(ganhoDaCompra(item, { vida: 0, ataque: 1, defesa: 0 })).toEqual({ vida: 25, ataque: 5, defesa: 0 })
    expect(ganhoDaCompra(item, undefined)).toEqual({ vida: 25, ataque: 6, defesa: 0 })
  })

  it('situação segue a ordem do banco', () => {
    expect(situacaoDaCompra({ ...item, possui: true, bloqueado: true }, 0)).toBe('possui')
    expect(situacaoDaCompra({ ...item, bloqueado: true }, 9999)).toBe('bloqueado')
    expect(situacaoDaCompra(item, 279)).toBe('sem_ouro')
    expect(situacaoDaCompra(item, 280)).toBe('pode')
  })
})
