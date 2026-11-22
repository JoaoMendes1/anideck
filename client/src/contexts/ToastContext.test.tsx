// client/src/contexts/ToastContext.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'
import { marcarRecompensaContextual, recompensaContextualRecente, resetarRecompensaContextual } from '../lib/recompensaEvento'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  resetarRecompensaContextual()
})

function GatilhoTeste() {
  const { showToast, showRewardToast } = useToast()
  return (
    <div>
      <button type="button" onClick={() => showToast('Salvo no Deck!', 'success')}>
        Disparar aviso
      </button>
      <button
        type="button"
        onClick={() =>
          showRewardToast({
            titulo: 'Episódio registrado',
            subtitulo: 'Progresso sincronizado com a Guilda',
            badge: 'Nível 12',
            xp: 45,
            ouro: 20,
            anicoins: 5,
            hp: -10,
            mp: 12,
            progressoAntesPct: 30,
            progressoDepoisPct: 75,
            xpLabel: '75 / 100 XP',
            tom: 'xp',
          })
        }
      >
        Disparar recompensa
      </button>
    </div>
  )
}

describe('ToastContext', () => {
  it('exibe e fecha o toast padrão ao clicar no botão de fechar', () => {
    render(
      <ToastProvider>
        <GatilhoTeste />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disparar aviso' }))
    expect(screen.getByText('Salvo no Deck!')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }))
    const status = screen.getByRole('status')
    expect(status.className).toContain('opacity-0')
  })

  it('renderiza notificação animada de recompensa com pílulas (+XP, +Ouro, +₳, HP, MP) e barra de progresso', async () => {
    render(
      <ToastProvider>
        <GatilhoTeste />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Disparar recompensa' }))
    })

    expect(await screen.findByText('Episódio registrado')).toBeTruthy()
    expect(screen.getByText('Nível 12')).toBeTruthy()
    expect(screen.getByText('+45 XP')).toBeTruthy()
    expect(screen.getByText('+20 Ouro')).toBeTruthy()
    expect(screen.getByText('+5 ₳')).toBeTruthy()
    expect(screen.getByText('-10 HP')).toBeTruthy()
    expect(screen.getByText('+12 MP')).toBeTruthy()
    expect(screen.getByText('75 / 100 XP')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação de recompensa' }))
    expect(screen.queryByText('Episódio registrado')).toBeNull()
  })

  it('oculta o toast padrão ao exibir recompensa HUD e coordena janela de deduplicação contextual', async () => {
    render(
      <ToastProvider>
        <GatilhoTeste />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disparar aviso' }))
    expect(screen.getByRole('status').className).toContain('opacity-100')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Disparar recompensa' }))
    })
    expect(await screen.findByText('Episódio registrado')).toBeTruthy()
    expect(screen.getByRole('status').className).toContain('opacity-0')

    expect(recompensaContextualRecente(6000, 1000)).toBe(false)
    marcarRecompensaContextual(1000)
    expect(recompensaContextualRecente(6000, 3000)).toBe(true)
    expect(recompensaContextualRecente(6000, 8000)).toBe(false)
  })
})
