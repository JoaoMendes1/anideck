// client/src/sql/insigniasMaratona.test.ts
import { describe, it, expect } from 'vitest'
import { criarBancoTeste } from './bancoDeTeste'
import sql143 from '../../../sql/143_insignias_maratona.sql?raw'

const BASE_SQL = `
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES (
  'guilda_insignias',
  '[{"id":"coruja","icone":"🌙","nome":"Coruja da Guilda","descricao":"12 madrugadas","regra":"madrugadas","meta":12,"estilo":"foil"}]'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`

describe('sql/143_insignias_maratona', () => {
  it('adiciona Primeira Maratona e Lenda das Maratonas preservando insígnias existentes e sendo idempotente', async () => {
    const db = await criarBancoTeste({ scriptsExtras: [BASE_SQL] })

    await db.exec(sql143)
    await db.exec(sql143)

    const res = await db.query<{ value: string }>(
      `SELECT value FROM public.app_settings WHERE key = 'guilda_insignias'`,
    )
    const lista = JSON.parse(res.rows[0].value) as Array<{ id: string; regra: string; meta: number }>
    expect(lista).toHaveLength(3)
    expect(lista.map((i) => i.id)).toEqual(['coruja', 'maratonista_1', 'maratonista_5'])
    expect(lista.find((i) => i.id === 'maratonista_1')?.meta).toBe(1)
    expect(lista.find((i) => i.id === 'maratonista_5')?.meta).toBe(5)
  }, 15000)
})
