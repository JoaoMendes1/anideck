-- =============================================================================
-- 112 — Denúncia de perfil e de avaliação, e contador da moderação
-- =============================================================================
--
-- O que muda:
--   1. Tabela public.denuncias para perfis e avaliações de anime. Comentários e clãs
--      continuam nas tabelas que já existem (comment_reports, sql/041; denúncias de clã,
--      sql/054): a fila do Painel Admin junta as quatro.
--   2. denunciar(): quem está logado denuncia. Regras no banco: o alvo existe, ninguém
--      denuncia a si mesmo nem o mesmo alvo duas vezes, e no máximo 10 denúncias por dia.
--   3. moderacao_pendentes(): quantas denúncias esperam decisão, somando as quatro filas.
--      Só o admin recebe o número; para os outros, 0. A campainha do admin mostra isso.
--
-- Pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.denuncias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alvo_tipo       TEXT NOT NULL CHECK (alvo_tipo IN ('perfil', 'avaliacao')),
  alvo_id         UUID NOT NULL,
  -- Dono do conteúdo denunciado, gravado na hora: a punição sabe em quem cair mesmo que o
  -- conteúdo seja apagado depois.
  alvo_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  denunciante_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo          TEXT NOT NULL CHECK (motivo IN ('spoiler', 'ofensa', 'spam', 'improprio', 'outro')),
  detalhe         TEXT NOT NULL DEFAULT '' CHECK (char_length(detalhe) <= 300),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvida', 'descartada')),
  decisao         TEXT NOT NULL DEFAULT '' CHECK (char_length(decisao) <= 300),
  resolvida_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvida_em    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alvo_tipo, alvo_id, denunciante_id)
);

CREATE INDEX IF NOT EXISTS denuncias_pendentes_idx ON public.denuncias (created_at DESC) WHERE status = 'pendente';

ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.denuncias FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.denuncias TO service_role;

-- p_alvo: o @ do perfil, ou o id da avaliação.
CREATE OR REPLACE FUNCTION public.denunciar(p_tipo TEXT, p_alvo TEXT, p_motivo TEXT, p_detalhe TEXT DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eu      UUID := auth.uid();
  v_alvo    UUID;
  v_dono    UUID;
  v_hoje    INTEGER;
BEGIN
  IF v_eu IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_motivo NOT IN ('spoiler', 'ofensa', 'spam', 'improprio', 'outro') THEN
    RAISE EXCEPTION 'Motivo inválido.' USING ERRCODE = '22023';
  END IF;

  IF p_tipo = 'perfil' THEN
    SELECT user_id INTO v_dono FROM public.profiles WHERE handle = ltrim(lower(btrim(p_alvo)), '@');
    v_alvo := v_dono;
  ELSIF p_tipo = 'avaliacao' THEN
    BEGIN
      v_alvo := p_alvo::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_alvo := NULL;
    END;
    SELECT user_id INTO v_dono FROM public.anime_reviews WHERE id = v_alvo;
  ELSE
    RAISE EXCEPTION 'Tipo de denúncia inválido.' USING ERRCODE = '22023';
  END IF;

  IF v_dono IS NULL THEN
    RAISE EXCEPTION 'Não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_dono = v_eu THEN
    RAISE EXCEPTION 'Você não pode denunciar a si mesmo.' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_hoje FROM public.denuncias
   WHERE denunciante_id = v_eu AND created_at > now() - INTERVAL '1 day';
  IF v_hoje >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 denúncias por dia. Obrigado por ajudar; volte amanhã.' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.denuncias (alvo_tipo, alvo_id, alvo_user_id, denunciante_id, motivo, detalhe)
  VALUES (p_tipo, v_alvo, v_dono, v_eu, p_motivo, left(btrim(COALESCE(p_detalhe, '')), 300))
  ON CONFLICT (alvo_tipo, alvo_id, denunciante_id) DO NOTHING;

  -- Denunciar de novo o mesmo alvo não é erro: a primeira denúncia já está na fila.
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.denunciar(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.denunciar(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Total pendente nas quatro filas. Tabelas de clã variam de nome entre versões; a de
-- denúncias de clã é lida só se existir.
CREATE OR REPLACE FUNCTION public.moderacao_pendentes()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total INTEGER := 0;
  v_clas  INTEGER := 0;
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    RETURN 0;
  END IF;
  SELECT count(*) INTO v_total FROM public.denuncias WHERE status = 'pendente';
  v_total := v_total + (SELECT count(*) FROM public.comment_reports WHERE NOT resolvido);
  IF to_regclass('public.cla_denuncias') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.cla_denuncias WHERE status = ''pendente''' INTO v_clas;
  END IF;
  RETURN v_total + COALESCE(v_clas, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.moderacao_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderacao_pendentes() TO authenticated, service_role;
