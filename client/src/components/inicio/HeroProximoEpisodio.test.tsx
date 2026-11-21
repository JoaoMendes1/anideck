// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ParaContinuar } from '../../lib/inicio'
import type { RespostaMaratona } from '../../lib/maratona'

vi.mock('../../lib/maratona', async (original) => {
  const real = await original<typeof import('../../lib/maratona')>()
  return { ...real, obterMaratona: vi.fn() }
})

import HeroProximoEpisodio from './HeroProximoEpisodio'
import { obterMaratona } from '../../lib/maratona'

const faixas = [
  { id: 'relampago', nome: 'Relâmpago', ate_seg: 25920, ouro: 360, bilhetes: 3, xp: 180, anicoins: 120 },
  { id: 'folego', nome: 'Fôlego', ate_seg: 86400, ouro: 144, bilhetes: 1, xp: 72, anicoins: 48 },
]

const itemOverlord: ParaContinuar = {
  anime: {
    mal_id: 35073,
    title: 'Overlord II',
    image_url: '',
    episodes: 13,
    genres: ['Isekai', 'Fantasia'],
  },
  proximoEpisodio: 2,
}

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.mocked(obterMaratona).mockReset()
})

describe('HeroProximoEpisodio · maratona', () => {
  it('mostra o cronômetro em tempo real e muda para Liberado para marcar quando zera a espera', async () => {
    vi.useFakeTimers()
    const baseAgora = new Date('2026-11-20T20:00:00Z').getTime()
    vi.setSystemTime(baseAgora)

    const resposta: RespostaMaratona = {
      pode: false,
      total: 13,
      duracao_min: 24,
      intervalo_seg: 1296,
      faixas,
      maratona: {
        mal_id: 35073,
        total: 13,
        intervalo_seg: 1296,
        faixas,
        iniciada_em: new Date(baseAgora - 600_000).toISOString(),
        ultimo_em: new Date(baseAgora - 1_294_000).toISOString(),
        episodios: [1],
        status: 'ativa',
        motivo: null,
        faixa: null,
        ouro: 0,
        bilhetes: 0,
        xp: 0,
        anicoins: 0,
        terminada_em: null,
        prazo_em: new Date(baseAgora + 85_800_000).toISOString(),
        proximo_em: new Date(baseAgora + 2_000).toISOString(),
      },
    }
    vi.mocked(obterMaratona).mockResolvedValue({ dados: resposta })

    render(
      <MemoryRouter>
        <HeroProximoEpisodio itens={[itemOverlord]} />
      </MemoryRouter>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByLabelText('Cronômetro da maratona').textContent).toContain('00:10:00')
    expect(screen.getByLabelText('Cronômetro da maratona').textContent).toContain('Relâmpago')
    expect(screen.getByLabelText('Tempo para liberar o próximo episódio da maratona').textContent).toContain('Libera em 00:02')

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByLabelText('Cronômetro da maratona').textContent).toContain('00:10:02')
    expect(screen.getByLabelText('Próximo episódio liberado na maratona').textContent).toContain('Liberado para marcar')
  })

  it('não exibe indicadores de maratona quando não há maratona ativa para o anime', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({
      dados: { pode: true, total: 13, duracao_min: 24, intervalo_seg: 1296, faixas },
    })

    render(
      <MemoryRouter>
        <HeroProximoEpisodio itens={[itemOverlord]} />
      </MemoryRouter>,
    )

    await vi.waitFor(() => expect(obterMaratona).toHaveBeenCalledWith(35073))
    expect(screen.queryByLabelText('Cronômetro da maratona')).toBeNull()
    expect(screen.queryByLabelText('Próximo episódio liberado na maratona')).toBeNull()
    expect(screen.queryByLabelText('Tempo para liberar o próximo episódio da maratona')).toBeNull()
  })

  it('não exibe Ep. 14 fantasma nem botão de marcar quando o último episódio (13/13) acabou de ser marcado', async () => {
    vi.mocked(obterMaratona).mockResolvedValue({
      dados: { pode: false, total: 13, duracao_min: 24, intervalo_seg: 1296, faixas },
    })

    render(
      <MemoryRouter>
        <HeroProximoEpisodio
          itens={[{ ...itemOverlord, proximoEpisodio: 13 }]}
          recemMarcados={{ 35073: 13 }}
        />
      </MemoryRouter>,
    )

    await vi.waitFor(() => expect(obterMaratona).toHaveBeenCalledWith(35073))
    expect(screen.queryByText(/Ep\. 14/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Marcar ep\. 14 visto/i })).toBeNull()
    expect(screen.getByText('Concluído')).toBeTruthy()
  })
})
