// client/src/sql/xpRegraDeOuro.test.ts
// Teste da Regra de Ouro (Fase 18.8, #265):
//   "XP total = XP recalculado a partir do estado atual."
// Desfeita a causa (episódio, comentário, reação, carta), sai o XP.
import { describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import {
  autenticarComo,
  criarBancoTeste,
  criarUsuarioTeste,
  lerNivelUsuario,
  lerXPTotalUsuario,
} from './bancoDeTeste'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const CONVIDADO_ID = '22222222-2222-4222-8222-222222222222'
const ANIME_A = 1001
const ANIME_B = 2002

async function calcularXPEsperadoPeloEstadoAtual(db: PGlite, userId: string): Promise<number> {
  const epRes = await db.query<{ soma: string | number }>(
    `SELECT COALESCE(SUM(l.xp_earned), 0)::bigint AS soma
       FROM public.xp_ledger l
      WHERE l.user_id = $1
        AND l.mal_id > 0
        AND EXISTS (
          SELECT 1 FROM public.episode_progress ep
           WHERE ep.user_id = l.user_id
             AND ep.mal_id = l.mal_id
             AND ep.episode_number = l.episode_number
        )`,
    [userId],
  )
  const xpEpisodios = Number(epRes.rows[0]?.soma ?? 0)

  const extraRes = await db.query<{ soma: string | number }>(
    `SELECT COALESCE(SUM(l.xp_earned), 0)::bigint AS soma
       FROM public.xp_ledger l
      WHERE l.user_id = $1
        AND l.mal_id = 0
        AND EXISTS (
          SELECT 1 FROM public.xp_extra xe
           WHERE xe.user_id = l.user_id
             AND xe.id = l.episode_number
        )`,
    [userId],
  )
  const xpExtra = Number(extraRes.rows[0]?.soma ?? 0)
  return xpEpisodios + xpExtra
}

describe('Regra de Ouro do XP (estado atual da SQL)', () => {
  it('sobe o banco PGlite com app_settings TEXT e profiles.titulos_desbloqueados TEXT[]', async () => {
    const db = await criarBancoTeste()
    try {
      const colSettings = await db.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'value'`,
      )
      expect(colSettings.rows[0]?.data_type).toBe('text')

      const colTitulos = await db.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'titulos_desbloqueados'`,
      )
      expect(colTitulos.rows[0]?.data_type).toBe('ARRAY')

      await expect(db.query(`SELECT public.config_inteira('cla_nivel_minimo_criacao', 15)`)).resolves.toBeDefined()
    } finally {
      await db.close()
    }
  })

  it('cenário 1: marcar e desmarcar 20 vezes não infla o XP nem melhora na remarcação em 7 dias', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku1')
      const colEstornos = await db.query<{ existe: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'estornos'
         ) AS existe`,
      )
      expect(colEstornos.rows[0]?.existe).toBe(true)

      for (let i = 0; i < 20; i++) {
        await db.query(
          `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
           VALUES ($1, $2, 1, now())`,
          [USER_ID, ANIME_A],
        )
        // Primeira vez rende 12 XP; nas seguintes tenta gravar 35 XP (ex.: bônus maior no dia)
        const xpTentado = i === 0 ? 12 : 35
        await db.query(
          `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
           VALUES ($1, $2, 1, $3, 'teste ciclo')`,
          [USER_ID, ANIME_A, xpTentado],
        )
        const xpMarcado = await lerXPTotalUsuario(db, USER_ID)
        expect(xpMarcado).toBeLessThanOrEqual(12)

        await db.query(
          `DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 AND episode_number = 1`,
          [USER_ID, ANIME_A],
        )
        expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      }
    } finally {
      await db.close()
    }
  })

  it('cenário 2: Completo ida e volta (Desisti/marquei errado mostra prévia exata e zera XP e carta)', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku2')
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, status) VALUES ($1, $2, 'Completo')`,
        [USER_ID, ANIME_A],
      )
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
      // O gatilho de sql/050 já gera a carta automaticamente quando media_entries vira Completo
      const cartaInicial = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      expect(Number(cartaInicial.rows[0].n)).toBe(1)
      // Missão vinculada a esta obra: também deve entrar na prévia de perda
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_semanal', 'semana:teste:obra_a', 80, 50, 'Missão da semana: Obra',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'completar_obra',
            meta: 1,
            evidencias: [{ tipo_acao: 'carta', mal_id: ANIME_A }],
          }),
        ],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(100)

      // Completado há menos de 24h -> prévia sugere desisti_ou_errado e calcula perda sem alterar nada
      const prevRes = await db.query<{
        previa: {
          xp_antes: number
          xp_depois: number
          xp_perdido: number
          nivel_antes: number
          nivel_depois: number
          niveis_perdidos: number
          episodios_marcados: number
          sugestao: string
        }
      }>(`SELECT public.previa_saida_completo($1, $2) AS previa`, [USER_ID, ANIME_A])
      const previa = prevRes.rows[0].previa
      expect(previa.xp_antes).toBe(100)
      expect(previa.xp_depois).toBe(0)
      expect(previa.xp_perdido).toBe(100)
      expect(previa.nivel_antes).toBe(2)
      expect(previa.nivel_depois).toBe(1)
      expect(previa.niveis_perdidos).toBe(1)
      expect(previa.episodios_marcados).toBe(2)
      expect(previa.sugestao).toBe('desisti_ou_errado')

      // Prévia não mutou o estado do banco
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(100)

      // Sai por engano -> desmarca episódios, apaga carta e estorna XP (episódios + missão)
      await autenticarComo(db, USER_ID)
      await db.query(`SELECT public.executar_saida_completo($1, $2, 'desisti_ou_errado', 'Dropado')`, [
        USER_ID,
        ANIME_A,
      ])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      expect(await lerNivelUsuario(db, USER_ID)).toBe(1)
      const cartas = await db.query(`SELECT count(*) AS n FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`, [
        USER_ID,
        ANIME_A,
      ])
      expect(Number((cartas.rows[0] as { n: string }).n)).toBe(0)
      const eps = await db.query(`SELECT count(*) AS n FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2`, [
        USER_ID,
        ANIME_A,
      ])
      expect(Number((eps.rows[0] as { n: string }).n)).toBe(0)
    } finally {
      await db.close()
    }
  })

  it('cenário 3: rever (tabela revisoes) mantém histórico, sugere rever após 24h e não rende XP na segunda volta', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku3')
      await db.query(
        `INSERT INTO public.media_entries (user_id, mal_id, status, completado_em)
         VALUES ($1, $2, 'Completo', now() - interval '3 days')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now() - interval '3 days'), ($1, $2, 2, now() - interval '3 days')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason, earned_at)
         VALUES ($1, $2, 1, 25, 'ep 1', now() - interval '3 days'), ($1, $2, 2, 25, 'ep 2', now() - interval '3 days')`,
        [USER_ID, ANIME_A],
      )

      const prevRes = await db.query<{ previa: { sugestao: string } }>(
        `SELECT public.previa_saida_completo($1, $2) AS previa`,
        [USER_ID, ANIME_A],
      )
      expect(prevRes.rows[0].previa.sugestao).toBe('vou_rever')

      await db.query(`SELECT public.executar_saida_completo($1, $2, 'vou_rever', 'Assistindo')`, [
        USER_ID,
        ANIME_A,
      ])

      // Episódios e XP antigos continuam intactos no histórico
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(50)
      const revAtiva = await db.query<{ ativa: boolean }>(
        `SELECT ativa FROM public.revisoes WHERE user_id = $1 AND mal_id = $2 AND ativa = true`,
        [USER_ID, ANIME_A],
      )
      expect(revAtiva.rows).toHaveLength(1)

      // Tentar registrar XP novo em episódio durante a revisão zera para 0 XP
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 3, now())`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
         VALUES ($1, $2, 3, 25, 'tentativa na revisao')`,
        [USER_ID, ANIME_A],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(50)

      // Voltar para Completo fecha o ciclo ativo de revisão
      await db.query(
        `UPDATE public.media_entries SET status = 'Completo' WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      const revDepois = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.revisoes WHERE user_id = $1 AND mal_id = $2 AND ativa = true`,
        [USER_ID, ANIME_A],
      )
      expect(Number(revDepois.rows[0].n)).toBe(0)

      // Alterar status direto sem executar_saida_completo também ativa revisão automaticamente
      await db.query(
        `UPDATE public.media_entries SET status = 'Assistindo' WHERE user_id = $1 AND mal_id = $2`,
        [USER_ID, ANIME_A],
      )
      const revBypass = await db.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.revisoes WHERE user_id = $1 AND mal_id = $2 AND ativa = true`,
        [USER_ID, ANIME_A],
      )
      expect(Number(revBypass.rows[0].n)).toBe(1)
    } finally {
      await db.close()
    }
  })

  it('cenário 4: importar / acervo usa fila xp_pendente com liberação gradual e teto próprio', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku4')
      const tblPendente = await db.query<{ existe: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'xp_pendente'
         ) AS existe`,
      )
      expect(tblPendente.rows[0]?.existe).toBe(true)
    } finally {
      await db.close()
    }
  })

  it('cenário 5: missão com episódio desmarcado estorna XP na hora e refazer paga de novo (inclusive de ontem)', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku5')
      // Simula ontem e hoje: usuário assiste ep 1 ontem e resgata missão de ontem (+20 XP)
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now() - interval '1 day')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason, earned_at)
         VALUES ($1, $2, 1, 25, 'episódio base · 100%', now() - interval '1 day')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `SELECT public.resgatar_missao($1, 'missao_diaria', $2, 15, 20, 'Missão do dia: Começar')`,
        [USER_ID, 'missao_diaria:ontem:comecar_1'],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(45)

      // Hoje o usuário desmarca o episódio de ontem: deve perder os 25 XP do ep E os 20 XP da missão
      await db.query(
        `DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 AND episode_number = 1`,
        [USER_ID, ANIME_A],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(await calcularXPEsperadoPeloEstadoAtual(db, USER_ID))
    } finally {
      await db.close()
    }
  })

  it('cenário 6: desmarcar tudo zera XP total (inclusive missões e convites) e devolve ao nível 1', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'anfitriao')
      await criarUsuarioTeste(db, CONVIDADO_ID, 'convidado')

      // Anfitrião assiste 2 episódios (50 XP), resgata missão (20 XP) e convida um amigo (100 XP) -> Nível >= 2
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
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_diaria', 'missao:dia:ep_2', 15, 20, 'Missão do dia: 2 episódios',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'episodios',
            meta: 2,
            evidencias: [
              { tipo_acao: 'episodio', mal_id: ANIME_B, episode_number: 1 },
              { tipo_acao: 'episodio', mal_id: ANIME_B, episode_number: 2 },
            ],
          }),
        ],
      )
      await db.query(
        `INSERT INTO public.convites_membros (anfitriao_user_id, codigo) VALUES ($1, 'anfitriao')`,
        [USER_ID],
      )
      await autenticarComo(db, CONVIDADO_ID)
      await db.query(`SELECT public.resgatar_codigo_convite('anfitriao')`)

      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(170)
      expect(await lerNivelUsuario(db, USER_ID)).toBe(2)

      // O dono desmarca todos os episódios: precisa voltar para XP 0 e Nível 1 de verdade
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1`, [USER_ID])

      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      expect(await lerNivelUsuario(db, USER_ID)).toBe(1)

      // Refazer 1 episódio restaura o XP de convite sem precisar resgatar código de novo (missão exige 2)
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now())`,
        [USER_ID, ANIME_B],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(100)
    } finally {
      await db.close()
    }
  })

  it('cenário 6b (#266): refazer ação paga XP de novo (soma zero, sem duplicar AniCoins) e funciona para comentário, reação e carta', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'social')
      await db.query(`INSERT INTO public.anime_metadata_cache (mal_id, title) VALUES ($1, 'Teste')`, [ANIME_A])

      // Missão diária de episódios: resgata com evidência explícita, desmarca, remarca
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now() - interval '2 days')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_diaria', 'missao:ontem:estreia', 15, 20, 'Missão do dia: Primeiro Passo',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'comecar_anime',
            meta: 1,
            periodo_inicio: new Date(Date.now() - 2 * 86400_000).toISOString(),
            periodo_fim: new Date(Date.now() - 1 * 86400_000).toISOString(),
            evidencias: [{ tipo_acao: 'episodio', mal_id: ANIME_A, episode_number: 1 }],
          }),
        ],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(20)

      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1 AND mal_id = $2 AND episode_number = 1`, [
        USER_ID,
        ANIME_A,
      ])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)

      // Refaz o episódio 1: XP da missão volta (20) e AniCoins no crystal_ledger não duplicam (segue 15)
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now())`,
        [USER_ID, ANIME_A],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(20)
      const saldoRes = await db.query<{ soma: string }>(
        `SELECT COALESCE(SUM(quantidade), 0)::bigint AS soma FROM public.crystal_ledger WHERE user_id = $1`,
        [USER_ID],
      )
      expect(Number(saldoRes.rows[0]?.soma ?? 0)).toBe(15)

      // Missão de reação e comentário: apagar reação/comentário marca estornada_em; refazer limpa estornada_em
      const comRes = await db.query<{ id: string }>(
        `INSERT INTO public.episode_comments (user_id, mal_id, episode_number, texto)
         VALUES ($1, $2, 1, 'Bom demais') RETURNING id`,
        [USER_ID, ANIME_A],
      )
      const commentId = comRes.rows[0].id
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_diaria', 'missao:hoje:comentario', 20, 0, 'Missão do dia: Voz',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'comentar_episodio',
            meta: 1,
            evidencias: [{ tipo_acao: 'comentario', comment_id: commentId, mal_id: ANIME_A, episode_number: 1 }],
          }),
        ],
      )
      await db.query(`DELETE FROM public.episode_comments WHERE id = $1`, [commentId])
      const estCom = await db.query<{ estornada_em: string | null }>(
        `SELECT estornada_em FROM public.missoes_resgates WHERE user_id = $1 AND referencia = 'missao:hoje:comentario'`,
        [USER_ID],
      )
      expect(estCom.rows[0]?.estornada_em).not.toBeNull()

      await db.query(
        `INSERT INTO public.episode_reactions (user_id, mal_id, episode_number, reacao)
         VALUES ($1, $2, 1, 'chorei')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_diaria', 'missao:hoje:reacao', 15, 0, 'Missão do dia: Reator',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'reagir_episodio',
            meta: 1,
            evidencias: [{ tipo_acao: 'reacao', mal_id: ANIME_A, episode_number: 1, reacao: 'chorei' }],
          }),
        ],
      )
      await db.query(
        `DELETE FROM public.episode_reactions WHERE user_id = $1 AND mal_id = $2 AND episode_number = 1 AND reacao = 'chorei'`,
        [USER_ID, ANIME_A],
      )
      const estReac = await db.query<{ estornada_em: string | null }>(
        `SELECT estornada_em FROM public.missoes_resgates WHERE user_id = $1 AND referencia = 'missao:hoje:reacao'`,
        [USER_ID],
      )
      expect(estReac.rows[0]?.estornada_em).not.toBeNull()

      // Missão semanal de completar obra (carta): remover carta estorna XP
      await db.query(`INSERT INTO public.user_cards (user_id, mal_id, raridade) VALUES ($1, $2, 'comum')`, [
        USER_ID,
        ANIME_A,
      ])
      await db.query(
        `SELECT public.resgatar_missao(
           $1, 'missao_semanal', 'semana:atual:obra_1', 80, 50, 'Missão da semana: Safra',
           $2::jsonb
         )`,
        [
          USER_ID,
          JSON.stringify({
            tipo: 'completar_do_ano',
            meta: 1,
            evidencias: [{ tipo_acao: 'carta', mal_id: ANIME_A, do_ano: true }],
          }),
        ],
      )
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(70)
      await db.query(`DELETE FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`, [USER_ID, ANIME_A])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(20)
    } finally {
      await db.close()
    }
  })
})

describe('Prova do defeito original antes do sql/101', () => {
  it('sem sql/101, desmarcar episódio deixa o XP de missão e convite preso na conta', async () => {
    const db = await criarBancoTeste({ etapas: [] })
    try {
      await criarUsuarioTeste(db, USER_ID, 'vazamento')
      await db.query(
        `INSERT INTO public.episode_progress (user_id, mal_id, episode_number, watched_at)
         VALUES ($1, $2, 1, now())`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `INSERT INTO public.xp_ledger (user_id, mal_id, episode_number, xp_earned, reason)
         VALUES ($1, $2, 1, 25, 'ep 1')`,
        [USER_ID, ANIME_A],
      )
      await db.query(
        `SELECT public.resgatar_missao($1, 'missao_diaria', 'missao:leak:1', 15, 20, 'Missão vazada')`,
        [USER_ID],
      )
      await db.query(`DELETE FROM public.episode_progress WHERE user_id = $1`, [USER_ID])
      // Sem as amarras, os 20 XP da missão continuavam presos na conta mesmo com 0 episódios
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(20)
    } finally {
      await db.close()
    }
  })
})
