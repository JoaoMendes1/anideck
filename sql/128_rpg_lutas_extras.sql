-- 128_rpg_lutas_extras.sql
-- Fase 18: comprar lutas extras com Ouro depois do limite do dia.
--
-- 1. rpg_lutas_extras: o que cada jogador comprou em cada dia (expedição e masmorra)
-- 2. rpg_extras_de_hoje(user, tipo) e rpg_preco_luta_extra(tipo, nível, já compradas)
-- 3. rpg_contar_batalhas_hoje desconta as expedições extras: todas as funções que comparam
--    "feitas" com o limite passam a aceitar a luta comprada sem serem reescritas
-- 4. Masmorra: a trava "uma por dia" deixa de ser UNIQUE(user_id, dia) e passa a contar as
--    entradas do dia contra 1 + extras; rpg_concluir_masmorra (sql/125) muda só nessa conferência
-- 5. rpg_comprar_luta_extra(tipo) e rpg_lutas_extras_hoje() para a tela
--
-- Paga com Ouro, nunca com AniCoins: lutar mais dá poder (regra do projeto). O preço sobe 50% a
-- cada compra no mesmo dia e fica acima do Ouro de uma vitória, para não virar fonte de Ouro.
-- Expedição: 20 + 6 × nível, até 5 por dia. Masmorra: 150 + 25 × nível, até 2 por dia.
--
-- Depende do 072, 081, 091 e 125. Idempotente.

-- =============================================================================
-- 1. Compras do dia
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_lutas_extras (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia        DATE NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('expedicao', 'masmorra')),
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  ouro_gasto INTEGER NOT NULL DEFAULT 0 CHECK (ouro_gasto >= 0),
  PRIMARY KEY (user_id, dia, tipo)
);

ALTER TABLE public.rpg_lutas_extras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpg_lutas_extras_le_o_proprio ON public.rpg_lutas_extras;
CREATE POLICY rpg_lutas_extras_le_o_proprio ON public.rpg_lutas_extras
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE ALL ON public.rpg_lutas_extras FROM anon, authenticated;
GRANT SELECT ON public.rpg_lutas_extras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_lutas_extras TO service_role;

-- =============================================================================
-- 2. Quantas extras hoje e quanto custa a próxima
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_extras_de_hoje(p_user_id UUID, p_tipo TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT quantidade FROM public.rpg_lutas_extras
                    WHERE user_id = p_user_id AND tipo = p_tipo
                      AND dia = (now() AT TIME ZONE 'America/Sao_Paulo')::DATE), 0);
