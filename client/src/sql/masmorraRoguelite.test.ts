// client/src/sql/masmorraRoguelite.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql138 from '../../../sql/138_masmorra_roguelite.sql?raw'

describe('sql/138_masmorra_roguelite', () => {
  it('salva, atualiza e limpa sessao roguelite com RLS de leitura propria', async () => {
    const db = await criarBancoTeste()
    const u1 = '11111111-1111-4111-8111-111111111111'
    const u2 = '22222222-2222-4222-8222-222222222222'
    await criarUsuarioTeste(db, u1, 'joao', 'Joao')
    await criarUsuarioTeste(db, u2, 'maria', 'Maria')

    await db.exec(sql138)
    await db.exec(sql138)

    const { rows: [r1] } = await db.query<{ res: { ok?: boolean } }>(
      `SELECT public.rpg_roguelite_salvar($1, 'bosque_sombrio', $2, 1, 3, $3::jsonb, $4, $5, 'altar_sangue', $6, $7::jsonb, 15, 'ativa') AS res`,
      [
        u1,
        ['guerreiro_chama', 'arqueira_vento'],
        JSON.stringify([{ base: 'guerreiro_chama', nome: 'Kael', vida_atual: 240, vida_maxima: 300 }]),
        ['furia_carmesim'],
        ['muralha_ferro', 'passo_fantasma', 'vigor_ancestral'],
        ['goblin_batedor'],
        JSON.stringify({ corte_flam: 1 }),
      ],
    )
    expect(r1.res.ok).toBe(true)

    await db.exec('SET ROLE authenticated')
    await autenticarComo(db, u1)
    const proprias = await db.query<{ masmorra_id: string; andar_atual: number; altar_ativo: string | null }>(
      `SELECT masmorra_id, andar_atual, altar_ativo FROM public.rpg_masmorra_sessoes`,
    )
    expect(proprias.rows).toHaveLength(1)
    expect(proprias.rows[0].masmorra_id).toBe('bosque_sombrio')
    expect(proprias.rows[0].andar_atual).toBe(1)
    expect(proprias.rows[0].altar_ativo).toBe('altar_sangue')

    await autenticarComo(db, u2)
    const deOutro = await db.query(`SELECT masmorra_id FROM public.rpg_masmorra_sessoes`)
    expect(deOutro.rows).toHaveLength(0)

    await db.exec('RESET ROLE')
    const { rows: [r2] } = await db.query<{ res: { ok?: boolean } }>(
      `SELECT public.rpg_roguelite_limpar($1) AS res`,
      [u1],
    )
    expect(r2.res.ok).toBe(true)
    const vazia = await db.query<{ total: number }>(`SELECT count(*)::int AS total FROM public.rpg_masmorra_sessoes`)
    expect(vazia.rows[0].total).toBe(0)
  })
})
