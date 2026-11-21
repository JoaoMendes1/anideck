// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import type { EstadoEquipamento, ItemRPG, SlotId } from '../../lib/rpg'

vi.mock('../../lib/rpg', async (original) => {
  const real = await original<typeof import('../../lib/rpg')>()
  return { ...real, equiparItemRPG: vi.fn(), aprimorarItem: vi.fn() }
})

import PainelEquipamentos from './PainelEquipamentos'
import SlotsDoPersonagem from './SlotsDoPersonagem'
import EscolhaDeItem from './EscolhaDeItem'
import { ESTILO_DA_RARIDADE, aprimorarItem, equiparItemRPG } from '../../lib/rpg'

// Monta os slots, a lista e o painel como a página: o estado fica fora deles.
function Tela({ inicial }: { inicial: EstadoEquipamento | null | undefined }) {
  const [estado, setEstado] = useState(inicial)
  const [aberto, setAberto] = useState<SlotId | null>(null)
  return (
    <>
      <SlotsDoPersonagem estado={estado} slotAberto={aberto} aoEscolher={(s) => setAberto((a) => (a === s ? null : s))} />
      {estado && aberto && <EscolhaDeItem estado={estado} slot={aberto} aoFechar={() => setAberto(null)} aoAtualizar={setEstado} />}
      <PainelEquipamentos estado={estado} />
    </>
  )
}

const espada = { id: 'espada_de_ferro', slot: 'arma' as const, nome: 'Espada de Ferro', descricao: '', raridade: 'comum' as const, vida: 0, ataque: 4, defesa: 0, nivel_minimo: 1 }
const lamina = { id: 'lamina_de_eter', slot: 'arma' as const, nome: 'Lâmina de Éter', descricao: '', raridade: 'raro' as const, vida: 0, ataque: 10, defesa: 0, nivel_minimo: 10 }
const primordial = { id: 'lamina_primordial', slot: 'arma' as const, nome: 'Lâmina Primordial', descricao: '', raridade: 'lendario' as const, vida: 0, ataque: 45, defesa: 0, nivel_minimo: 55 }

function estado(armaEquipada: ItemRPG = espada): EstadoEquipamento {
  return {
    nivel: 12,
    base: { vida: 320, ataque: 43, defesa: 27, poder: 172 },
    atributos: { vida: 320, ataque: 43 + armaEquipada.ataque, defesa: 27, poder: 180 },
    slots: [{ slot: 'arma', item: armaEquipada }, { slot: 'armadura' }, { slot: 'capa' }, { slot: 'botas' }, { slot: 'joia' }],
    inventario: [
      { ...espada, quantidade: 1, equipado: armaEquipada.id === espada.id, bloqueado: false },
      { ...lamina, quantidade: 2, equipado: armaEquipada.id === lamina.id, bloqueado: false },
      { ...primordial, quantidade: 1, equipado: false, bloqueado: true },
    ],
  }
}

beforeEach(() => {
  vi.mocked(equiparItemRPG).mockReset()
  vi.mocked(aprimorarItem).mockReset()
})
afterEach(cleanup)

