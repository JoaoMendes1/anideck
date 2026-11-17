// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import type { EstadoEvento } from '../../lib/rpg'

vi.mock('../../lib/rpg', async (original) => {
  const real = await original<typeof import('../../lib/rpg')>()
  return { ...real, obterEvento: vi.fn(), lutarNoEvento: vi.fn() }
})

import CartaoEvento from './CartaoEvento'
import { lutarNoEvento, obterEvento } from '../../lib/rpg'

const estado: EstadoEvento = {
  evento: { id: 'arauto_outono_2026', estacao: 'Outono', ano: 2026, nome: 'Arauto da Tempestade', descricao: 'Sopra.', elemento: 'raio', titulo: 'Caçador do Outono 2026', inicio: '2026-10-01', fim: new Date(Date.now() + 10 * 86_400_000).toISOString() },
  monstro: { id: 'arauto_outono_2026', nome: 'Arauto da Tempestade', descricao: '', tipo: 'raro', nivel: 15, vida: 600, ataque: 50, defesa: 30, bilhetes: 0, chance_item: 0, raridade_item: 'raro' },
  vitorias: 9, meta: 10, lutou_hoje: false, premiado: false, ouro_premio: 300, elemental: 'desvantagem',
}

afterEach(() => { cleanup(); vi.mocked(obterEvento).mockReset(); vi.mocked(lutarNoEvento).mockReset() })

describe('CartaoEvento', () => {
  it('mostra o arauto, as marcas e a relação de elemento', async () => {
    vi.mocked(obterEvento).mockResolvedValue({ dados: estado })
    render(<CartaoEvento />)
    expect(await screen.findByText('Arauto da Tempestade')).toBeTruthy()
    expect(screen.getByText('9 / 10')).toBeTruthy()
    expect(screen.getByText(/Desvantagem de elemento/)).toBeTruthy()
  })

  it('a vitória da meta entrega o título e trava até amanhã', async () => {
    vi.mocked(obterEvento).mockResolvedValue({ dados: estado })
    vi.mocked(lutarNoEvento).mockResolvedValue({
      dados: {
        estado: { ...estado, vitorias: 10, lutou_hoje: true, premiado: true },
        resultado: { venceu: true, rodadas: 4, turnos: [] },
        jogador: { vida: 300, ataque: 40, defesa: 20, poder: 200 },
        premiado_agora: true,
      },
    })
    render(<CartaoEvento />)
    fireEvent.click(await screen.findByRole('button', { name: /Enfrentar o arauto/ }))
    expect(await screen.findByText(/o título “Caçador do Outono 2026” é seu/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Volte amanhã/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('some quando o evento não responde', async () => {
    vi.mocked(obterEvento).mockResolvedValue({ erro: 'fora' })
    const { container } = render(<CartaoEvento />)
    await Promise.resolve()
    expect(container.innerHTML).toBe('')
  })
})
