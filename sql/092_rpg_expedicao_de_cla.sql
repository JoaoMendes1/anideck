-- =============================================================================
-- 092 — Expedição de clã semanal
-- =============================================================================
--
-- Um chefe por clã e por semana (segunda a domingo, Brasília). Cada membro ataca uma vez
-- por dia com o próprio personagem; o Go simula o ataque e manda o dano. Quando o dano
-- soma a Vida do chefe, todo membro que atacou na semana recebe Ouro e bilhetes, uma vez,
-- na mesma transação do golpe final.
--
-- 1. rpg_cla_chefes: o chefe da semana de cada clã. O Go escolhe o monstro pela mediana de
--    nível dos membros e a Vida pelo número deles (rpg_cla_expedicao.go).
-- 2. rpg_cla_ataques: um por usuário e dia (UNIQUE), com o dano.
-- 3. rpg_cla_recompensas: quem já recebeu a recompensa do chefe da semana.
-- 4. Funções só do service role: rpg_cla_expedicao_estado(), rpg_cla_garantir_chefe() e
--    rpg_cla_atacar(). O Go confere o usuário pelo token antes.
--
-- O ataque não usa nem gasta a Vida guardada do personagem (sql/081).
--
-- Ordem: antes de promover. Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_cla_chefes (
  cla_id       UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  semana       DATE NOT NULL,
  monstro_id   TEXT NOT NULL CHECK (length(monstro_id) BETWEEN 1 AND 40),
  vida_max     BIGINT NOT NULL CHECK (vida_max > 0),
  dano         BIGINT NOT NULL DEFAULT 0 CHECK (dano >= 0),
  derrotado_em TIMESTAMPTZ,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cla_id, semana)
);

CREATE TABLE IF NOT EXISTS public.rpg_cla_ataques (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cla_id    UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  semana    DATE NOT NULL,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia       DATE NOT NULL,
  dano      BIGINT NOT NULL CHECK (dano >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia)
);

CREATE INDEX IF NOT EXISTS rpg_cla_ataques_semana ON public.rpg_cla_ataques (cla_id, semana);

CREATE TABLE IF NOT EXISTS public.rpg_cla_recompensas (
  cla_id    UUID NOT NULL REFERENCES public.clas(id) ON DELETE CASCADE,
  semana    DATE NOT NULL,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ouro      INTEGER NOT NULL CHECK (ouro >= 0),
  bilhetes  INTEGER NOT NULL CHECK (bilhetes >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cla_id, semana, user_id)
);

ALTER TABLE public.rpg_cla_chefes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_cla_ataques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_cla_recompensas ENABLE ROW LEVEL SECURITY;

-- Leitura só para os membros do próprio clã; escrita só pelas funções.
DROP POLICY IF EXISTS rpg_cla_chefes_membros ON public.rpg_cla_chefes;
CREATE POLICY rpg_cla_chefes_membros ON public.rpg_cla_chefes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cla_membros m WHERE m.cla_id = rpg_cla_chefes.cla_id AND m.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS rpg_cla_ataques_membros ON public.rpg_cla_ataques;
CREATE POLICY rpg_cla_ataques_membros ON public.rpg_cla_ataques FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cla_membros m WHERE m.cla_id = rpg_cla_ataques.cla_id AND m.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS rpg_cla_recompensas_propria ON public.rpg_cla_recompensas;
CREATE POLICY rpg_cla_recompensas_propria ON public.rpg_cla_recompensas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.rpg_cla_chefes, public.rpg_cla_ataques, public.rpg_cla_recompensas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rpg_cla_chefes, public.rpg_cla_ataques, public.rpg_cla_recompensas TO authenticated;

-- Segunda-feira da semana atual no fuso de Brasília.
CREATE OR REPLACE FUNCTION public.rpg_semana_atual()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
$$;

