// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import type { EstadoEquipamento } from '../../lib/rpg'

vi.mock('../../lib/rpg', async (original) => {
  const real = await original<typeof import('../../lib/rpg')>()
  return { ...real, distribuirPontos: vi.fn() }
})

import PainelAtributos from './PainelAtributos'
import LivroDeHabilidades from './LivroDeHabilidades'
import { distribuirPontos } from '../../lib/rpg'

const zero = { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0 }

function estado(pontos = zero, disponiveis = 2): EstadoEquipamento {
  return {
    nivel: 4,
    base: { vida: 160, ataque: 19, defesa: 11, poder: 100 },
    atributos: { vida: 160, ataque: 19, defesa: 11, poder: 100 },
    slots: [],
    inventario: [],
    primarios_base: { forca: 8, inteligencia: 4, constituicao: 8, agilidade: 6, destreza: 6, sorte: 5 },
    pontos,
    pontos_disponiveis: disponiveis,
  }
}

beforeEach(() => vi.mocked(distribuirPontos).mockReset())
afterEach(cleanup)

describe('PainelAtributos', () => {
  it('distribui no rascunho, respeita o limite e salva a distribuição inteira', async () => {
    const aoAtualizar = vi.fn()
    vi.mocked(distribuirPontos).mockResolvedValue({ dados: estado({ ...zero, forca: 2 }) })
    render(<PainelAtributos estado={estado()} aoAtualizar={aoAtualizar} />)

    expect(screen.getByText('2 pontos livres')).toBeTruthy()
    const mais = screen.getByRole('button', { name: 'Pôr um ponto em Força' })
    fireEvent.click(mais)
    fireEvent.click(mais)
    expect(screen.getByText('0 pontos livres')).toBeTruthy()
    expect((mais as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByLabelText('Força: 10')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar pontos' }))
    await waitFor(() => expect(aoAtualizar).toHaveBeenCalled())
    expect(distribuirPontos).toHaveBeenCalledWith({ ...zero, forca: 2 })
  })

  it('desfazer volta ao que está salvo, e o erro do servidor aparece', async () => {
    vi.mocked(distribuirPontos).mockResolvedValue({ erro: 'Você tem 1 pontos para distribuir.' })
    render(<PainelAtributos estado={estado()} aoAtualizar={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pôr um ponto em Sorte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.queryByRole('button', { name: 'Salvar pontos' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Pôr um ponto em Sorte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pontos' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Você tem 1 pontos para distribuir.'))
  })

  it('não tira ponto que não existe, e some com servidor antigo', () => {
    const { unmount } = render(<PainelAtributos estado={estado()} aoAtualizar={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Tirar um ponto de Força' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()
    const antigo = { ...estado(), primarios_base: undefined }
    render(<PainelAtributos estado={antigo} aoAtualizar={vi.fn()} />)
    expect(screen.queryByText('Atributos')).toBeNull()
  })
})

describe('LivroDeHabilidades', () => {
  it('destaca a única e mostra o nível das bloqueadas', () => {
    render(
      <LivroDeHabilidades
        habilidades={[
          { id: 'despertar_do_eter', nome: 'Despertar do Éter', descricao: 'Uma vez por luta...', tipo: 'unica', nivel_minimo: 5, custo_eter: 0, recarga: 0, desbloqueada: true },
          { id: 'golpe_firme', nome: 'Golpe Firme', descricao: '1,5x', tipo: 'comum', nivel_minimo: 1, custo_eter: 8, recarga: 0, desbloqueada: true },
          { id: 'corte_duplo', nome: 'Corte Duplo', descricao: 'dois cortes', tipo: 'comum', nivel_minimo: 8, custo_eter: 14, recarga: 0, desbloqueada: false },
        ]}
      />,
    )
    expect(screen.getByText('Única')).toBeTruthy()
    expect(screen.getByText('2/3')).toBeTruthy()
    expect(screen.getByText('nível 8')).toBeTruthy()
    expect(screen.queryByText('dois cortes')).toBeNull()
    expect(screen.getByText('8 Éter')).toBeTruthy()
  })

  it('mostra a maestria das comuns liberadas, e não da única', () => {
    render(
      <LivroDeHabilidades
        habilidades={[
          { id: 'despertar_do_eter', nome: 'Despertar do Éter', descricao: 'x', tipo: 'unica', nivel_minimo: 5, custo_eter: 0, recarga: 0, desbloqueada: true, maestria: 0 },
          { id: 'golpe_firme', nome: 'Golpe Firme', descricao: '1,5x', tipo: 'comum', nivel_minimo: 1, custo_eter: 8, recarga: 0, desbloqueada: true, usos: 26, maestria: 2, faltam_maestria: 34 },
        ]}
      />,
    )
    expect(screen.getByText('Maestria II · faltam 34 usos')).toBeTruthy()
    expect(screen.getAllByText(/Maestria/).length).toBe(1)
  })

  it('sem livro, não desenha nada', () => {
    const { container } = render(<LivroDeHabilidades habilidades={undefined} />)
    expect(container.innerHTML).toBe('')
  })
})
