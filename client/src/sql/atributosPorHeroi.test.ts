// client/src/sql/atributosPorHeroi.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql140 from '../../../sql/140_atributos_por_personagem.sql?raw'

const BASE_RPG_SQL = `
CREATE OR REPLACE FUNCTION public.calcular_nivel_usuario(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT 10;
$$;

CREATE OR REPLACE FUNCTION public.rpg_personagem_existe(p_base TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_base IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio', 'maga_agua',
                    'guerreiro_terra', 'paladina_luz', 'arqueiro_trevas');
$$;

CREATE TABLE IF NOT EXISTS public.rpg_personagens (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  personagem_base TEXT NOT NULL DEFAULT 'espadachim_eter',
  visual_equipado TEXT,
  desbloqueados   TEXT[] NOT NULL DEFAULT ARRAY['espadachim_eter']::TEXT[],
  esquadrao       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  eco_mal_id      INTEGER,
  ultima_troca_em TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rpg_atributos (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  forca         INTEGER NOT NULL DEFAULT 0,
  inteligencia  INTEGER NOT NULL DEFAULT 0,
  constituicao  INTEGER NOT NULL DEFAULT 0,
  agilidade     INTEGER NOT NULL DEFAULT 0,
  destreza      INTEGER NOT NULL DEFAULT 0,
  sorte         INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rpg_recursos (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bilhetes      INTEGER NOT NULL DEFAULT 0,
  ouro          INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rpg_itens (
  id                   TEXT PRIMARY KEY,
  slot                 TEXT NOT NULL,
  nome                 TEXT NOT NULL,
  descricao            TEXT NOT NULL DEFAULT '',
  raridade             TEXT NOT NULL DEFAULT 'comum',
  vida                 INTEGER NOT NULL DEFAULT 0,
  ataque               INTEGER NOT NULL DEFAULT 0,
  defesa               INTEGER NOT NULL DEFAULT 0,
  nivel_minimo         INTEGER NOT NULL DEFAULT 1,
  magia                INTEGER NOT NULL DEFAULT 0,
  velocidade           INTEGER NOT NULL DEFAULT 0,
  critico_por_mil      INTEGER NOT NULL DEFAULT 0,
  dano_critico         INTEGER NOT NULL DEFAULT 150,
  esquiva_por_mil      INTEGER NOT NULL DEFAULT 0,
  classes              TEXT[],
  personagem_exclusivo TEXT,
  conjunto             TEXT,
  elemento             TEXT,
  ativo                BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id       UUID NOT NULL,
  item_id       TEXT NOT NULL,
  quantidade    INTEGER NOT NULL DEFAULT 1,
  aprimoramento INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.rpg_equipados (
  user_id UUID NOT NULL,
  slot    TEXT NOT NULL,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.rpg_maestria (
  user_id       UUID NOT NULL,
  habilidade_id TEXT NOT NULL,
  usos          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, habilidade_id)
);

CREATE TABLE IF NOT EXISTS public.store_items (
  id     TEXT PRIMARY KEY,
  nome   TEXT NOT NULL,
  estilo TEXT NOT NULL,
  tipo   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_equipped (
  user_id UUID NOT NULL,
  slot    TEXT NOT NULL,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.user_items (
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);
`

describe('sql/140_atributos_por_personagem', () => {
  it('isola atributos por herói, faz backfill só do líder e começa o 2º herói zerado', async () => {
    const db = await criarBancoTeste()
    const u1 = '11111111-1111-4111-8111-111111111111'
    await criarUsuarioTeste(db, u1, 'joao', 'Joao')
    await db.exec(BASE_RPG_SQL)

    // Usuário com espadachim ativo + maga já desbloqueada e build antiga preenchida
    await db.query(
      `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
       VALUES ($1, 'Arthur', 'espadachim_eter', ARRAY['espadachim_eter', 'maga_agua'])`,
      [u1],
    )
    await db.query(
      `INSERT INTO public.rpg_atributos (user_id, forca, constituicao) VALUES ($1, 10, 8)`,
      [u1],
    )

    // Roda duas vezes para validar idempotência
    await db.exec(sql140)
    await db.exec(sql140)

    const { rows: rowsHerois } = await db.query<{ personagem_base: string; forca: number; constituicao: number }>(
      `SELECT personagem_base, forca, constituicao FROM public.rpg_atributos_herois WHERE user_id = $1`,
      [u1],
    )
    expect(rowsHerois).toEqual([{ personagem_base: 'espadachim_eter', forca: 10, constituicao: 8 }])

    await db.exec('SET ROLE authenticated')
    await autenticarComo(db, u1)

    // Configura build específica da maga sem alterar a do espadachim
    const resDist = await db.query<{ res: { ok?: boolean; personagem_base?: string } }>(
      `SELECT public.rpg_distribuir_pontos(0, 12, 2, 4, 0, 0, 'maga_agua') AS res`,
    )
    expect(resDist.rows[0].res).toEqual({ ok: true, personagem_base: 'maga_agua' })

    const resEstado = await db.query<{
      est: {
        pontos: Record<string, number>
        pontos_por_heroi: Record<string, Record<string, number>>
      }
    }>(`SELECT public.rpg_estado_jogador() AS est`)
    expect(resEstado.rows[0].est.pontos).toMatchObject({ forca: 10, constituicao: 8, inteligencia: 0 })
    expect(resEstado.rows[0].est.pontos_por_heroi.maga_agua).toMatchObject({ forca: 0, inteligencia: 12, constituicao: 2, agilidade: 4 })

    // Troca para um 3º herói recém-comprado (arqueiro_trevas) -> começa com rpg_atributos zerado
    await db.exec('RESET ROLE')
    await db.query(
      `UPDATE public.rpg_personagens SET desbloqueados = ARRAY['espadachim_eter', 'maga_agua', 'arqueiro_trevas'] WHERE user_id = $1`,
      [u1],
    )
    await db.exec('SET ROLE authenticated')
    await autenticarComo(db, u1)

    const resTroca = await db.query<{ res: { ok?: boolean; personagem_base?: string } }>(
      `SELECT public.rpg_trocar_personagem('arqueiro_trevas', false) AS res`,
    )
    expect(resTroca.rows[0].res.ok).toBe(true)

    await db.exec('RESET ROLE')
    const { rows: legacyRows } = await db.query<{ forca: number; inteligencia: number; constituicao: number }>(
      `SELECT forca, inteligencia, constituicao FROM public.rpg_atributos WHERE user_id = $1`,
      [u1],
    )
    expect(legacyRows[0]).toEqual({ forca: 0, inteligencia: 0, constituicao: 0 })
  })
})
