// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import BotaoSalvarNoDeck from './BotaoSalvarNoDeck'

describe('BotaoSalvarNoDeck', () => {
  afterEach(cleanup)

  it('adiciona quando o anime não está no Deck', () => {
    const aoClicar = vi.fn()
    render(<BotaoSalvarNoDeck salvo={false} salvando={false} aoClicar={aoClicar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao Deck' }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  it('na Agenda o ✓ só confirma; no Descobrir ele remove', () => {
    render(<BotaoSalvarNoDeck salvo salvando={false} podeRemover={false} aoClicar={() => {}} />)
    expect(screen.getByRole('button', { name: 'Já está no seu Deck' })).toBeTruthy()
    cleanup()
    render(<BotaoSalvarNoDeck salvo salvando={false} aoClicar={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remover do Deck' })).toBeTruthy()
  })
})
