// client/src/sql/comunidadeAnimes.test.ts
// Testes SQL das funções agregadas da comunidade (#271):
//   - numeros_comunidade_anime: contagens dos 5 status sem expor usuários
//   - animes_em_alta_comunidade: atividade recente (episódios, comentários e
//     reações) ponderada e penalizada por drops recentes, sem expor usuários.
import { describe, expect, it } from 'vitest'
import { criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'

const USER_1 = '11111111-1111-4111-8111-111111111111'
const USER_2 = '22222222-2222-4222-8222-222222222222'
const USER_3 = '33333333-3333-4333-8333-333333333333'
const USER_4 = '44444444-4444-4444-8444-444444444444'
const USER_5 = '55555555-5555-4555-8555-555555555555'

describe('Números da comunidade por anime (#271 + #272)', () => {
  it('mascara contagens entre 1 e 2 como -1, impede dedução por subtração e libera números >= 3 sem expor user_id', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_1, 'user_1')
      await criarUsuarioTeste(db, USER_2, 'user_2')
      await criarUsuarioTeste(db, USER_3, 'user_3')
      await criarUsuarioTeste(db, USER_4, 'user_4')
      await criarUsuarioTeste(db, USER_5, 'user_5')

      // 2 Assistindo/Em Dia, 1 Completo, 1 Dropado, 1 Quero Assistir -> tudo abaixo de 3
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, tipo, status) VALUES
           ($1, 100, 'anime', 'Assistindo'),
           ($2, 100, 'anime', 'Em Dia'),
           ($3, 100, 'anime', 'Completo'),
           ($4, 100, 'anime', 'Dropado'),
           ($5, 100, 'anime', 'Quero Assistir'),
           ($1, 1001, 'manga', 'Completo')`,
        [USER_1, USER_2, USER_3, USER_4, USER_5],
      )

      const resMascarado = await db.query<Record<string, unknown>>(
        `SELECT * FROM public.numeros_comunidade_anime(100)`,
      )
      expect(resMascarado.rows).toEqual([
        {
          mal_id: 100,
          assistindo: -1,
          completo: -1,
          dropado: -1,
          quero_assistir: -1,
          total: 5,
          total_aproximado: false,
        },
      ])

      const chaves = Object.keys(resMascarado.rows[0])
      expect(chaves).not.toContain('user_id')
      expect(chaves).not.toContain('handle')

      // Obra com apenas 1 pessoa no deck -> total também fica -1 ("Menos de 3")
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, tipo, status) VALUES ($1, 101, 'anime', 'Dropado')`,
        [USER_1],
      )
      const umSo = await db.query<Record<string, unknown>>(`SELECT * FROM public.numeros_comunidade_anime(101)`)
      expect(umSo.rows[0]).toMatchObject({ dropado: -1, total: -1, total_aproximado: false })

      // 3 Assistindo + 1 Dropado (= 4 real): apenas 1 categoria < 3 -> total arredondado para 3 (3+) evitando 4 - 3 = 1
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, tipo, status) VALUES
           ($1, 102, 'anime', 'Assistindo'),
           ($2, 102, 'anime', 'Assistindo'),
           ($3, 102, 'anime', 'Em Dia'),
           ($4, 102, 'anime', 'Dropado')`,
        [USER_1, USER_2, USER_3, USER_4],
      )
      const deducaoBloqueada = await db.query<Record<string, unknown>>(`SELECT * FROM public.numeros_comunidade_anime(102)`)
      expect(deducaoBloqueada.rows[0]).toEqual({
        mal_id: 102,
        assistindo: 3,
        completo: 0,
        dropado: -1,
        quero_assistir: 0,
        total: 3,
        total_aproximado: true,
      })

      const vazio = await db.query<Record<string, unknown>>(
        `SELECT * FROM public.numeros_comunidade_anime(999999)`,
      )
      expect(vazio.rows).toEqual([
        {
          mal_id: 999999,
          assistindo: 0,
          completo: 0,
          dropado: 0,
          quero_assistir: 0,
          total: 0,
          total_aproximado: false,
        },
      ])
    } finally {
      await db.close()
    }
  })
})

describe('Animes em alta na comunidade (#271 + #272)', () => {
  it('ranqueia atividade recente, ignora acervo/oculto/antigo e mascara < 3 usuários/drops como -1', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_1, 'user_1')
      await criarUsuarioTeste(db, USER_2, 'user_2')
      await criarUsuarioTeste(db, USER_3, 'user_3')
      await criarUsuarioTeste(db, USER_4, 'user_4')
      await criarUsuarioTeste(db, USER_5, 'user_5')

      // Anime 201: 3 usuários ativos, episódios recentes, 1 comentário visível e 1 reação -> líder
      // Anime 202: 2 usuários ativos com 2 drops recentes -> abaixo de 201 e mascarado (< 3 -> -1)
      // Anime 203: apenas 1 usuário com 1 ep e 3 drops -> pontuação zera e sai da lista
      // Anime 204: só importação antiga / acervo (watched_at NULL) -> não entra em "Em alta"
      // Anime 205: atividade de 30 dias atrás (fora da janela de 14 dias) -> não entra em "Em alta"
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at) VALUES
           ($1, 201, 1, now()), ($2, 201, 1, now()), ($3, 201, 1, now()),
           ($1, 202, 1, now()), ($2, 202, 1, now()),
           ($1, 203, 1, now()),
           ($1, 204, 1, NULL), ($1, 204, 2, NULL),
           ($1, 205, 1, now() - interval '30 days')`,
        [USER_1, USER_2, USER_3],
      )

      await db.query(
        `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto, oculto) VALUES
           ($1, 201, 1, 'Excelente estreia!', false),
           ($2, 201, 1, 'Comentário oculto', true),
           ($1, 202, 1, 'Bom começo', false)`,
        [USER_1, USER_2],
      )

      await db.query(
        `INSERT INTO public.episode_reactions (user_id, mal_id, episode_number, reacao) VALUES
           ($1, 201, 1, 'chorei')`,
        [USER_2],
      )

      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, tipo, status, updated_at) VALUES
           ($1, 202, 'anime', 'Dropado', now()),
           ($2, 202, 'anime', 'Dropado', now()),
           ($1, 203, 'anime', 'Dropado', now()),
           ($2, 203, 'anime', 'Dropado', now()),
           ($3, 203, 'anime', 'Dropado', now())`,
        [USER_3, USER_4, USER_5],
      )

      const res = await db.query<{
        mal_id: number
        pontuacao: number
        usuarios_ativos: number
        episodios_recentes: number
        comentarios_recentes: number
        reacoes_recentes: number
        drops_recentes: number
      }>(`SELECT * FROM public.animes_em_alta_comunidade(14, 12)`)

      const malIds = res.rows.map(r => r.mal_id)
      expect(malIds).toEqual([201, 202])

      expect(res.rows[0]).toMatchObject({
        mal_id: 201,
        usuarios_ativos: 3,
        episodios_recentes: 3,
        comentarios_recentes: 1,
        reacoes_recentes: 1,
        drops_recentes: 0,
      })
      expect(res.rows[0].pontuacao).toBeGreaterThan(res.rows[1].pontuacao)
      expect(res.rows[1].usuarios_ativos).toBe(-1)
      expect(res.rows[1].drops_recentes).toBe(-1)

      const chaves = Object.keys(res.rows[0])
      expect(chaves).not.toContain('user_id')
      expect(chaves).not.toContain('handle')
    } finally {
      await db.close()
    }
  })
})
