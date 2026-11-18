// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../contexts/ToastContext'
import type { EstadoMasmorras, RespostaMasmorra } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterMasmorras: vi.fn(), entrarNaMasmorra: vi.fn() }
})

import Masmorras from './Masmorras'
import { entrarNaMasmorra, obterMasmorras } from '../lib/rpg'

const goblin = { id: 'goblin_batedor', nome: 'Goblin Batedor', descricao: '', tipo: 'comum' as const, nivel: 4, vida: 120, ataque: 14, defesa: 6, bilhetes: 1, chance_item: 0, raridade_item: 'comum' as const }
const lobo = { ...goblin, id: 'lobo_sombrio', nome: 'Lobo Sombrio', nivel: 10 }

function estado(feita = '', perdida = 0): EstadoMasmorras {
  return {
    atributos: { vida: 300, ataque: 40, defesa: 20, poder: 200 },
    vida: { atual: Math.floor((300 * (1000 - perdida)) / 1000), maxima: 300, perdida_por_mil: perdida },
    hoje: { feitas: 0, limite: 5, bilhetes: 2, ouro: 80 },
    feita_hoje: feita,
    masmorras: [
      { id: 'bosque_sombrio', nome: 'Bosque Sombrio', descricao: 'Goblins.', nivel_minimo: 8, andares: ['goblin_batedor', 'lobo_sombrio'], monstros: [goblin, lobo], bloqueada: false, dificuldade: 'equilibrada' },
      { id: 'trono_primordial', nome: 'Trono Primordial', descricao: 'Final.', nivel_minimo: 60, andares: [], monstros: [lobo], bloqueada: true, dificuldade: 'perigosa' },
    ],
  }
}

const turno = { atacante: 'jogador' as const, dano: 50, critico: false, vida_jogador: 300, vida_monstro: 0 }
const resposta: RespostaMasmorra = {
  masmorra: { id: 'bosque_sombrio', nome: 'Bosque Sombrio', descricao: '', nivel_minimo: 8, andares: [] },
  jogador: { vida: 300, ataque: 40, defesa: 20, poder: 200 },
  expedicao: {
    completou: true, caiu: false, vida_final: 250,
    andares: [
      { monstro: goblin, resultado: { venceu: true, rodadas: 2, turnos: [turno], vida_inicial: 300, vida_final: 280 } },
      { monstro: lobo, resultado: { venceu: true, rodadas: 4, turnos: [turno], vida_inicial: 300, vida_final: 250 } },
    ],
  },
  recompensa: { bilhetes: 2, ouro: 57 },
  vida: { atual: 250, maxima: 300, perdida_por_mil: 167 },
}

beforeEach(() => {
  vi.mocked(obterMasmorras).mockReset()
  vi.mocked(entrarNaMasmorra).mockReset()
})
afterEach(cleanup)

function abrir() {
  return render(<ToastProvider><MemoryRouter><Masmorras /></MemoryRouter></ToastProvider>)
}

describe('Masmorras', () => {
  it('lista as masmorras com os andares e trava a de nível alto', async () => {
    vi.mocked(obterMasmorras).mockResolvedValue({ dados: estado() })
    abrir()
    expect(((await screen.findByRole('button', { name: 'Entrar em Bosque Sombrio' })) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Entrar em Trono Primordial' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('nível 60')).toBeTruthy()
    expect(screen.getAllByText('Lobo Sombrio').length).toBeGreaterThan(0)
  })

  it('depois da masmorra do dia, ou abaixo de 30% de Vida, tudo fica fechado', async () => {
    vi.mocked(obterMasmorras).mockResolvedValue({ dados: estado('bosque_sombrio') })
    abrir()
    expect(((await screen.findByRole('button', { name: 'Entrar em Bosque Sombrio' })) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Já explorou')).toBeTruthy()
    cleanup()
    vi.mocked(obterMasmorras).mockResolvedValue({ dados: estado('', 800) })
    abrir()
    expect(((await screen.findByRole('button', { name: 'Entrar em Bosque Sombrio' })) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/abaixo de 30% de Vida/)).toBeTruthy()
  })

  it('mostra cada andar e a recompensa', async () => {
    vi.mocked(obterMasmorras).mockResolvedValue({ dados: estado() })
    vi.mocked(entrarNaMasmorra).mockResolvedValue({ dados: resposta })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar em Bosque Sombrio' }))
    expect(await screen.findByText('Masmorra completa')).toBeTruthy()
    expect(screen.getByText('Vencido em 2 rodadas')).toBeTruthy()
    expect(screen.getByText(/57 de Ouro/)).toBeTruthy()
    expect(entrarNaMasmorra).toHaveBeenCalledWith('bosque_sombrio')
  })
})
