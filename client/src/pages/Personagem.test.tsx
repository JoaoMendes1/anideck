// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RespostaPersonagem } from '../lib/personagem'

// As chamadas ao servidor são trocadas; o resto do módulo (artes, textos) é o real.
vi.mock('../lib/personagem', async (original) => {
  const real = await original<typeof import('../lib/personagem')>()
  return { ...real, obterPersonagem: vi.fn(), equiparVisual: vi.fn(), despertarPersonagem: vi.fn() }
})

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return { ...real, obterEquipamentos: vi.fn() }
})

import Personagem from './Personagem'
import { obterEquipamentos } from '../lib/rpg'
import { EVENTO_PERSONAGEM_ATUALIZADO, equiparVisual, obterPersonagem } from '../lib/personagem'

const estagios = [
  { id: 'iniciante', nome: 'Iniciante', nivel_minimo: 1 },
  { id: 'aventureiro', nome: 'Aventureiro', nivel_minimo: 10 },
  { id: 'veterano', nome: 'Veterano', nivel_minimo: 28 },
  { id: 'lendario', nome: 'Lendário', nivel_minimo: 55 },
]

function personagemNoNivel(nivel: number, visual: { id: string; automatico: boolean }): RespostaPersonagem {
  const indice = estagios.reduce((achado, e, i) => (nivel >= e.nivel_minimo ? i : achado), 0)
  return {
    existe: true,
    personagem: { nome: 'Ren', personagem_base: 'espadachim_eter', classe: 'espadachim', elemento: 'eter', criado_em: '' },
    progressao: { nivel, xp_total: 5000, xp_no_nivel: 100, xp_para_proximo: 400, progresso_pct: 25, rank: 'D', titulo_rank: 'Batedor' },
    estagio: estagios[indice],
    proximo_estagio: estagios[indice + 1],
    visual,
    estagios: estagios.map((e) => ({ ...e, alcancado: nivel >= e.nivel_minimo })),
  }
}

function abrir() {
  return render(
    <MemoryRouter>
      <Personagem />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(obterPersonagem).mockReset()
  vi.mocked(obterEquipamentos).mockReset()
  vi.mocked(obterEquipamentos).mockResolvedValue(null)
  vi.mocked(equiparVisual).mockReset()
})
afterEach(cleanup)

describe('Personagem - escolha de visual', () => {
  it('no automático, explica a regra e só deixa experimentar estágio alcançado', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    abrir()

    await screen.findByText(/O visual acompanha o seu estágio/)
    expect(screen.getByRole('button', { name: 'Ver o visual Iniciante' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver o visual Aventureiro' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver o visual Veterano' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver o visual Lendário' })).toBeNull()
    expect(screen.queryByText('Usar este visual')).toBeNull()
  })

  it('experimenta, fixa o visual e avisa o resto do app', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    vi.mocked(equiparVisual).mockResolvedValue({ dados: personagemNoNivel(12, { id: 'iniciante', automatico: false }) })
    const aviso = vi.fn()
    window.addEventListener(EVENTO_PERSONAGEM_ATUALIZADO, aviso)
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver o visual Iniciante' }))
    expect(screen.getByText('Prévia · Iniciante')).toBeTruthy()
    expect(screen.getByRole('img', { name: /com o visual Iniciante/ })).toBeTruthy()
    expect(equiparVisual).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Usar este visual' }))
    await screen.findByText(/Visual fixado em/)

    expect(equiparVisual).toHaveBeenCalledWith('iniciante')
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Prévia · Iniciante')).toBeNull()
    expect(screen.getByRole('button', { name: 'Voltar ao automático' })).toBeTruthy()
    window.removeEventListener(EVENTO_PERSONAGEM_ATUALIZADO, aviso)
  })

  it('cancelar a prévia volta ao visual em uso sem chamar o servidor', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver o visual Iniciante' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Prévia · Iniciante')).toBeNull()
    expect(screen.getByRole('img', { name: /com o visual Aventureiro/ })).toBeTruthy()
    expect(equiparVisual).not.toHaveBeenCalled()
  })

  it('voltar ao automático envia visual vazio', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(58, { id: 'iniciante', automatico: false }))
    vi.mocked(equiparVisual).mockResolvedValue({ dados: personagemNoNivel(58, { id: 'lendario', automatico: true }) })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar ao automático' }))

    await screen.findByText(/O visual acompanha o seu estágio/)
    expect(equiparVisual).toHaveBeenCalledWith('')
  })

  it('mostra o erro do servidor e mantém a prévia', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    vi.mocked(equiparVisual).mockResolvedValue({ erro: 'Este visual ainda não foi desbloqueado.' })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver o visual Iniciante' }))
    fireEvent.click(screen.getByRole('button', { name: 'Usar este visual' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Este visual ainda não foi desbloqueado.'))
    expect(screen.getByText('Prévia · Iniciante')).toBeTruthy()
  })

  it('resposta de servidor antigo, sem o campo visual, segue o estágio', async () => {
    const semVisual = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    delete semVisual.visual
    vi.mocked(obterPersonagem).mockResolvedValue(semVisual)
    abrir()

    await screen.findByText(/O visual acompanha o seu estágio/)
    expect(screen.getByRole('img', { name: /com o visual Aventureiro/ })).toBeTruthy()
  })
})

