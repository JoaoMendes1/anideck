-- =============================================================================
-- 125 — Regras editáveis de HP/bilhetes, amizade mútua e contratos semanais
-- =============================================================================
--
-- O que muda:
--   1. app_settings.comunidade_regras ganha cinco campos configuráveis no Painel
--      Admin -> Moderação:
--        - hp_por_episodio_pct  (8%  padrão): % de HP recuperada por episódio assistido
--        - hp_episodios_por_dia (5   padrão): máximo de episódios que curam HP por dia
--        - hp_regen_hora_pct    (5%  padrão): % de regeneração passiva de HP por hora
--        - hp_pocao_pct         (30% padrão): % de HP recuperada pela Poção de HP
--        - bilhete_bonus_pct    (100% padrão): multiplicador de bilhetes de invocação
--   2. rpg_regras_vida() passa a ser STABLE e lê as regras da comunidade via
--      regra_comunidade(), preservando todas as 12 chaves existentes (antes no sql/114).
--   3. rpg_concluir_batalha() e rpg_concluir_masmorra() (antes no sql/118) escalam os
--      bilhetes ganhos com bilhete_bonus_pct.
--   4. social_resumo() (antes no sql/098) passa a devolver ele_me_segue e amigos
--      (verdadeiro quando os dois se seguem mutuamente).
--   5. Tabela rpg_contratos_resgatados e RPC rpg_resgatar_contrato() (service role)
--      para resgate atômico das recompensas dos Contratos de Caça semanais.
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Semente das novas regras em app_settings.comunidade_regras
-- =============================================================================

INSERT INTO public.app_settings (key, value) VALUES ('comunidade_regras', '{}')
ON CONFLICT (key) DO NOTHING;

UPDATE public.app_settings
   SET value = (jsonb_build_object(
         'hp_por_episodio_pct', 8,
         'hp_episodios_por_dia', 5,
         'hp_regen_hora_pct', 5,
         'hp_pocao_pct', 30,
         'bilhete_bonus_pct', 100
       ) || COALESCE(NULLIF(value, ''), '{}')::jsonb)::text
 WHERE key = 'comunidade_regras';

-- =============================================================================
-- 2. Regras de Vida dinâmicas (definição viva; antes sql/114)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_regras_vida()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'regen_por_hora',           GREATEST(0, COALESCE(public.regra_comunidade('hp_regen_hora_pct', 5)::INTEGER, 5) * 10),
    'por_episodio',             GREATEST(10, COALESCE(public.regra_comunidade('hp_por_episodio_pct', 8)::INTEGER, 8) * 10),
    'episodios_por_dia',        GREATEST(0, COALESCE(public.regra_comunidade('hp_episodios_por_dia', 5)::INTEGER, 5)),
    'pocao',                    GREATEST(50, COALESCE(public.regra_comunidade('hp_pocao_pct', 30)::INTEGER, 30) * 10),
    'pousada_horas',            4,
    'vida_minima_luta',         300,
    'queda_ouro_pct',           10,
    'inatividade_carencia_dias', 3,
    'inatividade_por_dia',      100,
    'inatividade_perda_maxima', 800,
    'pocao_mana',               25,
    'fonte_horas',              24
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_regras_vida() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_regras_vida() TO authenticated, service_role;

