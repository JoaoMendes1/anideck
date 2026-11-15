-- 072_rpg_batalhas.sql
-- Fase 18 (18.4a): expedições com combate por turnos.
--
-- 1. rpg_monstros: catálogo de monstros
-- 2. rpg_recursos: bilhetes de invocação de cada jogador (e o contador da garantia, sql/073)
-- 3. rpg_batalhas: histórico de batalhas
-- 4. rpg_batalhas_hoje(): quantas batalhas o jogador fez hoje e o limite
-- 5. rpg_registrar_batalha(): grava o resultado, SÓ para o service role
-- 6. Catálogo inicial de monstros
--
-- A batalha é simulada no Go com os atributos que o próprio Go calcula. O navegador só
-- escolhe o monstro. Por isso a função que grava o resultado não é executável pelo usuário:
-- se fosse, bastaria chamá-la com "venceu = true".
--
-- Combate não dá XP: o XP vem só de assistir animes. A vitória dá bilhetes e, às vezes, um item.
--
-- Idempotente: pode ser reaplicado sem efeito.

-- =============================================================================
-- 1. Monstros
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_monstros (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  descricao         TEXT NOT NULL DEFAULT '',
  -- comum, raro ou chefe: muda a arte provisória e a moldura na tela.
  tipo              TEXT NOT NULL DEFAULT 'comum',
  nivel             INTEGER NOT NULL,
  vida              INTEGER NOT NULL,
  ataque            INTEGER NOT NULL,
  defesa            INTEGER NOT NULL,
  -- Recompensa da vitória.
  bilhetes          INTEGER NOT NULL DEFAULT 1,
  chance_item       INTEGER NOT NULL DEFAULT 0,
  raridade_item     TEXT NOT NULL DEFAULT 'comum',
  ativo             BOOLEAN NOT NULL DEFAULT true,
  ordem             INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT rpg_monstros_id_formato CHECK (id ~ '^[a-z0-9_]{1,40}$'),
  CONSTRAINT rpg_monstros_tipo       CHECK (tipo IN ('comum', 'raro', 'chefe')),
  CONSTRAINT rpg_monstros_numeros    CHECK (nivel >= 1 AND vida >= 1 AND ataque >= 1 AND defesa >= 0),
  CONSTRAINT rpg_monstros_recompensa CHECK (bilhetes BETWEEN 0 AND 20 AND chance_item BETWEEN 0 AND 100),
  CONSTRAINT rpg_monstros_raridade   CHECK (raridade_item IN ('comum', 'raro', 'epico', 'lendario'))
);

ALTER TABLE public.rpg_monstros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_monstros_leitura ON public.rpg_monstros;
CREATE POLICY rpg_monstros_leitura ON public.rpg_monstros
  FOR SELECT TO authenticated
  USING (ativo = true OR public.is_admin());

DROP POLICY IF EXISTS rpg_monstros_escrita_admin ON public.rpg_monstros;
CREATE POLICY rpg_monstros_escrita_admin ON public.rpg_monstros
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.rpg_monstros FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rpg_monstros TO authenticated;

-- =============================================================================
-- 2. Recursos do jogador
-- =============================================================================
-- Bilhetes não se compram nem se transferem: só entram por batalha (aqui) e só saem por
-- invocação (sql/073). É isso que mantém a invocação fora da definição de caixa de recompensa
-- paga do ECA Digital (Lei 15.211/2025, art. 20).

CREATE TABLE IF NOT EXISTS public.rpg_recursos (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bilhetes             INTEGER NOT NULL DEFAULT 0,
  -- Invocações seguidas sem item épico ou melhor, para a garantia (sql/073).
  invocacoes_sem_epico INTEGER NOT NULL DEFAULT 0,
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rpg_recursos_bilhetes CHECK (bilhetes >= 0),
  CONSTRAINT rpg_recursos_contador CHECK (invocacoes_sem_epico >= 0)
);

