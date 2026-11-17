-- =============================================================================
-- 085 — Bestiário: vitórias por monstro
-- =============================================================================
--
-- O que muda:
--   1. rpg_batalhas_hoje() devolve também `vitorias`: id do monstro -> vitórias do jogador.
--   2. rpg_concluir_batalha() dá +10% de Ouro por marco do bestiário (10, 50 e 150 vitórias
--      contra aquele monstro), até +30%. A assinatura não muda.
--
-- Não há tabela nova: as vitórias já estão em rpg_batalhas (sql/072). O bônus é de Ouro, e
-- não de dano, porque o combate é sensível: +9% de dano dobrava a vitória contra o chefe
-- final. Os marcos e o bônus estão também no Go (rpg_bestiario.go), que só os mostra.
--
-- ORDEM: ANTES de promover o código da issue #243. rpg_batalhas_hoje e rpg_concluir_batalha
-- são redefinidas aqui (a definição viva das duas era a do sql/081; os campos continuam iguais).
--
-- Pode rodar mais de uma vez.

-- A contagem lê as batalhas do jogador; este índice evita varrer as dos outros.
CREATE INDEX IF NOT EXISTS rpg_batalhas_vitorias ON public.rpg_batalhas (user_id, monstro_id) WHERE venceu;

CREATE OR REPLACE FUNCTION public.rpg_batalhas_hoje()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_recursos public.rpg_recursos%ROWTYPE;
  v_regras   JSONB := public.rpg_regras_vida();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'ok', true,
    'feitas', public.rpg_contar_batalhas_hoje(v_user_id),
    'limite', public.rpg_limite_batalhas_dia(),
    'bilhetes', COALESCE(v_recursos.bilhetes, 0),
    'ouro', COALESCE(v_recursos.ouro, 0),
    'vida_perdida', public.rpg_vida_perdida_agora(v_recursos.vida_perdida, v_recursos.vida_em),
    'pousada_livre_em', CASE
      WHEN v_recursos.pousada_em IS NULL THEN NULL
      WHEN v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER) <= now() THEN NULL
      ELSE v_recursos.pousada_em + make_interval(hours => (v_regras->>'pousada_horas')::INTEGER)
    END,
    'episodios_hoje', (
      SELECT count(*)::INTEGER FROM public.rpg_recuperacoes
       WHERE user_id = v_user_id AND origem LIKE 'episodio:%' AND criado_em >= public.rpg_inicio_do_dia()),
    'regras', v_regras,
    'vitorias', COALESCE((
      SELECT jsonb_object_agg(v.monstro_id, v.n)
        FROM (SELECT b.monstro_id, count(*)::INTEGER AS n
                FROM public.rpg_batalhas b
               WHERE b.user_id = v_user_id AND b.venceu
               GROUP BY b.monstro_id) v), '{}'::JSONB)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpg_batalhas_hoje() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_batalhas_hoje() TO authenticated;

-- =============================================================================
-- Concluir batalha, com o Ouro do bestiário
-- =============================================================================
-- Igual à do sql/081, mais o bônus de Ouro por marco.

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
  IF v_perdida >= 1000 THEN
    RETURN jsonb_build_object('erro', 'Seu personagem está sem Vida. Descanse, assista a um episódio ou use a Pousada.', 'sem_vida', true);
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

  INSERT INTO public.rpg_batalhas (user_id, monstro_id, venceu, turnos, bilhetes, item_id, ouro)
  VALUES (p_user_id, v_monstro.id, p_venceu, GREATEST(COALESCE(p_turnos, 0), 0), v_bilhetes, v_item, v_ouro);

  UPDATE public.rpg_recursos
     SET bilhetes = bilhetes + v_bilhetes,
         ouro = ouro + v_ouro,
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
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_batalhas_hoje()->'vitorias';   -- {"lobo_sombrio": 3, ...}
-- ROLLBACK;
--
-- Com 10 vitórias contra o Lobo Sombrio (nível 10), a próxima dá 25 + 10% = 28 de Ouro.
