// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import LimiteDeErro from './LimiteDeErro'

function TelaQuebrada(): never {
  throw new Error('dado em formato inesperado')
}

describe('LimiteDeErro', () => {
  // O React registra no console o erro capturado; aqui ele é esperado.
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('mostra a tela normalmente quando nada falha', () => {
    const { getByText, queryByRole } = render(<LimiteDeErro chave="/deck"><p>meu deck</p></LimiteDeErro>)
    expect(getByText('meu deck')).toBeTruthy()
    expect(queryByRole('alert')).toBeNull()
  })

  it('troca a tela quebrada por um aviso com saída', () => {
    const { getByRole, getByText } = render(<LimiteDeErro chave="/personagem"><TelaQuebrada /></LimiteDeErro>)
    expect(getByRole('alert')).toBeTruthy()
    expect(getByText('Recarregar a página')).toBeTruthy()
    expect(getByText('Voltar ao início').getAttribute('href')).toBe('/')
  })

  it('esquece o erro quando a rota muda', () => {
    const { rerender, getByText, queryByRole } = render(<LimiteDeErro chave="/personagem"><TelaQuebrada /></LimiteDeErro>)
    rerender(<LimiteDeErro chave="/deck"><p>meu deck</p></LimiteDeErro>)
    expect(queryByRole('alert')).toBeNull()
    expect(getByText('meu deck')).toBeTruthy()
  })
})
