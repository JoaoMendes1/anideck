// client/src/sql/esquadraoGrupo.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql066 from '../../../sql/066_personagem_rpg.sql?raw'
import sql068 from '../../../sql/068_personagem_visual.sql?raw'
import sql080 from '../../../sql/080_rpg_elenco.sql?raw'
import sql120 from '../../../sql/120_lutas_em_grupo.sql?raw'
import sql123 from '../../../sql/123_rpg_elenco_desbloqueio_e_troca.sql?raw'
import sql136 from '../../../sql/136_esquadrao_e_grupo_vagas.sql?raw'

const TABELAS_AUXILIARES = `
CREATE TABLE IF NOT EXISTS public.rpg_itens (
  id                   text PRIMARY KEY,
  slot                 text NOT NULL,
  nome                 text NOT NULL,
  descricao            text NOT NULL DEFAULT '',
  raridade             text NOT NULL DEFAULT 'comum',
  vida                 integer NOT NULL DEFAULT 0,
  ataque               integer NOT NULL DEFAULT 0,
  defesa               integer NOT NULL DEFAULT 0,
  nivel_minimo         integer NOT NULL DEFAULT 1,
  ativo                boolean NOT NULL DEFAULT true,
  magia                integer NOT NULL DEFAULT 0,
  velocidade           integer NOT NULL DEFAULT 0,
  critico_por_mil      integer NOT NULL DEFAULT 0,
  dano_critico         integer NOT NULL DEFAULT 0,
  esquiva_por_mil      integer NOT NULL DEFAULT 0,
  classes              text[],
  personagem_exclusivo text,
  conjunto             text,
  elemento             text
);

CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id       text NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  quantidade    integer NOT NULL DEFAULT 1,
  aprimoramento integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.rpg_equipados (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot        text NOT NULL,
  item_id     text NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  equipado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.rpg_atributos (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  forca        integer NOT NULL DEFAULT 0,
  inteligencia integer NOT NULL DEFAULT 0,
  constituicao integer NOT NULL DEFAULT 0,
  agilidade    integer NOT NULL DEFAULT 0,
  destreza     integer NOT NULL DEFAULT 0,
  sorte        integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.rpg_maestria (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habilidade_id text NOT NULL,
  usos          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, habilidade_id)
);

CREATE TABLE IF NOT EXISTS public.store_items (
  id     text PRIMARY KEY,
  nome   text NOT NULL DEFAULT '',
  estilo text NOT NULL DEFAULT '',
  tipo   text NOT NULL DEFAULT 'cenario'
);

CREATE TABLE IF NOT EXISTS public.user_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.user_equipped (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot    text NOT NULL,
  item_id text NOT NULL,
  PRIMARY KEY (user_id, slot)
);
`

async function criarBancoCom136() {
  const db = await criarBancoTeste({
    scriptsExtras: [TABELAS_AUXILIARES, sql066, sql068, sql080, sql120, sql123],
  })
  // Aplica duas vezes para garantir idempotência.
  await db.exec(sql136)
  await db.exec(sql136)
  return db
}

