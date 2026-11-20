// client/src/components/AbaCatalogoRPG.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AbaCatalogoRPG from './AbaCatalogoRPG'

// Só a Lança da Tempestade tem arte neste teste.
vi.mock('../lib/artesRpg', () => ({
  arteDoItem: (id: string | undefined) => (id === 'lanca_da_tempestade' ? '/arte.webp' : undefined),
  arteDoMonstro: () => undefined,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok-admin' } } }),
    },
  },
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const respostaMock = {
  resumo: {
    total: 3,
    ativos: 3,
    inativos: 0,
    no_mercado: 2,
    na_forja: 1,
    possuidos: 1,
    por_slot: { arma: 2, armadura: 1 },
    por_raridade: { comum: 1, epico: 2 },
    por_classe: { espadachim: 1, lanceiro: 1, assassina: 0, maga: 0, guerreiro: 0, paladina: 0, generico: 1 },
    por_elemento: { fogo: 1, agua: 0, terra: 0, vento: 0, raio: 1, luz: 0, trevas: 0, eter: 0, neutro: 1 },
    por_conjunto: { carmesim: 1, sem_conjunto: 2 },
  },
  itens: [
    {
      id: 'lanca_de_madeira', slot: 'arma', nome: 'Lança de Treino', descricao: 'Haste leve.',
      raridade: 'comum', vida: 0, ataque: 4, defesa: 0, magia: 0, velocidade: 1,
      critico_por_mil: 0, dano_critico: 0, esquiva_por_mil: 0, nivel_minimo: 1,
      classes: ['lanceiro'], generico: false, elemento: 'neutro', preco_ouro: 35,
      na_forja: false, inicial: false, ativo: true, possui: true, quantidade: 1, ordem: 15,
    },
    {
      id: 'lanca_da_tempestade', slot: 'arma', nome: 'Lança da Tempestade', descricao: 'Atrai raios.',
      raridade: 'epico', vida: 0, ataque: 32, defesa: 0, magia: 0, velocidade: 2,
      critico_por_mil: 0, dano_critico: 0, esquiva_por_mil: 0, nivel_minimo: 26,
      classes: ['lanceiro'], generico: false, elemento: 'raio', preco_ouro: null,
      na_forja: false, inicial: false, ativo: true, possui: false, quantidade: 0, ordem: 105,
    },
    {
      id: 'armadura_carmesim', slot: 'armadura', nome: 'Armadura Carmesim', descricao: 'Escamas.',
      raridade: 'epico', vida: 100, ataque: 7, defesa: 12, magia: 0, velocidade: 0,
      critico_por_mil: 0, dano_critico: 0, esquiva_por_mil: 0, nivel_minimo: 26,
      classes: null, generico: true, conjunto: 'carmesim', elemento: 'fogo', preco_ouro: 240,
      na_forja: true, forja_ouro: 180, inicial: false, ativo: true, possui: false, quantidade: 0, ordem: 116,
    },
  ],
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => respostaMock,
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AbaCatalogoRPG', () => {
  it('exibe contagens por classe e elemento e permite filtrar equipamentos', async () => {
    render(<AbaCatalogoRPG />)

    await screen.findByText('Lança de Treino')
    expect(screen.getByText('Lanceiro (1)')).toBeTruthy()
    expect(screen.getByText('Fogo (1)')).toBeTruthy()
    expect(screen.getByText('Raio (1)')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fogo (1)' }))
    await waitFor(() => {
      expect(screen.queryByText('Lança de Treino')).toBeNull()
      expect(screen.getByText('Armadura Carmesim')).toBeTruthy()
    })
  })

  it('filtra os sem arte, mostra a cobertura e limpa os filtros', async () => {
    render(<AbaCatalogoRPG />)
    await screen.findByText('Lança de Treino')

    fireEvent.click(screen.getByRole('button', { name: /^Sem arte/ }))
    await waitFor(() => {
      expect(screen.queryByText('Lança da Tempestade')).toBeNull()
      expect(screen.getByText('Lança de Treino')).toBeTruthy()
      expect(screen.getByText('Armadura Carmesim')).toBeTruthy()
    })

    // Elmo comum não existe no catálogo: a cobertura mostra zero.
    expect(screen.getByRole('button', { name: 'Elmo Comum: 0' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Arma Épico: 1' }))
    fireEvent.click(screen.getByRole('button', { name: /^Sem arte/ }))
    await waitFor(() => {
      expect(screen.getByText('Lança da Tempestade')).toBeTruthy()
      expect(screen.queryByText('Lança de Treino')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() => expect(screen.getByText('Lança de Treino')).toBeTruthy())
  })
})
