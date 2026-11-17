// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../contexts/SessaoContext', () => ({
  useSessao: () => ({ session: { access_token: 'tok-teste' }, isAdmin: false }),
}))

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('../../hooks/useLoja', () => ({
  useLoja: () => ({ temItem: () => false }),
}))

vi.mock('../../hooks/useComunidade', () => ({
  useComunidade: () => ({
    indisponivel: false,
    estado: {
      perfil: {
        existe: true,
        handle: 'joao',
        nome: 'João Mendes',
        bio: 'Curto isekai',
        vitrine: [],
        publico: true,
        mostrar_atividade: true,
        descanso_inicio: '',
        descanso_fim: '',
      },
      mana: 50,
      hp: 100,
      mp_max_jogador: 50,
      hp_max_jogador: 100,
      regras: {
        mp_max: 50,
        mp_regen_dia: 20,
        mp_custo_comentario: 5,
        hp_janela_dias: 14,
        hp_dias_para_cheio: 10,
        hp_piso: 20,
        descanso_max_dias: 14,
      },
      em_descanso: false,
    },
  }),
  avisarComunidadeAtualizada: vi.fn(),
}))

import PerfilPublicoConfig from './PerfilPublicoConfig'

afterEach(cleanup)

describe('PerfilPublicoConfig (#273)', () => {
  it('não exibe campo duplicado de Nome na comunidade e mostra o Nome de exibição único junto do @', () => {
    render(
      <MemoryRouter>
        <PerfilPublicoConfig nomeSugerido="João Mendes" />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText(/Nome na comunidade/i)).toBeNull()
    expect(screen.getByLabelText('Seu @')).toBeTruthy()
    expect(screen.getByText('Nome de exibição')).toBeTruthy()
    expect(screen.getByText('João Mendes')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Alterar acima' }).getAttribute('href')).toBe('#perfil')
  })
})
