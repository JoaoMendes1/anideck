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
  it('exibe os 7 itens incluindo Guilda e Personagem para usuário logado', () => {
    montar('/')
    expect(screen.getByRole('link', { name: 'Início' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Deck' }).getAttribute('href')).toBe('/deck')
    expect(screen.getByRole('link', { name: 'Guilda' }).getAttribute('href')).toBe('/guilda')
    expect(screen.getByRole('link', { name: 'Personagem' }).getAttribute('href')).toBe('/personagem')
    expect(screen.getByRole('link', { name: 'Feed' }).getAttribute('href')).toBe('/feed')
    expect(screen.getByRole('link', { name: 'Rankings' }).getAttribute('href')).toBe('/rankings')
    expect(screen.getByRole('button', { name: /Perfil/ })).toBeTruthy()
  })

  it('acende Guilda nas subrotas de masmorras e expedições, e Personagem em duelos', () => {
    montar('/masmorras')
    expect(screen.getByRole('link', { name: 'Guilda' }).className).toContain('text-holo-3')
    expect(screen.getByRole('link', { name: 'Personagem' }).className).toContain('text-muted')

    cleanup()
    montar('/duelos')
    expect(screen.getByRole('link', { name: 'Personagem' }).className).toContain('text-holo-3')
    expect(screen.getByRole('link', { name: 'Guilda' }).className).toContain('text-muted')
  })

  it('exibe apenas Início, Rankings e Entrar quando deslogado', () => {
    mockSessao.mockReturnValue({ session: null })
    montar('/')
    expect(screen.getByRole('link', { name: 'Início' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Rankings' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Guilda' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Personagem' })).toBeNull()
  })
})
