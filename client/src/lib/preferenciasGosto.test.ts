import { describe, it, expect } from 'vitest'
import {
  selecionarGenerosRecomendados,
  filtrarRecomendacoesPorGosto,
  type PreferenciasDeGosto,
} from './preferenciasGosto'

describe('selecionarGenerosRecomendados', () => {
  it('prioriza generos favoritos do usuario e completa com afinidade sem incluir bloqueados', () => {
    const prefs: PreferenciasDeGosto = {
      favoritos: ['Fantasia'],
      bloqueados: ['Terror'],
      tutorialConcluido: true,
    }
    const afinidade = [
      { genre: 'Terror', tier: 'genero' as const, total_watched: 20, media_nota_genero: 9.0 },
      { genre: 'Ficção Científica', tier: 'genero' as const, total_watched: 10, media_nota_genero: 8.8 },
      { genre: 'Seinen', tier: 'demografia' as const, total_watched: 8, media_nota_genero: 8.5 },
      { genre: 'Escolar', tier: 'tag_tematica' as const, total_watched: 30, media_nota_genero: 9.5 },
    ]

    const resultado = selecionarGenerosRecomendados(afinidade, prefs, 3)
    expect(resultado).toEqual(['Fantasia', 'Ficção Científica', 'Seinen'])
  })
})

describe('filtrarRecomendacoesPorGosto', () => {
  it('remove animes ja presentes no deck e animes com generos bloqueados', () => {
    const candidatos = [
      { mal_id: 1, genres: [{ name: 'Fantasia' }, { name: 'Aventura' }] },
      { mal_id: 2, genres: [{ name: 'Terror' }, { name: 'Suspense' }] },
      { mal_id: 3, genres: [{ name: 'Ficção Científica' }] },
      { mal_id: 3, genres: [{ name: 'Ficção Científica' }] },
    ]
    const noDeck = new Set([1])
    const filtrados = filtrarRecomendacoesPorGosto(candidatos, noDeck, ['Terror'])
    expect(filtrados.map(a => a.mal_id)).toEqual([3])
  })
})
