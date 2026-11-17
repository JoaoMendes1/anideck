-- =============================================================================
-- 094 — Evento da temporada
-- =============================================================================
--
-- Um arauto por temporada de anime (trimestre, no fuso de Brasília), montado no Go na escala
-- do nível do jogador (rpg_evento.go). Uma luta por dia, com a Vida cheia e sem queda: o
-- evento não mexe na Vida guardada nem no Ouro de quem perde. Com 10 vitórias na temporada,
-- o jogador ganha um título exclusivo ("Caçador do Outono 2026") e Ouro, uma vez.
--
-- 1. rpg_evento_batalhas: uma luta por usuário e dia (UNIQUE), com a temporada.
-- 2. rpg_evento_premios: o prêmio de cada temporada, um por usuário.
-- 3. rpg_evento_registrar(), só para o service role: grava a luta, conta as vitórias da
--    temporada e, ao chegar na meta, entrega o prêmio. O título entra em
--    profiles.titulos_desbloqueados, que é TEXT[] (sql/061); sem perfil, só o Ouro.
--
-- Ordem: antes de promover. Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_evento_batalhas (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada DATE NOT NULL,
  dia       DATE NOT NULL,
  venceu    BOOLEAN NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia)
);

CREATE INDEX IF NOT EXISTS rpg_evento_batalhas_temporada ON public.rpg_evento_batalhas (user_id, temporada);

CREATE TABLE IF NOT EXISTS public.rpg_evento_premios (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada DATE NOT NULL,
  titulo    TEXT NOT NULL,
  ouro      INTEGER NOT NULL CHECK (ouro >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, temporada)
);

ALTER TABLE public.rpg_evento_batalhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_evento_premios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_evento_batalhas_proprias ON public.rpg_evento_batalhas;
CREATE POLICY rpg_evento_batalhas_proprias ON public.rpg_evento_batalhas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS rpg_evento_premios_proprios ON public.rpg_evento_premios;
CREATE POLICY rpg_evento_premios_proprios ON public.rpg_evento_premios FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.rpg_evento_batalhas, public.rpg_evento_premios FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rpg_evento_batalhas, public.rpg_evento_premios TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_evento_registrar(
  p_user_id   UUID,
  p_temporada DATE,
  p_venceu    BOOLEAN,
  p_meta      INTEGER,
  p_titulo    TEXT,
  p_ouro      INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dia      DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_atual    DATE := date_trunc('quarter', now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_vitorias INTEGER;
  v_meta     INTEGER := LEAST(GREATEST(COALESCE(p_meta, 10), 1), 90);
  v_ouro     INTEGER := LEAST(GREATEST(COALESCE(p_ouro, 0), 0), 2000);
  v_titulo   TEXT := btrim(COALESCE(p_titulo, ''));
  v_agora    BOOLEAN := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;
  -- A temporada vem do Go, mas tem de ser a de agora: luta de temporada passada não conta.
  IF p_temporada IS DISTINCT FROM v_atual THEN
    RETURN jsonb_build_object('erro', 'Esta temporada já terminou.');
  END IF;
  IF length(v_titulo) NOT BETWEEN 1 AND 60 THEN
    RETURN jsonb_build_object('erro', 'Título inválido.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_evento:' || p_user_id::TEXT, 0));

  IF EXISTS (SELECT 1 FROM public.rpg_evento_batalhas WHERE user_id = p_user_id AND dia = v_dia) THEN
    RETURN jsonb_build_object('erro', 'Você já enfrentou o arauto hoje. Volte amanhã.');
  END IF;

  INSERT INTO public.rpg_evento_batalhas (user_id, temporada, dia, venceu)
  VALUES (p_user_id, v_atual, v_dia, COALESCE(p_venceu, false));

  SELECT count(*) FILTER (WHERE venceu)::INTEGER INTO v_vitorias
    FROM public.rpg_evento_batalhas WHERE user_id = p_user_id AND temporada = v_atual;

  IF v_vitorias >= v_meta AND NOT EXISTS (SELECT 1 FROM public.rpg_evento_premios WHERE user_id = p_user_id AND temporada = v_atual) THEN
    INSERT INTO public.rpg_evento_premios (user_id, temporada, titulo, ouro) VALUES (p_user_id, v_atual, v_titulo, v_ouro);
    INSERT INTO public.rpg_recursos (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.rpg_recursos SET ouro = ouro + v_ouro, atualizado_em = now() WHERE user_id = p_user_id;
    UPDATE public.profiles
       SET titulos_desbloqueados = CASE
             WHEN v_titulo = ANY(COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[])) THEN titulos_desbloqueados
             ELSE array_append(COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[]), v_titulo)
           END
     WHERE user_id = p_user_id;
    v_agora := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'vitorias', v_vitorias,
    'premiado_agora', v_agora,
    'premiado', EXISTS (SELECT 1 FROM public.rpg_evento_premios WHERE user_id = p_user_id AND temporada = v_atual)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_evento_registrar(UUID, DATE, BOOLEAN, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_evento_registrar(UUID, DATE, BOOLEAN, INTEGER, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- Depois de uma luta no app:
-- SELECT temporada, dia, venceu FROM public.rpg_evento_batalhas ORDER BY id DESC LIMIT 3;
-- SELECT temporada, titulo, ouro FROM public.rpg_evento_premios ORDER BY criado_em DESC LIMIT 3;