$$;
REVOKE ALL ON FUNCTION public.rpg_extras_de_hoje(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_extras_de_hoje(UUID, TEXT) TO service_role;

-- Máximo de compras por dia. Repete MaximoLutasExtras no Go.
CREATE OR REPLACE FUNCTION public.rpg_maximo_lutas_extras(p_tipo TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_tipo WHEN 'expedicao' THEN 5 WHEN 'masmorra' THEN 2 ELSE 0 END;
$$;

-- Preço da próxima compra: base pelo nível, +50% por compra já feita hoje. Repete PrecoLutaExtra no Go.
CREATE OR REPLACE FUNCTION public.rpg_preco_luta_extra(p_tipo TEXT, p_nivel INTEGER, p_ja_compradas INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT ((CASE p_tipo WHEN 'masmorra' THEN 150 + 25 * GREATEST(p_nivel, 1)
                       ELSE 20 + 6 * GREATEST(p_nivel, 1) END)
          * (100 + 50 * GREATEST(p_ja_compradas, 0)) + 50) / 100;
$$;

-- =============================================================================
-- 3. Expedições: a contagem do dia desconta as extras
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_contar_batalhas_hoje(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT GREATEST(0, (SELECT count(*)::INTEGER
                        FROM public.rpg_batalhas
                       WHERE user_id = p_user_id
                         AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'))
                     - public.rpg_extras_de_hoje(p_user_id, 'expedicao'));
$$;
REVOKE ALL ON FUNCTION public.rpg_contar_batalhas_hoje(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_contar_batalhas_hoje(UUID) TO service_role;

-- =============================================================================
-- 4. Masmorras: mais de uma entrada por dia quando comprada
-- =============================================================================

ALTER TABLE public.rpg_masmorras_execucoes DROP CONSTRAINT IF EXISTS rpg_masmorras_execucoes_user_id_dia_key;
CREATE INDEX IF NOT EXISTS rpg_masmorras_execucoes_user_dia ON public.rpg_masmorras_execucoes (user_id, dia);

-- Igual ao sql/125; muda só a conferência de "já entrou hoje".
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

  -- Uma por dia, mais as entradas extras compradas hoje (sql/128).
  IF (SELECT count(*) FROM public.rpg_masmorras_execucoes WHERE user_id = p_user_id AND dia = v_dia)
     >= 1 + public.rpg_extras_de_hoje(p_user_id, 'masmorra') THEN
    RETURN jsonb_build_object('erro', 'Você já entrou numa masmorra hoje. Compre uma entrada extra ou volte amanhã.', 'ja_feita', true);
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
-- 5. Comprar e ler
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_comprar_luta_extra(p_tipo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_dia    DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_ja     INTEGER;
  v_preco  INTEGER;
  v_ouro   INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('expedicao', 'masmorra') THEN
    RETURN jsonb_build_object('erro', 'Tipo de luta desconhecido.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  -- Mesma trava das lutas: duas compras ao mesmo tempo não passam do máximo.
  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_luta_extra:' || v_user::TEXT, 0));

  -- Só compra quem já usou o limite do dia: a extra é para depois das diárias.
  IF p_tipo = 'expedicao' AND public.rpg_contar_batalhas_hoje(v_user) < public.rpg_limite_batalhas_dia() THEN
    RETURN jsonb_build_object('erro', 'Você ainda tem batalhas de hoje. Use-as antes de comprar.');
  END IF;
  IF p_tipo = 'masmorra' AND (SELECT count(*) FROM public.rpg_masmorras_execucoes WHERE user_id = v_user AND dia = v_dia)
                             < 1 + public.rpg_extras_de_hoje(v_user, 'masmorra') THEN
    RETURN jsonb_build_object('erro', 'Você ainda pode entrar numa masmorra hoje.');
  END IF;

  v_ja := public.rpg_extras_de_hoje(v_user, p_tipo);
  IF v_ja >= public.rpg_maximo_lutas_extras(p_tipo) THEN
    RETURN jsonb_build_object('erro', 'Você já comprou o máximo de hoje. Volte amanhã.', 'maximo', true);
  END IF;
  v_preco := public.rpg_preco_luta_extra(p_tipo, public.calcular_nivel_usuario(v_user), v_ja);

  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT ouro INTO v_ouro FROM public.rpg_recursos WHERE user_id = v_user FOR UPDATE;
  IF v_ouro < v_preco THEN
    RETURN jsonb_build_object('erro', format('Faltam %s de Ouro.', v_preco - v_ouro), 'sem_ouro', true);
  END IF;

  UPDATE public.rpg_recursos SET ouro = ouro - v_preco, atualizado_em = now() WHERE user_id = v_user;
  INSERT INTO public.rpg_lutas_extras (user_id, dia, tipo, quantidade, ouro_gasto)
  VALUES (v_user, v_dia, p_tipo, 1, v_preco)
  ON CONFLICT (user_id, dia, tipo) DO UPDATE
    SET quantidade = public.rpg_lutas_extras.quantidade + 1,
        ouro_gasto = public.rpg_lutas_extras.ouro_gasto + EXCLUDED.ouro_gasto;

  RETURN jsonb_build_object('ok', true, 'tipo', p_tipo, 'preco', v_preco, 'ouro', v_ouro - v_preco,
                            'compradas', v_ja + 1, 'maximo', public.rpg_maximo_lutas_extras(p_tipo));
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_comprar_luta_extra(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_comprar_luta_extra(TEXT) TO authenticated;

-- O que a tela mostra: compradas hoje, máximo e preço da próxima, para os dois tipos.
CREATE OR REPLACE FUNCTION public.rpg_lutas_extras_hoje()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_nivel INTEGER;
  v_exp   INTEGER;
  v_mas   INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  v_nivel := public.calcular_nivel_usuario(v_user);
  v_exp := public.rpg_extras_de_hoje(v_user, 'expedicao');
  v_mas := public.rpg_extras_de_hoje(v_user, 'masmorra');
  RETURN jsonb_build_object(
    'ok', true,
    'expedicao', jsonb_build_object('compradas', v_exp, 'maximo', public.rpg_maximo_lutas_extras('expedicao'),
                                    'preco', public.rpg_preco_luta_extra('expedicao', v_nivel, v_exp)),
    'masmorra', jsonb_build_object('compradas', v_mas, 'maximo', public.rpg_maximo_lutas_extras('masmorra'),
                                   'preco', public.rpg_preco_luta_extra('masmorra', v_nivel, v_mas)),
    'ouro', COALESCE((SELECT ouro FROM public.rpg_recursos WHERE user_id = v_user), 0)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_lutas_extras_hoje() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_lutas_extras_hoje() TO authenticated;
