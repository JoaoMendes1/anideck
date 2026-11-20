// client/src/components/BottomNav.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

const mockSessao = vi.fn()
vi.mock('../contexts/SessaoContext', () => ({ useSessao: () => mockSessao() }))
vi.mock('./ItensPerfil', () => ({ default: () => <div>Menu Perfil</div> }))

beforeEach(() => {
  mockSessao.mockReturnValue({
    session: { user: { id: 'u1', user_metadata: { display_name: 'Ana' } } },
  })
})
afterEach(cleanup)

function montar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('exibe os 8 itens na ordem atual incluindo Herói, Guilda e Agenda para usuário logado', () => {
    montar('/')
    const links = screen.getAllByRole('link').map((el) => ({
      texto: el.textContent,
      href: el.getAttribute('href'),
    }))
    expect(links).toEqual([
      { texto: 'Início', href: '/' },
      { texto: 'Herói', href: '/personagem' },
      { texto: 'Guilda', href: '/guilda' },
      { texto: 'Deck', href: '/deck' },
      { texto: 'Agenda', href: '/calendario' },
      { texto: 'Feed', href: '/feed' },
      { texto: 'Rankings', href: '/rankings' },
    ])
    expect(screen.getByRole('button', { name: /Perfil/ })).toBeTruthy()
  })

  it('acende Guilda nas subrotas de masmorras, Herói em duelos e Agenda no calendário', () => {
    montar('/masmorras')
    expect(screen.getByRole('link', { name: 'Guilda' }).className).toContain('text-holo-3')
    expect(screen.getByRole('link', { name: 'Herói' }).className).toContain('text-muted')

    cleanup()
    montar('/duelos')
    expect(screen.getByRole('link', { name: 'Herói' }).className).toContain('text-holo-3')
    expect(screen.getByRole('link', { name: 'Guilda' }).className).toContain('text-muted')

    cleanup()
    montar('/calendario')
    expect(screen.getByRole('link', { name: 'Agenda' }).className).toContain('text-holo-3')
    expect(screen.getByRole('link', { name: 'Deck' }).className).toContain('text-muted')
  })

  it('exibe apenas Início, Rankings e Entrar quando deslogado', () => {
    mockSessao.mockReturnValue({ session: null })
    montar('/')
    expect(screen.getByRole('link', { name: 'Início' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Rankings' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Guilda' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Herói' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Agenda' })).toBeNull()
  })
})
