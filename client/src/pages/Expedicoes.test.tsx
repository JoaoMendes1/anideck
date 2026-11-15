// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EstadoExpedicoes, RespostaBatalha } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterExpedicoes: vi.fn(), batalhar: vi.fn() }
})

import Expedicoes from './Expedicoes'
import { batalhar, obterExpedicoes } from '../lib/rpg'

const slime = {
  id: 'slime_de_eter', nome: 'Slime de Éter', descricao: 'Uma gota.', tipo: 'comum' as const, nivel: 1,
  vida: 60, ataque: 8, defesa: 3, bilhetes: 1, chance_item: 15, raridade_item: 'comum' as const,
}

function estado(feitas = 1): EstadoExpedicoes {
  return {
    atributos: { vida: 130, ataque: 15, defesa: 9, poder: 61 },
    hoje: { feitas, limite: 5, bilhetes: 3 },
    monstros: [{ ...slime, poder: 34, dificuldade: 'facil' }],
  }
}

const vitoria: RespostaBatalha = {
  monstro: slime,
  jogador: { vida: 130, ataque: 15, defesa: 9, poder: 61 },
  resultado: {
    venceu: true,
    rodadas: 2,
    turnos: [
      { atacante: 'jogador', dano: 30, critico: false, vida_jogador: 130, vida_monstro: 30 },
      { atacante: 'monstro', dano: 4, critico: false, vida_jogador: 126, vida_monstro: 30 },
      { atacante: 'jogador', dano: 45, critico: true, vida_jogador: 126, vida_monstro: 0 },
    ],
  },
  recompensa: {
    bilhetes: 1,
    item: { id: 'botas_do_batedor', slot: 'botas', nome: 'Botas do Batedor', descricao: '', raridade: 'raro', vida: 0, ataque: 1, defesa: 3, nivel_minimo: 6 },
  },
  hoje: { feitas: 2, limite: 5, bilhetes: 4 },
}

function abrir() {
  return render(<MemoryRouter><Expedicoes /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(obterExpedicoes).mockReset()
  vi.mocked(batalhar).mockReset()
  // Movimento reduzido: a luta aparece inteira, sem esperar os golpes.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(cleanup)

describe('Expedições', () => {
  it('lista os monstros com dificuldade, recompensa e o limite do dia', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    abrir()

    await screen.findByText('Slime de Éter')
    expect(screen.getByText('Fácil')).toBeTruthy()
    expect(screen.getByText('15% de item comum')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('enfrenta, mostra a luta e a recompensa', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    vi.mocked(batalhar).mockResolvedValue({ dados: vitoria })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' }))

    await screen.findByText('Vitória')
    expect(batalhar).toHaveBeenCalledWith('slime_de_eter')
    expect(screen.getByText('Crítico!')).toBeTruthy()
    expect(screen.getByText('1 bilhete de invocação')).toBeTruthy()
    expect(screen.getByText('Botas do Batedor')).toBeTruthy()
  })

  it('sem batalhas restantes, o botão fica desligado e avisa', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(5) })
    abrir()

    const botao = await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' })
    expect((botao as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/já fez todas as batalhas de hoje/)).toBeTruthy()
  })

  it('mostra o erro do servidor ao batalhar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    vi.mocked(batalhar).mockResolvedValue({ erro: 'Você já fez todas as batalhas de hoje. Volte amanhã.' })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Volte amanhã'))
  })

  it('sem personagem, leva ao despertar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ semPersonagem: true })
    abrir()

    expect((await screen.findByRole('link', { name: 'Ir para o despertar' })).getAttribute('href')).toBe('/personagem')
  })
})
