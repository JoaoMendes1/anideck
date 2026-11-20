// client/src/components/PainelRecompensasMissoesAdmin.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PainelRecompensasMissoesAdmin from './PainelRecompensasMissoesAdmin'

const showToastMock = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok-admin' } } }),
    },
  },
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

const missoesMock = {
  diarias: [
    {
      id: 'ep_hoje', periodo: 'dia', titulo: 'Episódio do Dia',
      descricao: 'Assista a 1 episódio de qualquer anime', meta: 1,
      recompensa: 10, xp: 5, padrao_recompensa: 10, padrao_xp: 5,
    },
  ],
  semanais: [
    {
      id: 'dias_ativos', periodo: 'semana', titulo: 'Constância',
      descricao: 'Assista a episódios em 5 dias diferentes', meta: 5,
      recompensa: 70, xp: 40, padrao_recompensa: 70, padrao_xp: 40,
    },
  ],
}

beforeEach(() => {
  showToastMock.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return { ok: true, json: async () => missoesMock }
    }
    return { ok: true, json: async () => missoesMock }
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PainelRecompensasMissoesAdmin', () => {
  it('carrega diárias e semanais e envia valores editados ao salvar', async () => {
    render(<PainelRecompensasMissoesAdmin />)

    await screen.findByText('Episódio do Dia')

    const inputAniCoins = screen.getByLabelText('AniCoins de Episódio do Dia') as HTMLInputElement
    fireEvent.change(inputAniCoins, { target: { value: '30' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Semanais (1)' }))
    expect(screen.getByText('Constância')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Salvar Recompensas das Missões/i }))

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch)
      const chamadaPut = fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(chamadaPut).toBeTruthy()
      const corpo = JSON.parse(String(chamadaPut![1]!.body))
      expect(corpo.missoes.ep_hoje).toEqual({ recompensa: 30, xp: 5 })
      expect(corpo.missoes.dias_ativos).toEqual({ recompensa: 70, xp: 40 })
      expect(showToastMock).toHaveBeenCalledWith('Recompensas individuais das missões salvas!', 'success')
    })
  })
})
