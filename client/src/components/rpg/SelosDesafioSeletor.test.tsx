// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import SelosDesafioSeletor from './SelosDesafioSeletor'

afterEach(cleanup)

const catalogo = [
  { id: 'pressa_mortal', nome: 'Pressa Mortal', risco: '-20% Defesa', recompensa: '+1 material' },
  { id: 'sem_cura', nome: 'Voto Sem Cura', risco: 'Sem curas', recompensa: '+1 material' },
]

describe('SelosDesafioSeletor', () => {
  it('permite marcar e desmarcar selos de desafio', () => {
    const aoAlterar = vi.fn()
    render(<SelosDesafioSeletor catalogo={catalogo} selecionados={['pressa_mortal']} aoAlterar={aoAlterar} />)

    fireEvent.click(screen.getByText('Voto Sem Cura').closest('button')!)
    expect(aoAlterar).toHaveBeenCalledWith(['pressa_mortal', 'sem_cura'])

    fireEvent.click(screen.getByText('Pressa Mortal').closest('button')!)
    expect(aoAlterar).toHaveBeenCalledWith([])
  })
})