describe('PainelEquipamentos', () => {
  it('mostra atributos, poder e o item de cada slot', async () => {
    render(<Tela inicial={estado()} />)

    await screen.findByText('Poder 180')
    expect(screen.getByText('47')).toBeTruthy()
    expect(screen.getByText('+4 itens')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Arma: Espada de Ferro. Trocar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Botas: vazio. Equipar' })).toBeTruthy()
  })

  it('abre o slot, mostra o ganho da troca e equipa', async () => {
    vi.mocked(equiparItemRPG).mockResolvedValue({ dados: estado(lamina) })
    render(<Tela inicial={estado()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    expect(screen.getByText('+6 Ataque')).toBeTruthy()
    expect(screen.getByText('nível 55')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Equipar' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }))
    await screen.findByRole('button', { name: 'Arma: Lâmina de Éter. Trocar' })
    expect(equiparItemRPG).toHaveBeenCalledWith('arma', 'lamina_de_eter')
  })

  it('remover envia o slot vazio', async () => {
    vi.mocked(equiparItemRPG).mockResolvedValue({ dados: estado() })
    render(<Tela inicial={estado()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(equiparItemRPG).toHaveBeenCalledWith('arma', ''))
  })

  it('mostra o erro do servidor', async () => {
    vi.mocked(equiparItemRPG).mockResolvedValue({ erro: 'Este item exige o nível 10.' })
    render(<Tela inicial={estado()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Este item exige o nível 10.'))
  })

  it('sem resposta do servidor, avisa e não desenha slots', () => {
    render(<Tela inicial={null} />)
    expect(screen.getByText('indisponível')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('carregando, não desenha slots', () => {
    render(<Tela inicial={undefined} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('item comum não se parece com slot vazio', () => {
    expect(ESTILO_DA_RARIDADE.comum.borda).not.toContain('line')
    render(<Tela inicial={estado()} />)
    const arma = screen.getByRole('button', { name: 'Arma: Espada de Ferro. Trocar' })
    const botas = screen.getByRole('button', { name: 'Botas: vazio. Equipar' })
    expect(arma.className).not.toContain('border-dashed')
    expect(botas.className).toContain('border-dashed')
  })

  it('a lista abre por cima, sem rolar a página, e fecha no Esc e no toque fora', () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    render(<Tela inicial={estado()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    expect(screen.getByRole('dialog', { name: 'Itens de Arma' })).toBeTruthy()
    expect(rolar).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Arma: Espada de Ferro. Trocar' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar a lista de itens' })[0])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})


describe('Aprimoramento', () => {
  function comAprimoramento(nivelDaLamina: number, ouro: number): EstadoEquipamento {
    const base = estado(lamina)
    const custo = nivelDaLamina < 6 ? 40 * (nivelDaLamina + 1) : 0
    return {
      ...base,
      ouro,
      slots: [{ slot: 'arma', item: { ...lamina, aprimoramento: nivelDaLamina } }, ...base.slots.slice(1)],
      inventario: base.inventario.map((i) =>
        i.id === lamina.id ? { ...i, aprimoramento: nivelDaLamina, aprimoramento_maximo: 6, custo_aprimorar: custo } : { ...i, aprimoramento_maximo: 4, custo_aprimorar: 20 },
      ),
    }
  }

  it('mostra o nível, o teto, o preço e o Ouro, e aprimora sem fechar a lista', async () => {
    vi.mocked(aprimorarItem).mockResolvedValue({ dados: comAprimoramento(3, 20) })
    render(<Tela inicial={comAprimoramento(2, 140)} />)

    expect(screen.getByText('+2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Arma: Lâmina de Éter. Trocar' }))
    expect(screen.getByText('140 de Ouro')).toBeTruthy()
    expect(screen.getByText('Aprimoramento +2 de +6')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Aprimorar Lâmina de Éter para +3 por 120 de Ouro' }))
    await screen.findByText('Aprimoramento +3 de +6')
    expect(aprimorarItem).toHaveBeenCalledWith('lamina_de_eter')
    expect(screen.getByText('20 de Ouro')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Aprimorar Lâmina de Éter para +4 por 160 de Ouro' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('no teto, mostra "no máximo" em vez do botão', () => {
    render(<Tela inicial={comAprimoramento(6, 999)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Arma: Lâmina de Éter. Trocar' }))
    expect(screen.getByText('no máximo')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Aprimorar Lâmina de Éter/ })).toBeNull()
  })

  it('mostra o erro do servidor', async () => {
    vi.mocked(aprimorarItem).mockResolvedValue({ erro: 'Ouro insuficiente. Vença expedições para ganhar mais.' })
    render(<Tela inicial={comAprimoramento(0, 500)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Arma: Lâmina de Éter. Trocar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aprimorar Lâmina de Éter para +1 por 40 de Ouro' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Ouro insuficiente'))
  })
})

describe('Uso exclusivo por cópia entre heróis', () => {
  it('exibe Em uso por outro herói e impede equipar item sem cópias livres', () => {
    const base = estado()
    const comEmUso: EstadoEquipamento = {
      ...base,
      slots: [{ slot: 'arma' }, ...base.slots.slice(1)],
      inventario: [
        {
          ...espada,
          quantidade: 1,
          equipado: false,
          bloqueado: false,
          em_uso_outros: 1,
          em_uso_por: ['Espadachim de Éter'],
        },
        {
          ...lamina,
          quantidade: 2,
          equipado: false,
          bloqueado: false,
          em_uso_outros: 1,
          em_uso_por: ['Haruto'],
        },
      ],
    }

    render(<Tela inicial={comEmUso} />)
    fireEvent.click(screen.getByRole('button', { name: 'Arma: vazio. Equipar' }))

    expect(screen.getByText('Em uso por Espadachim de Éter')).toBeTruthy()
    expect(screen.getByText('Em uso por Haruto · 1 livre')).toBeTruthy()
    expect(screen.getByText('em uso')).toBeTruthy()
    // Apenas Lâmina de Éter (com 1 cópia livre) mantém botão Equipar ativo.
    expect(screen.getAllByRole('button', { name: 'Equipar' })).toHaveLength(1)
  })
})
