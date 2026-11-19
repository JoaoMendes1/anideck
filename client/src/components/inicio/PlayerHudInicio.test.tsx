// client/src/components/inicio/PlayerHudInicio.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlayerHudInicio from './PlayerHudInicio'

vi.mock('../../hooks/useResumoGuilda', () => ({
  useResumoGuilda: () => ({
    nivel: 16,
    rank: 'D',
    titulo_rank: 'Batedor',
    xp_no_nivel: 314,
    xp_para_proximo: 550,
    progresso_pct: 57,
    xp_hoje: 175,
    teto_diario: 250,
    streak_atual: 8,
    proximo_rank: 'C',
    nivel_proximo_rank: 20,
  }),
}))

vi.mock('../../hooks/useComunidade', () => ({
  useComunidade: () => ({
    estado: {
      hp: 100,
      hp_max_jogador: 175,
      hp_atual_jogador: 175,
      mana: 272,
      mp_max_jogador: 300,
      em_descanso: false,
      regras: { mp_max: 120, mp_por_nivel: 12, mp_max_teto: 999 },
    },
    indisponivel: false,
  }),
}))

vi.mock('../../hooks/useCarteira', () => ({
  useCarteira: () => ({ saldo: 350, carregando: false }),
}))

vi.mock('../../hooks/useMissoesHoje', () => ({
  useMissoesHoje: () => ({ concluidas: 1, total: 3, todasResgatadas: false }),
}))

vi.mock('../../hooks/usePersonagem', () => ({
  usePersonagem: () => ({ dados: { existe: false } }),
}))

afterEach(cleanup)

describe('PlayerHudInicio', () => {
  it('permite minimizar e expandir o painel mantendo resumo de status e atalhos', () => {
    const aoAlternarMinimizar = vi.fn()
    const aoAbrirGosto = vi.fn()

    const { rerender } = render(
      <MemoryRouter>
        <PlayerHudInicio
          nome="Administrador"
          dataHoje="quinta-feira, 19 de novembro"
          minimizada={false}
          aoAlternarMinimizar={aoAlternarMinimizar}
          aoAbrirGosto={aoAbrirGosto}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Minimizar painel do herói' }))
    expect(aoAlternarMinimizar).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <PlayerHudInicio
          nome="Administrador"
          dataHoje="quinta-feira, 19 de novembro"
          minimizada={true}
          aoAlternarMinimizar={aoAlternarMinimizar}
          aoAbrirGosto={aoAbrirGosto}
        />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Painel do herói minimizado')).toBeTruthy()
    expect(screen.getByText(/Rank D · Nv 16/)).toBeTruthy()
    expect(screen.getByText('314/550 XP')).toBeTruthy()
    expect(screen.getByText('350 ₳')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir painel do herói' }))
    expect(aoAlternarMinimizar).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }))
    expect(aoAbrirGosto).toHaveBeenCalledTimes(1)
  })
})
