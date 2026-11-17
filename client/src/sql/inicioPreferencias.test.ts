// client/src/sql/inicioPreferencias.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'

describe('sql/110_inicio_personalizavel — RLS de user_preferences', () => {
  it('permite salvar e ler apenas as preferências do próprio usuário', async () => {
    const db = await criarBancoTeste()
    const userA = '11111111-1111-4111-8111-111111111111'
    const userB = '22222222-2222-4222-8222-222222222222'
    await criarUsuarioTeste(db, userA, 'usera', 'Usuário A')
    await criarUsuarioTeste(db, userB, 'userb', 'Usuário B')

    await autenticarComo(db, userA)
    await db.exec(`BEGIN`)
    await db.exec(`SET LOCAL ROLE authenticated`)
    await db.query(
      `INSERT INTO public.user_preferences (user_id, inicio_config)
       VALUES ($1, $2::jsonb)`,
      [userA, JSON.stringify({ ordem: ['continuar', 'destaques'], destaque_fonte: 'lancamento' })],
    )
    const proprias = await db.query<{ user_id: string }>(`SELECT user_id FROM public.user_preferences`)
    expect(proprias.rows).toHaveLength(1)
    expect(proprias.rows[0].user_id).toBe(userA)
    await db.exec(`COMMIT`)

    // Usuário B não enxerga nem consegue inserir para Usuário A
    await autenticarComo(db, userB)
    await db.exec(`BEGIN`)
    await db.exec(`SET LOCAL ROLE authenticated`)
    const deOutro = await db.query<{ user_id: string }>(`SELECT user_id FROM public.user_preferences`)
    expect(deOutro.rows).toHaveLength(0)

    await expect(
      db.query(
        `INSERT INTO public.user_preferences (user_id, inicio_config) VALUES ($1, '{}'::jsonb)`,
        [userA],
      ),
    ).rejects.toThrow()
    await db.exec(`ROLLBACK`)

    // Anon não tem permissão nem de leitura nem de escrita
    await db.exec(`BEGIN`)
    await db.exec(`SET LOCAL ROLE anon`)
    await expect(db.query(`SELECT user_id FROM public.user_preferences`)).rejects.toThrow()
    await db.exec(`ROLLBACK`)
  })
})
