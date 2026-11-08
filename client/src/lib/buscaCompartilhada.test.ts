import { describe, expect, it, vi } from 'vitest'
import { buscarUmaVez } from './buscaCompartilhada'

describe('buscarUmaVez', () => {
  it('pedidos simultâneos dividem a mesma busca', async () => {
    const buscar = vi.fn(() => new Promise<number>(resolver => setTimeout(() => resolver(7), 5)))
    const [a, b] = await Promise.all([buscarUmaVez('k', buscar), buscarUmaVez('k', buscar)])
    expect(a).toBe(7)
    expect(b).toBe(7)
    expect(buscar).toHaveBeenCalledTimes(1)
  })
  it('depois de terminar, a próxima busca é nova, mesmo se a anterior falhou', async () => {
    const falha = vi.fn(() => Promise.reject(new Error('rede')))
    await expect(buscarUmaVez('x', falha)).rejects.toThrow('rede')
    const ok = vi.fn(() => Promise.resolve('ok'))
    await expect(buscarUmaVez('x', ok)).resolves.toBe('ok')
    expect(ok).toHaveBeenCalledTimes(1)
  })
})