ALTER TABLE public.rpg_recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_recursos_le_o_proprio ON public.rpg_recursos;
CREATE POLICY rpg_recursos_le_o_proprio ON public.rpg_recursos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_recursos FROM anon, authenticated;
GRANT SELECT ON public.rpg_recursos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rpg_recursos TO service_role;

-- =============================================================================
-- 3. Histórico de batalhas
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rpg_batalhas (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monstro_id  TEXT NOT NULL REFERENCES public.rpg_monstros(id) ON DELETE CASCADE,
  venceu      BOOLEAN NOT NULL,
  turnos      INTEGER NOT NULL DEFAULT 0,
  bilhetes    INTEGER NOT NULL DEFAULT 0,
  item_id     TEXT REFERENCES public.rpg_itens(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpg_batalhas_user_data ON public.rpg_batalhas (user_id, criado_em DESC);

ALTER TABLE public.rpg_batalhas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_batalhas_le_o_proprio ON public.rpg_batalhas;
CREATE POLICY rpg_batalhas_le_o_proprio ON public.rpg_batalhas
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.rpg_batalhas FROM anon, authenticated;
GRANT SELECT ON public.rpg_batalhas TO authenticated;
GRANT SELECT, INSERT ON public.rpg_batalhas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rpg_batalhas_id_seq TO service_role;

-- =============================================================================
-- 4. Limite do dia
-- =============================================================================
-- O dia é o de São Paulo, o mesmo do resto do projeto. O limite é ajustável pela chave
-- rpg_batalhas_por_dia de app_settings; sem ela, ou com valor inválido, vale 5.

CREATE OR REPLACE FUNCTION public.rpg_limite_batalhas_dia()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT LEAST(value::INTEGER, 50)
       FROM public.app_settings
      WHERE key = 'rpg_batalhas_por_dia' AND value ~ '^[1-9][0-9]?$'),
    5
  );
$$;

