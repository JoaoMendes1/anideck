import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('./rpg', () => ({ cabecalhoDeAutenticacao: vi.fn(async () => ({})) }))

import {
  anotarMarcacao,
  pacoteEmTexto,
  cronometro,
  faixaAtual,
  formatarDuracao,
  mensagemDaMaratona,
  obterMaratona,
  segundosParaLiberar,
  type FaixaMaratona,
  type RespostaMaratona,
} from './maratona'

const faixas: FaixaMaratona[] = [
  { id: 'relampago', nome: 'Relâmpago', ate_seg: 25920, ouro: 360, bilhetes: 3, xp: 180, anicoins: 120 },
  { id: 'maratona', nome: 'Maratona', ate_seg: 43200, ouro: 240, bilhetes: 2, xp: 120, anicoins: 84 },
  { id: 'folego', nome: 'Fôlego', ate_seg: 86400, ouro: 144, bilhetes: 1, xp: 72, anicoins: 48 },
]

function resposta(proximoEm: number, episodios: number[] = [1]): RespostaMaratona {
  return {
    pode: false, total: 12, duracao_min: 24, intervalo_seg: 1296, faixas,
    maratona: {
      mal_id: 1, total: 12, intervalo_seg: 1296, faixas, iniciada_em: new Date(0).toISOString(), ultimo_em: null,
      episodios, status: 'ativa', motivo: null, faixa: null, ouro: 0, bilhetes: 0, xp: 0, anicoins: 0, terminada_em: null,
      prazo_em: new Date(86_400_000).toISOString(), proximo_em: new Date(proximoEm).toISOString(),
    },
  }
}

async function carregar(malId: number, r: RespostaMaratona) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(r), { status: 200 })))
  await obterMaratona(malId)
}

afterEach(() => vi.unstubAllGlobals())

describe('formatos', () => {
  it('formata durações e cronômetro', () => {
    expect(formatarDuracao(25920)).toBe('7h12')
    expect(formatarDuracao(1296)).toBe('21 min')
    expect(formatarDuracao(42)).toBe('42 s')
    expect(cronometro(3725)).toBe('01:02:05')
  })

  it('a faixa valendo é a primeira cujo limite não passou', () => {
    expect(faixaAtual(faixas, 100)?.id).toBe('relampago')
    expect(faixaAtual(faixas, 30000)?.id).toBe('maratona')
    expect(faixaAtual(faixas, 90000)).toBeUndefined()
  })
})

describe('liberação do próximo episódio', () => {
  it('conta o que falta e zera depois do horário', async () => {
    await carregar(7, resposta(600_000))
    expect(segundosParaLiberar(7, 2, 0)).toBe(600)
    expect(segundosParaLiberar(7, 2, 600_000)).toBe(0)
    expect(segundosParaLiberar(7, 1, 0)).toBe(0) // já marcado: não muda nada
    expect(segundosParaLiberar(8, 2, 0)).toBe(0) // sem maratona
  })

  it('a marcação aceita empurra o próximo horário na hora', async () => {
    await carregar(9, resposta(0))
    anotarMarcacao(9, 2, { status: 'ativa', marcados: 2, total: 12 }, 1_000_000)
    expect(segundosParaLiberar(9, 3, 1_000_000)).toBe(1296)
    anotarMarcacao(9, 3, { status: 'falhou', motivo: 'cedo', marcados: 2, total: 12 }, 1_000_000)
    expect(segundosParaLiberar(9, 4, 1_000_000)).toBe(0)
  })
})

describe('mensagemDaMaratona', () => {
  it('avisa conclusão e perda; em andamento fica quieta', () => {
    expect(mensagemDaMaratona({ status: 'concluida', marcados: 12, total: 12, ouro: 360, bilhetes: 3, xp: 180, anicoins: 120 })?.texto).toContain('+360 Ouro')
    expect(mensagemDaMaratona({ status: 'falhou', motivo: 'cedo', marcados: 3, total: 12 })?.tipo).toBe('error')
    expect(mensagemDaMaratona({ status: 'ativa', marcados: 3, total: 12 })).toBeNull()
    expect(mensagemDaMaratona(null)).toBeNull()
  })
})

describe('pacoteEmTexto', () => {
  it('omite moeda zerada e usa singular no bilhete', () => {
    expect(pacoteEmTexto({ ouro: 144, xp: 0, anicoins: 48, bilhetes: 1 })).toBe('+144 Ouro · +48 AniCoins · +1 bilhete')
  })
})
