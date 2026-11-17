-- =============================================================================
-- 109 — Avaliações públicas da obra (anime_reviews) e missões de avaliação (#276)
-- =============================================================================
--
-- Separa a anotação privada do deck (media_entries.anotacao) da avaliação pública
-- da obra (anime_reviews), exige anime Completo e mínimo de 100 caracteres,
-- integra proteção contra spoiler e estende as amarras da Fase 18.8 para as
-- missões diárias de avaliar obra (>= 100 caracteres) e episódio (>= 60).
--
-- Pode rodar mais de uma vez. Aplicar após sql/101 e sql/105.

-- -----------------------------------------------------------------------------
-- 1. Tabela anime_reviews e validação de eligibilidade
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anime_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id         integer NOT NULL CHECK (mal_id > 0),
  nota           numeric(4,2) CHECK (nota IS NULL OR (nota >= 1 AND nota <= 10)),
  texto          text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 100 AND 2000),
  contem_spoiler boolean NOT NULL DEFAULT false,
  oculto         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id)
);

CREATE INDEX IF NOT EXISTS anime_reviews_mal_idx
  ON public.anime_reviews (mal_id, created_at DESC)
  WHERE NOT oculto;

CREATE INDEX IF NOT EXISTS anime_reviews_user_idx
  ON public.anime_reviews (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.pode_avaliar_anime(p_user_id uuid, p_mal_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id IS NOT NULL
     AND COALESCE(p_mal_id, 0) > 0
     AND EXISTS (
       SELECT 1
         FROM public.media_entries m
        WHERE m.user_id = p_user_id
          AND m.mal_id = p_mal_id
          AND m.tipo = 'anime'
          AND m.status = 'Completo'
     )
     AND (
       EXISTS (
         SELECT 1
           FROM public.episode_progress ep
          WHERE ep.user_id = p_user_id
            AND ep.mal_id = p_mal_id
       )
       OR NOT (
         EXISTS (
           SELECT 1
             FROM public.anime_metadata_cache mc
            WHERE mc.mal_id = p_mal_id
              AND COALESCE(mc.episodes, 0) > 0
         )
         OR EXISTS (
           SELECT 1
             FROM public.curated_animes ca
            WHERE ca.mal_id = p_mal_id
              AND jsonb_typeof(ca.custom_episodes) = 'array'
              AND jsonb_array_length(ca.custom_episodes) > 0
         )
       )
     );
$$;

REVOKE ALL ON FUNCTION public.pode_avaliar_anime(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_avaliar_anime(uuid, integer) TO authenticated, service_role;

ALTER TABLE public.anime_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anime_reviews_leitura ON public.anime_reviews;
CREATE POLICY anime_reviews_leitura ON public.anime_reviews
  FOR SELECT TO anon, authenticated
  USING (NOT oculto OR (SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS anime_reviews_cria ON public.anime_reviews;
CREATE POLICY anime_reviews_cria ON public.anime_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT oculto
    AND public.pode_avaliar_anime((SELECT auth.uid()), mal_id)
  );

DROP POLICY IF EXISTS anime_reviews_edita ON public.anime_reviews;
CREATE POLICY anime_reviews_edita ON public.anime_reviews
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND NOT oculto)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT oculto
    AND public.pode_avaliar_anime((SELECT auth.uid()), mal_id)
  );

DROP POLICY IF EXISTS anime_reviews_remove ON public.anime_reviews;
CREATE POLICY anime_reviews_remove ON public.anime_reviews
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

-- Autor edita apenas nota, texto, spoiler e data de edição; oculto fica reservado ao service role.
REVOKE INSERT, UPDATE, DELETE ON public.anime_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.anime_reviews TO anon, authenticated, service_role;
GRANT INSERT (user_id, mal_id, nota, texto, contem_spoiler) ON public.anime_reviews TO authenticated;
GRANT UPDATE (nota, texto, contem_spoiler, updated_at) ON public.anime_reviews TO authenticated;
GRANT DELETE ON public.anime_reviews TO authenticated;
GRANT ALL ON public.anime_reviews TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Evidência de avaliação pública em missoes_evidencias
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_nome text;
BEGIN
  FOR v_nome IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.missoes_evidencias'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%tipo_acao%'
  LOOP
    EXECUTE format('ALTER TABLE public.missoes_evidencias DROP CONSTRAINT %I', v_nome);
  END LOOP;
END;
$$;

ALTER TABLE public.missoes_evidencias
  ADD CONSTRAINT missoes_evidencias_tipo_acao_check
  CHECK (tipo_acao IN ('episodio', 'comentario', 'reacao', 'carta', 'review_anime'));

ALTER TABLE public.missoes_evidencias
  ADD COLUMN IF NOT EXISTS review_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS missoes_evidencias_uq_review
  ON public.missoes_evidencias (resgate_id, tipo_acao, review_id)
  WHERE tipo_acao = 'review_anime' AND review_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. reavaliar_missoes(uuid) — definição viva (antes no sql/101)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reavaliar_missoes(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_resgate      public.missoes_resgates%ROWTYPE;
  v_semana_ini   timestamptz;
  v_progresso    integer;
  v_prog_vivo    integer;
  v_cumprida     boolean;
  v_xe_id        integer;
  v_tem_episodio boolean;
  v_conv         RECORD;
  v_estornos     integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('reavaliar_missoes:' || p_user_id::text));

  FOR v_resgate IN
    SELECT * FROM public.missoes_resgates
     WHERE user_id = p_user_id
     ORDER BY criado_em ASC
  LOOP
    v_semana_ini := (date_trunc('week', v_resgate.periodo_inicio AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
    v_progresso := 0;

    IF v_resgate.tipo = 'episodios' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio';

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.episode_progress ep
         WHERE ep.user_id = v_resgate.user_id
           AND ep.watched_at IS NOT NULL
           AND ep.watched_at >= v_resgate.periodo_inicio
           AND ep.watched_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'episodios_genero' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio'
         AND (
           v_resgate.genero = ''
           OR EXISTS (SELECT 1 FROM unnest(ev.generos) g WHERE lower(g) = lower(v_resgate.genero))
         );

    ELSIF v_resgate.tipo = 'animes_distintos' THEN
      SELECT count(DISTINCT ev.mal_id)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio';

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(DISTINCT ep.mal_id)::integer INTO v_prog_vivo
          FROM public.episode_progress ep
         WHERE ep.user_id = v_resgate.user_id
           AND ep.watched_at IS NOT NULL
           AND ep.watched_at >= v_resgate.periodo_inicio
           AND ep.watched_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'comecar_anime' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio'
         AND ev.episode_number = 1;

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.episode_progress ep
         WHERE ep.user_id = v_resgate.user_id
           AND ep.episode_number = 1
           AND ep.watched_at IS NOT NULL
           AND ep.watched_at >= v_resgate.periodo_inicio
           AND ep.watched_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'lancamento' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio'
         AND ev.lancamento = true;

    ELSIF v_resgate.tipo = 'foco' THEN
      SELECT COALESCE(max(qtd), 0)::integer INTO v_progresso
        FROM (
          SELECT ev.mal_id, count(*)::integer AS qtd
            FROM public.missoes_evidencias ev
            JOIN public.episode_progress ep
              ON ep.user_id = v_resgate.user_id
             AND ep.mal_id = ev.mal_id
             AND ep.episode_number = ev.episode_number
             AND ep.watched_at IS NOT NULL
           WHERE ev.resgate_id = v_resgate.id
             AND ev.tipo_acao = 'episodio'
           GROUP BY ev.mal_id
        ) sub;

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT COALESCE(max(qtd), 0)::integer INTO v_prog_vivo
          FROM (
            SELECT ep.mal_id, count(*)::integer AS qtd
              FROM public.episode_progress ep
             WHERE ep.user_id = v_resgate.user_id
               AND ep.watched_at IS NOT NULL
               AND ep.watched_at >= v_resgate.periodo_inicio
               AND ep.watched_at < v_resgate.periodo_fim
             GROUP BY ep.mal_id
          ) sub;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'dias_ativos' THEN
      SELECT count(DISTINCT (ep.watched_at AT TIME ZONE 'America/Sao_Paulo')::date)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_progress ep
          ON ep.user_id = v_resgate.user_id
         AND ep.mal_id = ev.mal_id
         AND ep.episode_number = ev.episode_number
         AND ep.watched_at IS NOT NULL
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'episodio';

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(DISTINCT (ep.watched_at AT TIME ZONE 'America/Sao_Paulo')::date)::integer INTO v_prog_vivo
          FROM public.episode_progress ep
         WHERE ep.user_id = v_resgate.user_id
           AND ep.watched_at IS NOT NULL
           AND ep.watched_at >= v_resgate.periodo_inicio
           AND ep.watched_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo IN ('completar_obra', 'completar_do_ano', 'completar_temporada', 'completar_genero') THEN
      SELECT count(DISTINCT ev.mal_id)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.user_cards uc
          ON uc.user_id = v_resgate.user_id
         AND uc.mal_id = ev.mal_id
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'carta'
         AND (v_resgate.tipo <> 'completar_do_ano' OR ev.do_ano)
         AND (v_resgate.tipo <> 'completar_temporada' OR ev.da_temporada)
         AND (
           v_resgate.tipo <> 'completar_genero'
           OR v_resgate.genero = ''
           OR EXISTS (SELECT 1 FROM unnest(ev.generos) g WHERE lower(g) = lower(v_resgate.genero))
         )
         AND EXISTS (
           SELECT 1 FROM public.episode_progress ep
            WHERE ep.user_id = v_resgate.user_id
              AND ep.mal_id = ev.mal_id
              AND ep.watched_at IS NOT NULL
              AND ep.watched_at >= v_semana_ini
              AND ep.watched_at < v_resgate.periodo_fim
         );

    ELSIF v_resgate.tipo = 'reagir_episodio' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_reactions er
          ON er.user_id = v_resgate.user_id
         AND er.mal_id = ev.mal_id
         AND er.episode_number = ev.episode_number
         AND er.reacao = ev.reacao
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'reacao';

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.episode_reactions er
         WHERE er.user_id = v_resgate.user_id
           AND er.created_at >= v_resgate.periodo_inicio
           AND er.created_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'comentar_episodio' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_comments c
          ON c.id = ev.comment_id
         AND c.user_id = v_resgate.user_id
         AND NOT c.oculto
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'comentario';

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.episode_comments c
         WHERE c.user_id = v_resgate.user_id
           AND NOT c.oculto
           AND c.created_at >= v_resgate.periodo_inicio
           AND c.created_at < v_resgate.periodo_fim;
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'avaliar_anime' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.anime_reviews r
          ON r.id = ev.review_id
         AND r.user_id = v_resgate.user_id
         AND NOT r.oculto
         AND char_length(btrim(r.texto)) >= 100
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'review_anime'
         AND public.pode_avaliar_anime(v_resgate.user_id, r.mal_id);

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.anime_reviews r
         WHERE r.user_id = v_resgate.user_id
           AND NOT r.oculto
           AND char_length(btrim(r.texto)) >= 100
           AND r.created_at >= v_resgate.periodo_inicio
           AND r.created_at < v_resgate.periodo_fim
           AND public.pode_avaliar_anime(v_resgate.user_id, r.mal_id);
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;

    ELSIF v_resgate.tipo = 'avaliar_episodio' THEN
      SELECT count(*)::integer INTO v_progresso
        FROM public.missoes_evidencias ev
        JOIN public.episode_comments c
          ON c.id = ev.comment_id
         AND c.user_id = v_resgate.user_id
         AND NOT c.oculto
         AND char_length(btrim(c.texto)) >= 60
       WHERE ev.resgate_id = v_resgate.id
         AND ev.tipo_acao = 'comentario'
         AND EXISTS (
           SELECT 1
             FROM public.episode_progress ep
            WHERE ep.user_id = v_resgate.user_id
              AND ep.mal_id = c.mal_id
              AND ep.episode_number = c.episode_number
         );

      IF v_progresso < v_resgate.meta AND now() < v_resgate.periodo_fim THEN
        SELECT count(*)::integer INTO v_prog_vivo
          FROM public.episode_comments c
         WHERE c.user_id = v_resgate.user_id
           AND NOT c.oculto
           AND char_length(btrim(c.texto)) >= 60
           AND c.created_at >= v_resgate.periodo_inicio
           AND c.created_at < v_resgate.periodo_fim
           AND EXISTS (
             SELECT 1
               FROM public.episode_progress ep
              WHERE ep.user_id = v_resgate.user_id
                AND ep.mal_id = c.mal_id
                AND ep.episode_number = c.episode_number
           );
        v_progresso := GREATEST(v_progresso, v_prog_vivo);
      END IF;
    END IF;

    v_cumprida := (v_progresso >= v_resgate.meta);

    SELECT id INTO v_xe_id
      FROM public.xp_extra
     WHERE user_id = p_user_id
       AND origem = v_resgate.referencia;

    IF NOT v_cumprida THEN
      IF v_xe_id IS NOT NULL THEN
        DELETE FROM public.xp_ledger
         WHERE user_id = p_user_id
           AND mal_id = 0
           AND episode_number = v_xe_id;
        DELETE FROM public.xp_extra
         WHERE id = v_xe_id;
        v_estornos := v_estornos + 1;
      END IF;

      IF v_resgate.estornada_em IS NULL THEN
        UPDATE public.missoes_resgates
           SET estornada_em = clock_timestamp()
         WHERE id = v_resgate.id;
      END IF;
    ELSE
      IF v_resgate.xp > 0 AND v_xe_id IS NULL THEN
        PERFORM public.conceder_xp_extra(
          p_user_id,
          v_resgate.xp,
          CASE WHEN v_resgate.texto_xp <> '' THEN v_resgate.texto_xp ELSE 'Missão concluída' END,
          v_resgate.referencia
        );
      END IF;
      IF v_resgate.estornada_em IS NOT NULL THEN
        UPDATE public.missoes_resgates
           SET estornada_em = NULL
         WHERE id = v_resgate.id;
      END IF;
    END IF;
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM public.episode_progress WHERE user_id = p_user_id
  ) INTO v_tem_episodio;

  IF NOT v_tem_episodio THEN
    FOR v_conv IN
      SELECT id FROM public.xp_extra
       WHERE user_id = p_user_id
         AND origem LIKE 'convite:%'
    LOOP
      DELETE FROM public.xp_ledger
       WHERE user_id = p_user_id
         AND mal_id = 0
         AND episode_number = v_conv.id;
      DELETE FROM public.xp_extra
       WHERE id = v_conv.id;
      v_estornos := v_estornos + 1;
    END LOOP;
  ELSE
    FOR v_conv IN
      SELECT convidado_user_id, recompensa_anfitriao_xp
        FROM public.convites_resgatados
       WHERE anfitriao_user_id = p_user_id
         AND recompensa_anfitriao_xp > 0
    LOOP
      PERFORM public.conceder_xp_extra(
        p_user_id,
        LEAST(v_conv.recompensa_anfitriao_xp, 500),
        'Convite de amigo',
        'convite:' || v_conv.convidado_user_id::text
      );
    END LOOP;
  END IF;

  RETURN v_estornos;
END;
$$;

REVOKE ALL ON FUNCTION public.reavaliar_missoes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reavaliar_missoes(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. resgatar_missao() — definição viva (antes no sql/101)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resgatar_missao(
  p_user_id    uuid,
  p_motivo     text,
  p_referencia text,
  p_anicoins   integer,
  p_xp         integer,
  p_texto_xp   text,
  p_detalhe    jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo       integer;
  v_xp          integer := 0;
  v_resgate_id  uuid;
  v_tipo        text;
  v_meta        integer;
  v_inicio      timestamptz;
  v_fim         timestamptz;
  v_genero      text;
  v_evidencias  jsonb;
  v_ev          jsonb;
  v_qtd_ev      integer := 0;
BEGIN
  IF p_motivo NOT IN ('missao_diaria', 'missao_semanal') THEN
    RAISE EXCEPTION 'Motivo de missão inválido: %', p_motivo USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_referencia));

  IF EXISTS (
    SELECT 1 FROM public.crystal_ledger
     WHERE user_id = p_user_id AND motivo = p_motivo AND referencia = p_referencia
  ) THEN
    RETURN jsonb_build_object('ja_resgatada', true, 'saldo', 0, 'xp', 0);
  END IF;

  v_tipo := COALESCE(NULLIF(btrim(p_detalhe->>'tipo'), ''), 'episodios');
  v_meta := GREATEST(1, COALESCE((p_detalhe->>'meta')::integer, 1));
  v_genero := COALESCE(btrim(p_detalhe->>'genero'), '');
  v_inicio := COALESCE(
    NULLIF(btrim(p_detalhe->>'periodo_inicio'), '')::timestamptz,
    date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
  );
  v_fim := COALESCE(
    NULLIF(btrim(p_detalhe->>'periodo_fim'), '')::timestamptz,
    CASE WHEN p_motivo = 'missao_semanal' THEN v_inicio + interval '7 days' ELSE v_inicio + interval '1 day' END
  );

  -- Missões de avaliação valem no máximo uma vez por dia por tipo.
  IF v_tipo IN ('avaliar_anime', 'avaliar_episodio') THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || ':avaliacao:' || v_tipo || ':' || to_char(v_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'))
    );
    IF EXISTS (
      SELECT 1
        FROM public.missoes_resgates mr
       WHERE mr.user_id = p_user_id
         AND mr.tipo = v_tipo
         AND mr.referencia <> btrim(p_referencia)
         AND (mr.periodo_inicio AT TIME ZONE 'America/Sao_Paulo')::date = (v_inicio AT TIME ZONE 'America/Sao_Paulo')::date
    ) THEN
      RETURN jsonb_build_object('ja_resgatada', true, 'limite_diario', true, 'saldo', 0, 'xp', 0);
    END IF;
  END IF;

  v_saldo := public.creditar_cristais(p_user_id, p_anicoins, p_motivo, p_referencia);
  v_xp := public.conceder_xp_extra(p_user_id, p_xp, p_texto_xp, p_referencia);

  INSERT INTO public.missoes_resgates (
    user_id, referencia, motivo, tipo, meta, xp, texto_xp, periodo_inicio, periodo_fim, genero
  ) VALUES (
    p_user_id, btrim(p_referencia), p_motivo, v_tipo, v_meta, GREATEST(0, COALESCE(p_xp, 0)),
    COALESCE(btrim(p_texto_xp), ''), v_inicio, v_fim, v_genero
  )
  ON CONFLICT (user_id, referencia) DO UPDATE
    SET estornada_em = NULL
  RETURNING id INTO v_resgate_id;

  v_evidencias := COALESCE(p_detalhe->'evidencias', '[]'::jsonb);
  IF jsonb_typeof(v_evidencias) = 'array' THEN
    FOR v_ev IN SELECT * FROM jsonb_array_elements(v_evidencias)
    LOOP
      IF COALESCE(v_ev->>'tipo_acao', '') NOT IN ('episodio', 'comentario', 'reacao', 'carta', 'review_anime') THEN
        CONTINUE;
      END IF;
      INSERT INTO public.missoes_evidencias (
        resgate_id, user_id, tipo_acao, mal_id, episode_number, comment_id, review_id, reacao,
        lancamento, do_ano, da_temporada, generos, acao_em
      ) VALUES (
        v_resgate_id,
        p_user_id,
        v_ev->>'tipo_acao',
        NULLIF(v_ev->>'mal_id', '')::integer,
        NULLIF(v_ev->>'episode_number', '')::integer,
        NULLIF(v_ev->>'comment_id', '')::uuid,
        NULLIF(v_ev->>'review_id', '')::uuid,
        NULLIF(v_ev->>'reacao', ''),
        COALESCE((v_ev->>'lancamento')::boolean, false),
        COALESCE((v_ev->>'do_ano')::boolean, false),
        COALESCE((v_ev->>'da_temporada')::boolean, false),
        COALESCE(
          (SELECT array_agg(val::text) FROM jsonb_array_elements_text(COALESCE(v_ev->'generos', '[]'::jsonb)) val),
          ARRAY[]::text[]
        ),
        COALESCE(NULLIF(v_ev->>'acao_em', '')::timestamptz, now())
      )
      ON CONFLICT DO NOTHING;
      v_qtd_ev := v_qtd_ev + 1;
    END LOOP;
  END IF;

  IF v_qtd_ev = 0 AND v_tipo IN ('episodios', 'animes_distintos', 'comecar_anime', 'lancamento', 'foco', 'dias_ativos', 'episodios_genero') THEN
    INSERT INTO public.missoes_evidencias (
      resgate_id, user_id, tipo_acao, mal_id, episode_number, acao_em
    )
    SELECT v_resgate_id, p_user_id, 'episodio', ep.mal_id, ep.episode_number, ep.watched_at
      FROM public.episode_progress ep
     WHERE ep.user_id = p_user_id
       AND ep.watched_at IS NOT NULL
       AND ep.mal_id > 0
       AND ep.episode_number > 0
       AND (v_tipo <> 'comecar_anime' OR ep.episode_number = 1)
     ORDER BY ep.watched_at DESC, ep.episode_number DESC
     LIMIT v_meta
    ON CONFLICT DO NOTHING;
  ELSIF v_qtd_ev = 0 AND v_tipo = 'avaliar_anime' THEN
    INSERT INTO public.missoes_evidencias (
      resgate_id, user_id, tipo_acao, review_id, mal_id, acao_em
    )
    SELECT v_resgate_id, p_user_id, 'review_anime', r.id, r.mal_id, r.created_at
      FROM public.anime_reviews r
     WHERE r.user_id = p_user_id
       AND NOT r.oculto
       AND char_length(btrim(r.texto)) >= 100
       AND public.pode_avaliar_anime(p_user_id, r.mal_id)
     ORDER BY r.created_at DESC
     LIMIT v_meta
    ON CONFLICT DO NOTHING;
  ELSIF v_qtd_ev = 0 AND v_tipo = 'avaliar_episodio' THEN
    INSERT INTO public.missoes_evidencias (
      resgate_id, user_id, tipo_acao, comment_id, mal_id, episode_number, acao_em
    )
    SELECT v_resgate_id, p_user_id, 'comentario', c.id, c.mal_id, c.episode_number, c.created_at
      FROM public.episode_comments c
     WHERE c.user_id = p_user_id
       AND NOT c.oculto
       AND char_length(btrim(c.texto)) >= 60
       AND EXISTS (
         SELECT 1
           FROM public.episode_progress ep
          WHERE ep.user_id = p_user_id
            AND ep.mal_id = c.mal_id
            AND ep.episode_number = c.episode_number
       )
     ORDER BY c.created_at DESC
     LIMIT v_meta
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ja_resgatada', false, 'saldo', v_saldo, 'xp', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Gatilhos para estorno imediato ao apagar, ocultar, encurtar ou sair de Completo
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_anime_reviews_reavaliar_missoes ON public.anime_reviews;
CREATE TRIGGER trg_anime_reviews_reavaliar_missoes
  AFTER INSERT OR UPDATE OF texto, oculto OR DELETE ON public.anime_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();

DROP TRIGGER IF EXISTS trg_episode_comments_reavaliar_missoes ON public.episode_comments;
CREATE TRIGGER trg_episode_comments_reavaliar_missoes
  AFTER INSERT OR UPDATE OF texto, oculto OR DELETE ON public.episode_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();

DROP TRIGGER IF EXISTS trg_media_entries_reavaliar_missoes ON public.media_entries;
CREATE TRIGGER trg_media_entries_reavaliar_missoes
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.media_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();
