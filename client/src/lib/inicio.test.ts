import { describe, expect, it } from 'vitest'
import { continuarAssistindo, estreiasDeHoje, type AnimeResumido } from './inicio'
import { encontrarLacuna } from './lacuna'

const agora = new Date(2026, 9, 31, 12, 0, 0) // 31/10/2026, meio-dia local
const emSegundos = (d: Date) => Math.floor(d.getTime() / 1000)

const anime = (mal_id: number, extra: Partial<AnimeResumido> = {}): AnimeResumido => ({
  mal_id, title: `Anime ${mal_id}`, image_url: '', episodes: 12, ...extra,
})

describe('estreiasDeHoje', () => {
  const animes = {
    1: anime(1, { nextAiringEpisode: { airingAt: emSegundos(new Date(2026, 9, 31, 22, 0)), episode: 5 } }),
    2: anime(2, { nextAiringEpisode: { airingAt: emSegundos(new Date(2026, 9, 31, 8, 30)), episode: 2 } }),
    3: anime(3, { nextAiringEpisode: { airingAt: emSegundos(new Date(2026, 10, 1, 0, 30)), episode: 9 } }),
    4: anime(4, { nextAiringEpisode: { airingAt: emSegundos(new Date(2026, 9, 31, 15, 0)), episode: 1 } }),
  }

  it('lista só o que vai ao ar hoje, em ordem de horário', () => {
    const lista = estreiasDeHoje(
      [{ mal_id: 1, status: 'Assistindo' }, { mal_id: 2, status: 'Em Dia' }, { mal_id: 3, status: 'Assistindo' }],
      animes, agora,
    )
    expect(lista.map(e => e.anime.mal_id)).toEqual([2, 1])
    expect(lista[1].episodio).toBe(5)
  })

  it('ignora completo e dropado', () => {
    expect(estreiasDeHoje([{ mal_id: 4, status: 'Dropado' }, { mal_id: 1, status: 'Completo' }], animes, agora)).toEqual([])
  })

  it('deck vazio ou anime sem dados não quebra', () => {
    expect(estreiasDeHoje([], animes, agora)).toEqual([])
    expect(estreiasDeHoje([{ mal_id: 99, status: 'Assistindo' }], animes, agora)).toEqual([])
  })
})

describe('continuarAssistindo', () => {
  const animes = { 1: anime(1), 2: anime(2, { episodes: 3 }), 3: anime(3, { episodes: 0 }) }

  it('sugere o episódio seguinte ao último marcado, na ordem do progresso', () => {
    const lista = continuarAssistindo(
      [{ mal_id: 3, ultimo_episodio: 40, marcados: 40 }, { mal_id: 1, ultimo_episodio: 4, marcados: 4 }],
      [{ mal_id: 1, status: 'Assistindo' }, { mal_id: 3, status: 'Em Dia' }],
      animes,
    )
    expect(lista.map(c => [c.anime.mal_id, c.proximoEpisodio])).toEqual([[3, 41], [1, 5]])
  })

  it('não sugere anime terminado nem fora do deck', () => {
    const lista = continuarAssistindo(
      [{ mal_id: 2, ultimo_episodio: 3, marcados: 3 }, { mal_id: 1, ultimo_episodio: 1, marcados: 1 }],
      [{ mal_id: 2, status: 'Assistindo' }],
      animes,
    )
    expect(lista).toEqual([])
  })

  it('respeita o limite', () => {
    const progresso = [1, 2, 3].map(id => ({ mal_id: id, ultimo_episodio: 1, marcados: 1 }))
    const entradas = [1, 2, 3].map(id => ({ mal_id: id, status: 'Assistindo' }))
    expect(continuarAssistindo(progresso, entradas, animes, 2)).toHaveLength(2)
  })

  it('sinaliza bloqueadoPorLancamento para episódio futuro e semEpisodios quando episodes <= 0', () => {
    const catalogo = {
      10: anime(10, { episodes: 26, nextAiringEpisode: { airingAt: 9999999999, episode: 20 } }),
      11: anime(11, { episodes: 0 }),
    }
    const lista = continuarAssistindo(
      [{ mal_id: 10, ultimo_episodio: 19, marcados: 19 }, { mal_id: 11, ultimo_episodio: 6, marcados: 6 }],
      [{ mal_id: 10, status: 'Assistindo' }, { mal_id: 11, status: 'Assistindo' }],
      catalogo,
    )
    expect(lista[0].bloqueadoPorLancamento).toBe(true)
    expect(lista[0].semEpisodios).toBe(false)
    expect(lista[1].semEpisodios).toBe(true)
  })
})

describe('encontrarLacuna', () => {
  const afinidade = [
    { genre: 'Ação', tier: 'genero' as const, total_watched: 10, media_nota_genero: 7 },
    { genre: 'Mecha', tier: 'genero' as const, total_watched: 2, media_nota_genero: 9.5 },
    { genre: 'Drama', tier: 'genero' as const, total_watched: 4, media_nota_genero: 8.5 },
    { genre: 'Escolar', tier: 'tag_tematica' as const, total_watched: 2, media_nota_genero: 10 },
  ]

  it('escolhe o rótulo de nota mais alta entre os pouco assistidos', () => {
    expect(encontrarLacuna(afinidade, 8)).toEqual({ rotulo: 'Mecha', nota: 9.5, vistos: 2, mediaPessoal: 8 })
  })

  it('não conclui com um anime só no rótulo', () => {
    const umSo = afinidade.map(a => (a.genre === 'Mecha' ? { ...a, total_watched: 1 } : a))
    expect(encontrarLacuna(umSo, 8)?.rotulo).toBe('Drama')
  })

  it('sem nota média ou com poucos rótulos, não mostra o bloco', () => {
    expect(encontrarLacuna(afinidade, 0)).toBeNull()
    expect(encontrarLacuna(afinidade.slice(0, 2), 8)).toBeNull()
  })

  it('sem rótulo acima da média, não há buraco', () => {
    expect(encontrarLacuna(afinidade, 9.8)).toBeNull()
  })
})
