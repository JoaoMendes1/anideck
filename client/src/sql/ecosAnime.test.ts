// client/src/sql/ecosAnime.test.ts
import { describe, it, expect } from 'vitest'
import { autenticarComo, criarBancoTeste, criarUsuarioTeste } from './bancoDeTeste'
import sql066 from '../../../sql/066_personagem_rpg.sql?raw'
import sql068 from '../../../sql/068_personagem_visual.sql?raw'
import sql080 from '../../../sql/080_rpg_elenco.sql?raw'
import sql120 from '../../../sql/120_lutas_em_grupo.sql?raw'
import sql123 from '../../../sql/123_rpg_elenco_desbloqueio_e_troca.sql?raw'
import sql136 from '../../../sql/136_esquadrao_e_grupo_vagas.sql?raw'
import sql137 from '../../../sql/137_ecos_do_anime.sql?raw'

const AUXILIARES = `
CREATE TABLE IF NOT EXISTS public.rpg_itens (
  id text PRIMARY KEY, slot text NOT NULL, nome text NOT NULL, descricao text NOT NULL DEFAULT '',
  raridade text NOT NULL DEFAULT 'comum', vida integer NOT NULL DEFAULT 0, ataque integer NOT NULL DEFAULT 0,
  defesa integer NOT NULL DEFAULT 0, nivel_minimo integer NOT NULL DEFAULT 1, ativo boolean NOT NULL DEFAULT true,
  magia integer NOT NULL DEFAULT 0, velocidade integer NOT NULL DEFAULT 0, critico_por_mil integer NOT NULL DEFAULT 0,
  dano_critico integer NOT NULL DEFAULT 0, esquiva_por_mil integer NOT NULL DEFAULT 0,
  classes text[], personagem_exclusivo text, conjunto text, elemento text
);
CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1, aprimoramento integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS public.rpg_equipados (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL, item_id text NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  equipado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, slot)
);
CREATE TABLE IF NOT EXISTS public.rpg_atributos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  forca integer NOT NULL DEFAULT 0, inteligencia integer NOT NULL DEFAULT 0, constituicao integer NOT NULL DEFAULT 0,
  agilidade integer NOT NULL DEFAULT 0, destreza integer NOT NULL DEFAULT 0, sorte integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.rpg_maestria (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habilidade_id text NOT NULL, usos integer NOT NULL DEFAULT 0, PRIMARY KEY (user_id, habilidade_id)
);
CREATE TABLE IF NOT EXISTS public.store_items (id text PRIMARY KEY, nome text NOT NULL DEFAULT '', estilo text NOT NULL DEFAULT '', tipo text NOT NULL DEFAULT 'cenario');
CREATE TABLE IF NOT EXISTS public.user_items (user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, item_id text NOT NULL, PRIMARY KEY (user_id, item_id));
CREATE TABLE IF NOT EXISTS public.user_equipped (user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, slot text NOT NULL, item_id text NOT NULL, PRIMARY KEY (user_id, slot));
`

describe('sql/137_ecos_do_anime', () => {
  it('permite equipar Carta Foil da própria conta, bloqueia carta não-Foil/alheia e expõe eco_mal_id em rpg_estado_jogador', async () => {
    const db = await criarBancoTeste({ scriptsExtras: [AUXILIARES, sql066, sql068, sql080, sql120, sql123, sql136] })
    await db.exec(sql137)
    await db.exec(sql137)

    const u1 = '11111111-1111-4111-8111-111111111111'
    const u2 = '22222222-2222-4222-8222-222222222222'
    await criarUsuarioTeste(db, u1, 'dono', 'Dono')
    await criarUsuarioTeste(db, u2, 'outro', 'Outro')
    await db.query(`INSERT INTO public.rpg_personagens (user_id, nome, personagem_base) VALUES ($1, 'Kael', 'espadachim_eter')`, [u1])

    await db.query(`INSERT INTO public.user_cards (user_id, mal_id, raridade, is_foil, nota) VALUES ($1, 16498, 'rara', false, 8)`, [u1])
    await db.query(`INSERT INTO public.user_cards (user_id, mal_id, raridade, is_foil, nota) VALUES ($1, 5114, 'rarissima', true, 10)`, [u1])
    await db.query(`INSERT INTO public.user_cards (user_id, mal_id, raridade, is_foil, nota) VALUES ($1, 9253, 'lendaria', true, 10)`, [u2])

    await autenticarComo(db, u1)

    const naoFoil = await db.query<{ r: { erro?: string } }>(`SELECT public.rpg_equipar_eco(16498) AS r`)
    expect(naoFoil.rows[0].r.erro).toContain('Carta Foil')

    const alheia = await db.query<{ r: { erro?: string } }>(`SELECT public.rpg_equipar_eco(9253) AS r`)
    expect(alheia.rows[0].r.erro).toContain('Carta Foil')

    const equipada = await db.query<{ r: { ok?: boolean; eco_mal_id?: number } }>(`SELECT public.rpg_equipar_eco(5114) AS r`)
    expect(equipada.rows[0].r).toEqual({ ok: true, eco_mal_id: 5114 })

    const estado = await db.query<{ r: { personagem: { eco_mal_id: number | null } } }>(`SELECT public.rpg_estado_jogador() AS r`)
    expect(estado.rows[0].r.personagem.eco_mal_id).toBe(5114)

    const removida = await db.query<{ r: { ok?: boolean; eco_mal_id: number | null } }>(`SELECT public.rpg_equipar_eco(NULL) AS r`)
    expect(removida.rows[0].r).toEqual({ ok: true, eco_mal_id: null })
  }, 15000)
})
