-- 073_rpg_invocacao.sql
-- Fase 18 (18.6a): invocação gratuita.
--
-- 1. rpg_invocacoes: histórico do que cada invocação deu
-- 2. rpg_chances_invocacao(): as chances, num lugar só (a tela e o sorteio leem daqui)
-- 3. rpg_estado_invocacao(): bilhetes, garantia e chances do jogador
-- 4. rpg_invocar(vezes): gasta bilhetes e sorteia itens
--
-- GRATUITA POR DESENHO. O ECA Digital (Lei 15.211/2025, art. 20) veda caixa de recompensa em
-- jogo de acesso provável por menores, e a define por pagamento + sorteio. Aqui não há
-- pagamento: bilhetes só entram por batalha (sql/072), não se compram, não se transferem e não
-- se trocam por AniCoins. Mudar isso (vender bilhete, pacote, passe) exige consulta jurídica.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Histórico
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_invocacoes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     TEXT REFERENCES public.rpg_itens(id) ON DELETE SET NULL,
  raridade    TEXT NOT NULL,
  garantida   BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpg_invocacoes_user_data ON public.rpg_invocacoes (user_id, criado_em DESC);

ALTER TABLE public.rpg_invocacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_invocacoes_le_o_proprio ON public.rpg_invocacoes;
CREATE POLICY rpg_invocacoes_le_o_proprio ON public.rpg_invocacoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_invocacoes FROM anon, authenticated;
GRANT SELECT ON public.rpg_invocacoes TO authenticated;

-- =============================================================================
-- 2. Chances
-- =============================================================================
-- Em por mil, para inteiros: 600 = 60%. Somam 1000. `garantia` é a cada quantas invocações
-- seguidas sem épico ou melhor a próxima é garantida. A tela mostra exatamente estes números.

CREATE OR REPLACE FUNCTION public.rpg_chances_invocacao()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'comum', 600,
    'raro', 300,
    'epico', 85,
    'lendario', 15,
    'garantia', 10
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpg_chances_invocacao() TO authenticated, service_role;

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
    'sem_epico', COALESCE(v_recursos.invocacoes_sem_epico, 0),
    'chances', public.rpg_chances_invocacao()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_estado_invocacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_estado_invocacao() TO authenticated;

-- =============================================================================
-- 4. Invocar
-- =============================================================================
-- Trava a linha de recursos antes de debitar: dois cliques ao mesmo tempo não gastam o mesmo
-- bilhete. Item repetido soma quantidade no inventário.

CREATE OR REPLACE FUNCTION public.rpg_invocar(p_vezes INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_chances   JSONB := public.rpg_chances_invocacao();
  v_garantia  INTEGER := (v_chances->>'garantia')::INTEGER;
  v_recursos  public.rpg_recursos%ROWTYPE;
  v_sem_epico INTEGER;
  v_rolagem   INTEGER;
  v_raridade  TEXT;
  v_garantida BOOLEAN;
  v_item      public.rpg_itens%ROWTYPE;
  v_itens     JSONB := '[]'::JSONB;
  i           INTEGER;
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

  v_sem_epico := v_recursos.invocacoes_sem_epico;

  FOR i IN 1..p_vezes LOOP
    v_garantida := v_sem_epico + 1 >= v_garantia;
    IF v_garantida THEN
      -- Garantia: só épico ou lendário, na proporção entre os dois.
      v_rolagem := floor(random() * ((v_chances->>'epico')::INTEGER + (v_chances->>'lendario')::INTEGER))::INTEGER;
      v_raridade := CASE WHEN v_rolagem < (v_chances->>'lendario')::INTEGER THEN 'lendario' ELSE 'epico' END;
    ELSE
      v_rolagem := floor(random() * 1000)::INTEGER;
      v_raridade := CASE
        WHEN v_rolagem < (v_chances->>'lendario')::INTEGER THEN 'lendario'
        WHEN v_rolagem < (v_chances->>'lendario')::INTEGER + (v_chances->>'epico')::INTEGER THEN 'epico'
        WHEN v_rolagem < (v_chances->>'lendario')::INTEGER + (v_chances->>'epico')::INTEGER + (v_chances->>'raro')::INTEGER THEN 'raro'
        ELSE 'comum'
      END;
    END IF;

    -- Um item ativo da raridade, fora do kit inicial. Sem nenhum, cai para a raridade de baixo.
    SELECT * INTO v_item FROM public.rpg_itens
     WHERE ativo = true AND inicial = false AND raridade = v_raridade
     ORDER BY random() LIMIT 1;
    IF v_item.id IS NULL THEN
      SELECT * INTO v_item FROM public.rpg_itens
       WHERE ativo = true AND inicial = false
       ORDER BY CASE raridade WHEN 'lendario' THEN 4 WHEN 'epico' THEN 3 WHEN 'raro' THEN 2 ELSE 1 END DESC, random()
       LIMIT 1;
    END IF;
    IF v_item.id IS NULL THEN
      RAISE EXCEPTION 'Catálogo de itens vazio' USING ERRCODE = 'P0001';
    END IF;

    IF v_item.raridade IN ('epico', 'lendario') THEN
      v_sem_epico := 0;
    ELSE
      v_sem_epico := v_sem_epico + 1;
    END IF;

    INSERT INTO public.rpg_inventario (user_id, item_id)
    VALUES (v_user_id, v_item.id)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET quantidade = public.rpg_inventario.quantidade + 1;

    INSERT INTO public.rpg_invocacoes (user_id, item_id, raridade, garantida)
    VALUES (v_user_id, v_item.id, v_item.raridade, v_garantida);

    v_itens := v_itens || jsonb_build_object(
      'id', v_item.id, 'slot', v_item.slot, 'nome', v_item.nome, 'descricao', v_item.descricao,
      'raridade', v_item.raridade, 'vida', v_item.vida, 'ataque', v_item.ataque,
      'defesa', v_item.defesa, 'nivel_minimo', v_item.nivel_minimo, 'garantida', v_garantida
    );
    v_item := NULL;
  END LOOP;

  UPDATE public.rpg_recursos
     SET bilhetes = bilhetes - p_vezes,
         invocacoes_sem_epico = v_sem_epico,
         atualizado_em = now()
   WHERE user_id = v_user_id
  RETURNING * INTO v_recursos;

  RETURN jsonb_build_object(
    'ok', true,
    'itens', v_itens,
    'bilhetes', v_recursos.bilhetes,
    'sem_epico', v_recursos.invocacoes_sem_epico,
    'chances', v_chances
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_invocar(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_invocar(INTEGER) TO authenticated;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_chances_invocacao();   -- somam 1000 por mil
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_estado_invocacao();
--   SELECT public.rpg_invocar(3);    -- erro: 1 ou 10
--   SELECT public.rpg_invocar(1);    -- erro de bilhetes, ou um item
-- ROLLBACK;
