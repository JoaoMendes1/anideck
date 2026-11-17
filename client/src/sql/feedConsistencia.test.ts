// client/src/sql/feedConsistencia.test.ts
// Regra de consistência do Feed e do Perfil (#270):
//   "Se a pessoa desfez a ação (episódio, Completo, entrada do deck, comentário
//   ou curtida), o evento some do Feed e do perfil imediatamente."
import { describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste, lerXPTotalUsuario } from './bancoDeTeste'
import sql105 from '../../../sql/105_feed_consistencia_e_limpeza.sql?raw'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const AMIGO_ID = '22222222-2222-4222-8222-222222222222'
const ANIME_A = 1001
const ANIME_B = 2002

interface EventoFeed {
  tipo: string
  mal_id: number
  episodio?: number | null
  episodio_ate?: number | null
  comentario_id?: string | null
}

async function lerFeedGeral(db: PGlite, eu = USER_ID): Promise<EventoFeed[]> {
  const res = await db.query<{ ev: EventoFeed }>(
    `SELECT public.feed_comunidade($1, 'geral', NULL, 50) AS ev`,
    [eu],
  )
  return res.rows.map(r => r.ev)
}

async function lerFeedPerfil(db: PGlite, handle: string, eu = USER_ID): Promise<EventoFeed[]> {
  const res = await db.query<{ ev: EventoFeed }>(
    `SELECT public.atividade_do_perfil($1, $2, NULL, 50) AS ev`,
    [eu, handle],
  )
  return res.rows.map(r => r.ev)
}

async function lerAssistindoPerfil(db: PGlite, handle: string, eu = USER_ID): Promise<{ mal_id: number }[]> {
  const res = await db.query<{ item: { mal_id: number } }>(
    `SELECT public.atividade_assistindo($1, $2) AS item`,
    [eu, handle],
  )
  return res.rows.map(r => r.item)
}

describe('Prova do defeito do Feed antes do sql/105', () => {
  it('sem sql/105, remover entrada ou desmarcar tudo deixava eventos órfãos no feed', async () => {
    const db = await criarBancoTeste({ etapas: ['098', '101', '102', '103', '104'] })
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku_vaza')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES ($1, 'Teste A', 2)`, [
        ANIME_A,
      ])
      await db.query(`INSERT INTO public.media_entries (user_id, mal_id, status) VALUES ($1, $2, 'Completo')`, [
        USER_ID,
        ANIME_A,
      ])
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now()), ($1, $2, 2, now())`,
        [USER_ID, ANIME_A],
      )

      // Sem sql/105, apagar episode_progress deixa 'completou' preso no feed
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2`, [USER_ID, ANIME_A])
      const tipos = (await lerFeedGeral(db)).map(e => e.tipo)
      expect(tipos).toContain('completou')
    } finally {
      await db.close()
    }
  })

  it('backfill do sql/105 preenche Completo antigo sem apagar status/carta, sem XP e respeitando custom_episodes vazio', async () => {
    const db = await criarBancoTeste({ etapas: ['098', '101', '102', '103', '104'] })
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku_legado')
      await db.query(
        `INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES
           ($1, 'Legado Normal', 3),
           ($2, 'Curado Sem Eps', 12)`,
        [ANIME_A, ANIME_B],
      )
      await db.query(
        `INSERT INTO public.curated_animes (mal_id, custom_title, custom_episodes)
         VALUES ($1, 'Curado Sem Eps', '[]'::jsonb)`,
        [ANIME_B],
      )
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, status, created_at)
         VALUES
           ($1, $2, 'Completo', now() - interval '90 days'),
           ($1, $3, 'Completo', now() - interval '10 days')`,
        [USER_ID, ANIME_A, ANIME_B],
      )
      await db.query(
        `INSERT INTO public.user_cards (user_id, mal_id, raridade)
         VALUES ($1, $2, 'comum')
         ON CONFLICT (user_id, mal_id) DO NOTHING`,
        [USER_ID, ANIME_A],
      )

      // Consulta somente leitura para contar quantos Completos sem episódios serão preenchidos
      const contagemPrevia = await db.query<{ afetadas: string }>(
        `SELECT count(*) AS afetadas
           FROM public.media_entries m
          WHERE m.status = 'Completo'
            AND m.tipo = 'anime'
            AND NOT EXISTS (
              SELECT 1 FROM public.episode_progress ep
               WHERE ep.user_id = m.user_id AND ep.mal_id = m.mal_id
            )`,
      )
      expect(Number(contagemPrevia.rows[0].afetadas)).toBe(2)

      // Aplica sql/105 após já existirem entradas antigas
      await db.exec(sql105)

      // Ambas as entradas permanecem Completo e a carta é preservada
      const entries = await db.query<{ mal_id: number; status: string }>(
        `SELECT mal_id, status FROM public.media_entries WHERE user_id = $1 ORDER BY mal_id`,
        [USER_ID],
      )
      expect(entries.rows).toEqual([
        { mal_id: ANIME_A, status: 'Completo' },
        { mal_id: ANIME_B, status: 'Completo' },
      ])

      const cards = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      expect(Number(cards.rows[0].n)).toBe(1)

      // ANIME_A ganhou episódios 1..3 com watched_at NULL; ANIME_B (custom_episodes '[]') ficou sem episódios
      const epsA = await db.query<{ episode_number: number; watched_at: string | null }>(
        `SELECT episode_number, watched_at FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 ORDER BY episode_number`,
        [USER_ID, ANIME_A],
      )
      expect(epsA.rows).toEqual([
        { episode_number: 1, watched_at: null },
        { episode_number: 2, watched_at: null },
        { episode_number: 3, watched_at: null },
      ])

      const epsB = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_B],
      )
      expect(Number(epsB.rows[0].n)).toBe(0)

      // Zero XP ganho e zero fila xp_pendente pelo backfill
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      const pend = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.xp_pendente WHERE user_id = $1`,
        [USER_ID],
      )
      expect(Number(pend.rows[0].n)).toBe(0)
    } finally {
      await db.close()
    }
  })
})