describe('Personagem - cenário', () => {
  it('aplica o cenário equipado por baixo da luz do estágio', async () => {
    const comCenario = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    comCenario.cenario = 'cenario-aurora'
    vi.mocked(obterPersonagem).mockResolvedValue(comCenario)
    abrir()

    const palco = await screen.findByRole('region', { name: 'Arte do personagem' })
    expect(palco.getAttribute('data-cenario')).toBe('cenario-aurora')
    expect(screen.getByRole('link', { name: 'Cenários e auras' }).getAttribute('href')).toBe('/loja')
  })

  it('sem cenário, ou com um estilo que o app não conhece, usa o fundo padrão', async () => {
    const desconhecido = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    desconhecido.cenario = 'cenario-que-nao-existe'
    vi.mocked(obterPersonagem).mockResolvedValue(desconhecido)
    abrir()

    const palco = await screen.findByRole('region', { name: 'Arte do personagem' })
    expect(palco.getAttribute('data-cenario')).toBe('padrao')
  })
})

describe('Personagem - aura', () => {
  it('desenha a aura equipada atrás da ilustração', async () => {
    const comAura = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    comAura.aura = 'aura-chama-azul'
    vi.mocked(obterPersonagem).mockResolvedValue(comAura)
    abrir()

    const palco = await screen.findByRole('region', { name: 'Arte do personagem' })
    const camada = palco.querySelector('[data-aura]')
    expect(camada?.getAttribute('data-aura')).toBe('aura-chama-azul')
    // A camada vem antes da imagem no palco, então fica por baixo dela.
    const imagem = palco.querySelector('img')
    expect(camada && imagem && camada.compareDocumentPosition(imagem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem aura, ou com um estilo desconhecido, não desenha camada', async () => {
    const desconhecida = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    desconhecida.aura = 'aura-que-nao-existe'
    vi.mocked(obterPersonagem).mockResolvedValue(desconhecida)
    abrir()

    const palco = await screen.findByRole('region', { name: 'Arte do personagem' })
    expect(palco.querySelector('[data-aura]')).toBeNull()
  })
})

describe('Personagem - skins', () => {
  it('lista as skins possuídas e veste uma', async () => {
    const comSkin = personagemNoNivel(12, { id: 'aventureiro', automatico: true })
    comSkin.skins = [{ id: 'skin_carmesim', nome: 'Traje Carmesim', estilo: 'skin-carmesim' }]
    const vestida = { ...comSkin, visual: { id: 'skin_carmesim', automatico: false } }
    vi.mocked(obterPersonagem).mockResolvedValue(comSkin)
    vi.mocked(equiparVisual).mockResolvedValue({ dados: vestida })
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver o traje Traje Carmesim' }))
    expect(screen.getByText('Prévia · Traje Carmesim')).toBeTruthy()
    const imagem = screen.getByRole('img', { name: /com o visual Traje Carmesim/ }) as HTMLImageElement
    expect(imagem.style.filter).toContain('sepia')

    fireEvent.click(screen.getByRole('button', { name: 'Usar este visual' }))
    await screen.findByText(/Visual fixado em/)
    expect(equiparVisual).toHaveBeenCalledWith('skin_carmesim')
  })

  it('sem skins, a fileira de trajes não aparece', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    abrir()
    await screen.findByText(/O visual acompanha o seu estágio/)
    expect(screen.queryByText('Trajes')).toBeNull()
  })

  it('carrega personagem e equipamento numa chamada só, com os slots sobre a arte', async () => {
    const equipamento = {
      nivel: 12,
      base: { vida: 320, ataque: 43, defesa: 27, poder: 172 },
      atributos: { vida: 320, ataque: 47, defesa: 27, poder: 180 },
      slots: [
        { slot: 'arma' as const, item: { id: 'espada_de_ferro', slot: 'arma' as const, nome: 'Espada de Ferro', descricao: '', raridade: 'comum' as const, vida: 0, ataque: 4, defesa: 0, nivel_minimo: 1 } },
        { slot: 'armadura' as const },
        { slot: 'capa' as const },
        { slot: 'botas' as const },
        { slot: 'joia' as const },
      ],
      inventario: [],
    }
    vi.mocked(obterPersonagem).mockResolvedValue({ ...personagemNoNivel(12, { id: 'aventureiro', automatico: true }), equipamento })
    abrir()

    await screen.findByRole('button', { name: 'Arma: Espada de Ferro. Trocar' })
    expect(obterPersonagem).toHaveBeenCalledTimes(1)
    expect(obterPersonagem).toHaveBeenCalledWith({ completo: true })
    expect(obterEquipamentos).not.toHaveBeenCalled()
    expect(screen.getByText('Poder 180')).toBeTruthy()
  })

  it('sem o equipamento na resposta, busca só ele', async () => {
    vi.mocked(obterPersonagem).mockResolvedValue(personagemNoNivel(12, { id: 'aventureiro', automatico: true }))
    abrir()
    await waitFor(() => expect(obterEquipamentos).toHaveBeenCalledTimes(1))
  })

  it('alterna entre as abas Status, Atributos e Habilidades e respeita ?aba= na URL', async () => {
    const equipamento = {
      nivel: 12,
      base: { vida: 320, ataque: 43, defesa: 27, poder: 172 },
      atributos: { vida: 320, ataque: 47, defesa: 27, poder: 180, magia: 20, eter: 14, velocidade: 15, critico_por_mil: 70, dano_critico: 155, esquiva_por_mil: 30, sorte_item: 1 },
      primarios_base: { forca: 16, inteligencia: 8, constituicao: 16, agilidade: 10, destreza: 10, sorte: 7 },
      pontos: { forca: 0, inteligencia: 0, constituicao: 0, agilidade: 0, destreza: 0, sorte: 0 },
      pontos_disponiveis: 6,
      slots: [
        { slot: 'arma' as const },
        { slot: 'armadura' as const },
        { slot: 'capa' as const },
        { slot: 'botas' as const },
        { slot: 'joia' as const },
      ],
      inventario: [],
      habilidades: [
        { id: 'despertar_do_eter', nome: 'Despertar do Éter', descricao: 'Uma vez por luta...', tipo: 'unica' as const, nivel_minimo: 5, custo_eter: 0, recarga: 0, desbloqueada: true },
        { id: 'golpe_firme', nome: 'Golpe Firme', descricao: '1,5x', tipo: 'comum' as const, nivel_minimo: 1, custo_eter: 8, recarga: 0, desbloqueada: true },
      ],
    }
    vi.mocked(obterPersonagem).mockResolvedValue({ ...personagemNoNivel(12, { id: 'aventureiro', automatico: true }), equipamento })

    render(
      <MemoryRouter initialEntries={['/personagem?aba=atributos']}>
        <Personagem />
      </MemoryRouter>,
    )

    // Abre direto na aba Atributos pela URL (?aba=atributos)
    await screen.findByText('6 pontos livres')
    expect(screen.getByRole('tab', { name: /Atributos/ }).getAttribute('aria-selected')).toBe('true')

    // Troca para Habilidades
    fireEvent.click(screen.getByRole('tab', { name: 'Habilidades' }))
    expect(await screen.findByText('Despertar do Éter')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Habilidades' }).getAttribute('aria-selected')).toBe('true')

    // Troca para Status
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }))
    expect(await screen.findByText('Poder 180')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Status' }).getAttribute('aria-selected')).toBe('true')
  })
})
