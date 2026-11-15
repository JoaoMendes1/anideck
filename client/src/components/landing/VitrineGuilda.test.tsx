// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VitrineGuilda from './VitrineGuilda'

function montar(aoPedirConvite = () => {}) {
  return render(
    <MemoryRouter>
      <VitrineGuilda aoPedirConvite={aoPedirConvite} />
    </MemoryRouter>,
  )
}

const aba = (nome: string) => screen.getByRole('tab', { name: nome })

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('VitrineGuilda', () => {
  it('troca o momento da jornada ao escolher uma aba', () => {
    montar()
    expect(screen.getByText('Nível 24')).toBeTruthy()

    fireEvent.click(aba('Lendário'))

    expect(screen.getByText('Nível 90')).toBeTruthy()
    expect(aba('Lendário').getAttribute('aria-selected')).toBe('true')
    expect(aba('Aventureiro').getAttribute('aria-selected')).toBe('false')
  })

  it('avança sozinha e para de vez depois que a pessoa escolhe', () => {
    montar()

    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.getByText('Nível 90')).toBeTruthy()

    fireEvent.click(aba('Iniciante'))
    act(() => { vi.advanceTimersByTime(20000) })
    expect(screen.getByText('Nível 1')).toBeTruthy()
  })

  it('fica parada com movimento reduzido', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    montar()

    act(() => { vi.advanceTimersByTime(20000) })
    expect(screen.getByText('Nível 24')).toBeTruthy()
  })

  it('chama o pedido de convite pelo botão', () => {
    const aoPedirConvite = vi.fn()
    montar(aoPedirConvite)
    fireEvent.click(screen.getByText('Solicitar convite Beta'))
    expect(aoPedirConvite).toHaveBeenCalledTimes(1)
  })
})
