// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../contexts/ToastContext'
import type { EstadoExpedicoes, RespostaBatalha } from '../lib/rpg'

vi.mock('../lib/rpg', async (original) => {
  const real = await original<typeof import('../lib/rpg')>()
  return {
    ...real,
    obterExpedicoes: vi.fn(),
    batalhar: vi.fn(),
    recuperarVida: vi.fn(),
    obterContratosSemanais: vi.fn(),
    resgatarContratoSemanal: vi.fn(),
  }
})

import Expedicoes from './Expedicoes'
import { batalhar, obterContratosSemanais, obterExpedicoes, recuperarVida, resgatarContratoSemanal } from '../lib/rpg'

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
  return render(<ToastProvider><MemoryRouter><Expedicoes /></MemoryRouter></ToastProvider>)
}

beforeEach(() => {
  vi.mocked(obterExpedicoes).mockReset()
  vi.mocked(batalhar).mockReset()
  vi.mocked(recuperarVida).mockReset()
  vi.mocked(obterContratosSemanais).mockReset()
  vi.mocked(obterContratosSemanais).mockResolvedValue({})
  vi.mocked(resgatarContratoSemanal).mockReset()
  // Movimento reduzido: a luta aparece inteira, sem esperar os golpes.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(cleanup)

describe('Expedições', () => {
  it('lista os monstros com dificuldade, recompensa e o limite do dia', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado() })
    abrir()

    await screen.findAllByText('Slime de Éter')
    expect(screen.getByRole('link', { name: 'Voltar para a Guilda' }).getAttribute('href')).toBe('/guilda')
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

  it('mostra o bestiário e o novo marco na vitória', async () => {
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

    await screen.findAllByText('Seu HP')
    expect(screen.getByText('65 / 130')).toBeTruthy()
    expect(screen.getByText('100')).toBeTruthy()
    expect(screen.getByText(/5% por hora e 8% a cada episódio assistido \(2 de 5 hoje\)/)).toBeTruthy()
    expect(screen.getByText('12 de Ouro')).toBeTruthy()
    expect(screen.getByText('HP e Mana · 1×/dia')).toBeTruthy()
    expect(screen.getByText('23 de Ouro')).toBeTruthy()
    expect(screen.getByText('+40% da Mana')).toBeTruthy()
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

  it('permite explorar o mapa 2D, trocar de região, inspecionar os 8 atributos, dica tática, filtros da lista e bestiário global', async () => {
    const lobo = {
      id: 'lobo_sombrio', nome: 'Lobo Sombrio', descricao: 'Caça na neblina.', tipo: 'comum' as const, nivel: 10,
      vida: 380, ataque: 48, defesa: 24, magia: 10, eter: 16, velocidade: 11, critico_por_mil: 115, dano_critico: 155, esquiva_por_mil: 35,
      elemento: 'trevas', comportamento: 'Predador', regiao: 'bosque_sombrio', regiao_nome: 'Bosque Sombrio', habitat: 'Mata fechada.',
      familia: 'Lobos das Sombras', estagio: 1, evolui_para: ['lobo_abissal'],
      bilhetes: 1, chance_item: 20, raridade_item: 'raro' as const, poder: 160, dificuldade: 'dificil' as const,
      bestiario: { vitorias: 2, marco: 0, faltam_marco: 8, bonus_ouro: 0 },
      dica_tatica: 'Personagem de Luz tem vantagem direta.',
      em_destaque: true,
    }
    const loboAbissal = {
      ...lobo,
      id: 'lobo_abissal', nome: 'Lobo Abissal', nivel: 24, poder: 420,
      estagio: 2, evolui_de: 'lobo_sombrio', evolui_para: [],
      regiao: 'ruinas_do_vazio', regiao_nome: 'Ruínas do Vazio',
      dica_tatica: 'Evolução final da matilha; ataque antes da fúria.',
    }
    const base = estado()
    const comMapa: EstadoExpedicoes = {
      ...base,
      atributos: { vida: 130, ataque: 15, defesa: 9, magia: 8, velocidade: 10, critico_por_mil: 70, dano_critico: 150, esquiva_por_mil: 30, eter: 20, poder: 61 },
      passiva: { id: 'golpe_protagonista', nome: 'Golpe Protagonista', genero: 'Ação', resumo: '+7% Ataque nas batalhas', tipo: 'ataque', valor_pct: 7 },
      regiao_destaque: 'bosque_sombrio',
      regioes: [
        { id: 'clareira_inicial', nome: 'Clareira Inicial', subtitulo: 'Fronteira', bioma: 'Brisa de Éter', efeito_bioma: 'Campo aberto.', faixa_nivel: 'Nv 1–8', ordem: 1, x: 28, y: 75, conexoes: ['bosque_sombrio'], monstros: ['slime_de_eter'] },
        { id: 'bosque_sombrio', nome: 'Bosque Sombrio', subtitulo: 'Trilhas', bioma: 'Névoa Espessa', efeito_bioma: 'Feras velozes.', faixa_nivel: 'Nv 10–25', ordem: 2, x: 19, y: 47, conexoes: ['clareira_inicial', 'ruinas_do_vazio'], monstros: ['lobo_sombrio'], em_destaque: true, bonus_destaque: '+1 material da Forja garantido na vitória' },
        { id: 'ruinas_do_vazio', nome: 'Ruínas do Vazio', subtitulo: 'Salões', bioma: 'Ecos Arcanos', efeito_bioma: 'Espectros antigos.', faixa_nivel: 'Nv 16–41', ordem: 5, x: 50, y: 49, conexoes: ['bosque_sombrio'], monstros: ['lobo_abissal'] },
      ],
      monstros: [
        { ...base.monstros[0], comportamento: 'Instintivo', bestiario: { vitorias: 0, marco: 0, faltam_marco: 10, bonus_ouro: 0 } },
        lobo,
        loboAbissal,
      ],
    }
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: comMapa })
    vi.mocked(batalhar).mockResolvedValue({ dados: { ...vitoria, monstro: lobo } })
    abrir()

    await screen.findByRole('heading', { name: 'Clareira Inicial' })
    expect(screen.getByText('2 / 3 descobertos · 67%')).toBeTruthy()
    expect(screen.getByText(/Golpe Protagonista:/)).toBeTruthy()
    expect(screen.getByText(/Destaque de hoje:/)).toBeTruthy()
    expect(screen.getByText(/Vença 1 vez para desbloquear a dica tática/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Explorar Bosque Sombrio \(Nv 10–25, 1 de 1 criaturas derrotadas\)/ }))
    await screen.findByRole('heading', { name: 'Bosque Sombrio' })
    expect(screen.getByText('Dominada')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Inspecionar Lobo Sombrio (nível 10)' }))
    expect(screen.getByText(/IA: Predador/)).toBeTruthy()
    expect(screen.getByText('Personagem de Luz tem vantagem direta.')).toBeTruthy()
    expect(screen.getByText('Linha de Evolução')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enfrentar Lobo Sombrio' })).toBeTruthy()

    // Clicar na evolução dentro da ficha seleciona a nova forma e salta para a região dela no mapa 2D.
    fireEvent.click(screen.getByRole('button', { name: 'Ver forma Lobo Abissal (nível 24)' }))
    await screen.findByRole('heading', { name: 'Ruínas do Vazio' })
    expect(screen.getByRole('button', { name: 'Enfrentar Lobo Abissal' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.getAllByRole('button', { name: /^Enfrentar / }).length).toBe(3)

    // Filtra por "Falta 1ª vitória" e depois limpa para lutar e validar rematch + próxima evolução.
    fireEvent.click(screen.getByRole('button', { name: 'Falta 1ª vitória' }))
    expect(screen.getAllByRole('button', { name: /^Enfrentar / }).length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Falta 1ª vitória' }))

    fireEvent.click(screen.getByRole('button', { name: 'Com evolução' }))
    expect(screen.getAllByRole('button', { name: /^Enfrentar / }).length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Enfrentar Lobo Sombrio' }))

    await screen.findByText('Vitória')
    expect(screen.getByRole('button', { name: 'Enfrentar novamente' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Desafiar Lobo Abissal' }))
    await waitFor(() => expect(batalhar).toHaveBeenCalledWith('lobo_abissal'))
  })

  it('mostra e resgata contratos semanais atualizando Ouro e Bilhetes', async () => {
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: estado(1, 100, 100) })
    vi.mocked(obterContratosSemanais).mockResolvedValue({
      dados: {
        semana: '2026-11-16',
        expira_em: '2026-11-22',
        contratos: [
          {
            id: 'vitorias_semana',
            titulo: 'Maratona da Fronteira',
            descricao: 'Alcance 10 vitórias em expedições nesta semana.',
            progresso: 10,
            meta: 10,
            ouro: 130,
            bilhetes: 2,
            concluido: true,
            resgatado: false,
          },
        ],
      },
    })
    vi.mocked(resgatarContratoSemanal).mockResolvedValue({
      dados: {
        contrato_id: 'vitorias_semana',
        ouro_ganho: 130,
        bilhetes_ganhos: 2,
        ouro: 230,
        bilhetes: 5,
        estado: {
          semana: '2026-11-16',
          expira_em: '2026-11-22',
          contratos: [
            {
              id: 'vitorias_semana',
              titulo: 'Maratona da Fronteira',
              descricao: 'Alcance 10 vitórias em expedições nesta semana.',
              progresso: 10,
              meta: 10,
              ouro: 130,
              bilhetes: 2,
              concluido: true,
              resgatado: true,
            },
          ],
        },
      },
    })

    abrir()
    await screen.findByText('Contratos Semanais')
    fireEvent.click(screen.getByRole('button', { name: 'Resgatar' }))

    await waitFor(() => expect(resgatarContratoSemanal).toHaveBeenCalledWith('vitorias_semana'))
    expect(await screen.findByText('Resgatado')).toBeTruthy()
    expect(screen.getByText('230')).toBeTruthy()
  })

  it('no desktop exibe o mapa-múndi panorâmico em 1,0× e permite focar e ajustar zoom pelos controles', async () => {
    const comRegioes: EstadoExpedicoes = {
      ...estado(),
      regioes: [
        { id: 'clareira_inicial', nome: 'Clareira Inicial', subtitulo: 'Fronteira', bioma: 'Brisa', efeito_bioma: 'Campo aberto.', faixa_nivel: 'Nv 1–8', ordem: 1, x: 28, y: 75, conexoes: ['bosque_sombrio'], monstros: ['slime_de_eter'] },
        { id: 'bosque_sombrio', nome: 'Bosque Sombrio', subtitulo: 'Trilhas', bioma: 'Névoa', efeito_bioma: 'Feras velozes.', faixa_nivel: 'Nv 10–25', ordem: 2, x: 19, y: 47, conexoes: ['clareira_inicial'], monstros: ['slime_de_eter'] },
      ],
    }
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: comRegioes })
    abrir()

    await screen.findByRole('heading', { name: 'Clareira Inicial' })
    expect(screen.getByText('1,0×')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Focar' }))
    expect(screen.getByText('1,8×')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Visão geral' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Diminuir zoom do mapa' }))
    expect(screen.getByText('1,4×')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Visão geral' }))
    expect(screen.getByText('1,0×')).toBeTruthy()
  })

  it('no celular inicia o mapa-múndi em câmera aproximada (1,8×) e permite explorar regiões e voltar à visão geral', async () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query !== '(min-width: 640px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia

    const comRegioes: EstadoExpedicoes = {
      ...estado(),
      regioes: [
        { id: 'clareira_inicial', nome: 'Clareira Inicial', subtitulo: 'Fronteira', bioma: 'Brisa', efeito_bioma: 'Campo aberto.', faixa_nivel: 'Nv 1–8', ordem: 1, x: 28, y: 75, conexoes: ['bosque_sombrio'], monstros: ['slime_de_eter'] },
        { id: 'bosque_sombrio', nome: 'Bosque Sombrio', subtitulo: 'Trilhas', bioma: 'Névoa', efeito_bioma: 'Feras velozes.', faixa_nivel: 'Nv 10–25', ordem: 2, x: 19, y: 47, conexoes: ['clareira_inicial'], monstros: ['slime_de_eter'] },
      ],
    }
    vi.mocked(obterExpedicoes).mockResolvedValue({ dados: comRegioes })
    abrir()

    // No celular a região ativa aparece numa barra; o painel completo fica na gaveta.
    await screen.findByRole('button', { name: /Clareira Inicial.*Ver criaturas/s })
    expect(screen.getByText('1,8×')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Visão geral' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Explorar Bosque Sombrio \(Nv 10–25,/ }))
    const gaveta = await screen.findByRole('dialog', { name: 'Região Bosque Sombrio' })
    expect(within(gaveta).getByRole('heading', { name: 'Bosque Sombrio' })).toBeTruthy()
    expect(within(gaveta).getAllByRole('button', { name: /^Inspecionar / }).length).toBeGreaterThan(0)
    expect(within(gaveta).getAllByRole('button', { name: /^Enfrentar / }).length).toBeGreaterThan(0)

    fireEvent.click(within(gaveta).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Visão geral' }))
    expect(screen.getByText('1,0×')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Focar' })).toBeTruthy()
  })
})
