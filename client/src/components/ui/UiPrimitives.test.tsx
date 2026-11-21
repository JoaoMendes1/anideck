// client/src/components/ui/UiPrimitives.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Button from './Button'
import Tabs from './Tabs'
import PageHeader from './PageHeader'

afterEach(cleanup)

describe('UI Primitives', () => {
  it('renderiza Button com variante primary, disabled e disparo de onClick', () => {
    const onClick = vi.fn()
    render(
      <>
        <Button variant="primary" size="md" onClick={onClick}>
          Confirmar ação
        </Button>
        <Button variant="danger" disabled>
          Bloqueado
        </Button>
      </>,
    )

    const primario = screen.getByRole('button', { name: 'Confirmar ação' })
    expect(primario.className).toContain('from-holo-1')
    fireEvent.click(primario)
    expect(onClick).toHaveBeenCalledTimes(1)

    const bloqueado = screen.getByRole('button', { name: 'Bloqueado' }) as HTMLButtonElement
    expect(bloqueado.disabled).toBe(true)
    expect(bloqueado.className).toContain('text-coral')
  })

  it('alterna abas e expõe aria-selected e badge em Tabs', () => {
    const aoTrocar = vi.fn()
    render(
      <Tabs
        ariaLabel="Seções do Teste"
        activeId="um"
        onChange={aoTrocar}
        items={[
          { id: 'um', label: 'Mercado', badge: 4 },
          { id: 'dois', label: 'Forja' },
        ]}
      />,
    )

    const abaUm = screen.getByRole('tab', { name: /Mercado/ })
    const abaDois = screen.getByRole('tab', { name: 'Forja' })
    expect(abaUm.getAttribute('aria-selected')).toBe('true')
    expect(abaDois.getAttribute('aria-selected')).toBe('false')
    expect(abaUm.textContent).toContain('4')

    fireEvent.click(abaDois)
    expect(aoTrocar).toHaveBeenCalledWith('dois')
  })

  it('renderiza PageHeader com botão voltar, eyebrow, título Manrope e ações', () => {
    render(
      <MemoryRouter>
        <PageHeader
          eyebrow="RPG · Arena"
          title="Masmorras"
          subtitle="Enfrente ondas em sequência."
          backTo="/personagem"
          backLabel="Voltar"
          actions={<Button variant="gold">Regras</Button>}
        />
      </MemoryRouter>,
    )

    const linkVoltar = screen.getByRole('link', { name: 'Voltar' })
    expect(linkVoltar.getAttribute('href')).toBe('/personagem')
    expect(screen.getByText('RPG · Arena')).toBeTruthy()
    const heading = screen.getByRole('heading', { name: 'Masmorras' })
    expect(heading.className).toContain('font-manrope')
    expect(screen.getByRole('button', { name: 'Regras' })).toBeTruthy()
  })
})
