// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SecaoColecaoCartas from './SecaoColecaoCartas'
import { formatarDataColecao, type CartaColecao } from '../../lib/cartas'

afterEach(cleanup)

function gerarCartas(qtd: number): CartaColecao[] {
  return Array.from({ length: qtd }, (_, i) => ({
    id: `carta-${i + 1}`,
    mal_id: 1000 + i,
    titulo: `Anime Teste ${i + 1}`,
    imagem_url: `https://cdn.exemplo.com/${i + 1}.jpg`,
    raridade: i % 10 === 0 ? 'rarissima' : i % 3 === 0 ? 'rara' : 'comum',
    is_foil: i < 5,
    estreia: i < 3,
    nota: i < 5 ? 10 : 8,
    obtida_em: new Date(Date.UTC(2026, 10, 16, 0, 40, 0) - i * 60_000).toISOString(),
  }))
}

describe('SecaoColecaoCartas e CardCartaColecao (#232)', () => {
  it('formata a data de obtenção com dia e hora no fuso de Brasília', () => {
    // 2026-11-16T00:40:00Z = 15/11/2026 às 21:40 em America/Sao_Paulo (UTC-3)
    expect(formatarDataColecao('2026-11-16T00:40:00Z')).toBe('15/11/2026 às 21:40')
  })

  it('pagina 63 cartas em 3 páginas de até 24 e exibe data com hora nos cards', () => {
    const cartas = gerarCartas(63)
    render(
      <MemoryRouter>
        <SecaoColecaoCartas cartas={cartas} />
      </MemoryRouter>,
    )

    // Página 1: mostra 24 cartas (1 a 24)
    expect(screen.getByText('Anime Teste 1')).toBeTruthy()
    expect(screen.getByText('Anime Teste 24')).toBeTruthy()
    expect(screen.queryByText('Anime Teste 25')).toBeNull()
    expect(screen.getByText(/Colecionada em 15\/11\/2026 às 21:40/)).toBeTruthy()

    // Botões de página 1, 2 e 3 visíveis
    expect(screen.getByRole('button', { name: 'Página 1' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeTruthy()

    // Vai para a página 3 (cartas 49 a 63 = 15 cartas)
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(screen.getByText('Anime Teste 49')).toBeTruthy()
    expect(screen.getByText('Anime Teste 63')).toBeTruthy()
    expect(screen.queryByText('Anime Teste 1')).toBeNull()
  })

  it('trocar filtro ou busca na página 2 volta para a página 1', () => {
    const cartas = gerarCartas(63)
    render(
      <MemoryRouter initialEntries={['/?cartas=2']}>
        <SecaoColecaoCartas cartas={cartas} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Anime Teste 25')).toBeTruthy()

    // Clica no filtro Foil (5 cartas) -> volta para a página 1
    fireEvent.click(screen.getByRole('button', { name: /Foil \(5\)/ }))
    expect(screen.getByText('Anime Teste 1')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).toBeNull()
  })
})
