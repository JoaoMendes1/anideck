// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EstadoExpedicoes, RespostaBatalha } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterExpedicoes: vi.fn(), batalhar: vi.fn(), recuperarVida: vi.fn() }
})

import Expedicoes from './Expedicoes'
import { batalhar, obterExpedicoes, recuperarVida } from '../lib/rpg'

const slime = {
  id: 'slime_de_eter', nome: 'Slime de Éter', descricao: 'Uma gota.', tipo: 'comum' as const, nivel: 1,
  vida: 60, ataque: 8, defesa: 3, bilhetes: 1, chance_item: 15, raridade_item: 'comum' as const,
}

const regras = { regen_por_hora: 50, por_episodio: 80, episodios_por_dia: 5, pocao: 300, pousada_horas: 4 }

function estado(feitas = 1, perdida = 500, ouro = 100): EstadoExpedicoes {
  return {
    atributos: { vida: 130, ataque: 15, defesa: 9, poder: 61 },
    vida: { atual: Math.floor((130 * (1000 - perdida)) / 1000), maxima: 130, perdida_por_mil: perdida },
    custos: { pousada: 12, pocao: 6, pocao_mana: 5, fonte: 23 },
    hoje: { feitas, limite: 5, bilhetes: 3, ouro, vida_perdida: perdida, pousada_livre_em: null, episodios_hoje: 2, regras },
    monstros: [{ ...slime, poder: 34, dificuldade: 'facil', bestiario: { vitorias: 9, marco: 0, faltam_marco: 1, bonus_ouro: 0 } }],
  }
}

const vitoria: RespostaBatalha = {
  monstro: slime,
  jogador: { vida: 130, ataque: 15, defesa: 9, poder: 61 },
  resultado: {
    venceu: true,
    rodadas: 2,
    turnos: [
      { atacante: 'jogador', dano: 30, critico: false, vida_jogador: 130, vida_monstro: 30 },
      { atacante: 'monstro', dano: 4, critico: false, vida_jogador: 126, vida_monstro: 30 },
      { atacante: 'jogador', dano: 45, critico: true, vida_jogador: 126, vida_monstro: 0 },
    ],
  },
  recompensa: {
    bilhetes: 1,
    ouro: 7,
    item: { id: 'botas_do_batedor', slot: 'botas', nome: 'Botas do Batedor', descricao: '', raridade: 'raro', vida: 0, ataque: 1, defesa: 3, nivel_minimo: 6 },
  },
  hoje: { feitas: 2, limite: 5, bilhetes: 4 },
}

function abrir() {
  return render(<MemoryRouter><Expedicoes /></MemoryRouter>)
}

beforeEach(() => {
  vi.mocked(obterExpedicoes).mockReset()
  vi.mocked(batalhar).mockReset()
  vi.mocked(recuperarVida).mockReset()
  // Movimento reduzido: a luta aparece inteira, sem esperar os golpes.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(cleanup)

describe('Expedições', () => {
  it('lista os monstros com dificuldade, recompensa e o limite do dia', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    abrir()

    await screen.findByText('Slime de Éter')
    expect(screen.getByText('Fácil')).toBeTruthy()
    expect(screen.getByText('15% de item comum')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('enfrenta, mostra a luta e a recompensa', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    vi.mocked(batalhar).mockResolvedValue({ dados: vitoria })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' }))

    await screen.findByText('Vitória')
    expect(batalhar).toHaveBeenCalledWith('slime_de_eter')
    expect(screen.getByText('Crítico!')).toBeTruthy()
    expect(screen.getByText('1 bilhete de invocação')).toBeTruthy()
    expect(screen.getByText('7 de Ouro')).toBeTruthy()
    expect(screen.getByText('Botas do Batedor')).toBeTruthy()
  })

  it('mostra o bestiário na lista e o novo marco na vitória', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    vi.mocked(batalhar).mockResolvedValue({
      dados: { ...vitoria, bestiario: { vitorias: 10, marco: 1, faltam_marco: 40, bonus_ouro: 10, novo_marco: true } },
    })
    abrir()

    await screen.findByText('9 vitórias · faltam 1 para o próximo marco')
    fireEvent.click(screen.getByRole('button', { name: 'Enfrentar Slime de Éter' }))
    await screen.findByText('Novo marco do bestiário: +10% de Ouro contra Slime de Éter')
  })

  it('mostra a Vida guardada, o Ouro e as regras de recuperação', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 500, 100) })
    abrir()

    await screen.findByText('Seu HP')
    expect(screen.getByText('65 / 130')).toBeTruthy()
    expect(screen.getByText('100')).toBeTruthy()
    expect(screen.getByText(/5% por hora e 8% a cada episódio assistido \(2 de 5 hoje\)/)).toBeTruthy()
    expect(screen.getByText('12 de Ouro')).toBeTruthy()
    expect(screen.getByText('Fonte termal: HP e Mana cheios')).toBeTruthy()
    expect(screen.getByText('23 de Ouro')).toBeTruthy()
    expect(screen.getByText('Poção de Mana: +25')).toBeTruthy()
  })

  it('abaixo de 30% de Vida, bloqueia a batalha e avisa como recuperar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 750) })
    abrir()

    const botao = await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' })
    expect((botao as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/abaixo de 30% de Vida/)).toBeTruthy()
  })

  it('com 30% de Vida, a batalha fica liberada', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 700) })
    abrir()

    const botao = await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' })
    expect((botao as HTMLButtonElement).disabled).toBe(false)
  })

  it('a Pousada gasta Ouro, enche a Vida e passa a mostrar quando volta', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 500, 100) })
    vi.mocked(recuperarVida).mockResolvedValue({ dados: { vida: { atual: 130, maxima: 130, perdida_por_mil: 0 }, ouro: 88, vida_recuperada: 65 } })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: /Pousada/ }))
    await screen.findByText('130 / 130')
    expect(recuperarVida).toHaveBeenCalledWith('pousada')
    expect(screen.getByText('88')).toBeTruthy()
    expect(screen.getByText(/livre às/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Poção de HP/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('sem Ouro, a Pousada e a Poção ficam desligadas', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 500, 0) })
    abrir()

    expect(((await screen.findByRole('button', { name: /Pousada/ })) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Poção de HP/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('mostra o erro do servidor ao recuperar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 500, 100) })
    vi.mocked(recuperarVida).mockResolvedValue({ erro: 'Ouro insuficiente. Vença expedições para ganhar mais.' })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: /Poção de HP/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Ouro insuficiente'))
  })

  it('sem batalhas restantes, o botão fica desligado e avisa', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(5) })
    abrir()

    const botao = await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' })
    expect((botao as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/já fez todas as batalhas de hoje/)).toBeTruthy()
  })

  it('mostra o erro do servidor ao batalhar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    vi.mocked(batalhar).mockResolvedValue({ erro: 'Você já fez todas as batalhas de hoje. Volte amanhã.' })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Enfrentar Slime de Éter' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Volte amanhã'))
  })

  it('sem personagem, leva ao despertar', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ semPersonagem: true })
    abrir()

    expect((await screen.findByRole('link', { name: 'Ir para o despertar' })).getAttribute('href')).toBe('/personagem')
  })
})
