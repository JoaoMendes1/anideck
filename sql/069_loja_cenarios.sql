-- 069_loja_cenarios.sql
-- Fase 18 (18.2b): cenários de fundo da tela do personagem, vendidos na Loja.
--
-- 1. Tipo e slot `cenario` nos CHECK de store_items e user_equipped
-- 2. equipar_item recriada com o slot novo (o corpo é o do sql/049, só a lista muda)
-- 3. Quatro cenários no catálogo
--
-- comprar_item NÃO é recriada: é a função que mexe em saldo, e a única coisa que mudaria
-- nela é equipar sozinho o cenário recém-comprado. O botão "Equipar" da Loja cobre isso.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Tipo e slot novos
-- =============================================================================

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_tipo_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_tipo_check
  CHECK (tipo IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'expansao', 'cenario'));

ALTER TABLE public.user_equipped DROP CONSTRAINT IF EXISTS user_equipped_slot_check;
ALTER TABLE public.user_equipped ADD CONSTRAINT user_equipped_slot_check
  CHECK (slot IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'cenario'));

-- =============================================================================
-- 2. equipar_item com o slot `cenario`
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

  IF p_slot NOT IN ('moldura', 'tema_perfil', 'cor_nome', 'emblema', 'cenario') THEN
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
-- 3. Cenários no catálogo
-- =============================================================================
-- O `estilo` é a chave do mapa CENARIOS em client/src/lib/cosmeticos.ts. Preços na mesma
-- faixa dos temas de perfil (250 e 400). DO NOTHING preserva preço ajustado pelo Admin.

INSERT INTO public.store_items (id, tipo, nome, descricao, preco, raridade, estilo, icone, ordem)
VALUES
  ('cenario_ceu_de_eter', 'cenario', 'Céu de Éter', 'Noite estrelada em azul profundo atrás do seu personagem.', 250, 'raro', 'cenario-ceu-de-eter', 'Sparkles', 40),
  ('cenario_aurora', 'cenario', 'Aurora do Norte', 'Véus de luz verde e violeta cruzando o céu do seu personagem.', 250, 'raro', 'cenario-aurora', 'Zap', 41),
  ('cenario_crepusculo', 'cenario', 'Crepúsculo Dourado', 'O fim de tarde de uma longa jornada, do violeta ao dourado.', 400, 'epico', 'cenario-crepusculo', 'Flame', 42),
  ('cenario_abismo', 'cenario', 'Abismo Estelar', 'Um vazio escuro com um clarão violeta subindo do chão.', 400, 'epico', 'cenario-abismo', 'Crown', 43)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT id, tipo, preco, estilo FROM public.store_items WHERE tipo = 'cenario' ORDER BY ordem;
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   -- Sem possuir o item, precisa falhar com "Você não possui este item cosmético.":
--   -- SELECT public.equipar_item('cenario', 'cenario_aurora');
--   -- Item de outro tipo no slot, precisa falhar com "Item inválido para o slot cenario":
--   -- SELECT public.equipar_item('cenario', 'moldura_cyber_holo');
-- ROLLBACK;
