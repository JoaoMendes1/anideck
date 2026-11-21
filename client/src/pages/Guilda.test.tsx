// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Guilda from './Guilda'
import type { DadosDaGuilda } from '../lib/guilda'

vi.mock('../contexts/SessaoContext', () => ({
  useSessao: () => ({
    session: { access_token: 'tok-teste', user: { id: 'user-1' } },
    isAdmin: false,
  }),
}))

vi.mock('../hooks/useCarteira', () => ({
  useCarteira: () => ({
    saldo: 420,
    movimentos: [],
    recarregar: vi.fn(),
  }),
}))

vi.mock('../hooks/useComunidade', () => ({
  useComunidade: () => ({
    estado: {
      perfil: {
        titulo_ativo: 'Aventureiro Iniciante',
        titulos_desbloqueados: ['Aventureiro Iniciante', 'Desbravador'],
      },
    },
    recarregar: vi.fn(),
  }),
}))

vi.mock('../hooks/useCartas', () => ({
  useCartas: () => ({
    cartas: [
      {
        id: 'c1',
        mal_id: 1,
        titulo: 'Frieren',
        imagem_url: 'https://cdn.exemplo.com/frieren.jpg',
        raridade: 'rarissima',
        is_foil: true,
        estreia: true,
        nota: 10,
        obtida_em: '2026-11-18T12:00:00Z',
      },
    ],
  }),
}))

vi.mock('../components/inicio/CardMissoesDiarias', () => ({
  default: () => <div data-testid="card-missoes">Missões Diárias</div>,
}))
vi.mock('../components/rpg/CardContratosSemanais', () => ({
  default: () => <div data-testid="card-contratos">Contratos Semanais</div>,
}))
vi.mock('../components/chefao/CardChefao', () => ({
  default: () => <div data-testid="card-chefao">Card Chefão</div>,
}))
vi.mock('../components/previsoes/CardPrevisoes', () => ({
  default: () => <div data-testid="card-previsoes">Card Previsões</div>,
}))
vi.mock('../components/AvisoTemporada0', () => ({
  default: () => null,
}))
vi.mock('../components/comunidade/CartaoVitais', () => ({
  default: () => <div data-testid="cartao-vitais">Vitais</div>,
}))
vi.mock('../components/comunidade/CardConviteAmigos', () => ({
  default: () => <div data-testid="card-convite">Convite Amigos</div>,
}))
vi.mock('../components/comunidade/SeletorTitulo', () => ({
  default: () => <div data-testid="seletor-titulo">Seletor de Título</div>,
}))
vi.mock('../components/ModalTransferirAniCoins', () => ({
  default: () => null,
}))

const dadosMock: DadosDaGuilda = {
  status: {
    nivel: 12,
    xp_total: 2400,
    xp_no_nivel: 120,
    xp_para_proximo: 300,
    progresso_pct: 40,
    rank: 'D',
    titulo_rank: 'Explorador',
    proximo_rank: 'C',
    nivel_proximo_rank: 15,
    xp_hoje: 30,
    teto_diario: 100,
    streak_atual: 4,
    maior_streak: 7,
    gamificacao_ativa: true,
    peso_maximo_voto: 1.4,
    maratonas_concluidas: 3,
  },
  economia: {
    ativo: true,
    xp_base_episodio: 10,
    bonus_cedo: 5,
    fator_3_a_5: 0.7,
    fator_6_mais: 0.4,
    teto_diario: 100,
    evento_inicio: '',
    evento_fim: '',
    evento_multiplicador: 1,
  },
  ranks: [
    { rank: 'F', titulo: 'Novato', nivel_minimo: 1 },
    { rank: 'D', titulo: 'Explorador', nivel_minimo: 10 },
  ],
  extrato: [
    {
      mal_id: 21,
      titulo_anime: 'One Piece',
      episode_number: 1100,
      xp_earned: 10,
      reason: 'Episódio assistido',
      earned_at: '2026-11-18T14:00:00Z',
      de_hoje: true,
    },
  ],
  extrato_total: 1,
  extrato_total_paginas: 1,
  especialistas: [
    {
      genero: 'Fantasia',
      total_vistos: 8,
      nivel: 2,
      rotulo_nivel: 'N2',
      titulo_nivel: 'Estudioso',
      peso_voto: 1.2,
      proximo_alvo: 15,
      progresso_pct: 55,
    },
  ],
  especialidade: {
    genero: 'Fantasia',
    epiteto: 'Arcanista',
    icone: '✨',
    lema: 'Mestre dos mundos',
    nivel: 2,
    rotulo_nivel: 'N2',
    titulo_nivel: 'Estudioso',
    total_vistos: 8,
    proximo_alvo: 15,
  },
  insignias: [
    {
      id: 'maratonista',
      icone: '🔥',
      nome: 'Maratonista',
      descricao: 'Assista 10 episódios',
      regra: 'eps >= 10',
      estilo: 'holo',
      desbloqueada: true,
      progresso_atual: 10,
      meta: 10,
    },
  ],
}

function abrir(rota = '/guilda') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Guilda />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/guilda/extrato')) {
        return new Response(
          JSON.stringify({ itens: dadosMock.extrato, pagina: 1, total_paginas: 1, total: 1 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify(dadosMock), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

describe('Guilda', () => {
  it('mostra atalhos diretos para Expedições, Masmorras, Evento e Chefão na aba Aventura', async () => {
    abrir()

    await screen.findByText('Atividades da Guilda')
    expect(screen.getByText(/3 maratonas/)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Expedições/ }).some((el) => el.getAttribute('href') === '/expedicoes')).toBe(true)
    expect(screen.getAllByRole('link', { name: /Masmorras/ }).some((el) => el.getAttribute('href') === '/masmorras')).toBe(true)
    expect(screen.getByRole('link', { name: /Evento da Temporada/ }).getAttribute('href')).toBe('/expedicoes#evento')
    expect(screen.getByRole('link', { name: /Chefão da Temporada/ }).getAttribute('href')).toBe('/chefao')

    expect(screen.queryByText('Coleção de Cartas')).toBeNull()
    expect(screen.queryByText('Como você ganhou XP')).toBeNull()
  })

  it('alterna entre as abas Aventura, Coleção, Extrato e Progresso', async () => {
    abrir()
    await screen.findByText('Atividades da Guilda')

    fireEvent.click(screen.getByRole('tab', { name: 'Coleção' }))
    expect(screen.getByText('Coleção de Cartas')).toBeTruthy()
    expect(screen.getByText('Insígnias')).toBeTruthy()
    expect(screen.getByTestId('seletor-titulo')).toBeTruthy()
    expect(screen.queryByText('Atividades da Guilda')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Extrato' }))
    expect(screen.getByText('Como você ganhou XP')).toBeTruthy()
    expect(screen.getByText(/One Piece/)).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Progresso' }))
    expect(screen.getByText('Especialista de Gênero')).toBeTruthy()
    expect(screen.getByText('Classes F → SS')).toBeTruthy()
    expect(screen.getByTestId('cartao-vitais')).toBeTruthy()
    expect(screen.getByTestId('card-convite')).toBeTruthy()
  })

  it('abre direto na aba correta via hash e permite trocar de aba depois sem travar no hash antigo', async () => {
    abrir('/guilda#extrato')

    await screen.findByText('Como você ganhou XP')
    expect(screen.getByRole('tab', { name: 'Extrato' }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('tab', { name: 'Coleção' }))
    expect(screen.getByText('Coleção de Cartas')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Coleção' }).getAttribute('aria-selected')).toBe('true')
  })
})
