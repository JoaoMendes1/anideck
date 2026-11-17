// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MenuLateral from './MenuLateral'

const preCarregar = vi.fn()
vi.mock('../lib/rotasPreguicosas', () => ({ preCarregarRota: (p: string) => preCarregar(p) }))
vi.mock('../contexts/SessaoContext', () => ({ useSessao: () => ({ isAdmin: false }) }))
vi.mock('../hooks/useResumoGuilda', () => ({ useResumoGuilda: () => null }))
vi.mock('../hooks/useComunidade', () => ({
  useComunidade: () => ({ estado: { perfil: { existe: true, publico: true, handle: 'ana' } } }),
}))

afterEach(cleanup)

function montar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <MenuLateral aberto aoAlternar={() => {}} />
    </MemoryRouter>,
  )
}

describe('MenuLateral', () => {
  it('tem o perfil público e o grupo Comunidade', () => {
    montar('/')
    expect(screen.getByText('COMUNIDADE')).toBeTruthy()
    expect(screen.getByTitle('Meu Perfil').getAttribute('href')).toBe('/u/ana')
  })

  it('abre sozinho o submenu da página atual e marca o subitem', () => {
    montar('/expedicoes')
    expect(screen.getByLabelText('Fechar atalhos de Meu Personagem').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('Abrir atalhos de Guilda').getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Expedições').getAttribute('aria-current')).toBe('page')
  })

  it('a seta abre e fecha o submenu sem navegar', () => {
    montar('/')
    fireEvent.click(screen.getByLabelText('Abrir atalhos de Guilda'))
    expect(screen.getByLabelText('Fechar atalhos de Guilda').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Extrato de XP').getAttribute('href')).toBe('/guilda#extrato')
  })

  it('baixa a página ao passar o mouse no item', () => {
    montar('/')
    fireEvent.mouseEnter(screen.getByTitle('Guilda'))
    expect(preCarregar).toHaveBeenCalledWith('/guilda')
  })
})
