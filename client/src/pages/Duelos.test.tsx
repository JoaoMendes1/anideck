// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EstadoDuelos, RespostaDuelo } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterDuelos: vi.fn(), duelar: vi.fn() }
})

import Duelos from './Duelos'
import { duelar, obterDuelos } from '../lib/rpg'

function estado(temPerfil = true, feitos = 0): EstadoDuelos {
  return {
    atributos: { vida: 300, ataque: 40, defesa: 20, poder: 200 },
    elemento: 'agua', feitos, limite: 3, pontos: 6, tem_perfil: temPerfil,
    oponentes: [
      { handle: 'beto', nome: 'Beto', personagem_base: 'lanceiro_fogo', elemento: 'fogo', nivel: 22, duelado_hoje: false, pontos: 3 },
      { handle: 'cris', nome: 'Cris', personagem_base: 'assassina_raio', elemento: 'raio', nivel: 20, duelado_hoje: true, pontos: 0 },
    ],
    ranking: [{ posicao: 1, handle: 'ana', nome: 'Ana', pontos: 6, vitorias: 2 }],
  }
}

const resposta: RespostaDuelo = {
  oponente: { handle: 'beto', nome: 'Beto', personagem_base: 'lanceiro_fogo', elemento: 'fogo', nivel: 22, duelado_hoje: true, pontos: 3 },
  jogador: { vida: 300, ataque: 40, defesa: 20, poder: 200 },
  adversario: { vida: 280, ataque: 38, defesa: 22, poder: 190 },
  resultado: {
    venceu: true, rodadas: 3, elemental: 'vantagem',
    turnos: [
      { atacante: 'monstro', dano: 20, critico: false, vida_jogador: 280, vida_monstro: 280, habilidade: 'Estocada' },
      { atacante: 'jogador', dano: 280, critico: true, vida_jogador: 280, vida_monstro: 0 },
    ],
  },
  pontos_ganhos: 3, ouro_ganho: 15, feitos: 1, limite: 3,
}

beforeEach(() => {
  vi.mocked(obterDuelos).mockReset()
  vi.mocked(duelar).mockReset()
})
afterEach(cleanup)

const abrir = () => render(<MemoryRouter><Duelos /></MemoryRouter>)

describe('Duelos', () => {
  it('lista oponentes com a relação de elemento e trava quem já foi desafiado', async () => {
    vi.mocked(obterDuelos).mockResolvedValue({ dados: estado() })
    abrir()
    expect(((await screen.findByRole('button', { name: 'Desafiar Beto' })) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Desafiar Cris' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Vantagem de elemento/)).toBeTruthy()
    expect(screen.getByText(/Desvantagem de elemento/)).toBeTruthy()
    expect(screen.getByText('Ana')).toBeTruthy()
  })

  it('sem perfil público, pede para abrir e não deixa desafiar', async () => {
    vi.mocked(obterDuelos).mockResolvedValue({ dados: estado(false) })
    abrir()
    expect(((await screen.findByRole('button', { name: 'Desafiar Beto' })) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/abra o seu perfil público/)).toBeTruthy()
  })

  it('mostra o resultado com pontos, Ouro e a habilidade do oponente', async () => {
    vi.mocked(obterDuelos).mockResolvedValue({ dados: estado() })
    vi.mocked(duelar).mockResolvedValue({ dados: resposta })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Desafiar Beto' }))
    expect(await screen.findByText('Vitória')).toBeTruthy()
    expect(screen.getByText(/\+3 pontos de duelo/)).toBeTruthy()
    expect(screen.getByText('Beto usa Estocada')).toBeTruthy()
    expect(duelar).toHaveBeenCalledWith('beto')
  })
})
