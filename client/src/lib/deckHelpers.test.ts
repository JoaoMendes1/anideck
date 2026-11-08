import { describe, it, expect } from 'vitest'
import { reconciliarStatusDeck, getAiringBadge } from './deckHelpers'

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