describe('sql/136_esquadrao_e_grupo_vagas', () => {
  it('salva esquadrão validando desbloqueados, remove duplicatas/líder e expõe em rpg_estado_jogador', async () => {
    const db = await criarBancoCom136()
    const u1 = '11111111-1111-4111-8111-111111111111'
    await criarUsuarioTeste(db, u1, 'lider', 'Líder')
    await db.query(
      `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
       VALUES ($1, 'Kael', 'espadachim_eter', ARRAY['espadachim_eter', 'lanceiro_fogo', 'maga_agua'])`,
      [u1],
    )
    await autenticarComo(db, u1)

    const invalido = await db.query<{ r: { erro?: string } }>(
      `SELECT public.rpg_salvar_esquadrao(ARRAY['paladina_luz']) AS r`,
    )
    expect(invalido.rows[0].r.erro).toContain('desbloqueados')

    const valido = await db.query<{ r: { ok?: boolean; esquadrao?: string[] } }>(
      `SELECT public.rpg_salvar_esquadrao(ARRAY['espadachim_eter', 'lanceiro_fogo', 'lanceiro_fogo', 'maga_agua']) AS r`,
    )
    expect(valido.rows[0].r.ok).toBe(true)
    expect(valido.rows[0].r.esquadrao).toEqual(['lanceiro_fogo', 'maga_agua'])

    const estado = await db.query<{ r: { ok: boolean; personagem: { esquadrao: string[] } } }>(
      `SELECT public.rpg_estado_jogador() AS r`,
    )
    expect(estado.rows[0].r.ok).toBe(true)
    expect(estado.rows[0].r.personagem.esquadrao).toEqual(['lanceiro_fogo', 'maga_agua'])
  }, 15000)

  it('controla max_herois, herois_lider e vagas_online ao criar, configurar, convidar e aceitar grupo', async () => {
    const db = await criarBancoCom136()
    const u1 = '11111111-1111-4111-8111-111111111111'
    const u2 = '22222222-2222-4222-8222-222222222222'
    const u3 = '33333333-3333-4333-8333-333333333333'
    await criarUsuarioTeste(db, u1, 'lider', 'Líder')
    await criarUsuarioTeste(db, u2, 'amigo1', 'Amigo 1')
    await criarUsuarioTeste(db, u3, 'amigo2', 'Amigo 2')

    for (const [id, nome] of [[u1, 'Kael'], [u2, 'Rin'], [u3, 'Vex']]) {
      await db.query(
        `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
         VALUES ($1, $2, 'espadachim_eter', ARRAY['espadachim_eter', 'maga_agua'])`,
        [id, nome],
      )
    }

    // Cria grupo com 3 heróis no total e 2 do líder -> 1 vaga online.
    const fichaLider = { nome: 'Kael', personagem: 'espadachim_eter', nivel: 10, poder: 100 }
    const criado = await db.query<{ r: { ok: boolean; grupo_id: string; max_herois: number; herois_lider: number } }>(
      `SELECT public.rpg_grupo_criar($1, 'monstro', 'slime_de_eter', 'Slime', $2::jsonb, 3, 2) AS r`,
      [u1, JSON.stringify(fichaLider)],
    )
    expect(criado.rows[0].r.ok).toBe(true)
    expect(criado.rows[0].r.max_herois).toBe(3)
    expect(criado.rows[0].r.herois_lider).toBe(2)

    const gid = criado.rows[0].r.grupo_id

    await autenticarComo(db, u1)
    const conv1 = await db.query<{ r: { ok?: boolean; erro?: string } }>(
      `SELECT public.rpg_grupo_convidar($1, 'amigo1') AS r`,
      [gid],
    )
    expect(conv1.rows[0].r.ok).toBe(true)

    // Não deixa convidar 2º amigo enquanto restar só 1 vaga online.
    const conv2Bloq = await db.query<{ r: { erro?: string } }>(
      `SELECT public.rpg_grupo_convidar($1, 'amigo2') AS r`,
      [gid],
    )
    expect(conv2Bloq.rows[0].r.erro).toContain('vagas')

    // Convite pendente do amigo1 mostra max_herois, herois_lider e vagas_online.
    await autenticarComo(db, u2)
    const pend = await db.query<{ r: { convites: { max_herois: number; herois_lider: number; vagas_online: number }[] } }>(
      `SELECT public.rpg_convites_pendentes() AS r`,
    )
    expect(pend.rows[0].r.convites[0]).toMatchObject({ max_herois: 3, herois_lider: 2, vagas_online: 1 })

    // Aceita convite.
    const ac1 = await db.query<{ r: { ok: boolean } }>(
      `SELECT public.rpg_grupo_aceitar($1, $2, $3::jsonb) AS r`,
      [u2, gid, JSON.stringify({ nome: 'Rin', personagem: 'maga_agua', nivel: 10, poder: 95 })],
    )
    expect(ac1.rows[0].r.ok).toBe(true)

    // Reconfigura para 3 heróis com apenas 1 do líder -> abre mais 1 vaga online e permite convidar amigo2.
    const cfg = await db.query<{ r: { ok?: boolean; vagas_online?: number } }>(
      `SELECT public.rpg_grupo_configurar($1, $2, 3, 1, $3::jsonb) AS r`,
      [u1, gid, JSON.stringify(fichaLider)],
    )
    expect(cfg.rows[0].r.ok).toBe(true)
    expect(cfg.rows[0].r.vagas_online).toBe(2)

    await autenticarComo(db, u1)
    const conv2 = await db.query<{ r: { ok?: boolean } }>(
      `SELECT public.rpg_grupo_convidar($1, 'amigo2') AS r`,
      [gid],
    )
    expect(conv2.rows[0].r.ok).toBe(true)
  }, 15000)
})
