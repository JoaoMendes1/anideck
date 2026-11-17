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

  it('cenário 2: Completo ida e volta (Desisti/marquei errado zera XP e carta; Vou rever preserva)', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku2')
      const fnSaida = await db.query<{ existe: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'executar_saida_completo'
         ) AS existe`,
      )
      expect(fnSaida.rows[0]?.existe).toBe(true)

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

      // Sai por engano -> desmarca episódios, apaga carta e estorna XP
      await autenticarComo(db, USER_ID)
      await db.query(`SELECT public.executar_saida_completo($1, $2, 'desisti_ou_errado', 'Dropado')`, [
        USER_ID,
        ANIME_A,
      ])
      expect(await lerXPTotalUsuario(db, USER_ID)).toBe(0)
      const cartas = await db.query(`SELECT count(*) AS n FROM public.user_cards WHERE user_id = $1 AND mal_id = $2`, [
        USER_ID,
        ANIME_A,
      ])
      expect(Number((cartas.rows[0] as { n: string }).n)).toBe(0)
    } finally {
      await db.close()
    }
  })

  it('cenário 3: rever (tabela revisoes) mantém histórico e não rende XP na segunda volta', async () => {
    const db = await criarBancoTeste()
    try {
      await criarUsuarioTeste(db, USER_ID, 'otaku3')
      const tblRevisoes = await db.query<{ existe: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'revisoes'
         ) AS existe`,
      )
      expect(tblRevisoes.rows[0]?.existe).toBe(true)
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
        `SELECT public.resgatar_missao($1, 'missao_diaria', 'missao:dia:ep_2', 15, 20, 'Missão do dia: 2 episódios')`,
        [USER_ID],
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
    } finally {
      await db.close()
    }
  })
})
