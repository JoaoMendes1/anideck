-- =============================================================================
-- 084 — Maestria de habilidades
-- =============================================================================
--
-- O que muda:
--   1. rpg_maestria guarda quantas vezes o jogador usou cada habilidade em batalha.
--   2. rpg_registrar_maestria() soma os usos de uma batalha. Só o service role chama.
--   3. rpg_estado_jogador() devolve também os usos (`maestria`: id da habilidade -> usos).
--
-- Os graus (I a IV, com 20, 60 e 150 usos) e o bônus (+10% de força por grau acima do I)
-- ficam no Go (rpg_maestria.go). O banco só conta. A maestria é do jogador, por habilidade;
-- como cada classe do elenco tem habilidades próprias, cada personagem tem a sua maestria, e
-- ela continua lá quando o jogador volta a ele.
--
-- Os usos chegam depois da batalha gravada, numa chamada à parte: perder essa chamada só
-- deixa de contar alguns usos, e não muda a batalha nem a recompensa.
--
-- ORDEM: depois do sql/083 e ANTES de promover o código da issue #242. rpg_estado_jogador é
-- redefinida aqui (a definição viva era a do sql/083).
--
-- Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_maestria (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habilidade_id  TEXT NOT NULL,
  usos           INTEGER NOT NULL DEFAULT 0,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, habilidade_id),
  CONSTRAINT rpg_maestria_usos CHECK (usos >= 0),
  CONSTRAINT rpg_maestria_id CHECK (char_length(habilidade_id) BETWEEN 1 AND 64)
);

ALTER TABLE public.rpg_maestria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_maestria_le_o_proprio ON public.rpg_maestria;
CREATE POLICY rpg_maestria_le_o_proprio ON public.rpg_maestria
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_maestria FROM anon, authenticated;
GRANT SELECT ON public.rpg_maestria TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rpg_maestria TO service_role;

-- =============================================================================
-- Registrar usos
-- =============================================================================
-- p_usos é um objeto {"id_da_habilidade": usos}. Chave vazia, longa demais ou valor não
-- positivo é ignorado. Uma batalha tem no máximo 20 rodadas; o teto de 40 por habilidade
-- impede que um valor errado infle a maestria.

CREATE OR REPLACE FUNCTION public.rpg_registrar_maestria(p_user_id UUID, p_usos JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_chave TEXT;
  v_valor JSONB;
  v_usos  INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_usos IS NULL OR jsonb_typeof(p_usos) <> 'object' THEN
    RETURN jsonb_build_object('erro', 'Pedido inválido.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  FOR v_chave, v_valor IN SELECT * FROM jsonb_each(p_usos) LOOP
    CONTINUE WHEN v_chave IS NULL OR char_length(v_chave) NOT BETWEEN 1 AND 64;
    CONTINUE WHEN jsonb_typeof(v_valor) <> 'number';
    v_usos := LEAST(40, floor((v_valor #>> '{}')::NUMERIC)::INTEGER);
    CONTINUE WHEN v_usos < 1;
    INSERT INTO public.rpg_maestria (user_id, habilidade_id, usos)
    VALUES (p_user_id, v_chave, v_usos)
    ON CONFLICT (user_id, habilidade_id) DO UPDATE
      SET usos = public.rpg_maestria.usos + EXCLUDED.usos,
          atualizado_em = now();
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_registrar_maestria(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_registrar_maestria(UUID, JSONB) TO service_role;

-- =============================================================================
-- Estado do jogador
-- =============================================================================
-- Igual à do sql/083, mais `maestria`.

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
           'visual_equipado', p.visual_equipado)
    INTO v_personagem
    FROM public.rpg_personagens p
   WHERE p.user_id = v_user_id;

  -- Quem não despertou não precisa do resto.
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
                 'defesa', i.defesa, 'nivel_minimo', i.nivel_minimo)))
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

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- BEGIN;
--   SELECT public.rpg_registrar_maestria('<UUID>', '{"golpe_firme": 3}'::jsonb);
--   SELECT usos FROM public.rpg_maestria WHERE user_id = '<UUID>';        -- 3
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_estado_jogador()->'maestria';                        -- {"golpe_firme": 3}
-- ROLLBACK;
