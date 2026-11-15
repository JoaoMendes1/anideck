import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buscarUmaVez, esquecerBuscasRecentes } from './buscaCompartilhada'

describe('buscarUmaVez', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    esquecerBuscasRecentes()
  })
  afterEach(() => vi.useRealTimers())

  it('junta pedidos simultâneos num só', async () => {
    const buscar = vi.fn(() => Promise.resolve('a'))
    const [x, y] = await Promise.all([buscarUmaVez('k1', buscar), buscarUmaVez('k1', buscar)])
    expect(x).toBe('a')
    expect(y).toBe('a')
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('sem validade, consulta de novo depois que o primeiro pedido termina', async () => {
    const buscar = vi.fn(() => Promise.resolve('a'))
    await buscarUmaVez('k2', buscar)
    await buscarUmaVez('k2', buscar)
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('com validade, reaproveita a resposta recente e volta a consultar quando ela vence', async () => {
    const buscar = vi.fn(() => Promise.resolve('a'))
    await buscarUmaVez('k3', buscar, 10_000)
    await buscarUmaVez('k3', buscar, 10_000)
    expect(buscar).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10_001)
    await buscarUmaVez('k3', buscar, 10_000)
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('não guarda resposta de pedido que falhou', async () => {
    const buscar = vi.fn(() => Promise.reject(new Error('fora')))
    await expect(buscarUmaVez('k4', buscar, 10_000)).rejects.toThrow('fora')
    await expect(buscarUmaVez('k4', buscar, 10_000)).rejects.toThrow('fora')
    expect(buscar).toHaveBeenCalledTimes(2)
  })
})
