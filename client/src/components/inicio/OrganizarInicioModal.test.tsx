// client/src/components/inicio/OrganizarInicioModal.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import OrganizarInicioModal from './OrganizarInicioModal'
import { configInicioPadrao } from '../../lib/inicioPreferencias'

afterEach(() => cleanup())

describe('OrganizarInicioModal', () => {
  it('reordena, alterna visibilidade, minimiza e muda a fonte de destaque', () => {
    const aoAtualizar = vi.fn()
    const aoFechar = vi.fn()
    const padrao = configInicioPadrao()

    render(
      <OrganizarInicioModal
        aberto
        config={padrao}
        ehDesktopLargo
        aoFechar={aoFechar}
        aoAtualizar={aoAtualizar}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Em lançamento/i }))
    expect(aoAtualizar).toHaveBeenCalledWith(
      expect.objectContaining({ destaque_fonte: 'lancamento' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Subir Em destaque' }))
    expect(aoAtualizar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ordem: expect.arrayContaining(['destaques', 'continuar']),
      }),
    )
    const chamadaOrdem = aoAtualizar.mock.calls.at(-1)?.[0].ordem as string[]
    expect(chamadaOrdem.indexOf('destaques')).toBeLessThan(chamadaOrdem.indexOf('continuar'))

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Topo do ranking' }))
    expect(aoAtualizar).toHaveBeenLastCalledWith(
      expect.objectContaining({ ocultas: ['ranking'] }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Minimizar Trilhas da curadoria' }))
    expect(aoAtualizar).toHaveBeenLastCalledWith(
      expect.objectContaining({ minimizadas: ['trilhas'] }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Minimizar Painel do herói' }))
    expect(aoAtualizar).toHaveBeenLastCalledWith(
      expect.objectContaining({ minimizadas: ['hud'] }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    expect(aoAtualizar).toHaveBeenLastCalledWith(padrao)
  })
})
