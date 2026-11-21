// client/src/components/BottomNav.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
  it('exibe os 5 botões principais (Início, Deck, Aventura, Explorar, Perfil) para usuário logado', () => {
    montar('/')
    const nav = screen.getByRole('navigation', { name: 'Navegação inferior' })
    const links = within(nav).getAllByRole('link').map((el) => ({
      texto: el.textContent,
      href: el.getAttribute('href'),
    }))
    expect(links).toEqual([
      { texto: 'Início', href: '/' },
      { texto: 'Deck', href: '/deck' },
      { texto: 'Explorar', href: '/descobrir' },
    ])
    expect(screen.getByRole('button', { name: /Aventura/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Perfil/ })).toBeTruthy()
  })

  it('acende Aventura nas subrotas do RPG, Deck no calendário e Explorar em rankings/feed', () => {
    montar('/masmorras')
    expect(screen.getByRole('button', { name: /Aventura/ }).className).toContain('from-holo-1')
    expect(screen.getByRole('link', { name: 'Deck' }).className).toContain('text-muted')

    cleanup()
    montar('/calendario')
    expect(screen.getByRole('link', { name: 'Deck' }).className).toContain('text-holo-3')

    cleanup()
    montar('/feed')
    expect(screen.getByRole('link', { name: 'Explorar' }).className).toContain('text-holo-3')
  })

  it('abre a gaveta Aventura com atalhos diretos de RPG e Agenda', () => {
    montar('/')
    fireEvent.click(screen.getByRole('button', { name: /Aventura/ }))
    expect(screen.getByRole('dialog', { name: 'Aventura & Atalhos' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Herói & Eco/ }).getAttribute('href')).toBe('/personagem')
    expect(screen.getByRole('link', { name: /Expedições 2D/ }).getAttribute('href')).toBe('/expedicoes')
    expect(screen.getByRole('link', { name: /Guilda & Missões/ }).getAttribute('href')).toBe('/guilda')
    expect(screen.getByRole('link', { name: /Agenda/ }).getAttribute('href')).toBe('/calendario')
  })

  it('exibe apenas Início, Descobrir, Rankings e Entrar quando deslogado', () => {
    mockSessao.mockReturnValue({ session: null })
    montar('/')
    expect(screen.getByRole('link', { name: 'Início' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Descobrir' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Rankings' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Aventura/ })).toBeNull()
  })
})
