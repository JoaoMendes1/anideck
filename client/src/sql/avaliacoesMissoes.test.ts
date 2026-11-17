import { describe, expect, it } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste, lerXPTotalUsuario } from './bancoDeTeste'

const USER_A = '11111111-1111-1111-1111-111111111111'
const USER_B = '22222222-2222-2222-2222-222222222222'
const TEXTO_LONGO_ANIME = 'A'.repeat(110)
const TEXTO_LONGO_EP = 'Excelente episódio com direção impecável e trilha marcante do começo ao fim.'

describe('sql/109 — avaliações públicas e missões com estorno (#276)', () => {
  it('exige Completo e episódio marcado para publicar review pública e preserva anotação privada', async () => {
    const db = await criarBancoTeste()
    await criarUsuarioTeste(db, USER_A, 'ana', 'Ana')
    await criarUsuarioTeste(db, USER_B, 'bia', 'Bia')

    await db.exec(`
      ALTER TABLE public.media_entries ENABLE ROW LEVEL SECURITY;
      CREATE POLICY media_entries_own ON public.media_entries
        FOR ALL TO authenticated
        USING ((SELECT auth.uid()) = user_id)
        WITH CHECK ((SELECT auth.uid()) = user_id);
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_entries TO authenticated;
    `)
    await db.query(
      `INSERT INTO public.curated_animes (mal_id, custom_title, custom_episodes)
       VALUES (100, 'Frieren', '[{"number":1}]'::jsonb)`,
    )
    await db.query(
      `INSERT INTO public.media_entries (user_id, mal_id, tipo, status, anotacao)
       VALUES ($1, 100, 'anime', 'Assistindo', 'Nota privada só minha')`,
      [USER_A],
    )

    await autenticarComo(db, USER_A)
    await db.exec('SET ROLE authenticated')
    await expect(
      db.query(
        `INSERT INTO public.anime_reviews (user_id, mal_id, nota, texto, contem_spoiler)
         VALUES ($1, 100, 9.5, $2, true)`,
        [USER_A, TEXTO_LONGO_ANIME],
      ),
    ).rejects.toThrow()
    await db.exec('RESET ROLE')

    // Marca episódio e move para Completo
    await db.query(
      `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
       VALUES ($1, 100, 1, now())`,
      [USER_A],
    )
    await db.query(
      `UPDATE public.media_entries SET status = 'Completo' WHERE user_id = $1 AND mal_id = 100`,
      [USER_A],
    )

    await autenticarComo(db, USER_A)
    await db.exec('SET ROLE authenticated')

    // Texto curto (< 100 caracteres) falha no CHECK
    await expect(
      db.query(
        `INSERT INTO public.anime_reviews (user_id, mal_id, texto)
         VALUES ($1, 100, 'Muito bom mesmo!')`,
        [USER_A],
      ),
    ).rejects.toThrow()

    // Review válida entra sem tocar na anotacao privada
    const ins = await db.query<{ id: string }>(
      `INSERT INTO public.anime_reviews (user_id, mal_id, nota, texto, contem_spoiler)
       VALUES ($1, 100, 9.5, $2, true)
       RETURNING id`,
      [USER_A, TEXTO_LONGO_ANIME],
    )
    expect(ins.rows[0]?.id).toBeTruthy()
    await db.exec('RESET ROLE')

    // Visitante / outro usuário lê a review pública, não vê anotação privada
    await autenticarComo(db, USER_B)
    await db.exec('SET ROLE authenticated')
    const vis = await db.query<{ texto: string; contem_spoiler: boolean }>(
      `SELECT texto, contem_spoiler FROM public.anime_reviews WHERE mal_id = 100`,
    )
    expect(vis.rows).toHaveLength(1)
    expect(vis.rows[0].contem_spoiler).toBe(true)

    const priv = await db.query(`SELECT anotacao FROM public.media_entries WHERE mal_id = 100`)
    expect(priv.rows).toHaveLength(0)
    await db.exec('RESET ROLE')
  })

  it('estorna XP de avaliar_anime ao apagar, ocultar ou sair de Completo e limita a 1x/dia', async () => {
    const db = await criarBancoTeste()
    await criarUsuarioTeste(db, USER_A, 'ana', 'Ana')
    await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title, episodes) VALUES (200, 'Solo Leveling', 12)`)
    await db.query(
      `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
       VALUES ($1, 200, 1, now())`,
      [USER_A],
    )
    await db.query(
      `INSERT INTO public.media_entries (user_id, mal_id, tipo, status)
       VALUES ($1, 200, 'anime', 'Completo')`,
      [USER_A],
    )
    const rev = await db.query<{ id: string }>(
      `INSERT INTO public.anime_reviews (user_id, mal_id, nota, texto)
       VALUES ($1, 200, 8.5, $2)
       RETURNING id`,
      [USER_A, TEXTO_LONGO_ANIME],
    )
    const revId = rev.rows[0].id
    const xpAntes = await lerXPTotalUsuario(db, USER_A)

    const agora = new Date()
    const detalhe = {
      tipo: 'avaliar_anime',
      meta: 1,
      periodo_inicio: new Date(agora.getTime() - 3600_000).toISOString(),
      periodo_fim: new Date(agora.getTime() + 3600_000).toISOString(),
      evidencias: [{ tipo_acao: 'review_anime', review_id: revId, mal_id: 200 }],
    }

    const r1 = await db.query<{ res: { ja_resgatada: boolean; xp: number } }>(
      `SELECT public.resgatar_missao($1, 'missao_diaria', 'missao:2026-11-17:avaliar_obra', 30, 25, 'Missão do dia: Crítica da Obra', $2::jsonb) AS res`,
      [USER_A, JSON.stringify(detalhe)],
    )
    expect(r1.rows[0].res.ja_resgatada).toBe(false)
    expect(r1.rows[0].res.xp).toBe(25)
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes + 25)

    // Segunda tentativa no mesmo dia com outra referência é barrada
    const r2 = await db.query<{ res: { ja_resgatada: boolean; limite_diario?: boolean } }>(
      `SELECT public.resgatar_missao($1, 'missao_diaria', 'missao:2026-11-17:avaliar_obra_extra', 30, 25, 'Outra crítica', $2::jsonb) AS res`,
      [USER_A, JSON.stringify(detalhe)],
    )
    expect(r2.rows[0].res.ja_resgatada).toBe(true)
    expect(r2.rows[0].res.limite_diario).toBe(true)

    // Sair de Completo estorna o XP da missão imediatamente
    await db.query(`UPDATE public.media_entries SET status = 'Assistindo' WHERE user_id = $1 AND mal_id = 200`, [USER_A])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes)

    // Voltar a Completo dentro do mesmo período restaura sem duplicar
    await db.query(`UPDATE public.media_entries SET status = 'Completo' WHERE user_id = $1 AND mal_id = 200`, [USER_A])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes + 25)

    // Apagar a review estorna em definitivo
    await db.query(`DELETE FROM public.anime_reviews WHERE id = $1`, [revId])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes)
  })

  it('estorna XP de avaliar_episodio ao encurtar comentário abaixo de 60 caracteres ou apagar', async () => {
    const db = await criarBancoTeste()
    await criarUsuarioTeste(db, USER_A, 'ana', 'Ana')
    await db.query(
      `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
       VALUES ($1, 300, 1, now())`,
      [USER_A],
    )
    const com = await db.query<{ id: string }>(
      `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto)
       VALUES ($1, 300, 1, $2)
       RETURNING id`,
      [USER_A, TEXTO_LONGO_EP],
    )
    const comId = com.rows[0].id
    const xpAntes = await lerXPTotalUsuario(db, USER_A)

    const agora = new Date()
    const detalhe = {
      tipo: 'avaliar_episodio',
      meta: 1,
      periodo_inicio: new Date(agora.getTime() - 3600_000).toISOString(),
      periodo_fim: new Date(agora.getTime() + 3600_000).toISOString(),
      evidencias: [{ tipo_acao: 'comentario', comment_id: comId, mal_id: 300, episode_number: 1 }],
    }

    const res = await db.query<{ res: { xp: number } }>(
      `SELECT public.resgatar_missao($1, 'missao_diaria', 'missao:2026-11-17:avaliar_episodio', 25, 15, 'Missão do dia: Análise de Episódio', $2::jsonb) AS res`,
      [USER_A, JSON.stringify(detalhe)],
    )
    expect(res.rows[0].res.xp).toBe(15)
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes + 15)

    // Encurtar abaixo de 60 caracteres dispara estorno
    await db.query(`UPDATE public.episode_comments SET texto = 'Curto demais agora' WHERE id = $1`, [comId])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes)

    // Aumentar de novo no mesmo dia restaura
    await db.query(`UPDATE public.episode_comments SET texto = $2 WHERE id = $1`, [comId, TEXTO_LONGO_EP])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes + 15)

    // Ocultar na moderação estorna
    await db.query(`UPDATE public.episode_comments SET oculto = true WHERE id = $1`, [comId])
    expect(await lerXPTotalUsuario(db, USER_A)).toBe(xpAntes)
  })
})
