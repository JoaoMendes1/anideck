import { describe, it, expect, vi } from 'vitest'

vi.mock('./maratona', async (original) => {
  const real = await original<typeof import('./maratona')>()
  return { ...real, segundosParaLiberar: vi.fn() }
})

import { confirmarMarcacaoNaMaratona } from './avisoDaMaratona'
import { segundosParaLiberar } from './maratona'

describe('confirmarMarcacaoNaMaratona', () => {
  it('liberado: marca sem perguntar', async () => {
    vi.mocked(segundosParaLiberar).mockReturnValue(0)
    const confirmar = vi.fn()
    expect(await confirmarMarcacaoNaMaratona(1, 3, confirmar)).toBe(true)
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('cedo: pergunta dizendo quanto falta e respeita a resposta', async () => {
    vi.mocked(segundosParaLiberar).mockReturnValue(600)
    const confirmar = vi.fn().mockResolvedValue(false)
    expect(await confirmarMarcacaoNaMaratona(1, 3, confirmar)).toBe(false)
    expect(confirmar.mock.calls[0][0].mensagem).toContain('10 min')
    expect(confirmar.mock.calls[0][0].perigoso).toBe(true)
  })
})
