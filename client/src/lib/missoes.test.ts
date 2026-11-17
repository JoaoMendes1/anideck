import { describe, expect, it } from 'vitest'
import { textoDoPrazo } from './missoes'
import { normalizarMissoes } from '../hooks/useMissoesHoje'

describe('textoDoPrazo', () => {
  const agora = new Date('2026-11-18T12:00:00Z')
  it('conta dias até a troca', () => {
    expect(textoDoPrazo('2026-11-23T03:00:00Z', agora)).toBe('termina em 5 dias')
    expect(textoDoPrazo('2026-11-19T15:00:00Z', agora)).toBe('termina em 2 dias')
  })
  it('usa horas no último dia e aceita prazo vencido ou inválido', () => {
    expect(textoDoPrazo('2026-11-18T17:30:00Z', agora)).toBe('termina em 6h')
    expect(textoDoPrazo('2026-11-18T11:00:00Z', agora)).toBe('trocando agora')
    expect(textoDoPrazo('', agora)).toBe('')
  })
})

describe('normalizarMissoes', () => {
  it('lê XP e período, com valores seguros para campos ausentes', () => {
    const [m, semXP] = normalizarMissoes(
      [
        { id: 'foco', titulo: 'Foco Total', meta: 4, progresso: 2, recompensa_cristais: 30, recompensa_xp: 15, periodo: 'dia' },
        { id: 'x', meta: 0, progresso: 'abc' },
      ],
      'semana',
    )
    expect(m).toMatchObject({ id: 'foco', recompensa_xp: 15, periodo: 'dia', concluida: false })
    expect(semXP).toMatchObject({ meta: 1, progresso: 0, recompensa_xp: 0, periodo: 'semana', titulo: 'Missão da Semana' })
  })
  it('lista ausente vira vazia', () => {
    expect(normalizarMissoes(undefined, 'dia')).toEqual([])
  })
})
