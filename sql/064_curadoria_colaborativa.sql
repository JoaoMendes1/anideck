-- =============================================================================
-- 064 — Curadoria Colaborativa (#188, Fase 17.7)
-- =============================================================================
-- Membros de rank alto sugerem correções (título de episódio em português,
-- data de estreia, links de streaming). A curadoria continua soberana:
-- a sugestão entra na fila de revisão do admin, e a aprovação credita Cristais.

CREATE TABLE IF NOT EXISTS public.curation_collab_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id              INT NOT NULL,
  campo               TEXT NOT NULL CHECK (campo IN ('titulo_episodio', 'estreia', 'link_streaming', 'sinopse')),
  episodio_numero     INT NOT NULL DEFAULT 0,
  valor_sugerido      TEXT NOT NULL,
  motivo              TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  avaliado_por        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  avaliado_em         TIMESTAMPTZ,
  justificativa_recusa TEXT NOT NULL DEFAULT '',
  cristais_pagos      INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_curation_collab_pendentes ON public.curation_collab_suggestions(mal_id, status) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_curation_collab_usuario ON public.curation_collab_suggestions(user_id, created_at);

-- RLS
ALTER TABLE public.curation_collab_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS curation_collab_select_propria ON public.curation_collab_suggestions;
CREATE POLICY curation_collab_select_propria ON public.curation_collab_suggestions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS curation_collab_insert_propria ON public.curation_collab_suggestions;
CREATE POLICY curation_collab_insert_propria ON public.curation_collab_suggestions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Configurações padrão em app_settings
INSERT INTO public.app_settings (key, value)
VALUES ('curadoria_colaborativa_config', '{"rank_minimo":"B","limite_diario":5,"cristais_recompensa":15}')
ON CONFLICT (key) DO NOTHING;

-- RPC para enviar uma sugestão colaborativa com validação de limite diário e rank
CREATE OR REPLACE FUNCTION public.submeter_sugestao_curadoria(
  p_mal_id INT,
  p_campo TEXT,
  p_episodio_numero INT,
  p_valor TEXT,
  p_motivo TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rank_min TEXT := 'B';
  v_limite_diario INT := 5;
  v_enviadas_hoje INT;
  v_ja_pendente INT;
  v_xp_total INT := 0;
  v_id UUID;
  v_config JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Lê configurações
  SELECT value::jsonb INTO v_config FROM public.app_settings WHERE key = 'curadoria_colaborativa_config';
  IF v_config IS NOT NULL THEN
    v_rank_min := COALESCE(v_config->>'rank_minimo', 'B');
    v_limite_diario := COALESCE((v_config->>'limite_diario')::int, 5);
  END IF;

  -- Confere XP do usuário para garantir rank compatível
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_xp_total FROM public.xp_ledger WHERE user_id = v_uid;
  -- Rank B exige pelo menos 1800 XP acumulado
  IF v_rank_min = 'B' AND v_xp_total < 1800 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você precisa ter pelo menos Rank B na Guilda para sugerir correções de curadoria.';
  END IF;

  -- Confere limite diário
  SELECT COUNT(*) INTO v_enviadas_hoje
  FROM public.curation_collab_suggestions
  WHERE user_id = v_uid
    AND created_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_enviadas_hoje >= v_limite_diario AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você atingiu o limite de % sugestões por dia.', v_limite_diario;
  END IF;

  -- Evita duplicata pendente para o mesmo campo e episódio
  SELECT COUNT(*) INTO v_ja_pendente
  FROM public.curation_collab_suggestions
  WHERE mal_id = p_mal_id
    AND campo = p_campo
    AND episodio_numero = p_episodio_numero
    AND status = 'pendente';

  IF v_ja_pendente > 0 THEN
    RAISE EXCEPTION 'Já existe uma sugestão pendente de análise para este campo.';
  END IF;

  INSERT INTO public.curation_collab_suggestions (
    user_id, mal_id, campo, episodio_numero, valor_sugerido, motivo
  ) VALUES (
    v_uid, p_mal_id, p_campo, p_episodio_numero, TRIM(p_valor), TRIM(p_motivo)
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('sucesso', true, 'id', v_id);
END;
$$;

-- RPC Admin para aprovar ou rejeitar uma sugestão colaborativa
CREATE OR REPLACE FUNCTION public.admin_revisar_sugestao_curadoria(
  p_sugestao_id UUID,
  p_aprovar BOOLEAN,
  p_justificativa TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_sug RECORD;
  v_cristais INT := 15;
  v_config JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: exclusivo para administradores';
  END IF;

  SELECT * INTO v_sug FROM public.curation_collab_suggestions WHERE id = p_sugestao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugestão não encontrada';
  END IF;

  IF v_sug.status <> 'pendente' THEN
    RAISE EXCEPTION 'Esta sugestão já foi avaliada anteriormente.';
  END IF;

  SELECT value::jsonb INTO v_config FROM public.app_settings WHERE key = 'curadoria_colaborativa_config';
  IF v_config IS NOT NULL AND v_config ? 'cristais_recompensa' THEN
    v_cristais := COALESCE((v_config->>'cristais_recompensa')::int, 15);
  END IF;

  IF p_aprovar THEN
    -- Credita Cristais para o autor da sugestão (#167)
    PERFORM public.creditar_cristais(
      v_sug.user_id,
      v_cristais,
      'curadoria_colaborativa',
      'sugestao:' || p_sugestao_id::text
    );

    UPDATE public.curation_collab_suggestions
    SET status = 'aprovada',
        avaliado_por = v_admin,
        avaliado_em = now(),
        cristais_pagos = v_cristais
    WHERE id = p_sugestao_id;

    RETURN jsonb_build_object('sucesso', true, 'status', 'aprovada', 'cristais_pagos', v_cristais);
  ELSE
    UPDATE public.curation_collab_suggestions
    SET status = 'recusada',
        avaliado_por = v_admin,
        avaliado_em = now(),
        justificativa_recusa = TRIM(p_justificativa)
    WHERE id = p_sugestao_id;

    RETURN jsonb_build_object('sucesso', true, 'status', 'recusada');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submeter_sugestao_curadoria(INT, TEXT, INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revisar_sugestao_curadoria(UUID, BOOLEAN, TEXT) TO authenticated;