describe('Consistência do Feed e do Perfil (#270)', () => {
  it('desmarcar episódios manualmente ou limpar tudo remove "episodios" e "completou" e limpa a carta', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku_limpo')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES ($1, 'Obra A', 2)`, [
        ANIME_A,
      ])
      await db.query(`INSERT INTO public.media_entries (user_id, mal_id, status) VALUES ($1, $2, 'Completo')`, [
        USER_ID,
        ANIME_A,
      ])
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now()), ($1, $2, 2, now())`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
         VALUES ($1, $2, 1, 25, 'ep 1'), ($1, $2, 2, 25, 'ep 2')`,
        [USER_ID, ANIME_A],
      )

      expect((await lerFeedGeral(db)).map(e => e.tipo).sort()).toEqual(['completou', 'episodios'])
      expect((await lerFeedPerfil(db, 'otaku_limpo')).map(e => e.tipo).sort()).toEqual(['completou', 'episodios'])

      // Desmarcar 1 dos 2: 'episodios' passa a mostrar só ep 1; se desmarcar o último, ambos somem
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 AND episode_number = 2`, [
        USER_ID,
        ANIME_A,
      ])
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 AND episode_number = 1`, [
        USER_ID,
        ANIME_A,
      ])

      expect(await lerFeedGeral(db)).toEqual([])
      expect(await lerFeedPerfil(db, 'otaku_limpo')).toEqual([])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)

      // Status foi rebaixado para 'Quero Assistir' sem criar revisão falsa, e a carta foi removida
      const entryRes = await db.query<{ status: string }>(
        `SELECT status FROM public.media_entries WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      expect(entryRes.rows[0]?.status).toBe('Quero Assistir')

      const revRes = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.revisoes WHERE user_id = $1 AND mal_id = $2 AND ativa = true`,
        [USER_ID, ANIME_A],
      )
      expect(Number(revRes.rows[0].n)).toBe(0)

      const cardsRes = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      expect(Number(cardsRes.rows[0].n)).toBe(0)
    } finally {
      await db.close()
    }
  })

  it('remover a entrada do deck (DELETE em media_entries) apaga episódios, carta, assistindo e XP do feed', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku_deck')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES ($1, 'Obra B', 12)`, [
        ANIME_B,
      ])
      await db.query(`INSERT INTO public.media_entries (user_id, mal_id, status) VALUES ($1, $2, 'Assistindo')`, [
        USER_ID,
        ANIME_B,
      ])
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now()), ($1, $2, 2, now())`,
        [USER_ID, ANIME_B],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
         VALUES ($1, $2, 1, 25, 'ep 1'), ($1, $2, 2, 25, 'ep 2')`,
        [USER_ID, ANIME_B],
      )

      expect(await lerFeedGeral(db)).toHaveLength(1)
      expect(await lerAssistindoPerfil(db, 'otaku_deck')).toHaveLength(1)

      // Usuário clica em "Remover do Deck"
      await db.query(`DELETE FROM public.media_entries WHERE user_id = $1 AND mal_id = $2`, [USER_ID, ANIME_B])

      expect(await lerFeedGeral(db)).toEqual([])
      expect(await lerFeedPerfil(db, 'otaku_deck')).toEqual([])
      expect(await lerAssistindoPerfil(db, 'otaku_deck')).toEqual([])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
    } finally {
      await db.close()
    }
  })

  it('editar nota/anotação de obra Completada há mais de 60 dias não ressuscita "completou" no feed', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku_antigo')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES ($1, 'Clássico', 1)`, [
        ANIME_A,
      ])
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, status, completado_em, updated_at)
         VALUES ($1, $2, 'Completo', now() - interval '90 days', now() - interval '90 days')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at, created_at)
         VALUES ($1, $2, 1, now() - interval '90 days', now() - interval '90 days')`,
        [USER_ID, ANIME_A],
      )

      expect(await lerFeedGeral(db)).toEqual([])

      // Usuário atualiza a nota hoje (isso muda media_entries.updated_at para now())
      await db.query(
        `UPDATE public.media_entries SET nota = 9, updated_at = now() WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      expect(await lerFeedGeral(db)).toEqual([])
    } finally {
      await db.close()
    }
  })

  it('desfazer comentário ou curtida (ou desmarcar o episódio) remove "comentou" e "curtiu" do feed e do perfil', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'autor')
      await criarUsuarioTeste(db, AMIGO_ID, 'curtidor')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES ($1, 'Série X', 12)`, [
        ANIME_A,
      ])

      // Ambos assistem ao episódio 1; autor comenta e amigo curte
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $3, 1, now()), ($2, $3, 1, now())`,
        [USER_ID, AMIGO_ID, ANIME_A],
      )
      const comRes = await db.query<{ id: string }>(
        `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto)
         VALUES ($1, $2, 1, 'Episódio incrível!') RETURNING id`,
        [USER_ID, ANIME_A],
      )
      const commentId = comRes.rows[0].id
      await db.query(`INSERT INTO public.comment_likes (comment_id, user_id) VALUES ($1, $2)`, [commentId, AMIGO_ID])

      expect((await lerFeedGeral(db)).map(e => e.tipo)).toEqual(expect.arrayContaining(['comentou', 'curtiu']))

      // 1) Curtidor remove a curtida -> 'curtiu' some na hora, 'comentou' fica
      await db.query(`DELETE FROM public.comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, AMIGO_ID])
      expect((await lerFeedGeral(db)).map(e => e.tipo)).not.toContain('curtiu')
      expect((await lerFeedPerfil(db, 'curtidor', AMIGO_ID)).map(e => e.tipo)).toEqual(['episodios'])

      // Recoloca curtida e agora o curtidor desmarca todos os episódios dele -> 'curtiu' e 'episodios' somem dele
      await db.query(`INSERT INTO public.comment_likes (comment_id, user_id) VALUES ($1, $2)`, [commentId, AMIGO_ID])
      expect((await lerFeedPerfil(db, 'curtidor', AMIGO_ID)).map(e => e.tipo)).toContain('curtiu')

      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1`, [AMIGO_ID])
      expect(await lerFeedPerfil(db, 'curtidor', AMIGO_ID)).toEqual([])

      // 2) Recoloca progresso do amigo e curtida; autor apaga o comentário -> somem 'comentou' e 'curtiu'
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now())`,
        [AMIGO_ID, ANIME_A],
      )
      await db.query(`DELETE FROM public.episode_comments WHERE id = $1`, [commentId])
      expect((await lerFeedGeral(db)).map(e => e.tipo)).not.toContain('comentou')
      expect((await lerFeedGeral(db)).map(e => e.tipo)).not.toContain('curtiu')

      // 3) Novo comentário do autor: se o autor desmarca o episódio (ou é ocultado), some 'comentou'
      const comRes2 = await db.query<{ id: string }>(
        `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto)
         VALUES ($1, $2, 1, 'Outro comentário') RETURNING id`,
        [USER_ID, ANIME_A],
      )
      expect((await lerFeedPerfil(db, 'autor')).map(e => e.tipo)).toContain('comentou')

      await autenticarComo(db, USER_ID)
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2`, [USER_ID, ANIME_A])
      expect(await lerFeedPerfil(db, 'autor')).toEqual([])
      expect(comRes2.rows[0].id).toBeTruthy()
    } finally {
      await db.close()
    }
  })
})
