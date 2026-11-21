-- =============================================================================
-- 138 — Masmorras estilo Roguelite (Issue #332)
-- =============================================================================
-- Estado persistido da incursão andar a andar na masmorra (1 sessão ativa ou
-- recente por jogador). A simulação de cada andar, sorteio de 1-de-3 bênçãos e
-- aplicação dos altares acontecem no Go; a finalização paga Ouro, bilhetes,
-- item e computa a entrada diária via rpg_concluir_masmorra (sql/128).
--
-- Ordem: depois do 128 e do 136, antes de promover. Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.rpg_masmorra_sessoes (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  masmorra_id      TEXT NOT NULL CHECK (length(masmorra_id) BETWEEN 1 AND 40),
  esquadrao        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  andar_atual      INTEGER NOT NULL DEFAULT 0 CHECK (andar_atual >= 0),
  total_andares    INTEGER NOT NULL DEFAULT 1 CHECK (total_andares >= 1),
  herois_hp        JSONB NOT NULL DEFAULT '[]'::jsonb,
  bencaos          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  escolhas_bencao  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  altar_ativo      TEXT,
  vencidos         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  usos             JSONB NOT NULL DEFAULT '{}'::jsonb,
  ouro_bonus_pct   INTEGER NOT NULL DEFAULT 0 CHECK (ouro_bonus_pct BETWEEN 0 AND 100),
  status           TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'vitoria', 'recuou', 'derrota')),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rpg_masmorra_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rpg_masmorra_sessoes_le_proprio ON public.rpg_masmorra_sessoes;
CREATE POLICY rpg_masmorra_sessoes_le_proprio ON public.rpg_masmorra_sessoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.rpg_masmorra_sessoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rpg_masmorra_sessoes TO authenticated;

CREATE OR REPLACE FUNCTION public.rpg_roguelite_salvar(
  p_user_id         UUID,
  p_masmorra_id     TEXT,
  p_esquadrao       TEXT[],
  p_andar_atual     INTEGER,
  p_total_andares   INTEGER,
  p_herois_hp       JSONB,
  p_bencaos         TEXT[],
  p_escolhas_bencao TEXT[],
  p_altar_ativo     TEXT,
  p_vencidos        TEXT[],
  p_usos            JSONB,
  p_ouro_bonus_pct  INTEGER,
  p_status          TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Jogador inválido.');
  END IF;

  INSERT INTO public.rpg_masmorra_sessoes (
    user_id, masmorra_id, esquadrao, andar_atual, total_andares, herois_hp,
    bencaos, escolhas_bencao, altar_ativo, vencidos, usos, ouro_bonus_pct,
    status, atualizado_em
  )
  VALUES (
    p_user_id,
    p_masmorra_id,
    COALESCE(p_esquadrao, ARRAY[]::TEXT[]),
    GREATEST(0, COALESCE(p_andar_atual, 0)),
    GREATEST(1, COALESCE(p_total_andares, 1)),
    COALESCE(p_herois_hp, '[]'::jsonb),
    COALESCE(p_bencaos, ARRAY[]::TEXT[]),
    COALESCE(p_escolhas_bencao, ARRAY[]::TEXT[]),
    NULLIF(btrim(COALESCE(p_altar_ativo, '')), ''),
    COALESCE(p_vencidos, ARRAY[]::TEXT[]),
    COALESCE(p_usos, '{}'::jsonb),
    LEAST(100, GREATEST(0, COALESCE(p_ouro_bonus_pct, 0))),
    COALESCE(NULLIF(btrim(COALESCE(p_status, '')), ''), 'ativa'),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    masmorra_id     = EXCLUDED.masmorra_id,
    esquadrao       = EXCLUDED.esquadrao,
    andar_atual     = EXCLUDED.andar_atual,
    total_andares   = EXCLUDED.total_andares,
    herois_hp       = EXCLUDED.herois_hp,
    bencaos         = EXCLUDED.bencaos,
    escolhas_bencao = EXCLUDED.escolhas_bencao,
    altar_ativo     = EXCLUDED.altar_ativo,
    vencidos        = EXCLUDED.vencidos,
    usos            = EXCLUDED.usos,
    ouro_bonus_pct  = EXCLUDED.ouro_bonus_pct,
    status          = EXCLUDED.status,
    atualizado_em   = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_roguelite_salvar(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, JSONB, TEXT[], TEXT[], TEXT, TEXT[], JSONB, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_roguelite_salvar(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, JSONB, TEXT[], TEXT[], TEXT, TEXT[], JSONB, INTEGER, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpg_roguelite_limpar(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Jogador inválido.');
  END IF;
  DELETE FROM public.rpg_masmorra_sessoes WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_roguelite_limpar(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpg_roguelite_limpar(UUID) TO service_role;
