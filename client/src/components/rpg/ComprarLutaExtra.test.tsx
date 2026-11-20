// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ComprarLutaExtra from './ComprarLutaExtra'
import { comprarLutaExtra, lerLutasExtras } from '../../lib/lutasExtras'

vi.mock('../../lib/lutasExtras', () => ({ lerLutasExtras: vi.fn(), comprarLutaExtra: vi.fn() }))

const oferta = (compradas: number, ouro: number) => ({
  expedicao: { compradas, maximo: 5, preco: 140 },
  masmorra: { compradas: 0, maximo: 2, preco: 650 },
  ouro,
})

describe('ComprarLutaExtra', () => {
  beforeEach(() => {
    vi.mocked(lerLutasExtras).mockReset()
    vi.mocked(comprarLutaExtra).mockReset()
  })
  afterEach(cleanup)

  it('compra a luta extra e avisa a página', async () => {
    vi.mocked(lerLutasExtras).mockResolvedValue(oferta(1, 500))
    vi.mocked(comprarLutaExtra).mockResolvedValue({ ok: true })
    const aoComprar = vi.fn()
    render(<ComprarLutaExtra tipo="expedicao" aoComprar={aoComprar} />)

    const botao = await screen.findByRole('button', { name: /Mais uma batalha/ })
    expect(screen.getByText(/Pode comprar mais 4 hoje/)).toBeTruthy()
    fireEvent.click(botao)
    await waitFor(() => expect(aoComprar).toHaveBeenCalled())
    expect(comprarLutaExtra).toHaveBeenCalledWith('expedicao')
  })

  it('sem Ouro suficiente o botão fica desativado e diz quanto falta', async () => {
    vi.mocked(lerLutasExtras).mockResolvedValue(oferta(0, 100))
    render(<ComprarLutaExtra tipo="expedicao" aoComprar={vi.fn()} />)
    const botao = await screen.findByRole('button', { name: /Mais uma batalha/ })
    expect((botao as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Faltam 40 de Ouro.')).toBeTruthy()
  })

  it('no máximo do dia, ou sem o sql/128, mostra só o aviso', async () => {
    vi.mocked(lerLutasExtras).mockResolvedValue(oferta(5, 9999))
    render(<ComprarLutaExtra tipo="expedicao" aoComprar={vi.fn()} />)
    await screen.findByText(/já comprou o máximo/)
    expect(screen.queryByRole('button')).toBeNull()

    cleanup()
    vi.mocked(lerLutasExtras).mockResolvedValue(null)
    render(<ComprarLutaExtra tipo="masmorra" aoComprar={vi.fn()} />)
    await screen.findByText(/Volte amanhã/)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mostra o erro do banco', async () => {
    vi.mocked(lerLutasExtras).mockResolvedValue(oferta(0, 500))
    vi.mocked(comprarLutaExtra).mockResolvedValue({ ok: false, erro: 'Você ainda tem batalhas de hoje. Use-as antes de comprar.' })
    render(<ComprarLutaExtra tipo="expedicao" aoComprar={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Mais uma batalha/ }))
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})
