import { describe, expect, it } from 'vitest'
import { fraseDoEvento, juntarEventos, linkDoEvento, tempoDoEvento, textoDosEpisodios, type EventoDeAtividade } from './social'

const autor = { handle: 'beto', nome: 'Beto', nivel: 15 }
const ev = (e: Partial<EventoDeAtividade>): EventoDeAtividade => ({ tipo: 'episodios', quando: '2026-11-17T12:00:00Z', autor, mal_id: 1, ...e })

describe('frases do feed', () => {
  it('episódios: um ou um intervalo', () => {
    expect(textoDosEpisodios(5)).toBe('o ep 5')
    expect(textoDosEpisodios(5, 5)).toBe('o ep 5')
    expect(textoDosEpisodios(1, 3)).toBe('os eps 1 a 3')
    expect(fraseDoEvento(ev({ episodio: 1, episodio_ate: 3 }))).toBe('assistiu os eps 1 a 3 de')
  })
  it('completou, comentou e curtiu', () => {
    expect(fraseDoEvento(ev({ tipo: 'completou' }))).toBe('completou')
    expect(fraseDoEvento(ev({ tipo: 'comentou', episodio: 2 }))).toBe('comentou no ep 2 de')
    expect(fraseDoEvento(ev({ tipo: 'curtiu', episodio: 2, alvo_nome: 'Ana' }))).toBe('curtiu um comentário de Ana no ep 2 de')
  })
})

describe('linkDoEvento', () => {
  it('comentário e curtida abrem a conversa do episódio', () => {
    expect(linkDoEvento(ev({ tipo: 'comentou', mal_id: 52991, episodio: 7 }))).toBe('/anime/52991?aba=conversa&ep=7')
    expect(linkDoEvento(ev({ tipo: 'curtiu', mal_id: 52991, episodio: 7 }))).toBe('/anime/52991?aba=conversa&ep=7')
  })
  it('episódios e completos abrem a obra', () => {
    expect(linkDoEvento(ev({ tipo: 'episodios', mal_id: 52991, episodio: 1 }))).toBe('/anime/52991')
    expect(linkDoEvento(ev({ tipo: 'completou', mal_id: 52991 }))).toBe('/anime/52991')
  })
})

describe('tempoDoEvento', () => {
  const agora = Date.parse('2026-11-17T12:00:00Z')
  it('relativo até uma semana, data depois', () => {
    expect(tempoDoEvento('2026-11-17T11:59:40Z', agora)).toBe('agora')
    expect(tempoDoEvento('2026-11-17T11:15:00Z', agora)).toBe('há 45 min')
    expect(tempoDoEvento('2026-11-17T07:00:00Z', agora)).toBe('há 5 h')
    expect(tempoDoEvento('2026-11-16T10:00:00Z', agora)).toBe('há 1 dia')
    expect(tempoDoEvento('2026-11-14T10:00:00Z', agora)).toBe('há 3 dias')
    expect(tempoDoEvento('2026-11-01T10:00:00Z', agora)).toMatch(/01/)
    expect(tempoDoEvento('ontem', agora)).toBe('')
  })
})

describe('juntarEventos', () => {
  it('não repete o que já está na lista', () => {
    const a = ev({ episodio: 1 })
    const b = ev({ episodio: 2, quando: '2026-11-17T11:00:00Z' })
    expect(juntarEventos([a], [a, b])).toEqual([a, b])
  })
})
