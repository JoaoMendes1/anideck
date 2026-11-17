// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CardMissoesDiarias from './CardMissoesDiarias'
import type { MissaoDiariaItem } from '../../hooks/useMissoesHoje'

const resgatar = vi.fn()
function missao(p: Partial<MissaoDiariaItem>): MissaoDiariaItem {
  return {
    id: 'm', titulo: 'Missão', descricao: '', tipo: 'episodios', meta: 1, progresso: 0, recompensa_cristais: 10,
    recompensa_xp: 5, periodo: 'dia', concluida: false, resgatada: false, icone: 'Play', ...p,
  }
}
const missoes = [
  missao({ id: 'foco', titulo: 'Foco Total', meta: 4, progresso: 4, concluida: true, recompensa_xp: 15 }),
  missao({ id: 'reacao', titulo: 'Reator Emocional', recompensa_xp: 0, recompensa_cristais: 15 }),
  missao({ id: 'ep', titulo: 'Episódio do Dia', resgatada: true, concluida: true }),
]
const longas = [missao({ id: 'anime_do_ano', titulo: 'Safra do Ano', periodo: 'semana', recompensa_cristais: 80, recompensa_xp: 50 })]

vi.mock('../../hooks/useMissoesHoje', () => ({
  useMissoesHoje: () => ({
    dados: { genero_do_dia: 'Fantasia', genero_da_semana: 'Drama', longas_terminam_em: new Date(Date.now() + 3 * 86_400_000 - 60_000).toISOString() },
    missoes, longas, concluidas: 2, total: 3, todasResgatadas: false, carregando: false, resgatandoId: null, resgatar,
  }),
}))

afterEach(cleanup)

describe('CardMissoesDiarias', () => {
  it('mostra as missões do dia, o gênero do dia e o XP de cada uma', () => {
    render(<CardMissoesDiarias />)
    expect(screen.getByText('Fantasia')).toBeTruthy()
    expect(screen.getByText('+15 XP')).toBeTruthy()
    // Missão social não mostra XP.
    expect(screen.queryAllByText(/XP$/).length).toBe(3)
    expect(screen.getByText('Recompensa Coletada')).toBeTruthy()
  })
  it('mostra as missões da semana com prazo e resgata pelo id', () => {
    render(<CardMissoesDiarias />)
    expect(screen.getByText('Missões da Semana')).toBeTruthy()
    expect(screen.getByText('Safra do Ano')).toBeTruthy()
    expect(screen.getByText(/termina em 3 dias/)).toBeTruthy()
    fireEvent.click(screen.getByText('Resgatar'))
    expect(resgatar).toHaveBeenCalledWith('foco')
  })
})
