import { describe, expect, it } from 'vitest'
import { minutosRestantes, origemDoCandidato, type Candidato } from './grupo'

const c = (o: Partial<Candidato>): Candidato => ({ handle: 'a', nome: 'A', online: false, amigo: false, cla: false, no_grupo: null, motivo: null, ...o })

describe('grupo', () => {
  it('origem do candidato', () => {
    expect(origemDoCandidato(c({ amigo: true, online: true }))).toBe('Amigo · Online')
    expect(origemDoCandidato(c({ cla: true }))).toBe('Clã')
    expect(origemDoCandidato(c({}))).toBe('')
  })
  it('minutos restantes', () => {
    const agora = Date.parse('2026-11-18T12:00:00Z')
    expect(minutosRestantes('2026-11-18T12:09:30Z', agora)).toBe(10)
    expect(minutosRestantes('2026-11-18T11:00:00Z', agora)).toBe(0)
    expect(minutosRestantes('lixo', agora)).toBe(0)
  })
})

import { descreverTurnoEmGrupo, etapasDoResultado } from './grupo'
import { descreverTurno } from './rpg'

describe('turno em grupo', () => {
  const nomes = ['Kael', 'Rin']
  it('troca "você" pelo herói', () => {
    expect(descreverTurnoEmGrupo({ atacante: 'jogador', dano: 10, critico: false, vida_jogador: 1, vida_monstro: 1, heroi: 2 }, 'Lobo', nomes, descreverTurno).texto).toBe('Rin golpeia')
    expect(descreverTurnoEmGrupo({ atacante: 'monstro', dano: 0, critico: false, vida_jogador: 1, vida_monstro: 1, esquiva: true, heroi: 1 }, 'Lobo', nomes, descreverTurno).texto).toBe('Lobo ataca, e Kael esquiva')
    expect(descreverTurnoEmGrupo({ atacante: 'monstro', dano: 9, critico: false, vida_jogador: 1, vida_monstro: 1, heroi: 1 }, 'Lobo', nomes, descreverTurno).texto).toBe('Lobo ataca → Kael')
  })
  it('etapas da masmorra e do monstro', () => {
    const luta = { venceu: true, rodadas: 1, turnos: [], herois: [], vida_monstro: 10 }
    const m = { id: 'x', nome: 'X' } as never
    expect(etapasDoResultado({ modo: 'na_hora', herois: [], venceu: true, monstro: m, luta }).length).toBe(1)
    expect(etapasDoResultado({ modo: 'na_hora', herois: [], venceu: true, masmorra: { andares: [{ monstro: m, resultado: luta }, { monstro: m, resultado: luta }], vencidos: [], completou: true, herois: [] } }).map(e => e.andar)).toEqual([1, 2])
  })
})
