// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import type { RespostaMaratona } from '../../lib/maratona'

vi.mock('../../lib/maratona', async (original) => {
  const real = await original<typeof import('../../lib/maratona')>()
  return { ...real, obterMaratona: vi.fn(), iniciarMaratona: vi.fn() }
})
const showToast = vi.fn()
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }))

import CartaoMaratona from './CartaoMaratona'
import { iniciarMaratona, obterMaratona } from '../../lib/maratona'

const faixas = [
  { id: 'relampago', nome: 'Relâmpago', ate_seg: 25920, ouro: 360, bilhetes: 3 },
  { id: 'folego', nome: 'Fôlego', ate_seg: 86400, ouro: 144, bilhetes: 1 },
]
const base: RespostaMaratona = { pode: true, total: 12, duracao_min: 24, intervalo_seg: 1296, faixas }
const agora = Date.now()
const ativa: RespostaMaratona = {
  ...base,
  pode: false,
  maratona: {
    mal_id: 1, total: 12, intervalo_seg: 1296, faixas, iniciada_em: new Date(agora - 3_600_000).toISOString(),
    ultimo_em: new Date(agora - 60_000).toISOString(), episodios: [1, 2], status: 'ativa', motivo: null, faixa: null,
    ouro: 0, bilhetes: 0, terminada_em: null, prazo_em: new Date(agora + 82_800_000).toISOString(),
    proximo_em: new Date(agora + 1_236_000).toISOString(),
  },
}

afterEach(() => {
  cleanup()
  vi.mocked(obterMaratona).mockReset()
  vi.mocked(iniciarMaratona).mockReset()
  showToast.mockReset()
})

describe('CartaoMaratona', () => {
  it('antes de começar mostra as faixas e inicia', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({ dados: base })
    vi.mocked(iniciarMaratona).mockResolvedValue({ dados: ativa })
    render(<CartaoMaratona malId={1} />)
    expect(await screen.findByText('Relâmpago')).toBeTruthy()
    expect(screen.getByText(/até 7h12/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar maratona' }))
    expect(await screen.findByText('2 / 12 episódios')).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Maratona iniciada'), 'success')
  })

  it('em andamento mostra cronômetro, próximo episódio e faixa', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({ dados: ativa })
    render(<CartaoMaratona malId={1} />)
    expect((await screen.findByLabelText('Tempo de maratona')).textContent).toMatch(/^01:00:0\d$/)
    expect(screen.getByText(/Faltam \d\d:\d\d para liberar o próximo episódio/)).toBeTruthy()
    expect(screen.getByText(/Valendo agora/).textContent).toContain('Relâmpago')
  })

  it('perdida avisa o motivo', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({
      dados: { ...ativa, motivo: 'A maratona começa do primeiro episódio: desmarque os episódios já vistos para iniciar.', maratona: { ...ativa.maratona!, status: 'falhou', motivo: 'cedo' } },
    })
    render(<CartaoMaratona malId={1} />)
    expect((await screen.findByRole('alert')).textContent).toContain('antes do tempo mínimo')
  })

  it('some quando o anime não serve para maratona ou já está sendo visto', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({ dados: { ...base, pode: false, motivo: 'A maratona começa do primeiro episódio: desmarque os episódios já vistos para iniciar.' } })
    const { container } = render(<CartaoMaratona malId={1} />)
    await vi.waitFor(() => expect(obterMaratona).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })
})
