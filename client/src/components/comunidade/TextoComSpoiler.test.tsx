// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import TextoComSpoiler from './TextoComSpoiler'

afterEach(cleanup)

describe('TextoComSpoiler', () => {
  it('esconde todo o conteúdo quando contemSpoiler=true até clicar e permite ocultar de novo', () => {
    render(<TextoComSpoiler texto="O herói era o vilão desde o início." contemSpoiler />)

    expect(screen.queryByText(/O herói era o vilão/)).toBeNull()
    const abrir = screen.getByRole('button', { name: /Contém spoiler/i })
    expect(abrir.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(abrir)
    expect(screen.getByText(/O herói era o vilão desde o início\./)).toBeTruthy()

    const ocultar = screen.getByRole('button', { name: /Ocultar/i })
    fireEvent.click(ocultar)
    expect(screen.queryByText(/O herói era o vilão/)).toBeNull()
  })

  it('oculta apenas os trechos ||marcados|| e revela um de cada vez ao clicar', () => {
    render(<TextoComSpoiler texto="Gostei da luta, mas ||o mestre morre|| e ||a espada quebra||." />)

    expect(screen.getByText(/Gostei da luta, mas/)).toBeTruthy()
    const botoes = screen.getAllByRole('button', { name: 'Revelar spoiler' })
    expect(botoes).toHaveLength(2)
    expect(botoes[0].getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botoes[0])
    expect(screen.getByRole('button', { name: 'Ocultar spoiler' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('button', { name: 'Revelar spoiler' })).toHaveLength(1)
  })
})