-- =============================================================================
-- 3. Bilhetes escaláveis na conclusão de batalha e masmorra (antes sql/118)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_concluir_batalha(
  p_user_id      UUID,
  p_monstro_id   TEXT,
  p_venceu       BOOLEAN,
  p_turnos       INTEGER,
  p_item_id      TEXT,
  p_vida_perdida INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_monstro  public.rpg_monstros%ROWTYPE;
  v_limite   INTEGER := public.rpg_limite_batalhas_dia();
  v_feitas   INTEGER;
  v_bilhetes INTEGER := 0;
  v_ouro     INTEGER := 0;
  v_item     TEXT := NULL;
  v_recursos public.rpg_recursos%ROWTYPE;
  v_perdida  INTEGER;
  v_vitorias INTEGER;
  v_marco    INTEGER;
  v_regras   JSONB := public.rpg_regras_vida();
  v_caiu     BOOLEAN := NOT COALESCE(p_venceu, false) AND COALESCE(p_vida_perdida, 0) >= 1000;
  v_perdido  INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  -- A mesma trava da rpg_registrar_batalha: as duas contam no mesmo limite do dia.
  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_batalha:' || p_user_id::TEXT, 0));

  v_feitas := public.rpg_contar_batalhas_hoje(p_user_id);
  IF v_feitas >= v_limite THEN
    RETURN jsonb_build_object('erro', 'Você já fez todas as batalhas de hoje. Volte amanhã.', 'limite_atingido', true);
  END IF;

  SELECT * INTO v_monstro FROM public.rpg_monstros WHERE id = p_monstro_id AND ativo = true;
  IF v_monstro.id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Monstro desconhecido.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);
  IF v_perdida > 1000 - (v_regras->>'vida_minima_luta')::INTEGER THEN
    RETURN jsonb_build_object('erro', 'Seu personagem precisa de pelo menos 30% de Vida para lutar. Descanse, assista a um episódio ou use a Pousada.', 'sem_vida', true);
  END IF;

  IF p_venceu THEN
    v_bilhetes := v_monstro.bilhetes;
    IF v_bilhetes > 0 THEN
      v_bilhetes := GREATEST(1, (v_bilhetes * public.regra_comunidade('bilhete_bonus_pct', 100)::INTEGER + 50) / 100);
    END IF;
    -- Bestiário: +10% de Ouro por marco (10, 50 e 150 vitórias antes desta).
    SELECT count(*)::INTEGER INTO v_vitorias
      FROM public.rpg_batalhas
     WHERE user_id = p_user_id AND monstro_id = v_monstro.id AND venceu;
    v_marco := (CASE WHEN v_vitorias >= 10 THEN 1 ELSE 0 END)
             + (CASE WHEN v_vitorias >= 50 THEN 1 ELSE 0 END)
             + (CASE WHEN v_vitorias >= 150 THEN 1 ELSE 0 END);
    v_ouro := ((5 + 2 * v_monstro.nivel) * (100 + 10 * v_marco) + 50) / 100;
    v_ouro := (v_ouro * public.regra_comunidade('ouro_recompensa_pct', 200)::INTEGER + 50) / 100;
    IF p_item_id IS NOT NULL AND btrim(p_item_id) <> '' THEN
      SELECT id INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true AND inicial = false;
    END IF;
  END IF;

  IF v_caiu THEN
    v_perdido := (v_recursos.ouro * (v_regras->>'queda_ouro_pct')::INTEGER) / 100;
  END IF;

  INSERT INTO public.rpg_batalhas (user_id, monstro_id, venceu, turnos, bilhetes, item_id, ouro, ouro_perdido)
  VALUES (p_user_id, v_monstro.id, p_venceu, GREATEST(COALESCE(p_turnos, 0), 0), v_bilhetes, v_item, v_ouro, v_perdido);

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
    'bilhetes_ganhos', v_bilhetes,
    'ouro_ganho', v_ouro,
    'ouro_perdido', v_perdido,
    'caiu', v_caiu,
    'item_id', v_item,
    'bilhetes', v_recursos.bilhetes,
    'ouro', v_recursos.ouro,
    'vida_perdida', v_recursos.vida_perdida,
    'feitas', v_feitas + 1,
    'limite', v_limite
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_concluir_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_concluir_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT, INTEGER) TO service_role;

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

  SELECT count(*)::INTEGER,
         COALESCE(sum(5 + 2 * m.nivel), 0)::INTEGER,
         COALESCE(sum(m.bilhetes), 0)::INTEGER
    INTO v_validos, v_ouro, v_bilhetes
    FROM unnest(COALESCE(p_vencidos, ARRAY[]::TEXT[])) AS v(id)
    JOIN public.rpg_monstros m ON m.id = v.id AND m.ativo;
  IF v_validos <> COALESCE(array_length(p_vencidos, 1), 0) THEN
    RETURN jsonb_build_object('erro', 'Masmorra com monstro desconhecido.');
  END IF;

  IF v_bilhetes > 0 THEN
    v_bilhetes := GREATEST(1, (v_bilhetes * public.regra_comunidade('bilhete_bonus_pct', 100)::INTEGER + 50) / 100);
  END IF;
  v_ouro := (v_ouro * public.regra_comunidade('ouro_recompensa_pct', 200)::INTEGER + 50) / 100;
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
-- 4. Seguimento mútuo = amigos (definição viva; antes sql/098)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.social_resumo(p_eu UUID, p_handle TEXT)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
           'seguidores', (SELECT count(*) FROM public.seguidores s WHERE s.seguido_id = p.user_id),
           'seguindo',   (SELECT count(*) FROM public.seguidores s WHERE s.seguidor_id = p.user_id),
           'eu_sigo',    p_eu IS NOT NULL AND EXISTS (
                           SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = p_eu AND s.seguido_id = p.user_id),
           'ele_me_segue', p_eu IS NOT NULL AND EXISTS (
                           SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = p.user_id AND s.seguido_id = p_eu),
           'amigos',     p_eu IS NOT NULL
                         AND EXISTS (SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = p_eu AND s.seguido_id = p.user_id)
                         AND EXISTS (SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = p.user_id AND s.seguido_id = p_eu),
           'sou_eu',     p_eu IS NOT NULL AND p_eu = p.user_id,
           'mostra_atividade', p.mostrar_atividade
         )
    FROM public.profiles p
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
$$;

