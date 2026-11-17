-- =============================================================================
-- 082 — Invocação mais rara, com Ouro e garantia de lendário
-- =============================================================================
--
-- O que muda:
--   1. Chances novas: Ouro 78%, Raro 17%, Épico 4,5% e Lendário 0,5%. Antes eram Comum 60%,
--      Raro 30%, Épico 8,5% e Lendário 1,5%, e toda tentativa dava um equipamento.
--
--      DEFEITO CORRIGIDO: todos os itens comuns do catálogo são do kit inicial (sql/071), e a
--      invocação só sorteia itens fora do kit. No sql/073, o resultado "comum" não achava item
--      e caía na reserva, que escolhia a raridade MAIS ALTA: cerca de 60% das invocações davam
--      um Lendário. Aqui o Comum sai da tabela enquanto não houver item comum sorteável, e a
--      reserva só desce de raridade; sem item nenhum, a tentativa vira Ouro.
--   2. Garantia de Raro ou melhor a cada 10 tentativas sem Raro. Antes era Épico ou melhor,
--      e 15% dessas garantias saíam Lendárias.
--   3. Garantia de Lendário: a partir da 70ª tentativa sem Lendário, a chance sobe 5 pontos
--      por tentativa; a 90ª é certa. Em média, um Lendário a cada 62 tentativas.
--   4. O resultado Ouro soma 25 de Ouro (sql/081) e fica no histórico com raridade 'ouro'.
--   5. Bilhetes por vitória reduzidos para 1 a 3, conforme o monstro.
--
-- Continua gratuita por desenho (sql/073): bilhetes não se compram, não se transferem e não
-- se trocam por AniCoins. O Ouro também não: é ganho só jogando.
--
-- Os contadores antigos (invocacoes_sem_epico) ficam na tabela, sem uso, para o histórico.
--
-- ORDEM: depois do sql/081 (coluna ouro) e ANTES de promover o código da issue #240. Entre
-- aplicar e promover, a tela antiga mostra o resultado de Ouro como um cartão vazio.
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Contadores e histórico
-- =============================================================================

ALTER TABLE public.rpg_recursos
  ADD COLUMN IF NOT EXISTS invocacoes_sem_raro     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invocacoes_sem_lendario INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.rpg_recursos DROP CONSTRAINT IF EXISTS rpg_recursos_contadores_invocacao;
ALTER TABLE public.rpg_recursos
  ADD CONSTRAINT rpg_recursos_contadores_invocacao CHECK (invocacoes_sem_raro >= 0 AND invocacoes_sem_lendario >= 0);

ALTER TABLE public.rpg_invocacoes
  ADD COLUMN IF NOT EXISTS ouro INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- 2. Chances
-- =============================================================================
-- Em por mil. Ouro, raro, épico e lendário somam 1000. A tela mostra estes números.

CREATE OR REPLACE FUNCTION public.rpg_chances_invocacao()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'ouro', 780,
    'raro', 170,
    'epico', 45,
    'lendario', 5,
    'garantia', 10,              -- tentativas sem Raro até a próxima ser Raro ou melhor
    'lendario_sobe_em', 70,      -- a partir desta tentativa sem Lendário, a chance sobe
    'lendario_passo', 50,        -- quanto sobe por tentativa, em por mil
    'lendario_garantido', 90,    -- esta tentativa sem Lendário é Lendária
    'ouro_por_tentativa', 25
  );
$$;

REVOKE ALL ON FUNCTION public.rpg_chances_invocacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_chances_invocacao() TO authenticated, service_role;