REVOKE ALL ON FUNCTION public.rpg_semana_atual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_semana_atual() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rpg_cla_expedicao_estado(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cla    public.clas%ROWTYPE;
  v_semana DATE := public.rpg_semana_atual();
  v_chefe  public.rpg_cla_chefes%ROWTYPE;
BEGIN
  SELECT c.* INTO v_cla
    FROM public.cla_membros m JOIN public.clas c ON c.id = m.cla_id AND c.ativo
   WHERE m.user_id = p_user_id;
  IF v_cla.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'tem_cla', false);
  END IF;
  SELECT * INTO v_chefe FROM public.rpg_cla_chefes WHERE cla_id = v_cla.id AND semana = v_semana;

  RETURN jsonb_build_object(
    'ok', true,
    'tem_cla', true,
    'cla_nome', v_cla.nome,
    'cla_tag', v_cla.tag,
    -- XP de cada membro com personagem, para o Go achar a mediana de nível.
    'membros_xp', COALESCE((
      SELECT jsonb_agg(COALESCE((SELECT sum(x.xp_earned) FROM public.xp_ledger x WHERE x.user_id = m.user_id), 0))
        FROM public.cla_membros m
        JOIN public.rpg_personagens r ON r.user_id = m.user_id
       WHERE m.cla_id = v_cla.id), '[]'::JSONB),
    'chefe', CASE WHEN v_chefe.cla_id IS NULL THEN NULL ELSE jsonb_build_object(
      'monstro_id', v_chefe.monstro_id, 'vida_max', v_chefe.vida_max, 'dano', v_chefe.dano,
      'derrotado_em', v_chefe.derrotado_em) END,
    'atacou_hoje', EXISTS (SELECT 1 FROM public.rpg_cla_ataques
                            WHERE user_id = p_user_id AND dia = (now() AT TIME ZONE 'America/Sao_Paulo')::DATE),
    'recebeu', EXISTS (SELECT 1 FROM public.rpg_cla_recompensas WHERE cla_id = v_cla.id AND semana = v_semana AND user_id = p_user_id),
    -- Contribuição da semana, sem user_id: nome do perfil e a marca de quem é você.
    'ranking', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('nome', COALESCE(NULLIF(p.nome, ''), 'Membro'), 'dano', a.dano, 'ataques', a.ataques,
                                          'sou_eu', a.user_id = p_user_id) ORDER BY a.dano DESC)
        FROM (SELECT user_id, sum(dano)::BIGINT AS dano, count(*)::INTEGER AS ataques
                FROM public.rpg_cla_ataques WHERE cla_id = v_cla.id AND semana = v_semana
               GROUP BY user_id) a
        LEFT JOIN public.profiles p ON p.user_id = a.user_id), '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_cla_expedicao_estado(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_cla_expedicao_estado(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_cla_garantir_chefe(p_user_id UUID, p_monstro_id TEXT, p_vida_max BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cla_id UUID;
