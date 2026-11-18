-- =============================================================================
-- 118 — Mana gasta nas lutas
-- =============================================================================
--
-- Até aqui a Mana só era gasta em comentários. Agora cada luta custa Mana: expedição, duelo,
-- chefe do clã e masmorra. O custo é uma porcentagem da Mana máxima, definida nas regras da
-- comunidade (Painel › Moderação), e o Go (rpg_mana.go) cobra antes de registrar a luta e
-- devolve se o registro falhar.
--
-- Junto, a escala nova da Mana e do Ouro, porque números pequenos davam sensação de jogo
-- lento e recompensa baixa:
--   Mana: 120 no nível 1, +12 por nível, até 999 (era 50, +1, até 120); recarga de metade
--   da base por dia, que cresce com a Mana máxima; comentário custa 12;
--   lutas: expedição e duelo 5%, chefe do clã 8%, masmorra 12% da Mana máxima;
--   Poção de Mana: 40% da Mana máxima (era +25 fixo);
--   Ouro de expedição e masmorra: 200% do que era (regra ouro_recompensa_pct).
-- Tudo isso fica em app_settings.comunidade_regras e muda pelo Painel sem SQL novo.
--
-- rpg_mana_lutar(usuario, quantia): quantia positiva cobra; sem Mana suficiente, nada muda e
-- volta {erro, mana_insuficiente}. Quantia negativa devolve, até o máximo. A linha do perfil
-- fica travada durante a conta, para dois toques seguidos não gastarem a mesma Mana.
--
-- Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.rpg_mana_lutar(p_user_id UUID, p_quantia NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mana   NUMERIC;
  v_maxima NUMERIC;
  v_nova   NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_quantia IS NULL OR p_quantia = 0 THEN
    RETURN jsonb_build_object('erro', 'Quantia inválida.');
  END IF;

  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  v_mana := public.mana_atual(p_user_id);
  IF v_mana IS NULL THEN
    RETURN jsonb_build_object('erro', 'Crie seu perfil na Comunidade para ter Mana.', 'mana_insuficiente', true);
  END IF;
  v_maxima := COALESCE(public.mana_maxima(p_user_id), 50);

  IF p_quantia > 0 AND v_mana < p_quantia THEN
    RETURN jsonb_build_object(
      'erro', format('Mana insuficiente: esta luta custa %s e você tem %s.', p_quantia, floor(v_mana)),
      'mana_insuficiente', true,
      'mana', floor(v_mana),
      'custo', p_quantia
    );
  END IF;

  v_nova := LEAST(v_maxima, v_mana - p_quantia);
  UPDATE public.profiles SET mp_atual = v_nova, mp_em = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'mana', floor(v_nova));
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_mana_lutar(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_mana_lutar(UUID, NUMERIC) TO service_role;

-- =============================================================================
-- Escala nova nas regras da comunidade (mesclada: o que não está aqui fica como está)
-- =============================================================================

INSERT INTO public.app_settings (key, value) VALUES ('comunidade_regras', '{}')
ON CONFLICT (key) DO NOTHING;

UPDATE public.app_settings
   SET value = (COALESCE(NULLIF(value, ''), '{}')::jsonb || jsonb_build_object(
         'mp_max', 120,
         'mp_por_nivel', 12,
         'mp_max_teto', 999,
         'mp_regen_dia', 60,
         'mp_custo_comentario', 12,
         'mp_custo_expedicao_pct', 5,
         'mp_custo_duelo_pct', 5,
         'mp_custo_chefe_pct', 8,
         'mp_custo_masmorra_pct', 12,
         'mp_pocao_pct', 40,
         'ouro_recompensa_pct', 200
       ))::text
 WHERE key = 'comunidade_regras';

-- =============================================================================
-- Ouro de expedição multiplicado (definição viva; antes sql/090)
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
  -- Vida mínima para lutar: quem cai só volta com 30% (regra do dono, 17/11/2026).
  IF v_perdida > 1000 - (v_regras->>'vida_minima_luta')::INTEGER THEN
    RETURN jsonb_build_object('erro', 'Seu personagem precisa de pelo menos 30% de Vida para lutar. Descanse, assista a um episódio ou use a Pousada.', 'sem_vida', true);
  END IF;

  IF p_venceu THEN
    v_bilhetes := v_monstro.bilhetes;
    -- Bestiário: +10% de Ouro por marco (10, 50 e 150 vitórias antes desta). O Go mostra a
    -- mesma conta (rpg_bestiario.go).
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

  -- Queda: perde 10% do Ouro guardado, arredondado para baixo. A batalha guarda quanto foi.
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

-- =============================================================================
-- Ouro de masmorra multiplicado (definição viva; antes sql/091)
-- =============================================================================

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
-- Poção de Mana em porcentagem da Mana máxima (definição viva; antes sql/114)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_recuperar_vida(p_user_id UUID, p_tipo TEXT, p_custo INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_regras   JSONB := public.rpg_regras_vida();
  v_recursos public.rpg_recursos%ROWTYPE;
  v_perdida  INTEGER;
  v_volta    INTEGER := 0;
  v_livre_em TIMESTAMPTZ;
  v_mana     NUMERIC;
  v_mana_max NUMERIC;
  v_mana_nova NUMERIC;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('pousada', 'pocao', 'pocao_mana', 'fonte') THEN
    RETURN jsonb_build_object('erro', 'Escolha a Pousada, a Fonte termal ou uma Poção.');
  END IF;
  IF p_custo IS NULL OR p_custo < 1 THEN
    RETURN jsonb_build_object('erro', 'Custo inválido.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = p_user_id FOR UPDATE;
  v_perdida := public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em);

  IF p_tipo IN ('pocao_mana', 'fonte') THEN
    v_mana := COALESCE(public.mana_atual(p_user_id), 0);
    v_mana_max := COALESCE(public.mana_maxima(p_user_id), 50);
  END IF;

  IF p_tipo IN ('pousada', 'pocao') AND v_perdida = 0 THEN
    RETURN jsonb_build_object('erro', 'Seu HP já está cheio.', 'vida_cheia', true);
  END IF;
  IF p_tipo = 'pocao_mana' AND v_mana >= v_mana_max THEN
    RETURN jsonb_build_object('erro', 'Sua Mana já está cheia.', 'mana_cheia', true);
  END IF;
  IF p_tipo = 'fonte' AND v_perdida = 0 AND v_mana >= v_mana_max THEN
    RETURN jsonb_build_object('erro', 'HP e Mana já estão cheios.', 'vida_cheia', true);
  END IF;

  IF p_tipo = 'pousada' AND v_recursos.pousada_em IS NOT NULL THEN
    v_livre_em := v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER);
    IF v_livre_em > now() THEN
      RETURN jsonb_build_object('erro', 'A Pousada ainda não tem quarto livre para você.', 'em_espera', true, 'pousada_livre_em', v_livre_em);
    END IF;
  END IF;
  IF p_tipo = 'fonte' AND v_recursos.fonte_em IS NOT NULL THEN
    v_livre_em := v_recursos.fonte_em + make_interval(hours => (v_regras->>'fonte_horas')::INTEGER);
    IF v_livre_em > now() THEN
      RETURN jsonb_build_object('erro', 'A Fonte termal só abre de novo amanhã para você.', 'em_espera', true, 'fonte_livre_em', v_livre_em);
    END IF;
  END IF;

  IF v_recursos.ouro < p_custo THEN
    RETURN jsonb_build_object('erro', 'Ouro insuficiente. Vença expedições para ganhar mais.', 'sem_ouro', true);
  END IF;

  v_volta := CASE p_tipo
    WHEN 'pousada' THEN v_perdida
    WHEN 'fonte' THEN v_perdida
    WHEN 'pocao' THEN LEAST(v_perdida, (v_regras->>'pocao')::INTEGER)
    ELSE 0
  END;

  INSERT INTO public.rpg_recuperacoes (user_id, origem, vida, ouro_gasto)
  VALUES (p_user_id, p_tipo || ':' || extract(epoch FROM clock_timestamp())::TEXT, v_volta, p_custo);

  UPDATE public.rpg_recursos
     SET ouro = ouro - p_custo,
         vida_perdida = v_perdida - v_volta,
         vida_em = now(),
         pousada_em = CASE WHEN p_tipo = 'pousada' THEN now() ELSE pousada_em END,
         fonte_em = CASE WHEN p_tipo = 'fonte' THEN now() ELSE fonte_em END,
         atualizado_em = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_recursos;

  IF p_tipo IN ('pocao_mana', 'fonte') THEN
    v_mana_nova := CASE p_tipo WHEN 'fonte' THEN v_mana_max
                   ELSE LEAST(v_mana_max, v_mana + ceil(v_mana_max * public.regra_comunidade('mp_pocao_pct', 40) / 100)) END;
    UPDATE public.profiles SET mp_atual = v_mana_nova, mp_em = now() WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'vida_recuperada', v_volta,
    'vida_perdida', v_recursos.vida_perdida,
    'mana', v_mana_nova,
    'ouro', v_recursos.ouro
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_recuperar_vida(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_recuperar_vida(UUID, TEXT, INTEGER) TO service_role;
