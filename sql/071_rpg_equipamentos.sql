-- 071_rpg_equipamentos.sql
-- Fase 18 (18.2d e 18.3a): equipamentos do personagem.
--
-- 1. rpg_itens: catálogo de itens com atributo (Vida, Ataque, Defesa)
-- 2. rpg_inventario: o que cada jogador possui
-- 3. rpg_equipados: o item em cada um dos cinco slots
-- 4. rpg_garantir_kit_inicial(): dá o kit de quem desperta, uma única vez
-- 5. rpg_equipar_item(slot, item): equipa ou desequipa, conferindo posse, slot e nível
-- 6. Catálogo inicial
--
-- Item com atributo NÃO é vendido por AniCoins: a moeda pode vir a ser vendida por
-- dinheiro, e poder comprado quebra a regra do projeto. Por isso estas tabelas são
-- separadas de store_items (cosméticos). O item funcional vem do kit, de batalha e de
-- invocação gratuita.
--
-- Os atributos do jogador não são gravados: o Go soma nível e itens equipados a cada leitura.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Catálogo
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_itens (
  id            TEXT PRIMARY KEY,
  slot          TEXT NOT NULL,
  nome          TEXT NOT NULL,
  descricao     TEXT NOT NULL DEFAULT '',
  raridade      TEXT NOT NULL DEFAULT 'comum',
  vida          INTEGER NOT NULL DEFAULT 0,
  ataque        INTEGER NOT NULL DEFAULT 0,
  defesa        INTEGER NOT NULL DEFAULT 0,
  nivel_minimo  INTEGER NOT NULL DEFAULT 1,
  -- Item do kit de quem desperta o personagem.
  inicial       BOOLEAN NOT NULL DEFAULT false,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  ordem         INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT rpg_itens_id_formato  CHECK (id ~ '^[a-z0-9_]{1,40}$'),
  CONSTRAINT rpg_itens_slot        CHECK (slot IN ('arma', 'armadura', 'capa', 'botas', 'joia')),
  CONSTRAINT rpg_itens_raridade    CHECK (raridade IN ('comum', 'raro', 'epico', 'lendario')),
  CONSTRAINT rpg_itens_atributos   CHECK (vida >= 0 AND ataque >= 0 AND defesa >= 0),
  CONSTRAINT rpg_itens_nivel       CHECK (nivel_minimo >= 1)
);

ALTER TABLE public.rpg_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_itens_leitura ON public.rpg_itens;
CREATE POLICY rpg_itens_leitura ON public.rpg_itens
  FOR SELECT TO authenticated
  USING (ativo = true OR public.is_admin());

DROP POLICY IF EXISTS rpg_itens_escrita_admin ON public.rpg_itens;
CREATE POLICY rpg_itens_escrita_admin ON public.rpg_itens
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.rpg_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_itens TO authenticated;

-- =============================================================================
-- 2. Inventário: o que cada jogador possui
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_inventario (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  -- Item repetido soma aqui em vez de virar outra linha.
  quantidade  INTEGER NOT NULL DEFAULT 1,
  obtido_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT rpg_inventario_quantidade CHECK (quantidade >= 1)
);

ALTER TABLE public.rpg_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_inventario_le_o_proprio ON public.rpg_inventario;
CREATE POLICY rpg_inventario_le_o_proprio ON public.rpg_inventario
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Sem escrita para o usuário: item só entra pelas funções do servidor.
REVOKE ALL ON public.rpg_inventario FROM anon, authenticated;
GRANT SELECT ON public.rpg_inventario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_inventario TO service_role;

-- =============================================================================
-- 3. Slots equipados
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_equipados (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL,
  item_id      TEXT NOT NULL REFERENCES public.rpg_itens(id) ON DELETE CASCADE,
  equipado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot),
  CONSTRAINT rpg_equipados_slot CHECK (slot IN ('arma', 'armadura', 'capa', 'botas', 'joia'))
);

ALTER TABLE public.rpg_equipados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_equipados_le_o_proprio ON public.rpg_equipados;
CREATE POLICY rpg_equipados_le_o_proprio ON public.rpg_equipados
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_equipados FROM anon, authenticated;
GRANT SELECT ON public.rpg_equipados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_equipados TO service_role;

-- =============================================================================
-- 4. Kit inicial
-- =============================================================================
-- Dá os itens marcados como `inicial` e já os equipa nos slots vazios. Pode ser chamada
-- à vontade: quem já tem o kit não ganha nada de novo, e todo jogador recebe o mesmo kit.

CREATE OR REPLACE FUNCTION public.rpg_garantir_kit_inicial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_novos   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  INSERT INTO public.rpg_inventario (user_id, item_id)
  SELECT v_user_id, i.id
    FROM public.rpg_itens i
   WHERE i.inicial = true AND i.ativo = true
  ON CONFLICT (user_id, item_id) DO NOTHING;
  GET DIAGNOSTICS v_novos = ROW_COUNT;

  -- Só equipa o kit quando ele acabou de chegar: quem desequipou de propósito não tem o
  -- slot preenchido de novo a cada visita.
  IF v_novos > 0 THEN
    INSERT INTO public.rpg_equipados (user_id, slot, item_id)
    SELECT v_user_id, i.slot, i.id
      FROM public.rpg_itens i
     WHERE i.inicial = true AND i.ativo = true
    ON CONFLICT (user_id, slot) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'novos', v_novos);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_garantir_kit_inicial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_garantir_kit_inicial() TO authenticated;

-- =============================================================================
-- 5. Equipar e desequipar
-- =============================================================================
-- Não há como forjar poder por aqui: só entra em slot um item que o jogador possui, do
-- slot certo e dentro do nível. O nível vem de calcular_nivel_usuario (sql/054), a mesma
-- conta do Go.

