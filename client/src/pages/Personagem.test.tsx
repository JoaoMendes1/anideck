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

import Personagem from './Personagem'
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