REVOKE ALL ON FUNCTION public.social_resumo(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_resumo(UUID, TEXT) TO service_role;

-- =============================================================================
-- 5. Contratos semanais de caça
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_contratos_resgatados (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana       DATE NOT NULL,
  contrato_id  TEXT NOT NULL,
  ouro         INTEGER NOT NULL DEFAULT 0,
  bilhetes     INTEGER NOT NULL DEFAULT 0,
  materiais    JSONB NOT NULL DEFAULT '{}'::JSONB,
  resgatado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, semana, contrato_id)
);

ALTER TABLE public.rpg_contratos_resgatados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_contratos_le_o_proprio ON public.rpg_contratos_resgatados;
CREATE POLICY rpg_contratos_le_o_proprio ON public.rpg_contratos_resgatados
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.rpg_contratos_resgatados FROM anon, authenticated;
GRANT SELECT ON TABLE public.rpg_contratos_resgatados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rpg_contratos_resgatados TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_resgatar_contrato(
  p_user_id     UUID,
  p_semana      DATE,
  p_contrato_id TEXT,
  p_ouro        INTEGER,
  p_bilhetes    INTEGER,
  p_materiais   JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserido       TEXT;
  v_ouro           INTEGER := GREATEST(0, COALESCE(p_ouro, 0));
  v_bilhetes       INTEGER := GREATEST(0, COALESCE(p_bilhetes, 0));
  v_ouro_total     INTEGER;
  v_bilhetes_total INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  IF p_semana IS NULL OR p_contrato_id IS NULL OR length(btrim(p_contrato_id)) NOT BETWEEN 1 AND 60 THEN
    RETURN jsonb_build_object('erro', 'Contrato inválido.');
  END IF;
  IF v_ouro > 2000 OR v_bilhetes > 20 THEN
    RETURN jsonb_build_object('erro', 'Recompensa fora do limite.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_contrato:' || p_user_id::TEXT || ':' || p_semana::TEXT || ':' || p_contrato_id, 0));

  INSERT INTO public.rpg_contratos_resgatados (user_id, semana, contrato_id, ouro, bilhetes, materiais)
  VALUES (p_user_id, p_semana, btrim(p_contrato_id), v_ouro, v_bilhetes, COALESCE(p_materiais, '{}'::JSONB))
  ON CONFLICT (user_id, semana, contrato_id) DO NOTHING
  RETURNING contrato_id INTO v_inserido;

  IF v_inserido IS NULL THEN
    RETURN jsonb_build_object('erro', 'Contrato já resgatado nesta semana.', 'ja_resgatado', true);
  END IF;

  INSERT INTO public.rpg_recursos (user_id, ouro, bilhetes)
  VALUES (p_user_id, v_ouro, v_bilhetes)
  ON CONFLICT (user_id) DO UPDATE
    SET ouro = public.rpg_recursos.ouro + EXCLUDED.ouro,
        bilhetes = public.rpg_recursos.bilhetes + EXCLUDED.bilhetes,
        atualizado_em = now()
  RETURNING ouro, bilhetes INTO v_ouro_total, v_bilhetes_total;

  IF p_materiais IS NOT NULL AND jsonb_typeof(p_materiais) = 'object'
     AND EXISTS (SELECT 1 FROM jsonb_object_keys(p_materiais)) THEN
    PERFORM public.rpg_somar_materiais(p_user_id, p_materiais);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ouro_ganho', v_ouro,
    'bilhetes_ganhos', v_bilhetes,
    'ouro', v_ouro_total,
    'bilhetes', v_bilhetes_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_resgatar_contrato(UUID, DATE, TEXT, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_resgatar_contrato(UUID, DATE, TEXT, INTEGER, INTEGER, JSONB) TO service_role;