CREATE OR REPLACE FUNCTION public.rpg_contar_batalhas_hoje(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::INTEGER
    FROM public.rpg_batalhas
   WHERE user_id = p_user_id
     AND criado_em >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
$$;

REVOKE ALL ON FUNCTION public.rpg_limite_batalhas_dia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_limite_batalhas_dia() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpg_contar_batalhas_hoje(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_contar_batalhas_hoje(UUID) TO service_role;

-- O que a tela mostra: feitas hoje, o limite e os bilhetes. Sempre do usuário do token.
CREATE OR REPLACE FUNCTION public.rpg_batalhas_hoje()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'feitas', public.rpg_contar_batalhas_hoje(v_user_id),
    'limite', public.rpg_limite_batalhas_dia(),
    'bilhetes', COALESCE((SELECT bilhetes FROM public.rpg_recursos WHERE user_id = v_user_id), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_batalhas_hoje() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_batalhas_hoje() TO authenticated;

-- =============================================================================
-- 5. Registro do resultado (só service role)
-- =============================================================================
-- Tudo numa transação: confere o limite com trava por usuário (dois cliques ao mesmo tempo
-- não passam do limite), grava a batalha, credita os bilhetes e entrega o item.

CREATE OR REPLACE FUNCTION public.rpg_registrar_batalha(
  p_user_id    UUID,
  p_monstro_id TEXT,
  p_venceu     BOOLEAN,
  p_turnos     INTEGER,
  p_item_id    TEXT
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
  v_item     TEXT := NULL;
  v_saldo    INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  -- Trava por usuário até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_batalha:' || p_user_id::TEXT, 0));

  v_feitas := public.rpg_contar_batalhas_hoje(p_user_id);
  IF v_feitas >= v_limite THEN
    RETURN jsonb_build_object('erro', 'Você já fez todas as batalhas de hoje. Volte amanhã.', 'limite_atingido', true);
  END IF;

  SELECT * INTO v_monstro FROM public.rpg_monstros WHERE id = p_monstro_id AND ativo = true;
  IF v_monstro.id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Monstro desconhecido.');
  END IF;

  IF p_venceu THEN
    v_bilhetes := v_monstro.bilhetes;
    -- Só vale item ativo, que não é do kit inicial.
    IF p_item_id IS NOT NULL AND btrim(p_item_id) <> '' THEN
      SELECT id INTO v_item FROM public.rpg_itens WHERE id = p_item_id AND ativo = true AND inicial = false;
    END IF;
  END IF;

  INSERT INTO public.rpg_batalhas (user_id, monstro_id, venceu, turnos, bilhetes, item_id)
  VALUES (p_user_id, v_monstro.id, p_venceu, GREATEST(COALESCE(p_turnos, 0), 0), v_bilhetes, v_item);

  INSERT INTO public.rpg_recursos (user_id, bilhetes)
  VALUES (p_user_id, v_bilhetes)
  ON CONFLICT (user_id) DO UPDATE
    SET bilhetes = public.rpg_recursos.bilhetes + EXCLUDED.bilhetes,
        atualizado_em = now()
  RETURNING bilhetes INTO v_saldo;

  IF v_item IS NOT NULL THEN
    INSERT INTO public.rpg_inventario (user_id, item_id)
    VALUES (p_user_id, v_item)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET quantidade = public.rpg_inventario.quantidade + 1;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bilhetes_ganhos', v_bilhetes,
    'item_id', v_item,
    'bilhetes', v_saldo,
    'feitas', v_feitas + 1,
    'limite', v_limite
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_registrar_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_registrar_batalha(UUID, TEXT, BOOLEAN, INTEGER, TEXT) TO service_role;

-- =============================================================================
-- 6. Monstros iniciais
-- =============================================================================
-- Ponto de partida de balanceamento: cada monstro foi pensado para um jogador no nível dele
-- com equipamento da mesma faixa. DO NOTHING preserva o que o Admin ajustar.

INSERT INTO public.rpg_monstros (id, nome, descricao, tipo, nivel, vida, ataque, defesa, bilhetes, chance_item, raridade_item, ordem)
VALUES
  ('slime_de_eter',        'Slime de Éter',        'Uma gota de energia que ganhou vontade própria.',       'comum',  1,   60,   8,   3, 1, 15, 'comum',     10),
  ('goblin_batedor',       'Goblin Batedor',       'Rápido, barulhento e sempre em bando.',                 'comum',  4,  120,  14,   6, 1, 20, 'comum',     20),
  ('lobo_sombrio',         'Lobo Sombrio',         'Caça à noite, onde a luz do éter não chega.',           'comum', 10,  300,  40,  20, 2, 20, 'raro',      30),
  ('golem_de_runas',       'Golem de Runas',       'Pedra antiga movida por símbolos esquecidos.',          'raro',  18,  700,  55,  45, 2, 25, 'raro',      40),
  ('espectro_do_vazio',    'Espectro do Vazio',    'O que sobrou de um aventureiro que não voltou.',        'raro',  26,  800,  80,  40, 3, 20, 'epico',     50),
  ('cavaleiro_caido',      'Cavaleiro Caído',      'Jurou proteger um reino que já não existe.',            'chefe', 35, 1300, 105,  60, 4, 30, 'epico',     60),
  ('dragao_de_eter',       'Dragão de Éter',       'Dorme sobre o ponto onde os mundos se tocam.',          'chefe', 50, 2200, 150,  90, 5, 25, 'lendario',  70),
  ('primordial_esquecido', 'Primordial Esquecido', 'Existia antes do primeiro reino. Ainda espera.',        'chefe', 60, 3000, 190, 120, 6, 35, 'lendario',  80)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT id, nivel, vida, ataque, defesa, bilhetes FROM public.rpg_monstros ORDER BY ordem;
--
-- BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', '{"sub":"<UUID>","role":"authenticated"}', true);
--   SELECT public.rpg_batalhas_hoje();                 -- feitas, limite e bilhetes
--   -- Precisa falhar com "permission denied for function":
--   -- SELECT public.rpg_registrar_batalha('<UUID>', 'slime_de_eter', true, 3, NULL);
-- ROLLBACK;
