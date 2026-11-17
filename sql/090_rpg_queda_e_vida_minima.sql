-- =============================================================================
-- 090 — Queda em batalha: perde Ouro e precisa de 30% de Vida para voltar
-- =============================================================================
--
-- Regra escolhida pelo dono (17/11/2026): quando a Vida chega a zero numa batalha, o
-- personagem perde 10% do Ouro guardado, e só volta a lutar com pelo menos 30% de Vida.
--
-- 1. rpg_regras_vida() ganha 'vida_minima_luta' (300 por mil) e 'queda_ouro_pct' (10). As
--    chaves antigas não mudam. Definição viva, antes no 081.
-- 2. rpg_batalhas.ouro_perdido guarda quanto cada queda custou, para a conta ser auditável.
-- 3. rpg_concluir_batalha(), mesma assinatura: recusa a batalha abaixo de 30% de Vida e
--    desconta o Ouro na queda (Vida final zero e derrota). Definição viva, antes no 085.
--    Derrota por tempo (20 rodadas) não é queda e não custa Ouro.
--
-- Elementos e poderes dos monstros não estão aqui: ficam no Go (rpg_combate_avancado.go),
-- como as habilidades das classes.
--
-- Ordem: antes de promover o código do combate novo. Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION public.rpg_regras_vida()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'regen_por_hora', 50,       -- 5% da Vida máxima por hora
    'por_episodio', 80,         -- 8% por episódio com XP real
    'episodios_por_dia', 5,     -- até 40% por dia assistindo
    'pocao', 300,               -- a Poção recupera 30%
    'pousada_horas', 4,         -- a Pousada vale uma vez a cada 4 horas
    'vida_minima_luta', 300,    -- precisa de 30% da Vida para começar uma batalha
    'queda_ouro_pct', 10        -- a queda custa 10% do Ouro guardado
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_regras_vida() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_regras_vida() TO authenticated, service_role;

ALTER TABLE public.rpg_batalhas
  ADD COLUMN IF NOT EXISTS ouro_perdido INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.rpg_batalhas DROP CONSTRAINT IF EXISTS rpg_batalhas_ouro_perdido;
ALTER TABLE public.rpg_batalhas ADD CONSTRAINT rpg_batalhas_ouro_perdido CHECK (ouro_perdido >= 0);

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
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_regras_vida()->>'vida_minima_luta';   -- 300
-- Depois de uma queda no app:
-- SELECT monstro_id, venceu, ouro_perdido FROM public.rpg_batalhas ORDER BY id DESC LIMIT 3;
