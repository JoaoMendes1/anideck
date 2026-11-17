import { describe, it, expect } from 'vitest'
import { reconciliarStatusDeck, getAiringBadge, obterTextoProximoEp } from './deckHelpers'

describe('reconciliarStatusDeck', () => {
  it('transiciona Em Dia para Assistindo quando há novos episódios lançados', () => {
    const status = reconciliarStatusDeck('Em Dia', {
      ultimoEpisodioAssistido: 6,
      nextAiringEpisode: { episode: 8, airingAt: 9999999999, timeUntilAiring: 100000 }, // último lançado = 7
      statusObra: 'RELEASING',
    })
    expect(status).toBe('Assistindo')
  })

  it('transiciona Em Dia para Assistindo quando acabou de lançar novo episódio', () => {
    const status = reconciliarStatusDeck('Em Dia', {
      ultimoEpisodioAssistido: 6,
      nextAiringEpisode: { episode: 7, airingAt: 9999999999, timeUntilAiring: 600000 }, // > 518400 -> acabouDeLancar
      statusObra: 'RELEASING',
    })
    expect(status).toBe('Assistindo')
  })

  it('preserva Em Dia se o usuário já assistiu todos os lançados e não acabou de sair novo', () => {
    const status = reconciliarStatusDeck('Em Dia', {
      ultimoEpisodioAssistido: 6,
      nextAiringEpisode: { episode: 7, airingAt: 9999999999, timeUntilAiring: 200000 }, // não acabouDeLancar
      statusObra: 'RELEASING',
    })
    expect(status).toBe('Em Dia')
  })

  it('transiciona Assistindo para Em Dia quando alcança o último episódio lançado de anime em exibição', () => {
    const status = reconciliarStatusDeck('Assistindo', {
      ultimoEpisodioAssistido: 6,
      nextAiringEpisode: { episode: 7, airingAt: 9999999999, timeUntilAiring: 200000 }, // último lançado = 6
      statusObra: 'RELEASING',
    })
    expect(status).toBe('Em Dia')
  })

  it('mantém Assistindo se a obra já finalizou (não vai para Em Dia)', () => {
    const status = reconciliarStatusDeck('Assistindo', {
      ultimoEpisodioAssistido: 12,
      totalDisponivel: 12,
      statusObra: 'FINISHED',
    })
    expect(status).toBe('Assistindo')
  })

  it('preserva outros status inalterados (Completo, Quero Assistir, Dropado)', () => {
    expect(reconciliarStatusDeck('Completo', { ultimoEpisodioAssistido: 5, totalDisponivel: 12 })).toBe('Completo')
    expect(reconciliarStatusDeck('Quero Assistir', { ultimoEpisodioAssistido: 0, totalDisponivel: 12 })).toBe('Quero Assistir')
    expect(reconciliarStatusDeck('Dropado', { ultimoEpisodioAssistido: 2, totalDisponivel: 12 })).toBe('Dropado')
  })
})

describe('getAiringBadge', () => {
  it('retorna falso quando nextAiringEpisode é indefinido', () => {
    expect(getAiringBadge(undefined)).toEqual({
      acabouDeLancar: false,
      lancaHoje: false,
      lancaAmanha: false,
    })
  })

  it('detecta acabouDeLancar quando faltam mais de 6 dias para o próximo', () => {
    const badge = getAiringBadge({ episode: 5, airingAt: Math.floor(Date.now() / 1000) + 550000, timeUntilAiring: 550000 })
    expect(badge.acabouDeLancar).toBe(true)
  })
})

describe('obterTextoProximoEp', () => {
  it('exibe "hoje" quando o lançamento é no mesmo dia civil local', () => {
    const agora = new Date(2026, 10, 16, 14, 0, 0) // 16/11/2026 14:00 local
    const lancamento = new Date(2026, 10, 16, 19, 0, 0) // 16/11/2026 19:00 local (+5h)
    const texto = obterTextoProximoEp(
      { episode: 6, airingAt: Math.floor(lancamento.getTime() / 1000) },
      Math.floor(agora.getTime() / 1000),
    )
    expect(texto).toBe('EP 6 hoje (~5h)')
  })

  it('exibe "amanhã" mesmo faltando menos de 24h quando o lançamento já cai no dia civil seguinte', () => {
    const agora = new Date(2026, 10, 16, 17, 0, 0) // 16/11/2026 17:00 local
    const lancamento = new Date(2026, 10, 17, 11, 0, 0) // 17/11/2026 11:00 local (+18h, dia seguinte)
    const texto = obterTextoProximoEp(
      { episode: 6, airingAt: Math.floor(lancamento.getTime() / 1000) },
      Math.floor(agora.getTime() / 1000),
    )
    expect(texto).toBe('EP 6 amanhã (~18h)')
  })
})


import { obterTextoProximoEp as textoCurto } from './deckHelpers'
import { describe as d2, expect as e2, it as i2 } from 'vitest'

d2('obterTextoProximoEp no cartão', () => {
  i2('dia da semana sem "-feira", para caber no celular', () => {
    const agora = Date.parse('2026-11-16T12:00:00-03:00') / 1000
    const segunda = Date.parse('2026-11-23T12:00:00-03:00') / 1000
    const texto = textoCurto({ airingAt: segunda, episode: 8 }, agora)
    e2(texto).toBe('EP 8 • Toda segunda')
  })
})
