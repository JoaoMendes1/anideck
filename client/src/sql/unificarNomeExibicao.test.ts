// @vitest-environment node
import { describe, expect, it } from 'vitest'
import sql107 from '../../../sql/107_unificar_nome_exibicao.sql?raw'
import { criarBancoTeste } from './bancoDeTeste'

const USER_DIVERGENTE = '00000000-0000-4000-8000-000000000701'
const USER_SEM_PERFIL = '00000000-0000-4000-8000-000000000702'
const USER_SEM_DISPLAY = '00000000-0000-4000-8000-000000000703'

describe('Unificação de Nome de exibição (#273 · sql/107)', () => {
  it('prevalece profiles.nome sobre display_name divergente sem apagar outros metadados', async () => {
    const db = await criarBancoTeste({ etapas: ['098', '101', '102', '103', '104', '105', '106'] })

    await db.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES
         ($1, 'um@teste.local', '{"display_name":"Nome Antigo","avatar_url":"https://img/a.png"}'::jsonb),
         ($2, 'dois@teste.local', '{"display_name":"Só Conta","avatar_url":"https://img/b.png"}'::jsonb),
         ($3, 'tres@teste.local', '{"preferencias_gosto":{"favoritos":["Ação"]}}'::jsonb)`,
      [USER_DIVERGENTE, USER_SEM_PERFIL, USER_SEM_DISPLAY],
    )
    await db.query(
      `INSERT INTO public.profiles (user_id, handle, nome)
       VALUES
         ($1, 'usuario_um', 'Nome do Perfil'),
         ($2, 'usuario_tres', 'Nome Preenchido')`,
      [USER_DIVERGENTE, USER_SEM_DISPLAY],
    )

    await db.exec(sql107)

    const { rows } = await db.query<{ id: string; raw_user_meta_data: Record<string, unknown> }>(
      `SELECT id, raw_user_meta_data FROM auth.users ORDER BY email`,
    )
    const porId = new Map(rows.map((r) => [r.id, r.raw_user_meta_data]))

    expect(porId.get(USER_DIVERGENTE)).toEqual({
      display_name: 'Nome do Perfil',
      avatar_url: 'https://img/a.png',
    })
    expect(porId.get(USER_SEM_PERFIL)).toEqual({
      display_name: 'Só Conta',
      avatar_url: 'https://img/b.png',
    })
    expect(porId.get(USER_SEM_DISPLAY)).toEqual({
      display_name: 'Nome Preenchido',
      preferencias_gosto: { favoritos: ['Ação'] },
    })
  })
})
