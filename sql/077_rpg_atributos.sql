-- 077_rpg_atributos.sql
-- Fase 18 (#227): atributos primários com pontos distribuídos pelo jogador.
--
-- 1. rpg_atributos: os pontos que o jogador pôs em cada atributo primário
-- 2. rpg_distribuir_pontos(...): grava a distribuição inteira, conferindo o nível
-- 3. rpg_estado_jogador(): a leitura única do sql/076 passa a trazer os pontos
--
-- Só os pontos são gravados. O valor de cada atributo (base do nível + pontos) e os
-- derivados (Vida, Ataque, Éter, Crítico...) são calculados no Go a cada leitura, como os
-- do sql/071. O jogador ganha 1 ponto a cada 2 níveis (nível / 2, arredondado para baixo),
-- a mesma conta de PontosDisponiveis no Go.
--
-- Redistribuir é livre: a função recebe a distribuição inteira, não um "+1".
-- Quando o nível cai (episódio desmarcado), os pontos gravados podem passar do que o nível
-- dá. Nada é apagado: o Go corta o excesso na leitura, numa ordem fixa, e a próxima
-- distribuição grava dentro do limite.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Pontos por jogador
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_atributos (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  forca         INTEGER NOT NULL DEFAULT 0,
  inteligencia  INTEGER NOT NULL DEFAULT 0,
  constituicao  INTEGER NOT NULL DEFAULT 0,
  agilidade     INTEGER NOT NULL DEFAULT 0,
  destreza      INTEGER NOT NULL DEFAULT 0,
  sorte         INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rpg_atributos_nao_negativos CHECK (
    forca >= 0 AND inteligencia >= 0 AND constituicao >= 0
    AND agilidade >= 0 AND destreza >= 0 AND sorte >= 0)
);

ALTER TABLE public.rpg_atributos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_atributos_le_o_proprio ON public.rpg_atributos;
CREATE POLICY rpg_atributos_le_o_proprio ON public.rpg_atributos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Sem escrita direta: ponto só entra pela função, que confere o nível.
REVOKE ALL ON public.rpg_atributos FROM anon, authenticated;
GRANT SELECT ON public.rpg_atributos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_atributos TO service_role;

-- =============================================================================
-- 2. Distribuir
-- =============================================================================
-- O nível vem de calcular_nivel_usuario (sql/054), a mesma conta do Go: o total de pontos
-- não pode passar de nível / 2.

CREATE OR REPLACE FUNCTION public.rpg_distribuir_pontos(
  p_forca INTEGER, p_inteligencia INTEGER, p_constituicao INTEGER,
  p_agilidade INTEGER, p_destreza INTEGER, p_sorte INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_disponiveis INTEGER;
  v_total       INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o personagem antes.');
  END IF;

  IF p_forca IS NULL OR p_inteligencia IS NULL OR p_constituicao IS NULL
     OR p_agilidade IS NULL OR p_destreza IS NULL OR p_sorte IS NULL
     OR LEAST(p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte) < 0 THEN
    RETURN jsonb_build_object('erro', 'Pontos inválidos.');
  END IF;

  v_disponiveis := public.calcular_nivel_usuario(v_user_id) / 2;
  v_total := p_forca + p_inteligencia + p_constituicao + p_agilidade + p_destreza + p_sorte;
  IF v_total > v_disponiveis THEN
    RETURN jsonb_build_object('erro', format('Você tem %s pontos para distribuir.', v_disponiveis));
  END IF;

  INSERT INTO public.rpg_atributos AS a
    (user_id, forca, inteligencia, constituicao, agilidade, destreza, sorte)
  VALUES (v_user_id, p_forca, p_inteligencia, p_constituicao, p_agilidade, p_destreza, p_sorte)
  ON CONFLICT (user_id) DO UPDATE SET
    forca = EXCLUDED.forca, inteligencia = EXCLUDED.inteligencia,
    constituicao = EXCLUDED.constituicao, agilidade = EXCLUDED.agilidade,
    destreza = EXCLUDED.destreza, sorte = EXCLUDED.sorte, atualizado_em = now();

  RETURN jsonb_build_object('ok', true, 'usados', v_total, 'disponiveis', v_disponiveis);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_distribuir_pontos(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- =============================================================================
-- 3. Leitura única com os pontos
-- =============================================================================
-- Mesma função do sql/076, com o campo `pontos` a mais. Objeto vazio é quem nunca
-- distribuiu.

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
