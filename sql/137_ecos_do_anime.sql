-- =============================================================================
-- 137 — Ecos do Anime: equipar 1 Carta Foil no personagem como slot tático
-- =============================================================================
--
-- O que muda:
--   1. rpg_personagens ganha `eco_mal_id INTEGER NULL` (obra da Carta Foil equipada).
--   2. rpg_equipar_eco(p_mal_id INTEGER) confere auth.uid() e exige que a carta exista
--      em public.user_cards para o jogador com `is_foil = true` (ou NULL/0 para remover).
--   3. rpg_estado_jogador() passa a expor `eco_mal_id` em `personagem` (definição viva,
--      antes no sql/136).
--
-- ORDEM: depois do sql/050 e do sql/136. Pode rodar mais de uma vez.

ALTER TABLE public.rpg_personagens
  ADD COLUMN IF NOT EXISTS eco_mal_id INTEGER;

COMMENT ON COLUMN public.rpg_personagens.eco_mal_id IS
  'mal_id da Carta Foil equipada em user_cards como Eco do Anime no combate RPG.';

CREATE OR REPLACE FUNCTION public.rpg_equipar_eco(p_mal_id INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_possui  BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  IF p_mal_id IS NULL OR p_mal_id <= 0 THEN
    UPDATE public.rpg_personagens SET eco_mal_id = NULL WHERE user_id = v_user_id;
    RETURN jsonb_build_object('ok', true, 'eco_mal_id', NULL);
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.user_cards uc
     WHERE uc.user_id = v_user_id
       AND uc.mal_id = p_mal_id
       AND uc.is_foil = true
  ) INTO v_possui;

  IF NOT v_possui THEN
    RETURN jsonb_build_object('erro', 'Você só pode equipar uma Carta Foil já conquistada na sua coleção.');
  END IF;

  UPDATE public.rpg_personagens
     SET eco_mal_id = p_mal_id
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'eco_mal_id', p_mal_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_equipar_eco(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_equipar_eco(INTEGER) TO authenticated;

-- Definição viva de rpg_estado_jogador() (baseada no sql/136, incluindo `eco_mal_id`).
CREATE OR REPLACE FUNCTION public.rpg_estado_jogador()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_personagem JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  SELECT jsonb_build_object(
           'nome', p.nome,
           'personagem_base', p.personagem_base,
           'criado_em', p.criado_em,
           'visual_equipado', p.visual_equipado,
           'desbloqueados', to_jsonb(p.desbloqueados),
           'esquadrao', COALESCE(to_jsonb(p.esquadrao), '[]'::JSONB),
           'eco_mal_id', p.eco_mal_id,
           'ultima_troca_em', p.ultima_troca_em)
    INTO v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

  IF v_personagem IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'personagem', NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'personagem', v_personagem,
    'xp_total', (SELECT COALESCE(sum(x.xp_earned), 0) FROM public.xp_ledger x WHERE x.user_id = v_user_id),
    'inventario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'quantidade', inv.quantidade,
               'aprimoramento', inv.aprimoramento,
               'rpg_itens', jsonb_build_object(
                 'id', i.id, 'slot', i.slot, 'nome', i.nome, 'descricao', i.descricao,
                 'raridade', i.raridade, 'vida', i.vida, 'ataque', i.ataque,
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo,
                 'magia', i.magia, 'velocidade', i.velocidade, 'critico_por_mil', i.critico_por_mil,
                 'dano_critico', i.dano_critico, 'esquiva_por_mil', i.esquiva_por_mil,
                 'classes', i.classes, 'personagem_exclusivo', i.personagem_exclusivo,
                 'conjunto', i.conjunto, 'elemento', i.elemento)))
        FROM public.rpg_inventario inv
        JOIN public.rpg_itens i ON i.id = inv.item_id AND i.ativo = true
       WHERE inv.user_id = v_user_id), '[]'::JSONB),
    'equipados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', e.slot, 'item_id', e.item_id))
        FROM public.rpg_equipados e
       WHERE e.user_id = v_user_id), '[]'::JSONB),
    'bilhetes', COALESCE((SELECT r.bilhetes FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'ouro', COALESCE((SELECT r.ouro FROM public.rpg_recursos r WHERE r.user_id = v_user_id), 0),
    'maestria', COALESCE((
      SELECT jsonb_object_agg(m.habilidade_id, m.usos)
        FROM public.rpg_maestria m
       WHERE m.user_id = v_user_id), '{}'::JSONB),
    'pontos', COALESCE((
      SELECT jsonb_build_object(
               'forca', p.forca, 'inteligencia', p.inteligencia, 'constituicao', p.constituicao,
               'agilidade', p.agilidade, 'destreza', p.destreza, 'sorte', p.sorte)
        FROM public.rpg_atributos p
       WHERE p.user_id = v_user_id), '{}'::JSONB),
    'cosmeticos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', ue.slot, 'store_items', jsonb_build_object('estilo', s.estilo)))
        FROM public.user_equipped ue
        JOIN public.store_items s ON s.id = ue.item_id
       WHERE ue.user_id = v_user_id AND ue.slot IN ('cenario', 'aura')), '[]'::JSONB),
    'skins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('store_items', jsonb_build_object(
               'id', s.id, 'nome', s.nome, 'estilo', s.estilo, 'tipo', s.tipo)))
        FROM public.user_items ui
        JOIN public.store_items s ON s.id = ui.item_id AND s.tipo = 'skin'
       WHERE ui.user_id = v_user_id), '[]'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_estado_jogador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_estado_jogador() TO authenticated;

NOTIFY pgrst, 'reload schema';
