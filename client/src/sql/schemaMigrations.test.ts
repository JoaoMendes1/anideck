// client/src/sql/schemaMigrations.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql139 from '../../../sql/139_schema_migrations.sql?raw'

describe('sql/139_schema_migrations', () => {
  it('cria schema_migrations de forma idempotente e bloqueia acesso de authenticated', async () => {
    const db = await criarBancoTeste()
    const u1 = '11111111-1111-4111-8111-111111111111'
    await criarUsuarioTeste(db, u1, 'joao', 'Joao')

    await db.exec(sql139)
    await db.exec(sql139)

    await db.query(
      `INSERT INTO public.schema_migrations (arquivo, checksum) VALUES ('138_masmorra_roguelite.sql', 'baseline')`,
    )

    await db.exec('SET ROLE authenticated')
    await autenticarComo(db, u1)
    await expect(db.query(`SELECT arquivo FROM public.schema_migrations`)).rejects.toThrow()
    await db.exec('RESET ROLE')

    const { rows } = await db.query<{ arquivo: string; checksum: string }>(
      `SELECT arquivo, checksum FROM public.schema_migrations`,
    )
    expect(rows).toEqual([{ arquivo: '138_masmorra_roguelite.sql', checksum: 'baseline' }])
  })
})
