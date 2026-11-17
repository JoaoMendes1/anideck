-- =============================================================================
-- 091 — Masmorras
-- =============================================================================
--
-- Masmorras são andares seguidos com monstros do catálogo (a lista fica no Go,
-- rpg_masmorras.go). Uma por dia, em qualquer masmorra, e fora do limite de batalhas das
-- expedições. A simulação roda no Go; aqui fica o registro e a conta da recompensa.
--
-- 1. rpg_masmorras_execucoes: uma linha por usuário e dia (UNIQUE), com o que a masmorra
--    deu e custou.
-- 2. rpg_concluir_masmorra(), só para o service role:
--    - recusa a segunda do dia e quem está abaixo da Vida mínima (sql/090);
--    - o Ouro e os bilhetes saem do catálogo, pelos monstros vencidos (5 + 2 × nível por
--      andar), e não do que o Go mandar; completar soma o bônus;
--    - a queda custa a mesma fração do Ouro da batalha comum;
--    - o item do baú só entra se for ativo e fora do kit inicial.
--
-- Ordem: depois do 090, antes de promover. Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_masmorras_execucoes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  masmorra_id  TEXT NOT NULL CHECK (length(masmorra_id) BETWEEN 1 AND 40),
  dia          DATE NOT NULL,
  andares      INTEGER NOT NULL DEFAULT 0 CHECK (andares >= 0),
  completou    BOOLEAN NOT NULL DEFAULT false,
  ouro         INTEGER NOT NULL DEFAULT 0 CHECK (ouro >= 0),
  ouro_perdido INTEGER NOT NULL DEFAULT 0 CHECK (ouro_perdido >= 0),
  bilhetes     INTEGER NOT NULL DEFAULT 0 CHECK (bilhetes >= 0),
  item_id      TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia)
);

ALTER TABLE public.rpg_masmorras_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_masmorras_le_o_proprio ON public.rpg_masmorras_execucoes;
CREATE POLICY rpg_masmorras_le_o_proprio ON public.rpg_masmorras_execucoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.rpg_masmorras_execucoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rpg_masmorras_execucoes TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_concluir_masmorra(
  p_user_id      UUID,
  p_masmorra_id  TEXT,
  p_vencidos     TEXT[],
  p_completou    BOOLEAN,
  p_caiu         BOOLEAN,
  p_bonus_pct    INTEGER,
  p_item_id      TEXT,
  p_vida_perdida INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_regras   JSONB := public.rpg_regras_vida();
  v_dia      DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_recursos public.rpg_recursos%ROWTYPE;
  v_perdida  INTEGER;
  v_ouro     INTEGER := 0;
  v_bilhetes INTEGER := 0;
  v_perdido  INTEGER := 0;
  v_item     TEXT := NULL;
  v_validos  INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  IF p_masmorra_id IS NULL OR length(p_masmorra_id) NOT BETWEEN 1 AND 40 THEN
    RETURN jsonb_build_object('erro', 'Masmorra desconhecida.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_masmorra:' || p_user_id::TEXT, 0));

  IF EXISTS (SELECT 1 FROM public.rpg_masmorras_execucoes WHERE user_id = p_user_id AND dia = v_dia) THEN
    RETURN jsonb_build_object('erro', 'Você já entrou numa masmorra hoje. Volte amanhã.', 'ja_feita', true);
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);
  IF v_perdida > 1000 - (v_regras->>'vida_minima_luta')::INTEGER THEN
    RETURN jsonb_build_object('erro', 'Seu personagem precisa de pelo menos 30% de Vida para entrar.', 'sem_vida', true);
  END IF;

  -- Recompensa pelos monstros vencidos, contada pelo catálogo (um andar pode repetir monstro).
  SELECT count(*)::INTEGER,
         COALESCE(sum(5 + 2 * m.nivel), 0)::INTEGER,
         COALESCE(sum(m.bilhetes), 0)::INTEGER
    INTO v_validos, v_ouro, v_bilhetes
    FROM unnest(COALESCE(p_vencidos, ARRAY[]::TEXT[])) AS v(id)
    JOIN public.rpg_monstros m ON m.id = v.id AND m.ativo;
  IF v_validos <> COALESCE(array_length(p_vencidos, 1), 0) THEN
    RETURN jsonb_build_object('erro', 'Masmorra com monstro desconhecido.');
  END IF;

  IF COALESCE(p_completou, false) THEN
    v_ouro := v_ouro + (v_ouro * LEAST(GREATEST(COALESCE(p_bonus_pct, 0), 0), 100)) / 100;
    IF p_item_id IS NOT NULL AND btrim(p_item_id) <> '' THEN
      SELECT id INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true AND inicial = false;
    END IF;
  END IF;

  IF COALESCE(p_caiu, false) THEN
    v_perdido := ((v_recursos.ouro + v_ouro) * (v_regras->>'queda_ouro_pct')::INTEGER) / 100;
  END IF;

  INSERT INTO public.rpg_masmorras_execucoes (user_id, masmorra_id, dia, andares, completou, ouro, ouro_perdido, bilhetes, item_id)
  VALUES (p_user_id, p_masmorra_id, v_dia, v_validos, COALESCE(p_completou, false), v_ouro, v_perdido, v_bilhetes, v_item);

  UPDATE public.rpg_recursos
     SET bilhetes = bilhetes + v_bilhetes,
         ouro = ouro + v_ouro - v_perdido,
         vida_perdida = GREATEST(0, LEAST(1000, COALESCE(p_vida_perdida, 0))),
         vida_em = now(),
         atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  IF v_item IS NOT NULL THEN
    INSERT INTO public.rpg_inventario (user_id, item_id)
    VALUES (p_user_id, v_item)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET quantidade = public.rpg_inventario.quantidade + 1;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ouro_ganho', v_ouro,
    'ouro_perdido', v_perdido,
    'bilhetes_ganhos', v_bilhetes,
    'item_id', v_item,
    'ouro', v_recursos.ouro,
    'bilhetes', v_recursos.bilhetes,
    'vida_perdida', v_recursos.vida_perdida
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_concluir_masmorra(UUID, TEXT, TEXT[], BOOLEAN, BOOLEAN, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_concluir_masmorra(UUID, TEXT, TEXT[], BOOLEAN, BOOLEAN, INTEGER, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- Depois de entrar numa masmorra no app:
-- SELECT masmorra_id, andares, completou, ouro, ouro_perdido, bilhetes, item_id
--   FROM public.rpg_masmorras_execucoes ORDER BY id DESC LIMIT 3;
