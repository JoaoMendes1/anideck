-- 070_loja_auras.sql
-- Fase 18 (18.2e): auras do personagem, vendidas na Loja.
--
-- Mesmo desenho do sql/069 (cenários):
-- 1. Tipo e slot `aura` nos CHECK de store_items e user_equipped
-- 2. equipar_item recriada com o slot novo (o corpo é o do sql/069, só a lista muda)
-- 3. Três auras no catálogo
--
-- comprar_item continua sem ser recriada: aura comprada se equipa pelo botão da Loja.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Tipo e slot novos
-- =============================================================================

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_tipo_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_tipo_check
  CHECK (tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'expansao', 'cenario', 'aura'));

ALTER TABLE public.user_equipped DROP CONSTRAINT IF EXISTS user_equipped_slot_check;
ALTER TABLE public.user_equipped ADD CONSTRAINT user_equipped_slot_check
  CHECK (slot IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'cenario', 'aura'));

-- =============================================================================
-- 2. equipar_item com o slot `aura`
-- =============================================================================

CREATE OR REPLACE FUNCTION public.equipar_item(p_slot text, p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = 'P0001';
  END IF;

  IF p_slot NOT IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'cenario', 'aura') THEN
    RAISE EXCEPTION 'Slot inválido: %', p_slot USING ERRCODE = 'P0002';
  END IF;

  -- Se p_item_id for nulo ou vazio, desequipa o slot
  IF p_item_id IS NULL OR trim(p_item_id) = '' THEN
    DELETE FROM public.user_equipped
     WHERE user_id = v_user_id AND slot = p_slot;
    RETURN jsonb_build_object('sucesso', true, 'slot', p_slot, 'item_id', null);
  END IF;

  SELECT * INTO v_item
    FROM public.store_items
   WHERE id = p_item_id;

  IF v_item.id IS NULL OR v_item.tipo != p_slot THEN
    RAISE EXCEPTION 'Item inválido para o slot %', p_slot USING ERRCODE = 'P0003';
  END IF;

  -- Confere posse do item
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Você não possui este item cosmético.' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO public.user_equipped (user_id, slot, item_id)
  VALUES (v_user_id, p_slot, p_item_id)
  ON CONFLICT (user_id, slot) DO UPDATE
  SET item_id = EXCLUDED.item_id, equipado_em = now();

  RETURN jsonb_build_object(
    'sucesso', true,
    'slot', p_slot,
    'item_id', v_item.id,
    'estilo', v_item.estilo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.equipar_item(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipar_item(text, text) TO authenticated, service_role;

-- =============================================================================
-- 3. Auras no catálogo
-- =============================================================================
-- O `estilo` é a chave do mapa AURAS em client/src/lib/cosmeticos.ts. DO NOTHING preserva
-- preço ajustado pelo Admin.

INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ordem)
VALUES
  ('aura_chama_azul', 'aura', 'Chama Azul', 'Uma labareda azul que pulsa atrás do seu personagem.', 200, 'raro', 'aura-chama-azul', 'Flame', 50),
  ('aura_sombra_violeta', 'aura', 'Sombra Violeta', 'Uma névoa escura e violeta que envolve o seu personagem.', 200, 'raro', 'aura-sombra-violeta', 'Sparkles', 51),
  ('aura_raios_dourados', 'aura', 'Raios Dourados', 'Raios de luz dourada saindo de trás do seu personagem.', 350, 'epico', 'aura-raios-dourados', 'Crown', 52)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT id, tipo, preco, estilo FROM public.store_items WHERE tipo IN ('cenario', 'aura') ORDER BY ordem;
