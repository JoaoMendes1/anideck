// client/src/lib/rpg.test.ts
import { describe, it, expect } from 'vitest'
import { ESTILO_DA_RARIDADE, SLOTS_RPG, diferencaDaTroca, estiloDaRaridade, resumoDoItem } from './rpg'

describe('rpg - equipamentos', () => {
  it('lista os cinco slots na ordem do servidor', () => {
    expect(SLOTS_RPG.map((s) => s.id)).toEqual(['arma', 'armadura', 'capa', 'botas', 'joia'])
  })

  it('resume só os atributos que o item dá', () => {
    expect(resumoDoItem({ vida: 0, ataque: 4, defesa: 0 })).toBe('+4 Ataque')
    expect(resumoDoItem({ vida: 20, ataque: 0, defesa: 2 })).toBe('+20 Vida · +2 Defesa')
    expect(resumoDoItem({ vida: 0, ataque: 0, defesa: 0 })).toBe('Sem atributos')
  })

  it('calcula ganho e perda da troca', () => {
    const atual = { vida: 0, ataque: 4, defesa: 0 }
    expect(diferencaDaTroca(atual, { vida: 0, ataque: 10, defesa: 1, bloqueado: false })).toEqual({ vida: 0, ataque: 6, defesa: 1 })
    expect(diferencaDaTroca(undefined, { vida: 20, ataque: 0, defesa: 2, bloqueado: false })).toEqual({ vida: 20, ataque: 0, defesa: 2 })
  })

  it('item bloqueado pelo nível não soma na troca', () => {
    expect(diferencaDaTroca({ vida: 0, ataque: 4, defesa: 0 }, { vida: 0, ataque: 45, defesa: 0, bloqueado: true })).toEqual({
      vida: 0,
      ataque: -4,
      defesa: 0,
    })
  })

  it('raridade desconhecida cai em comum', () => {
    expect(estiloDaRaridade('lendario')).toBe(ESTILO_DA_RARIDADE.lendario)
    expect(estiloDaRaridade('mitico')).toBe(ESTILO_DA_RARIDADE.comum)
    expect(estiloDaRaridade(undefined)).toBe(ESTILO_DA_RARIDADE.comum)
  })
})
