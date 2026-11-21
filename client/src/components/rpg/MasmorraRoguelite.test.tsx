// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import MasmorraRoguelite from './MasmorraRoguelite'
import type { RespostaRoguelite } from '../../lib/rpg'

afterEach(cleanup)

const baseSessao = {
  masmorra: { id: 'bosque_sombrio', nome: 'Bosque Sombrio', descricao: 'Goblins.', nivel_minimo: 8, andares: ['goblin', 'lobo', 'chefe'] },
  monstros: [
    { id: 'goblin', nome: 'Goblin Batedor', descricao: '', tipo: 'comum' as const, nivel: 4, vida: 120, ataque: 14, defesa: 6, bilhetes: 1, chance_item: 0, raridade_item: 'comum' as const },
    { id: 'lobo', nome: 'Lobo Alfa', descricao: '', tipo: 'raro' as const, nivel: 8, vida: 210, ataque: 22, defesa: 10, bilhetes: 2, chance_item: 0, raridade_item: 'raro' as const },
    { id: 'chefe', nome: 'Senhor do Bosque', descricao: '', tipo: 'chefe' as const, nivel: 12, vida: 360, ataque: 30, defesa: 14, bilhetes: 3, chance_item: 0.3, raridade_item: 'epico' as const },
  ],
  esquadrao: [],
  andar_atual: 1,
  total_andares: 3,
  herois: [{ base: 'lanceiro_fogo', nome: 'Haruto', nivel: 10, elemento: 'fogo', vida_atual: 240, vida_maxima: 300 }],
  bencaos_ativas: [],
  escolhas_bencao: [
    { id: 'furia_carmesim', nome: 'Fúria Carmesim', descricao: '+18% Ataque', categoria: 'ofensiva', raridade: 'rara' },
    { id: 'muralha_ferro', nome: 'Bastião de Ferro', descricao: '+20% Defesa', categoria: 'defensiva', raridade: 'comum' },
    { id: 'olho_aguia', nome: 'Olho da Águia', descricao: '+10% Crítico', categoria: 'ofensiva', raridade: 'epica' },
  ],
  vencidos: ['goblin'],
  ouro_bonus_pct: 0,
  pode_avancar: false,
  pode_recuar: true,
}

describe('MasmorraRoguelite', () => {
  it('exibe as 3 escolhas de bênção e dispara aoEscolherBencao ao clicar', () => {
    const aoEscolherBencao = vi.fn()
    const resposta: RespostaRoguelite = {
      ativo: true,
      finalizada: false,
      status: 'ativa',
      sessao: baseSessao,
    }
    render(
      <MasmorraRoguelite
        resposta={resposta}
        ocupado={false}
        aoEscolherBencao={aoEscolherBencao}
        aoDecidirAltar={vi.fn()}
        aoAvancar={vi.fn()}
        aoRecuar={vi.fn()}
        aoEncerrarResumo={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Fúria Carmesim').closest('button')!)
    expect(aoEscolherBencao).toHaveBeenCalledWith('furia_carmesim')
  })

  it('mostra altar de risco quando ativo e botões avançar ou recuar quando liberado', () => {
    const aoDecidirAltar = vi.fn()
    const aoAvancar = vi.fn()
    const aoRecuar = vi.fn()

    const comAltar: RespostaRoguelite = {
      ativo: true,
      finalizada: false,
      status: 'ativa',
      sessao: {
        ...baseSessao,
        escolhas_bencao: [],
        altar_ativo: {
          id: 'altar_sangue',
          nome: 'Altar do Sangue',
          descricao: 'Sacrifício.',
          custo: '20% Vida atual',
          recompensa: '+30% Ouro',
        },
      },
    }
    render(
      <MasmorraRoguelite
        resposta={comAltar}
        ocupado={false}
        aoEscolherBencao={vi.fn()}
        aoDecidirAltar={aoDecidirAltar}
        aoAvancar={aoAvancar}
        aoRecuar={aoRecuar}
        aoEncerrarResumo={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar altar' }))
    expect(aoDecidirAltar).toHaveBeenCalledWith('aceitar')

    cleanup()
    const prontoAvancar: RespostaRoguelite = {
      ativo: true,
      finalizada: false,
      status: 'ativa',
      sessao: { ...baseSessao, escolhas_bencao: [], pode_avancar: true, pode_recuar: true },
    }
    render(
      <MasmorraRoguelite
        resposta={prontoAvancar}
        ocupado={false}
        aoEscolherBencao={vi.fn()}
        aoDecidirAltar={vi.fn()}
        aoAvancar={aoAvancar}
        aoRecuar={aoRecuar}
        aoEncerrarResumo={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Avançar para o 2º andar/i }))
    fireEvent.click(screen.getByRole('button', { name: /Recuar com os espólios/i }))
    expect(aoAvancar).toHaveBeenCalledTimes(1)
    expect(aoRecuar).toHaveBeenCalledTimes(1)
  })
})
