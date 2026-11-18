// client/src/sql/elencoDesbloqueio.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql066 from '../../../sql/066_personagem_rpg.sql?raw'
import sql068 from '../../../sql/068_personagem_visual.sql?raw'
import sql080 from '../../../sql/080_rpg_elenco.sql?raw'
import sql123 from '../../../sql/123_rpg_elenco_desbloqueio_e_troca.sql?raw'

const TABELAS_AUXILIARES_ESTADO = `
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
  conjunto             text
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

async function criarBancoCom123() {
  const db = await criarBancoTeste({
    scriptsExtras: [TABELAS_AUXILIARES_ESTADO, sql066, sql068, sql080],
  })
  const legado = '33333333-3333-4333-8333-333333333333'
  await criarUsuarioTeste(db, legado, 'legado', 'Veterano')
  await db.query(
    `INSERT INTO public.rpg_personagens (user_id, nome, personagem_base)
     VALUES ($1, 'Kai', 'maga_agua')`,
    [legado],
  )
  // Aplica duas vezes para provar idempotência sobre contas já existentes.
  await db.exec(sql123)
  await db.exec(sql123)
  return { db, legado }
}

describe('sql/123_rpg_elenco_desbloqueio_e_troca', () => {
  it('faz backfill de contas antigas mantendo só o personagem atual e primeira troca livre', async () => {
    const { db, legado } = await criarBancoCom123()
    const res = await db.query<{
      personagem_base: string
      desbloqueados: string[]
      ultima_troca_em: string | null
    }>(
      `SELECT personagem_base, desbloqueados, ultima_troca_em
         FROM public.rpg_personagens
        WHERE user_id = $1`,
      [legado],
    )
    expect(res.rows[0].personagem_base).toBe('maga_agua')
    expect(res.rows[0].desbloqueados).toEqual(['maga_agua'])
    expect(res.rows[0].ultima_troca_em).toBeNull()
  }, 15000)

  it('cobre despertar grátis, desbloqueio por 400 Ouro, espera de 24h e troca antecipada por 150 Ouro', async () => {
    const { db } = await criarBancoCom123()
    const user = '44444444-4444-4444-8444-444444444444'
    await criarUsuarioTeste(db, user, 'aventureiro', 'Aventureiro')
    await autenticarComo(db, user)

    // 1. Despertar com 1º personagem grátis
    const despertou = await db.query<{ r: { ok: boolean; criado: boolean; desbloqueados: string[] } }>(
      `SELECT public.despertar_personagem('Celestia', 'paladina_luz') AS r`,
    )
    expect(despertou.rows[0].r.ok).toBe(true)
    expect(despertou.rows[0].r.criado).toBe(true)
    expect(despertou.rows[0].r.desbloqueados).toEqual(['paladina_luz'])

    // 2. Desbloquear sem Ouro recusa
    const semOuro = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_desbloquear_personagem('maga_agua') AS r`,
    )
    expect(semOuro.rows[0].r.erro).toContain('Faltam 400 de Ouro')

    // 3. Dar 600 Ouro e desbloquear Mizuki (400 Ouro)
    await db.query(
      `INSERT INTO public.rpg_recursos (user_id, ouro) VALUES ($1, 600)
       ON CONFLICT (user_id) DO UPDATE SET ouro = 600`,
      [user],
    )
    const desb = await db.query<{ r: { ok: boolean; desbloqueados: string[]; ouro: number } }>(
      `SELECT public.rpg_desbloquear_personagem('maga_agua') AS r`,
    )
    expect(desb.rows[0].r.ok).toBe(true)
    expect(desb.rows[0].r.desbloqueados).toEqual(['paladina_luz', 'maga_agua'])
    expect(desb.rows[0].r.ouro).toBe(200)

    // 4. Desbloquear repetido falha sem debitar
    const repetido = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_desbloquear_personagem('maga_agua') AS r`,
    )
    expect(repetido.rows[0].r.erro).toBe('Você já desbloqueou este personagem.')

    // 5. Trocar para bloqueado recusa
    const bloq = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_trocar_personagem('lanceiro_fogo', false) AS r`,
    )
    expect(bloq.rows[0].r.erro).toContain('Desbloqueie este personagem')

    // 6. Primeira troca gratuita para desbloqueado funciona
    const troca1 = await db.query<{ r: { ok: boolean; trocado: boolean; ouro_gasto: number; personagem_base: string } }>(
      `SELECT public.rpg_trocar_personagem('maga_agua', false) AS r`,
    )
    expect(troca1.rows[0].r.ok).toBe(true)
    expect(troca1.rows[0].r.trocado).toBe(true)
    expect(troca1.rows[0].r.ouro_gasto).toBe(0)
    expect(troca1.rows[0].r.personagem_base).toBe('maga_agua')

    // 7. Estado único traz desbloqueados e ultima_troca_em
    const estado = await db.query<{
      e: {
        ok: boolean
        ouro: number
        personagem: { personagem_base: string; desbloqueados: string[]; ultima_troca_em: string | null }
      }
    }>(`SELECT public.rpg_estado_jogador() AS e`)
    expect(estado.rows[0].e.ok).toBe(true)
    expect(estado.rows[0].e.ouro).toBe(200)
    expect(estado.rows[0].e.personagem.personagem_base).toBe('maga_agua')
    expect(estado.rows[0].e.personagem.desbloqueados).toEqual(['paladina_luz', 'maga_agua'])
    expect(estado.rows[0].e.personagem.ultima_troca_em).toBeTruthy()

    // 8. Trocar de volta dentro de 24h sem pagar antecipado é recusado
    const bloqueadoEspera = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_trocar_personagem('paladina_luz', false) AS r`,
    )
    expect(bloqueadoEspera.rows[0].r.erro).toContain('Troca gratuita disponível em')

    // 9. Trocar antes de 24h pagando 150 Ouro funciona
    const trocaAntec = await db.query<{ r: { ok: boolean; ouro_gasto: number; personagem_base: string } }>(
      `SELECT public.rpg_trocar_personagem('paladina_luz', true) AS r`,
    )
    expect(trocaAntec.rows[0].r.ok).toBe(true)
    expect(trocaAntec.rows[0].r.ouro_gasto).toBe(150)
    expect(trocaAntec.rows[0].r.personagem_base).toBe('paladina_luz')

    const saldoRestante = await db.query<{ ouro: number }>(
      `SELECT ouro FROM public.rpg_recursos WHERE user_id = $1`,
      [user],
    )
    expect(saldoRestante.rows[0].ouro).toBe(50)

    // 10. Trocar antecipado com Ouro insuficiente (50 < 150) falha
    const semOuroAntec = await db.query<{ r: { erro: string } }>(
      `SELECT public.rpg_trocar_personagem('maga_agua', true) AS r`,
    )
    expect(semOuroAntec.rows[0].r.erro).toContain('Faltam 100 de Ouro')

    // 11. Após 24h, troca volta a ser gratuita
    await db.query(
      `UPDATE public.rpg_personagens SET ultima_troca_em = now() - interval '25 hours' WHERE user_id = $1`,
      [user],
    )
    const trocaLivre = await db.query<{ r: { ok: boolean; ouro_gasto: number } }>(
      `SELECT public.rpg_trocar_personagem('maga_agua', false) AS r`,
    )
    expect(trocaLivre.rows[0].r.ok).toBe(true)
    expect(trocaLivre.rows[0].r.ouro_gasto).toBe(0)
  })

  it('proíbe anon de chamar as RPCs e bloqueia escrita direta de authenticated em rpg_personagens', async () => {
    const { db, legado } = await criarBancoCom123()
    await autenticarComo(db, legado)

    await db.exec(`BEGIN`)
    await db.exec(`SET LOCAL ROLE authenticated`)
    await expect(
      db.query(`UPDATE public.rpg_personagens SET desbloqueados = ARRAY['paladina_luz'] WHERE user_id = $1`, [legado]),
    ).rejects.toThrow()
    await db.exec(`ROLLBACK`)

    await db.exec(`BEGIN`)
    await db.exec(`SET LOCAL ROLE anon`)
    await expect(db.query(`SELECT public.rpg_desbloquear_personagem('paladina_luz')`)).rejects.toThrow()
    await expect(db.query(`SELECT public.rpg_trocar_personagem('paladina_luz', false)`)).rejects.toThrow()
    await expect(db.query(`SELECT public.rpg_estado_jogador()`)).rejects.toThrow()
    await db.exec(`ROLLBACK`)
  })
})