BEGIN
  SELECT m.cla_id INTO v_cla_id FROM public.cla_membros m JOIN public.clas c ON c.id = m.cla_id AND c.ativo WHERE m.user_id = p_user_id;
  IF v_cla_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Sem clã.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rpg_monstros WHERE id = p_monstro_id AND ativo) OR COALESCE(p_vida_max, 0) <= 0 THEN
    RETURN jsonb_build_object('erro', 'Chefe inválido.');
  END IF;
  -- O primeiro membro a abrir a semana define o chefe; os outros encontram o mesmo.
  INSERT INTO public.rpg_cla_chefes (cla_id, semana, monstro_id, vida_max)
  VALUES (v_cla_id, public.rpg_semana_atual(), p_monstro_id, LEAST(p_vida_max, 1000000000))
  ON CONFLICT (cla_id, semana) DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_cla_garantir_chefe(UUID, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_cla_garantir_chefe(UUID, TEXT, BIGINT) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_cla_atacar(p_user_id UUID, p_dano BIGINT, p_ouro INTEGER, p_bilhetes INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cla_id   UUID;
  v_semana   DATE := public.rpg_semana_atual();
  v_dia      DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_chefe    public.rpg_cla_chefes%ROWTYPE;
  v_ouro     INTEGER := LEAST(GREATEST(COALESCE(p_ouro, 0), 0), 2000);
  v_bilhetes INTEGER := LEAST(GREATEST(COALESCE(p_bilhetes, 0), 0), 10);
  v_derrubou BOOLEAN := false;
BEGIN
  SELECT m.cla_id INTO v_cla_id FROM public.cla_membros m JOIN public.clas c ON c.id = m.cla_id AND c.ativo WHERE m.user_id = p_user_id;
  IF v_cla_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.rpg_personagens WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('erro', 'Entre num clã e desperte o personagem para participar.');
  END IF;

  -- Trava por clã: dois golpes finais ao mesmo tempo não pagam a recompensa duas vezes.
  PERFORM pg_advisory_xact_lock(hashtextextended('rpg_cla:' || v_cla_id::TEXT, 0));

  SELECT * INTO v_chefe FROM public.rpg_cla_chefes WHERE cla_id = v_cla_id AND semana = v_semana FOR UPDATE;
  IF v_chefe.cla_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'O chefe da semana ainda não apareceu.');
  END IF;
  IF v_chefe.derrotado_em IS NOT NULL THEN
    RETURN jsonb_build_object('erro', 'O chefe desta semana já caiu.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.rpg_cla_ataques WHERE user_id = p_user_id AND dia = v_dia) THEN
    RETURN jsonb_build_object('erro', 'Você já atacou hoje. Volte amanhã.');
  END IF;

  INSERT INTO public.rpg_cla_ataques (cla_id, semana, user_id, dia, dano)
  VALUES (v_cla_id, v_semana, p_user_id, v_dia, LEAST(GREATEST(COALESCE(p_dano, 0), 0), v_chefe.vida_max));

  UPDATE public.rpg_cla_chefes
     SET dano = dano + LEAST(GREATEST(COALESCE(p_dano, 0), 0), vida_max)
   WHERE cla_id = v_cla_id AND semana = v_semana
  RETURNING * INTO v_chefe;

  IF v_chefe.dano >= v_chefe.vida_max THEN
    UPDATE public.rpg_cla_chefes SET derrotado_em = now() WHERE cla_id = v_cla_id AND semana = v_semana;
    v_derrubou := true;
    -- Recompensa para quem atacou na semana e ainda é do clã.
    INSERT INTO public.rpg_cla_recompensas (cla_id, semana, user_id, ouro, bilhetes)
    SELECT DISTINCT v_cla_id, v_semana, a.user_id, v_ouro, v_bilhetes
      FROM public.rpg_cla_ataques a
      JOIN public.cla_membros m ON m.user_id = a.user_id AND m.cla_id = v_cla_id
     WHERE a.cla_id = v_cla_id AND a.semana = v_semana
    ON CONFLICT DO NOTHING;
    INSERT INTO public.rpg_recursos (user_id)
    SELECT r.user_id FROM public.rpg_cla_recompensas r WHERE r.cla_id = v_cla_id AND r.semana = v_semana
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.rpg_recursos rr
       SET ouro = rr.ouro + r.ouro, bilhetes = rr.bilhetes + r.bilhetes, atualizado_em = now()
      FROM public.rpg_cla_recompensas r
     WHERE r.cla_id = v_cla_id AND r.semana = v_semana AND r.user_id = rr.user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'dano_total', v_chefe.dano, 'vida_max', v_chefe.vida_max, 'derrubou', v_derrubou);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_cla_atacar(UUID, BIGINT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_cla_atacar(UUID, BIGINT, INTEGER, INTEGER) TO service_role;

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- Depois do primeiro membro abrir a expedição na semana:
-- SELECT cla_id, semana, monstro_id, vida_max, dano, derrotado_em FROM public.rpg_cla_chefes ORDER BY criado_em DESC LIMIT 5;
-- SELECT user_id, dia, dano FROM public.rpg_cla_ataques ORDER BY id DESC LIMIT 5;
