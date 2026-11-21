// client/src/sql/trocaGratuita.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql140 from '../../../sql/140_atributos_por_personagem.sql?raw'
import sql141 from '../../../sql/141_troca_personagem_gratuita.sql?raw'

const BASE_SQL = `
CREATE OR REPLACE FUNCTION public.calcular_nivel_usuario(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$ SELECT 10; $$;

CREATE OR REPLACE FUNCTION public.rpg_personagem_existe(p_base TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
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
  nome                 TEXT NOT NULL DEFAULT '',
  descricao            TEXT NOT NULL DEFAULT '',
  raridade             TEXT NOT NULL DEFAULT 'comum',
  vida                 INTEGER NOT NULL DEFAULT 0,
  ataque               INTEGER NOT NULL DEFAULT 0,
  defesa               INTEGER NOT NULL DEFAULT 0,
  nivel_minimo         INTEGER NOT NULL DEFAULT 1,
  ativo                BOOLEAN NOT NULL DEFAULT true,
  magia                INTEGER NOT NULL DEFAULT 0,
  velocidade           INTEGER NOT NULL DEFAULT 0,
  critico_por_mil      INTEGER NOT NULL DEFAULT 0,
  dano_critico         INTEGER NOT NULL DEFAULT 0,
  esquiva_por_mil      INTEGER NOT NULL DEFAULT 0,
  classes              TEXT[],
  personagem_exclusivo TEXT,
  conjunto             TEXT
);

CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id       text NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  quantidade    INTEGER NOT NULL DEFAULT 1,
  aprimoramento INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.rpg_equipados (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot        TEXT NOT NULL,
  item_id     TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  equipado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);
`

describe('sql/141_troca_personagem_gratuita', () => {
  it('permite alternar imediatamente e sem Ouro entre heróis desbloqueados preservando atributos individuais', async () => {
    const db = await criarBancoTeste({ scriptsExtras: [BASE_SQL] })
    const user = '77777777-7777-4777-8777-777777777777'
    await criarUsuarioTeste(db, user, 'ren', 'Ren')

    await db.query(
      `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados, ultima_troca_em)
       VALUES ($1, 'Ren', 'espadachim_eter', ARRAY['espadachim_eter', 'paladina_luz'], now())`,
      [user],
    )
    await db.query(
      `INSERT INTO public.rpg_atributos (user_id, forca, constituicao) VALUES ($1, 10, 4)`,
      [user],
    )
    await db.query(`INSERT INTO public.rpg_recursos (user_id, ouro) VALUES ($1, 10)`, [user])

    await db.exec(sql140)
    await db.exec(sql141)
    await autenticarComo(db, user)

    // Troca imediata mesmo com ultima_troca_em = now() e apenas 10 Ouro
    const t1 = await db.query<{ r: { ok: boolean; trocado: boolean; ouro_gasto: number; personagem_base: string } }>(
      `SELECT public.rpg_trocar_personagem('paladina_luz', false) AS r`,
    )
    expect(t1.rows[0].r.ok).toBe(true)
    expect(t1.rows[0].r.trocado).toBe(true)
    expect(t1.rows[0].r.ouro_gasto).toBe(0)
    expect(t1.rows[0].r.personagem_base).toBe('paladina_luz')

    // Distribui atributos específicos para Paladina e volta imediatamente para o Espadachim de graça
    await db.query(`SELECT public.rpg_distribuir_pontos(0, 0, 12, 0, 0, 0, 'paladina_luz')`)

    const t2 = await db.query<{ r: { ok: boolean; ouro_gasto: number; personagem_base: string } }>(
      `SELECT public.rpg_trocar_personagem('espadachim_eter', true) AS r`,
    )
    expect(t2.rows[0].r.ok).toBe(true)
    expect(t2.rows[0].r.ouro_gasto).toBe(0)
    expect(t2.rows[0].r.personagem_base).toBe('espadachim_eter')

    const saldo = await db.query<{ ouro: number }>(`SELECT ouro FROM public.rpg_recursos WHERE user_id = $1`, [user])
    expect(saldo.rows[0].ouro).toBe(10)

    const atrEsp = await db.query<{ forca: number; constituicao: number }>(
      `SELECT forca, constituicao FROM public.rpg_atributos WHERE user_id = $1`,
      [user],
    )
    expect(atrEsp.rows[0]).toEqual({ forca: 10, constituicao: 4 })

    // Herói bloqueado continua recusado
    const bloq = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_trocar_personagem('maga_agua', false) AS r`,
    )
    expect(bloq.rows[0].r.erro).toContain('Desbloqueie este personagem')
  }, 15000)
})
