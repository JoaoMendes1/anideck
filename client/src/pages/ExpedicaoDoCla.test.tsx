// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EstadoExpedicaoDoCla } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterExpedicaoDoCla: vi.fn(), atacarChefeDoCla: vi.fn() }
})

import ExpedicaoDoCla from './ExpedicaoDoCla'
import { atacarChefeDoCla, obterExpedicaoDoCla } from '../lib/rpg'

const monstro = { id: 'cavaleiro_caido', nome: 'Cavaleiro Caído', descricao: '', tipo: 'chefe' as const, nivel: 35, vida: 2100, ataque: 145, defesa: 80, bilhetes: 2, chance_item: 30, raridade_item: 'epico' as const }

function estado(p: Partial<EstadoExpedicaoDoCla> = {}): EstadoExpedicaoDoCla {
  return {
    tem_cla: true, cla_nome: 'Guilda Azul', cla_tag: 'AZUL', membros: 4, atacou_hoje: false, recebeu: false,
    chefe: { monstro, vida_maxima: 25200, dano: 6300, derrotado: false, ouro: 300, bilhetes: 3 },
    ranking: [{ nome: 'Ana', dano: 4000, ataques: 2, sou_eu: true }, { nome: 'Beto', dano: 2300, ataques: 1, sou_eu: false }],
    ...p,
  }
}

beforeEach(() => {
  vi.mocked(obterExpedicaoDoCla).mockReset()
  vi.mocked(atacarChefeDoCla).mockReset()
})
afterEach(cleanup)
const abrir = () => render(<MemoryRouter><ExpedicaoDoCla /></MemoryRouter>)

describe('ExpedicaoDoCla', () => {
  it('mostra o chefe, o dano do clã e quem mais bateu', async () => {
    vi.mocked(obterExpedicaoDoCla).mockResolvedValue({ dados: estado() })
    abrir()
    expect(await screen.findByText('Cavaleiro Caído')).toBeTruthy()
    expect(screen.getByText('6.300 / 25.200')).toBeTruthy()
    expect(screen.getByText('Ana (você)')).toBeTruthy()
  })

  it('ataca uma vez e mostra o dano', async () => {
    vi.mocked(obterExpedicaoDoCla).mockResolvedValue({ dados: estado() })
    vi.mocked(atacarChefeDoCla).mockResolvedValue({ dados: { dano: 3100, derrubou: false, estado: estado({ atacou_hoje: true }) } })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: /Atacar o chefe/ }))
    expect(await screen.findByText('Você causou 3.100 de dano.')).toBeTruthy()
    expect((screen.getByRole('button', { name: /já atacou hoje/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('sem clã, convida a entrar num', async () => {
    vi.mocked(obterExpedicaoDoCla).mockResolvedValue({ dados: { tem_cla: false, membros: 0, atacou_hoje: false, recebeu: false, ranking: [] } })
    abrir()
    expect(await screen.findByText('Entre num clã')).toBeTruthy()
  })
})
