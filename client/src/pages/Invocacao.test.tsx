// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EstadoInvocacao } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterInvocacao: vi.fn(), invocar: vi.fn() }
})

import Invocacao from './Invocacao'
import { invocar, obterInvocacao } from '../lib/rpg'

const chances = {
  ouro: 780, raro: 170, epico: 45, lendario: 5, garantia: 10,
  lendario_sobe_em: 70, lendario_passo: 50, lendario_garantido: 90, ouro_por_tentativa: 25,
}
const estado = (bilhetes: number, semRaro = 7, semLendario = 20, chanceAgora = 5): EstadoInvocacao => ({
  bilhetes, ouro: 0, sem_raro: semRaro, sem_lendario: semLendario, chance_lendario_agora: chanceAgora, chances,
})

function abrir() {
  return render(<MemoryRouter><Invocacao /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(obterInvocacao).mockReset()
  vi.mocked(invocar).mockReset()
})
afterEach(cleanup)

describe('Invocação', () => {
  it('mostra bilhetes, as chances do servidor e quanto falta para as garantias', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(3, 7, 80, 555) })
    abrir()

    await screen.findByText('3 bilhetes')
    expect(screen.getByText('78%')).toBeTruthy()
    expect(screen.getByText('0,5%')).toBeTruthy()
    expect(screen.getByText('25 de Ouro')).toBeTruthy()
    expect(screen.queryByText('Comum')).toBeNull()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('55,5%')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Invocar 10/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Invocar 1 1 bilhete/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('invoca e revela os itens e o Ouro', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(3) })
    vi.mocked(invocar).mockResolvedValue({
      dados: {
        ...estado(2, 0),
        itens: [
          { tipo: 'item', id: 'selo_do_guardiao', slot: 'joia', nome: 'Selo do Guardião', descricao: '', raridade: 'epico', vida: 40, ataque: 9, defesa: 0, nivel_minimo: 24, garantida: true },
          { tipo: 'ouro', ouro: 25, garantida: false },
        ],
      },
    })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: /Invocar 1 1 bilhete/ }))
    await screen.findByText('Selo do Guardião')
    expect(invocar).toHaveBeenCalledWith(1)
    expect(screen.getByText('garantido')).toBeTruthy()
    expect(screen.getByText('Sem item desta vez')).toBeTruthy()
    expect(screen.getByText('2 bilhetes')).toBeTruthy()
  })

  it('sem bilhetes, desliga os botões e leva às expedições', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(0) })
    abrir()

    expect((await screen.findByRole('link', { name: /Ganhe bilhetes/ })).getAttribute('href')).toBe('/expedicoes')
    expect((screen.getByRole('button', { name: /Invocar 1 1 bilhete/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('mostra o erro do servidor', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(1) })
    vi.mocked(invocar).mockResolvedValue({ erro: 'Bilhetes insuficientes. Vença expedições para ganhar mais.' })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: /Invocar 1 1 bilhete/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Bilhetes insuficientes'))
  })
})
