-- =============================================================================
-- 114 — Um HP só: a Vitalidade da conta passa a ser a Vida do personagem
-- =============================================================================
--
-- Antes havia duas "vidas": a Vitalidade da barra do topo (calculada pelos dias com
-- episódio nas últimas 2 semanas) e a Vida do personagem do RPG (dano das batalhas). O dono
-- pediu uma só, como num RPG: o jogador tem um HP e um MP.
--
-- O que muda:
--   1. vitalidade_atual() passa a ler a Vida guardada em rpg_recursos (100 − perda/10).
--      Bônus de XP, recarga de Mana e a barra do topo continuam chamando a mesma função, e
--      por isso passam a usar o HP único sem outra mudança.
--   2. A Vida regenera sozinha (5% por hora), cura com episódio, Pousada e Poção, como antes,
--      e cai nas batalhas. Novidade: a inatividade. Quem passa 3 dias sem marcar episódio
--      perde 10% por dia, até o piso de 20%, e a regeneração fica parada até voltar a
--      assistir. O Modo Descanso protege, como protegia a Vitalidade.
--   3. Poção de Mana e Fonte termal (HP e Mana cheios, uma vez a cada 24 horas) em
--      rpg_recuperar_vida. O preço continua vindo do Go, pelo nível.
--
-- Pausa da regeneração: rpg_vida_perdida_agora calcula a regeneração por (agora − vida_em),
-- e com vida_em no futuro ela fica em zero. A tarefa diária de inatividade empurra vida_em
-- um dia para a frente; marcar episódio (gatilho do sql/081) devolve vida_em para agora.
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Regras (mantém as chaves do sql/090)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_regras_vida()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'regen_por_hora', 50,              -- 5% da Vida máxima por hora
    'por_episodio', 80,                -- 8% por episódio com XP real
    'episodios_por_dia', 5,            -- até 40% por dia assistindo
    'pocao', 300,                      -- a Poção recupera 30%
    'pousada_horas', 4,                -- a Pousada vale uma vez a cada 4 horas
    'vida_minima_luta', 300,           -- precisa de 30% da Vida para começar uma batalha
    'queda_ouro_pct', 10,              -- a queda custa 10% do Ouro guardado
    'inatividade_carencia_dias', 3,    -- 3 dias sem episódio antes de começar a cair
    'inatividade_por_dia', 100,        -- depois, 10% por dia
    'inatividade_perda_maxima', 800,   -- a inatividade sozinha nunca passa de 80% perdidos
    'pocao_mana', 25,                  -- a Poção de Mana devolve 25 de Mana
    'fonte_horas', 24                  -- a Fonte termal vale uma vez a cada 24 horas
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_regras_vida() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_regras_vida() TO authenticated, service_role;

ALTER TABLE public.rpg_recursos
  ADD COLUMN IF NOT EXISTS fonte_em       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inatividade_em DATE;

-- =============================================================================
-- 2. A Vitalidade é a Vida
-- =============================================================================
-- Sem linha em rpg_recursos (quem nunca perdeu Vida), o HP está cheio.

CREATE OR REPLACE FUNCTION public.vitalidade_atual(p_user uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT 100 - ceil(public.rpg_vida_perdida_agora(r.vida_perdida, r.vida_em) / 10.0)::integer
       FROM public.rpg_recursos r
      WHERE r.user_id = p_user),
    100
  );
$$;

REVOKE ALL ON FUNCTION public.vitalidade_atual(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vitalidade_atual(uuid) TO service_role, authenticated;

-- =============================================================================
-- 3. Inatividade (tarefa diária, service role)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_aplicar_inatividade()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_regras   JSONB := public.rpg_regras_vida();
  v_carencia INTEGER := (v_regras->>'inatividade_carencia_dias')::INTEGER;
  v_por_dia  INTEGER := (v_regras->>'inatividade_por_dia')::INTEGER;
  v_maxima   INTEGER := (v_regras->>'inatividade_perda_maxima')::INTEGER;
  v_hoje     DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total    INTEGER;
BEGIN
  -- Quem tem episódio marcado e está há mais que a carência sem marcar outro.
  WITH inativos AS (
    SELECT ep.user_id
      FROM public.episode_progress ep
     WHERE ep.watched_at IS NOT NULL
     GROUP BY ep.user_id
    HAVING max(ep.watched_at) < now() - make_interval(days => v_carencia)
  ),
  fora_do_descanso AS (
    SELECT i.user_id
      FROM inativos i
      LEFT JOIN public.profiles p ON p.user_id = i.user_id
     WHERE NOT (p.descanso_inicio IS NOT NULL AND p.descanso_fim IS NOT NULL
                AND v_hoje BETWEEN p.descanso_inicio::date AND p.descanso_fim::date)
  )
  INSERT INTO public.rpg_recursos (user_id)
  SELECT user_id FROM fora_do_descanso
  ON CONFLICT (user_id) DO NOTHING;

  WITH inativos AS (
    SELECT ep.user_id
      FROM public.episode_progress ep
     WHERE ep.watched_at IS NOT NULL
     GROUP BY ep.user_id
    HAVING max(ep.watched_at) < now() - make_interval(days => v_carencia)
  )
  UPDATE public.rpg_recursos r
     SET vida_perdida = GREATEST(
           public.rpg_vida_perdida_agora(r.vida_perdida, r.vida_em),
           LEAST(v_maxima, public.rpg_vida_perdida_agora(r.vida_perdida, r.vida_em) + v_por_dia)
         ),
         -- Regeneração parada por um dia; marcar episódio a libera de novo.
         vida_em = now() + INTERVAL '1 day',
         inatividade_em = v_hoje,
         atualizado_em = now()
    FROM inativos i
    LEFT JOIN public.profiles p ON p.user_id = i.user_id
   WHERE r.user_id = i.user_id
     AND (r.inatividade_em IS NULL OR r.inatividade_em < v_hoje)
     AND NOT (p.descanso_inicio IS NOT NULL AND p.descanso_fim IS NOT NULL
              AND v_hoje BETWEEN p.descanso_inicio::date AND p.descanso_fim::date);
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_aplicar_inatividade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_aplicar_inatividade() TO service_role;

-- =============================================================================
-- 4. Pousada, Poção, Poção de Mana e Fonte termal
-- =============================================================================
-- Definição viva (antes no sql/081). Mesmas regras de antes para Pousada e Poção.

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
                   ELSE LEAST(v_mana_max, v_mana + (v_regras->>'pocao_mana')::INTEGER) END;
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
