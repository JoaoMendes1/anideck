// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EVENTOS_DE_MUDANCA, buscarUmaVez, esquecerBuscasRecentes } from './buscaCompartilhada'

describe('respostas guardadas e avisos de mudança', () => {
  beforeEach(() => esquecerBuscasRecentes())

  it('reaproveita a resposta recente enquanto nada muda', async () => {
    const buscar = vi.fn(() => Promise.resolve(1))
    await buscarUmaVez('missoes', buscar, 10_000)
    await buscarUmaVez('missoes', buscar, 10_000)
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it.each(EVENTOS_DE_MUDANCA)('volta ao servidor depois de %s', async (evento) => {
    const buscar = vi.fn(() => Promise.resolve(1))
    await buscarUmaVez('missoes', buscar, 10_000)

    window.dispatchEvent(new CustomEvent(evento))

    await buscarUmaVez('missoes', buscar, 10_000)
    expect(buscar).toHaveBeenCalledTimes(2)
  })
})
