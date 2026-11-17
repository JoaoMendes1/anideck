// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ItemDeAtividade from './ItemDeAtividade'
import type { EventoDeAtividade } from '../../lib/social'

const base: EventoDeAtividade = {
  tipo: 'comentou', quando: '2026-11-17T12:00:00Z', autor: { handle: 'beto', nome: 'Beto', nivel: 15 },
  mal_id: 1, titulo: 'Frieren', episodio: 2,
}

function montar(e: EventoDeAtividade) {
  return render(<MemoryRouter><ul><ItemDeAtividade evento={e} agora={Date.parse('2026-11-17T12:30:00Z')} /></ul></MemoryRouter>)
}

afterEach(cleanup)

describe('ItemDeAtividade', () => {
  it('comentário visível aparece citado e leva à conversa do episódio', () => {
    montar({ ...base, texto: 'Que abertura!' })
    const citacao = screen.getByText('“Que abertura!”')
    expect(citacao.closest('a')?.getAttribute('href')).toBe('/anime/1?aba=conversa&ep=2')
    expect(screen.getByText('Beto').closest('a')?.getAttribute('href')).toBe('/u/beto')
    expect(screen.getByText('há 30 min')).toBeTruthy()
  })
  it('comentário de episódio não visto não mostra texto, só o aviso', () => {
    montar({ ...base, texto_oculto: true })
    expect(screen.getByText(/Assista ao ep 2 para ler, sem spoiler/)).toBeTruthy()
    expect(screen.queryByText(/“/)).toBeNull()
  })
  it('episódios em lote viram uma frase só', () => {
    montar({ ...base, tipo: 'episodios', episodio: 1, episodio_ate: 3 })
    expect(screen.getByText(/assistiu os eps 1 a 3 de/)).toBeTruthy()
    expect(screen.getByText('Frieren')).toBeTruthy()
  })
})
