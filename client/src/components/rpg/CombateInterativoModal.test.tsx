// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import CombateInterativoModal from './CombateInterativoModal'
import * as rpgLib from '../../lib/rpg'

vi.mock('../../lib/rpg', async (original) => {
  const real = await original<typeof import('../../lib/rpg')>()
  return { ...real, agirCombateInterativo: vi.fn() }
})

beforeEach(() => {
  vi.mocked(rpgLib.agirCombateInterativo).mockReset()
})
afterEach(cleanup)

const inicial: rpgLib.EstadoCombateInterativo = {
  sessao_id: 's1',
  modo: 'expedicao',
  alvo_nome: 'Rei Goblin',
  alvo_elemento: 'fogo',
  alvo_nivel: 12,
  rodada: 0,
  herois: [{ base: 'lanceiro_fogo', nome: 'Haruto', elemento: 'fogo', vida_atual: 300, vida_maxima: 300, eter_atual: 40, eter_maximo: 40 }],
  inimigo_vida: 240,
  inimigo_vida_max: 240,
  intencao: {
    tipo: 'golpe_pesado',
    titulo: 'Golpe Pesado',
    descricao: 'Impacto forte.',
    dano_estimado: 42,
    dica: 'Defender/Esquivar reduz pela metade.',
  },
  encerrado: false,
  venceu: false,
  caiu: false,
}

describe('CombateInterativoModal', () => {
  it('exibe próxima intenção e permite escolher Golpe, Defender ou Ruptura de Éter', async () => {
    vi.mocked(rpgLib.agirCombateInterativo).mockResolvedValue({
      dados: {
        ...inicial,
        rodada: 1,
        inimigo_vida: 0,
        encerrado: true,
        venceu: true,
        recompensa: { bilhetes: 1, ouro: 45 },
      },
    })

    const aoFechar = vi.fn()
    render(<CombateInterativoModal estadoInicial={inicial} aoFechar={aoFechar} />)

    expect(screen.getByText(/Próxima intenção: Golpe Pesado/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Defender \/ Esquivar/i }))

    expect(rpgLib.agirCombateInterativo).toHaveBeenCalledWith('s1', 'defender')
    expect(await screen.findByText('Vitória Tática')).toBeTruthy()
    expect(screen.getByText(/\+45 Ouro/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Concluir e atualizar' }))
    expect(aoFechar).toHaveBeenCalledWith(true)
  })

  it('renderiza em portal no document.body e trava a rolagem de fundo enquanto aberto', () => {
    const aoFechar = vi.fn()
    const { container, unmount } = render(<CombateInterativoModal estadoInicial={inicial} aoFechar={aoFechar} />)

    expect(container.querySelector('[role="dialog"]')).toBeNull()
    const dialogo = document.body.querySelector('[role="dialog"]')
    expect(dialogo).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
