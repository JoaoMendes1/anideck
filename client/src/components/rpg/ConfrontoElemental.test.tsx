// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ConfrontoElemental from './ConfrontoElemental'

describe('ConfrontoElemental', () => {
  afterEach(cleanup)

  it('fala pelo jogador: vantagem, fraqueza e traço com o efeito na classe dele', () => {
    render(
      <ConfrontoElemental
        nomeDoMonstro="Grifo"
        elementoMonstro="luz"
        elementoHeroi="trevas"
        classeHeroi="espadachim"
        tracos={[{ id: 'voador', nome: 'Voador', descricao: 'Fica fora do alcance.', fator_classe: 0.9 }]}
      />,
    )
    expect(screen.getByText(/Vantagem sua: Trevas vence Luz/)).toBeTruthy()
    expect(screen.getByText(/Fraqueza de Grifo: heróis de Trevas \(o seu\)/)).toBeTruthy()
    expect(screen.getByText('Você (Espadachim): você causa 10% menos dano.')).toBeTruthy()
  })

  it('sem vantagem e com traço favorável', () => {
    render(<ConfrontoElemental nomeDoMonstro="Golem" elementoMonstro="eter" elementoHeroi="eter" classeHeroi="guerreiro" tracos={[{ id: 'blindado', nome: 'Blindado', descricao: 'x', fator_classe: 1.2 }]} />)
    expect(screen.getByText(/Sem vantagem de elemento/)).toBeTruthy()
    expect(screen.getByText('Golem não tem fraqueza de elemento.')).toBeTruthy()
    expect(screen.getByText('Você (Guerreiro): você causa 20% mais dano.')).toBeTruthy()
  })

  it('exibe probabilidades dinâmicas quando estimativa é informada', () => {
    render(
      <ConfrontoElemental
        nomeDoMonstro="Dragão"
        elementoMonstro="fogo"
        elementoHeroi="agua"
        estimativa={{
          criticoJogadorPct: 24,
          esquivaJogadorPct: 18,
          esquivaMonstroPct: 6,
          bloqueioJogadorPct: 9,
          resistenciaJogadorPct: 12,
          atb: {
            velocidade_jogador: 28,
            velocidade_monstro: 20,
            ritmo_jogador: 33,
            ritmo_monstro: 25,
            atb_jogador: 100,
            atb_monstro: 75,
            primeiro: 'jogador',
            proxima_ordem: ['jogador', 'monstro', 'jogador', 'monstro', 'jogador', 'monstro'],
          },
        }}
      />,
    )
    expect(screen.getByText(/Probabilidades dinâmicas/)).toBeTruthy()
    expect(screen.getByText('24%')).toBeTruthy()
    expect(screen.getByText('18%')).toBeTruthy()
    expect(screen.getByText('9%')).toBeTruthy()
  })
})
