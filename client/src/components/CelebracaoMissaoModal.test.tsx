// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CelebracaoMissaoModal from './CelebracaoMissaoModal'

afterEach(() => {
  cleanup()
})

describe('CelebracaoMissaoModal', () => {
  it('renderiza celebração de maratona com recompensas, nota de insígnia e fecha ao clicar em Continuar', () => {
    const aoFechar = vi.fn()
    render(
      <CelebracaoMissaoModal
        dados={{
          tipo: 'maratona',
          subtitulo: 'Faixa Relâmpago · Maratona finalizada',
          notaExtra: 'Conta para as Insígnias de Maratona!',
          recompensas: {
            ouro: 360,
            xp: 180,
            anicoins: 120,
            bilhetes: 3,
          },
        }}
        aoFechar={aoFechar}
      />,
    )

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Maratona Concluída!')).toBeTruthy()
    expect(screen.getByText('Faixa Relâmpago · Maratona finalizada')).toBeTruthy()
    expect(screen.getByText('+360 Ouro')).toBeTruthy()
    expect(screen.getByText('+180 XP')).toBeTruthy()
    expect(screen.getByText('+120 AniCoins')).toBeTruthy()
    expect(screen.getByText('+3 bilhetes')).toBeTruthy()
    expect(screen.getByText('Conta para as Insígnias de Maratona!')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('renderiza título de missão diária com recompensas parciais', () => {
    render(
      <CelebracaoMissaoModal
        dados={{
          tipo: 'missao',
          titulo: 'Assistir 2 episódios hoje',
          subtitulo: 'Missão Diária',
          recompensas: { anicoins: 20, xp: 40 },
        }}
        aoFechar={() => {}}
      />,
    )

    expect(screen.getByText('Missão Concluída!')).toBeTruthy()
    expect(screen.getByText('Assistir 2 episódios hoje')).toBeTruthy()
    expect(screen.getByText('+20 AniCoins')).toBeTruthy()
    expect(screen.getByText('+40 XP')).toBeTruthy()
    expect(screen.queryByText(/Ouro/)).toBeNull()
  })
})