-- Chance de Lendário na próxima tentativa, em por mil, para quem está há p_sem tentativas
-- sem Lendário. A tela e o sorteio usam a mesma conta.
CREATE OR REPLACE FUNCTION public.rpg_chance_lendario(p_sem INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH c AS (SELECT public.rpg_chances_invocacao() AS j)
  SELECT CASE
    WHEN COALESCE(p_sem, 0) + 1 >= (j->>'lendario_garantido')::INTEGER THEN 1000
    WHEN COALESCE(p_sem, 0) + 1 >= (j->>'lendario_sobe_em')::INTEGER THEN
      LEAST(1000, (j->>'lendario')::INTEGER
        + (j->>'lendario_passo')::INTEGER * (COALESCE(p_sem, 0) + 2 - (j->>'lendario_sobe_em')::INTEGER))
    ELSE (j->>'lendario')::INTEGER
  END
  FROM c;
$$;

REVOKE ALL ON FUNCTION public.rpg_chance_lendario(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_chance_lendario(INTEGER) TO authenticated, service_role;

-- =============================================================================
-- 3. Estado do jogador
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_estado_invocacao()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_recursos public.rpg_recursos%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'ok', true,
    'bilhetes', COALESCE(v_recursos.bilhetes, 0),
    'ouro', COALESCE(v_recursos.ouro, 0),
    'sem_raro', COALESCE(v_recursos.invocacoes_sem_raro, 0),
    'sem_lendario', COALESCE(v_recursos.invocacoes_sem_lendario, 0),
    'chance_lendario_agora', public.rpg_chance_lendario(COALESCE(v_recursos.invocacoes_sem_lendario, 0)),
    'chances', public.rpg_chances_invocacao()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_estado_invocacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_estado_invocacao() TO authenticated;

-- =============================================================================
-- 4. Invocar
-- =============================================================================
-- Cada tentativa: primeiro sorteia o Lendário, com a chance da garantia; se não sair, sorteia
-- entre Ouro, Raro e Épico nas proporções da tabela. Na garantia de Raro, o segundo
-- sorteio fica só entre Raro e Épico.

CREATE OR REPLACE FUNCTION public.rpg_invocar(p_vezes INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_chances      JSONB := public.rpg_chances_invocacao();
  v_garantia     INTEGER := (v_chances->>'garantia')::INTEGER;
  v_ouro_fixo    INTEGER := (v_chances->>'ouro_por_tentativa')::INTEGER;
  v_c_ouro       INTEGER := (v_chances->>'ouro')::INTEGER;
  v_c_raro       INTEGER := (v_chances->>'raro')::INTEGER;
  v_c_epico      INTEGER := (v_chances->>'epico')::INTEGER;
  v_recursos     public.rpg_recursos%ROWTYPE;
  v_sem_raro     INTEGER;
  v_sem_lendario INTEGER;
  v_rolagem      INTEGER;
  v_resultado    TEXT;
  v_garantida    BOOLEAN;
  v_ouro_ganho   INTEGER := 0;
  v_item         public.rpg_itens%ROWTYPE;
  v_itens        JSONB := '[]'::JSONB;
  i              INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  IF p_vezes IS NULL OR p_vezes NOT IN (1, 10) THEN
    RETURN jsonb_build_object('erro', 'Invoque 1 ou 10 de cada vez.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  SELECT * INTO v_recursos FROM public.rpg_recursos WHERE user_id = v_user_id FOR UPDATE;
  IF v_recursos.user_id IS NULL OR v_recursos.bilhetes < p_vezes THEN
    RETURN jsonb_build_object('erro', 'Bilhetes insuficientes. Vença expedições para ganhar mais.', 'sem_bilhetes', true);
  END IF;

  v_sem_raro := v_recursos.invocacoes_sem_raro;
  v_sem_lendario := v_recursos.invocacoes_sem_lendario;

  FOR i IN 1..p_vezes LOOP
    v_garantida := false;
    v_rolagem := floor(random() * 1000)::INTEGER;
    IF v_rolagem < public.rpg_chance_lendario(v_sem_lendario) THEN
      v_resultado := 'lendario';
      v_garantida := v_sem_lendario + 1 >= (v_chances->>'lendario_sobe_em')::INTEGER;
    ELSIF v_sem_raro + 1 >= v_garantia THEN
      v_garantida := true;
      v_rolagem := floor(random() * (v_c_raro + v_c_epico))::INTEGER;
      v_resultado := CASE WHEN v_rolagem < v_c_epico THEN 'epico' ELSE 'raro' END;
    ELSE
      v_rolagem := floor(random() * (v_c_ouro + v_c_raro + v_c_epico))::INTEGER;
      v_resultado := CASE
        WHEN v_rolagem < v_c_epico THEN 'epico'
        WHEN v_rolagem < v_c_epico + v_c_raro THEN 'raro'
        ELSE 'ouro'
      END;
    END IF;

    IF v_resultado <> 'ouro' THEN
      -- Um item ativo da raridade, fora do kit inicial. Sem nenhum, desce de raridade; sem
      -- nenhum abaixo, a tentativa vira Ouro. A reserva nunca sobe de raridade.
      SELECT * INTO v_item FROM public.rpg_itens
       WHERE ativo = true AND inicial = false
         AND CASE raridade WHEN 'lendario' THEN 4 WHEN 'epico' THEN 3 WHEN 'raro' THEN 2 ELSE 1 END
          <= CASE v_resultado WHEN 'lendario' THEN 4 WHEN 'epico' THEN 3 WHEN 'raro' THEN 2 ELSE 1 END
       ORDER BY CASE raridade WHEN 'lendario' THEN 4 WHEN 'epico' THEN 3 WHEN 'raro' THEN 2 ELSE 1 END DESC, random()
       LIMIT 1;
      IF v_item.id IS NULL THEN
        v_resultado := 'ouro';
      END IF;
    END IF;

    IF v_resultado = 'ouro' THEN
      v_ouro_ganho := v_ouro_ganho + v_ouro_fixo;
      INSERT INTO public.rpg_invocacoes (user_id, item_id, raridade, garantida, ouro)
      VALUES (v_user_id, NULL, 'ouro', false, v_ouro_fixo);
      v_itens := v_itens || jsonb_build_object('tipo', 'ouro', 'ouro', v_ouro_fixo, 'garantida', false);
    ELSE
      INSERT INTO public.rpg_inventario (user_id, item_id)
      VALUES (v_user_id, v_item.id)
      ON CONFLICT (user_id, item_id) DO UPDATE
        SET quantidade = public.rpg_inventario.quantidade + 1;

      INSERT INTO public.rpg_invocacoes (user_id, item_id, raridade, garantida)
      VALUES (v_user_id, v_item.id, v_item.raridade, v_garantida);

      v_itens := v_itens || jsonb_build_object(
        'tipo', 'item',
        'id', v_item.id, 'slot', v_item.slot, 'nome', v_item.nome, 'descricao', v_item.descricao,
        'raridade', v_item.raridade, 'vida', v_item.vida, 'ataque', v_item.ataque,
        'defesa', v_item.defesa, 'nivel_minimo', v_item.nivel_minimo, 'garantida', v_garantida
      );
      v_resultado := v_item.raridade;
      v_item := NULL;
    END IF;

    v_sem_lendario := CASE WHEN v_resultado = 'lendario' THEN 0 ELSE v_sem_lendario + 1 END;
    v_sem_raro := CASE WHEN v_resultado IN ('raro', 'epico', 'lendario') THEN 0 ELSE v_sem_raro + 1 END;
  END LOOP;

  UPDATE public.rpg_recursos
     SET bilhetes = bilhetes - p_vezes,
         ouro = ouro + v_ouro_ganho,
         invocacoes_sem_raro = v_sem_raro,
         invocacoes_sem_lendario = v_sem_lendario,
         atualizado_em = now()
   WHERE user_id = v_user_id
  RETURNING * INTO v_recursos;

  RETURN jsonb_build_object(
    'ok', true,
    'itens', v_itens,
    'bilhetes', v_recursos.bilhetes,
    'ouro', v_recursos.ouro,
    'sem_raro', v_recursos.invocacoes_sem_raro,
    'sem_lendario', v_recursos.invocacoes_sem_lendario,
    'chance_lendario_agora', public.rpg_chance_lendario(v_recursos.invocacoes_sem_lendario),
    'chances', v_chances
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_invocar(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_invocar(INTEGER) TO authenticated;

-- =============================================================================
-- 5. Bilhetes por vitória
-- =============================================================================
-- Eram de 1 a 6 (sql/072). Com 5 batalhas por dia contra o chefe final, isso dava 30
-- invocações por dia. Agora o máximo é 15.

UPDATE public.rpg_monstros SET bilhetes = 1 WHERE id IN ('slime_de_eter', 'goblin_batedor', 'lobo_sombrio', 'golem_de_runas');
UPDATE public.rpg_monstros SET bilhetes = 2 WHERE id IN ('espectro_do_vazio', 'cavaleiro_caido', 'dragao_de_eter');
UPDATE public.rpg_monstros SET bilhetes = 3 WHERE id = 'primordial_esquecido';

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_chances_invocacao();      -- ouro+raro+epico+lendario = 1000
-- SELECT public.rpg_chance_lendario(0);       -- 5
-- SELECT public.rpg_chance_lendario(69);      -- 55   (70ª tentativa)
-- SELECT public.rpg_chance_lendario(88);      -- 1000 (89ª tentativa já chega a 100%)
-- SELECT public.rpg_chance_lendario(89);      -- 1000 (90ª: garantida)
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_estado_invocacao();
--   SELECT public.rpg_invocar(1);
-- ROLLBACK;
