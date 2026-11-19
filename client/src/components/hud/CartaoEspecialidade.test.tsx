// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CartaoEspecialidade from './CartaoEspecialidade'

const arcanista = {
  genero: 'Fantasia', epiteto: 'Arcanista', icone: '🔮', lema: 'Fala a língua dos mundos mágicos',
  nivel: 3, rotulo_nivel: 'N3', titulo_nivel: 'Especialista', total_vistos: 16, proximo_alvo: 25, secundario: 'Ação',
}

describe('CartaoEspecialidade', () => {
  it('mostra o título, o nível, o que falta e a subclasse', () => {
    render(<CartaoEspecialidade especialidade={arcanista} />)
    expect(screen.getByText('Arcanista')).toBeTruthy()
    expect(screen.getByText('N3 · Especialista')).toBeTruthy()
    expect(screen.getByText(/16 animes de Fantasia · faltam 9/)).toBeTruthy()
    expect(screen.getByText('Ação')).toBeTruthy()
  })
  it('no nível máximo não fala em próximo nível', () => {
    render(<CartaoEspecialidade especialidade={{ ...arcanista, nivel: 5, total_vistos: 42, proximo_alvo: 40 }} />)
    expect(screen.getByText(/nível máximo/)).toBeTruthy()
  })
  it('sem especialidade mostra o texto vazio, ou nada', () => {
    const { container, rerender } = render(<CartaoEspecialidade especialidade={null} />)
    expect(container.innerHTML).toBe('')
    rerender(<CartaoEspecialidade especialidade={null} vazio="Ainda sem especialidade" />)
    expect(screen.getByText('Ainda sem especialidade')).toBeTruthy()
  })

  it('mostra a passiva de RPG quando fornecida', () => {
    render(
      <CartaoEspecialidade
        especialidade={arcanista}
        passiva={{
          id: 'canalizacao_arcana',
          nome: 'Canalização Arcana',
          genero: 'Fantasia',
          resumo: '+8% Magia nas batalhas',
          tipo: 'magia',
          valor_pct: 8,
        }}
      />,
    )
    expect(screen.getByText(/Passiva RPG · Canalização Arcana:/)).toBeTruthy()
    expect(screen.getByText('+8% Magia nas batalhas')).toBeTruthy()
  })
})