CREATE OR REPLACE FUNCTION public.rpg_equipar_item(p_slot TEXT, p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    public.rpg_itens%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF p_slot IS NULL OR p_slot NOT IN ('arma', 'armadura', 'capa', 'botas', 'joia') THEN
    RETURN jsonb_build_object('erro', 'Slot inválido.');
  END IF;

  -- Sem item, o slot é esvaziado.
  IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    DELETE FROM public.rpg_equipados WHERE user_id = v_user_id AND slot = p_slot;
    RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', NULL);
  END IF;

  SELECT * INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true;
  IF v_item.id IS NULL OR v_item.slot <> p_slot THEN
    RETURN jsonb_build_object('erro', 'Este item não serve neste slot.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_inventario WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('erro', 'Você não possui este item.');
  END IF;

  IF public.calcular_nivel_usuario(v_user_id) < v_item.nivel_minimo THEN
    RETURN jsonb_build_object('erro', format('Este item exige o nível %s.', v_item.nivel_minimo));
  END IF;

  INSERT INTO public.rpg_equipados (user_id, slot, item_id)
  VALUES (v_user_id, p_slot, p_item_id)
  ON CONFLICT (user_id, slot) DO UPDATE
    SET item_id = EXCLUDED.item_id, equipado_em = now();

  RETURN jsonb_build_object('ok', true, 'slot', p_slot, 'item_id', p_item_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_equipar_item(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_equipar_item(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 6. Catálogo inicial
-- =============================================================================
-- DO NOTHING preserva o que o Admin ajustar depois. Os números são um ponto de partida de
-- balanceamento, não uma decisão final.

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, nivel_minimo, inicial, ordem)
VALUES
  -- Kit inicial
  ('espada_de_ferro',       'arma',     'Espada de Ferro',       'A primeira lâmina de todo aventureiro.',             'comum',     0,  4,  0,  1, true,  10),
  ('gibao_de_viajante',     'armadura', 'Gibão de Viajante',     'Couro simples, mas melhor que nada.',                'comum',    20,  0,  2,  1, true,  11),
  ('capa_de_viajante',      'capa',     'Capa de Viajante',      'Protege da chuva e de pouco mais.',                  'comum',    10,  0,  1,  1, true,  12),
  ('botas_de_couro',        'botas',    'Botas de Couro',        'Gastas de tanto andar.',                             'comum',     0,  0,  1,  1, true,  13),
  ('anel_de_cobre',         'joia',     'Anel de Cobre',         'Um amuleto de sorte de quem ficou para trás.',       'comum',     0,  1,  0,  1, true,  14),
  -- Raros
  ('lamina_de_eter',        'arma',     'Lâmina de Éter',        'O fio brilha com energia de outro mundo.',           'raro',      0, 10,  0, 10, false, 20),
  ('cota_de_malha',         'armadura', 'Cota de Malha',         'Anéis de aço entrelaçados à mão.',                   'raro',     50,  0,  5,  8, false, 21),
  ('capa_das_runas',        'capa',     'Capa das Runas',        'Símbolos antigos bordados na barra.',                'raro',     25,  0,  3, 10, false, 22),
  ('botas_do_batedor',      'botas',    'Botas do Batedor',      'Leves e silenciosas.',                               'raro',      0,  1,  3,  6, false, 23),
  ('amuleto_de_eter',       'joia',     'Amuleto de Éter',       'Pulsa no ritmo de quem o carrega.',                  'raro',     15,  4,  0,  8, false, 24),
  -- Épicos
  ('espada_da_aurora',      'arma',     'Espada da Aurora',      'Forjada na primeira luz de uma manhã de inverno.',   'epico',     0, 22,  0, 25, false, 30),
  ('armadura_do_veterano',  'armadura', 'Armadura do Veterano',  'Cada marca nela conta uma batalha.',                 'epico',   120,  0, 12, 28, false, 31),
  ('manto_estelar',         'capa',     'Manto Estelar',         'Parece guardar um pedaço do céu noturno.',           'epico',    60,  0,  7, 22, false, 32),
  ('grevas_de_ferro_negro', 'botas',    'Grevas de Ferro Negro', 'Pesadas, firmes, impossíveis de derrubar.',          'epico',     0,  3,  8, 20, false, 33),
  ('selo_do_guardiao',      'joia',     'Selo do Guardião',      'Marca de quem jurou proteger um reino.',             'epico',    40,  9,  0, 24, false, 34),
  -- Lendários
  ('lamina_primordial',     'arma',     'Lâmina Primordial',     'Dizem que existia antes do primeiro reino.',         'lendario',  0, 45,  0, 55, false, 40),
  ('egide_primordial',      'armadura', 'Égide Primordial',      'Nenhum golpe conhecido a atravessou.',               'lendario', 260,  0, 25, 55, false, 41)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir (roda e desfaz; troque o UUID por um usuário que já despertou)
-- =============================================================================
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--
--   SELECT public.rpg_garantir_kit_inicial();   -- novos: 5 na primeira vez, 0 depois
--   SELECT public.rpg_garantir_kit_inicial();
--   SELECT slot, item_id FROM public.rpg_equipados ORDER BY slot;   -- 5 linhas
--
--   SELECT public.rpg_equipar_item('arma', 'lamina_primordial');    -- erro: não possui
--   SELECT public.rpg_equipar_item('arma', 'botas_de_couro');       -- erro: slot errado
--   SELECT public.rpg_equipar_item('arma', '');                     -- ok: esvazia o slot
--
--   -- Gravação direta precisa falhar com "permission denied":
--   -- INSERT INTO public.rpg_inventario (user_id, item_id) VALUES ('<UUID>', 'lamina_primordial');
-- ROLLBACK;
