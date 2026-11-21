// client/src/sql/equipamentosPorHeroi.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql140 from '../../../sql/140_atributos_por_personagem.sql?raw'
import sql141 from '../../../sql/141_troca_personagem_gratuita.sql?raw'
import sql142 from '../../../sql/142_equipamentos_por_personagem.sql?raw'

const BASE_SQL = `
CREATE OR REPLACE FUNCTION public.calcular_nivel_usuario(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$ SELECT 20; $$;

CREATE OR REPLACE FUNCTION public.rpg_personagem_existe(p_base TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_base IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio', 'maga_agua',
                    'guerreiro_terra', 'paladina_luz', 'arqueiro_trevas');
$$;

CREATE OR REPLACE FUNCTION public.rpg_classe_do_personagem(p_base TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_base
    WHEN 'lanceiro_fogo'   THEN 'lanceiro'
    WHEN 'assassina_raio'  THEN 'assassina'
    WHEN 'maga_agua'       THEN 'maga'
    WHEN 'guerreiro_terra' THEN 'guerreiro'
    WHEN 'paladina_luz'    THEN 'paladina'
    WHEN 'arqueiro_trevas' THEN 'arqueiro'
    ELSE 'espadachim'
  END;
$$;

CREATE OR REPLACE FUNCTION public.rpg_item_serve(p_classes TEXT[], p_exclusivo TEXT, p_base TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_exclusivo IS NOT NULL THEN p_exclusivo = COALESCE(p_base, 'espadachim_eter')
    WHEN p_classes IS NULL THEN true
    ELSE public.rpg_classe_do_personagem(p_base) = ANY (p_classes)
  END;
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
  conjunto             TEXT,
  elemento             TEXT
);

CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.rpg_maestria (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habilidade_id TEXT NOT NULL,
  usos          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, habilidade_id)
);

CREATE TABLE IF NOT EXISTS public.store_items (
  id     TEXT PRIMARY KEY,
  nome   TEXT NOT NULL DEFAULT '',
  estilo TEXT NOT NULL DEFAULT '',
  tipo   TEXT NOT NULL DEFAULT 'cenario'
);

CREATE TABLE IF NOT EXISTS public.user_equipped (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot    TEXT NOT NULL,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.user_items (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);
`

describe('sql/142_equipamentos_por_personagem', () => {
  it('isola os equipamentos por herói e deixa o 2º personagem sem nenhum item vestido do 1º', async () => {
    const db = await criarBancoTeste({ scriptsExtras: [BASE_SQL] })
    const user = '88888888-8888-4888-8888-888888888888'
    await criarUsuarioTeste(db, user, 'kael', 'Kael')

    await db.query(`
      INSERT INTO public.rpg_itens (id, slot, nome, classes) VALUES
        ('armadura_aco', 'armadura', 'Armadura de Aço', NULL),
        ('botas_couro', 'botas', 'Botas de Couro', NULL),
        ('arco_silvestre', 'arma', 'Arco Silvestre', ARRAY['arqueiro'])
    `)
    await db.query(
      `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
       VALUES ($1, 'Kael', 'espadachim_eter', ARRAY['espadachim_eter', 'arqueiro_trevas'])`,
      [user],
    )
    await db.query(
      `INSERT INTO public.rpg_inventario (user_id, item_id, quantidade) VALUES
        ($1, 'armadura_aco', 1),
        ($1, 'botas_couro', 1),
        ($1, 'arco_silvestre', 1)`,
      [user],
    )
    await db.query(
      `INSERT INTO public.rpg_equipados (user_id, slot, item_id) VALUES
        ($1, 'armadura', 'armadura_aco'),
        ($1, 'botas', 'botas_couro')`,
      [user],
    )

    await db.exec(sql140)
    await db.exec(sql141)
    await db.exec(sql142)
    await autenticarComo(db, user)

    // Backfill preservou apenas para o Espadachim ativo; Yoru começa com 0 itens vestidos.
    const yoruAntes = await db.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM public.rpg_equipados_herois WHERE user_id = $1 AND personagem_base = 'arqueiro_trevas'`,
      [user],
    )
    expect(yoruAntes.rows[0].c).toBe(0)

    // Troca para Yoru: rpg_equipados fica completamente vazio (não herda armadura/botas do Espadachim).
    await db.query(`SELECT public.rpg_trocar_personagem('arqueiro_trevas', false)`)
    const eqYoru = await db.query<{ slot: string; item_id: string }>(
      `SELECT slot, item_id FROM public.rpg_equipados WHERE user_id = $1 ORDER BY slot`,
      [user],
    )
    expect(eqYoru.rows).toEqual([])

    // Equipa o Arco apenas no Yoru e verifica estado único.
    const equip = await db.query<{ r: { ok: boolean; slot: string; item_id: string } }>(
      `SELECT public.rpg_equipar_item('arma', 'arco_silvestre', NULL) AS r`,
    )
    expect(equip.rows[0].r.ok).toBe(true)

    const estadoYoru = await db.query<{
      e: { equipados: Array<{ slot: string; item_id: string }>; equipados_por_heroi: Record<string, unknown> }
    }>(`SELECT public.rpg_estado_jogador() AS e`)
    expect(estadoYoru.rows[0].e.equipados).toEqual([{ slot: 'arma', item_id: 'arco_silvestre' }])
    expect(Object.keys(estadoYoru.rows[0].e.equipados_por_heroi)).toContain('espadachim_eter')
    expect(Object.keys(estadoYoru.rows[0].e.equipados_por_heroi)).toContain('arqueiro_trevas')

    // Volta para Espadachim: recupera armadura + botas intactas, sem o Arco do Yoru.
    await db.query(`SELECT public.rpg_trocar_personagem('espadachim_eter', false)`)
    const eqEsp = await db.query<{ slot: string; item_id: string }>(
      `SELECT slot, item_id FROM public.rpg_equipados WHERE user_id = $1 ORDER BY slot`,
      [user],
    )
    expect(eqEsp.rows).toEqual([
      { slot: 'armadura', item_id: 'armadura_aco' },
      { slot: 'botas', item_id: 'botas_couro' },
    ])
  }, 15000)
})
