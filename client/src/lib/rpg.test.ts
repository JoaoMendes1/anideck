// client/src/lib/rpg.test.ts
import { describe, it, expect } from 'vitest'
import {
  ESTILO_DA_RARIDADE,
  SLOTS_RPG,
  descreverTurno,
  diferencaDaTroca,
  estiloDaRaridade,
  porMilEmPorcento,
  resumoDoItem,
  somaDosPontos,
} from './rpg'

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

describe('rpg - expedições', () => {
  it('conta as batalhas restantes sem passar de zero', async () => {
    const { batalhasRestantes } = await import('./rpg')
    expect(batalhasRestantes({ feitas: 2, limite: 5, bilhetes: 0 })).toBe(3)
    expect(batalhasRestantes({ feitas: 7, limite: 5, bilhetes: 0 })).toBe(0)
    expect(batalhasRestantes(undefined)).toBe(0)
  })

  it('dificuldade desconhecida cai em equilibrada', async () => {
    const { ROTULO_DA_DIFICULDADE, rotuloDaDificuldade } = await import('./rpg')
    expect(rotuloDaDificuldade('perigosa')).toBe(ROTULO_DA_DIFICULDADE.perigosa)
    expect(rotuloDaDificuldade('impossivel')).toBe(ROTULO_DA_DIFICULDADE.equilibrada)
  })
})

describe('rpg - invocação', () => {
  it('escreve por mil como porcentagem', async () => {
    const { porcentagem } = await import('./rpg')
    expect(porcentagem(600)).toBe('60%')
    expect(porcentagem(85)).toBe('8,5%')
    expect(porcentagem(15)).toBe('1,5%')
    expect(porcentagem(0)).toBe('0%')
  })

  it('conta quanto falta para a garantia, nunca menos de 1', async () => {
    const { faltamParaGarantia } = await import('./rpg')
    const chances = { comum: 600, raro: 300, epico: 85, lendario: 15, garantia: 10 }
    expect(faltamParaGarantia({ sem_epico: 0, chances })).toBe(10)
    expect(faltamParaGarantia({ sem_epico: 9, chances })).toBe(1)
    expect(faltamParaGarantia({ sem_epico: 12, chances })).toBe(1)
  })
})

describe('atributos primários e registro da luta', () => {
  it('soma os pontos e mostra milésimos como porcentagem', () => {
    expect(somaDosPontos({ forca: 3, inteligencia: 0, constituicao: 2, agilidade: 0, destreza: 1, sorte: 0 })).toBe(6)
    expect(porMilEmPorcento(70)).toBe('7%')
    expect(porMilEmPorcento(115)).toBe('11,5%')
    expect(porMilEmPorcento(undefined)).toBe('0%')
  })

  it('descreve cada tipo de turno', () => {
    const base = { dano: 12, critico: false, vida_jogador: 100, vida_monstro: 50 }
    expect(descreverTurno({ ...base, atacante: 'jogador' }, 'Lobo')).toEqual({ texto: 'Você golpeia', valor: '−12' })
    expect(descreverTurno({ ...base, atacante: 'jogador', habilidade: 'Corte Duplo' }, 'Lobo').texto).toBe('Você usa Corte Duplo')
    expect(descreverTurno({ ...base, atacante: 'jogador', dano: 0, habilidade: 'Despertar do Éter', cura: 30 }, 'Lobo')).toEqual({
      texto: 'Despertar do Éter: recupera Vida',
      valor: '+30',
    })
    expect(descreverTurno({ ...base, atacante: 'monstro', dano: 0, esquiva: true }, 'Lobo')).toEqual({
      texto: 'Lobo ataca, e você esquiva',
      valor: '0',
    })
  })
})
