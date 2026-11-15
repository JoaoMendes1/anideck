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

const chances = { comum: 600, raro: 300, epico: 85, lendario: 15, garantia: 10 }
const estado = (bilhetes: number, semEpico = 7): EstadoInvocacao => ({ bilhetes, sem_epico: semEpico, chances })

function abrir() {
  return render(<MemoryRouter><Invocacao /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(obterInvocacao).mockReset()
  vi.mocked(invocar).mockReset()
})
afterEach(cleanup)

describe('Invocação', () => {
  it('mostra bilhetes, as chances do servidor e quanto falta para a garantia', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(3) })
    abrir()

    await screen.findByText('3 bilhetes')
    expect(screen.getByText('60%')).toBeTruthy()
    expect(screen.getByText('1,5%')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Invocar 10/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Invocar 1 1 bilhete/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('invoca e revela os itens', async () => {
    vi.mocked(obterInvocacao).mockResolvedValue({ dados: estado(3) })
    vi.mocked(invocar).mockResolvedValue({
      dados: {
        ...estado(2, 0),
        itens: [{ id: 'selo_do_guardiao', slot: 'joia', nome: 'Selo do Guardião', descricao: '', raridade: 'epico', vida: 40, ataque: 9, defesa: 0, nivel_minimo: 24, garantida: true }],
      },
    })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: /Invocar 1 1 bilhete/ }))
    await screen.findByText('Selo do Guardião')
    expect(invocar).toHaveBeenCalledWith(1)
    expect(screen.getByText('garantido')).toBeTruthy()
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
