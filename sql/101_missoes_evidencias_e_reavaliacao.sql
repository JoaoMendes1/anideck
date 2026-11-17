-- =============================================================================
-- 101 — Evidências e reavaliação imediata de missões e convites (#266)
-- =============================================================================
--
-- Fecha a brecha em que XP de missões (xp_extra, sql/087) e de convites
-- (sql/062/088/095) permanecia na conta depois que a causa era desfeita.
--
-- O que faz:
--   1. Cria missoes_resgates e missoes_evidencias para guardar as ações exatas
--      (episódio, comentário, reação ou carta) que cumpriram cada missão,
--      permitindo estornar hoje uma missão resgatada ontem ou na semana.
--   2. Atualiza resgatar_missao() (remove a assinatura antiga para evitar
--      ambiguidade PGRST203) gravando o resgate, as evidências, AniCoins e XP.
--   3. Cria reavaliar_missoes(p_user_id uuid), que recalcula a partir do estado
--      atual: se a causa sumiu, apaga imediatamente a linha de xp_extra e seu
--      par em xp_ledger; se o usuário refizer a ação, restaura o mesmo XP
--      (soma zero, sem duplicar AniCoins no crystal_ledger).
--   4. Estorna XP de anfitrião por convite quando o usuário fica com 0
--      episódios marcados em episode_progress (voltando ao nível 1 / rank F)
--      e restaura assim que voltar a ter episódio marcado. Atualiza
--      resgatar_codigo_convite() (definição viva, substituindo a do sql/095).
--   5. Cria gatilhos em episode_progress, episode_comments, episode_reactions
--      e user_cards chamando reavaliar_missoes().
--
-- Pode rodar mais de uma vez.

-- -----------------------------------------------------------------------------
-- 1. Tabelas de resgates e evidências
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.missoes_resgates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referencia     text NOT NULL CHECK (length(btrim(referencia)) BETWEEN 1 AND 120),
  motivo         text NOT NULL CHECK (motivo IN ('missao_diaria', 'missao_semanal')),
  tipo           text NOT NULL,
  meta           integer NOT NULL CHECK (meta > 0),
  xp             integer NOT NULL DEFAULT 0 CHECK (xp >= 0 AND xp <= 500),
  texto_xp       text NOT NULL DEFAULT '',
  periodo_inicio timestamptz NOT NULL,
  periodo_fim    timestamptz NOT NULL,
  genero         text NOT NULL DEFAULT '',
  estornada_em   timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, referencia)
);

CREATE INDEX IF NOT EXISTS missoes_resgates_user_estorno_idx
  ON public.missoes_resgates (user_id, estornada_em DESC NULLS LAST);

ALTER TABLE public.missoes_resgates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missoes_resgates_le_o_proprio ON public.missoes_resgates;
CREATE POLICY missoes_resgates_le_o_proprio ON public.missoes_resgates
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE INSERT, UPDATE, DELETE ON public.missoes_resgates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.missoes_resgates TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.missoes_evidencias (
  id             bigserial PRIMARY KEY,
  resgate_id     uuid NOT NULL REFERENCES public.missoes_resgates(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acao      text NOT NULL CHECK (tipo_acao IN ('episodio', 'comentario', 'reacao', 'carta')),
  mal_id         integer,
  episode_number integer,
  comment_id     uuid,
  reacao         text,
  lancamento     boolean NOT NULL DEFAULT false,
  do_ano         boolean NOT NULL DEFAULT false,
  da_temporada   boolean NOT NULL DEFAULT false,
  generos        text[] NOT NULL DEFAULT ARRAY[]::text[],
  acao_em        timestamptz NOT NULL DEFAULT now(),
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS missoes_evidencias_resgate_idx
  ON public.missoes_evidencias (resgate_id, tipo_acao);

CREATE INDEX IF NOT EXISTS missoes_evidencias_user_acao_idx
  ON public.missoes_evidencias (user_id, tipo_acao, mal_id, episode_number);

CREATE UNIQUE INDEX IF NOT EXISTS missoes_evidencias_uq_ep
  ON public.missoes_evidencias (resgate_id, tipo_acao, mal_id, episode_number)
  WHERE tipo_acao = 'episodio';

CREATE UNIQUE INDEX IF NOT EXISTS missoes_evidencias_uq_carta
  ON public.missoes_evidencias (resgate_id, tipo_acao, mal_id)
  WHERE tipo_acao = 'carta';

CREATE UNIQUE INDEX IF NOT EXISTS missoes_evidencias_uq_com
  ON public.missoes_evidencias (resgate_id, tipo_acao, comment_id)
  WHERE tipo_acao = 'comentario' AND comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS missoes_evidencias_uq_reac
  ON public.missoes_evidencias (resgate_id, tipo_acao, mal_id, episode_number, reacao)
  WHERE tipo_acao = 'reacao';

ALTER TABLE public.missoes_evidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missoes_evidencias_le_o_proprio ON public.missoes_evidencias;
CREATE POLICY missoes_evidencias_le_o_proprio ON public.missoes_evidencias
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE INSERT, UPDATE, DELETE ON public.missoes_evidencias FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.missoes_evidencias TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Função de reavaliação imediata (missões + XP de convites)
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

    -- Avalia a partir das evidências gravadas que continuam existindo nas tabelas reais.
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

  -- Convites: se o usuário zerou todos os episódios marcados, estorna XP de convite
  -- para que voltar a zero episódios realmente devolva ao nível 1 / rank F.
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
-- 3. Redefinição de resgatar_missao() com evidências (evita PGRST203)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resgatar_missao(uuid, text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.resgatar_missao(uuid, text, text, integer, integer, text, jsonb);

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
      IF COALESCE(v_ev->>'tipo_acao', '') NOT IN ('episodio', 'comentario', 'reacao', 'carta') THEN
        CONTINUE;
      END IF;
      INSERT INTO public.missoes_evidencias (
        resgate_id, user_id, tipo_acao, mal_id, episode_number, comment_id, reacao,
        lancamento, do_ano, da_temporada, generos, acao_em
      ) VALUES (
        v_resgate_id,
        p_user_id,
        v_ev->>'tipo_acao',
        NULLIF(v_ev->>'mal_id', '')::integer,
        NULLIF(v_ev->>'episode_number', '')::integer,
        NULLIF(v_ev->>'comment_id', '')::uuid,
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

  -- Fallback quando resgatar_missao é chamada sem lista explícita de evidências:
  -- captura os episódios recentes que sustentam a meta para permitir estorno se desmarcar.
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
  END IF;

  RETURN jsonb_build_object('ja_resgatada', false, 'saldo', v_saldo, 'xp', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resgatar_missao(uuid, text, text, integer, integer, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Convites (definição viva, substituindo sql/095): só paga XP ao anfitrião se
--    ele tiver episódio assistido; caso contrário fica retido até assistir 1 ep.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resgatar_codigo_convite(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_convidado_id uuid := auth.uid();
  v_convite public.convites_membros%ROWTYPE;
  v_regras_raw text;
  v_regras jsonb;
  v_anicoins_anfitriao integer := 50;
  v_xp_anfitriao integer := 100;
  v_anicoins_convidado integer := 30;
  v_anicoins_convidado_admin integer := 100;
  v_titulo_admin text := 'Afilhado do Fundador';
  v_moedas_para_convidado integer;
  v_titulo_concedido text := NULL;
  v_clean_code text;
BEGIN
  IF v_convidado_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_clean_code := lower(trim(p_codigo));
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RAISE EXCEPTION 'Código de convite inválido.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_convidado_id::text));

  IF EXISTS (SELECT 1 FROM public.convites_resgatados WHERE convidado_user_id = v_convidado_id) THEN
    RAISE EXCEPTION 'Você já resgatou um convite nesta conta.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_convite
    FROM public.convites_membros
   WHERE codigo = v_clean_code;

  IF v_convite.id IS NULL THEN
    RAISE EXCEPTION 'Código de convite não encontrado.' USING ERRCODE = 'P0003';
  END IF;

  IF v_convite.anfitriao_user_id = v_convidado_id THEN
    RAISE EXCEPTION 'Você não pode usar o seu próprio código de convite.' USING ERRCODE = 'P0004';
  END IF;

  SELECT value INTO v_regras_raw FROM public.app_settings WHERE key = 'regras_convites';
  IF v_regras_raw IS NOT NULL THEN
    BEGIN
      v_regras := v_regras_raw::jsonb;
      IF v_regras ? 'anicoins_anfitriao' THEN v_anicoins_anfitriao := (v_regras->>'anicoins_anfitriao')::int; END IF;
      IF v_regras ? 'xp_anfitriao' THEN v_xp_anfitriao := (v_regras->>'xp_anfitriao')::int; END IF;
      IF v_regras ? 'anicoins_convidado' THEN v_anicoins_convidado := (v_regras->>'anicoins_convidado')::int; END IF;
      IF v_regras ? 'anicoins_convidado_admin' THEN v_anicoins_convidado_admin := (v_regras->>'anicoins_convidado_admin')::int; END IF;
      IF v_regras ? 'titulo_convidado_admin' THEN v_titulo_admin := v_regras->>'titulo_convidado_admin'; END IF;
    EXCEPTION WHEN OTHERS THEN
    END;
  END IF;

  IF v_convite.especial_admin THEN
    v_moedas_para_convidado := v_anicoins_convidado_admin;
    v_titulo_concedido := v_titulo_admin;
  ELSE
    v_moedas_para_convidado := v_anicoins_convidado;
    v_titulo_concedido := NULL;
  END IF;

  IF v_moedas_para_convidado > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id, quantidade, motivo, referencia
    ) VALUES (
      v_convidado_id, v_moedas_para_convidado, 'bonus_convite_entrada', 'convite:entrada:' || v_convidado_id::text
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  IF v_titulo_concedido IS NOT NULL THEN
    UPDATE public.profiles
       SET titulos_desbloqueados = CASE
             WHEN v_titulo_concedido = ANY(COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[])) THEN titulos_desbloqueados
             ELSE array_append(COALESCE(titulos_desbloqueados, ARRAY[]::TEXT[]), v_titulo_concedido)
           END,
           titulo_ativo = CASE
             WHEN titulo_ativo IS NULL OR titulo_ativo = 'Aventureiro Iniciante' THEN v_titulo_concedido
             ELSE titulo_ativo
           END
     WHERE user_id = v_convidado_id;
  END IF;

  IF v_anicoins_anfitriao > 0 THEN
    INSERT INTO public.crystal_ledger (
      user_id, quantidade, motivo, referencia
    ) VALUES (
      v_convite.anfitriao_user_id,
      v_anicoins_anfitriao,
      'recompensa_convidar_amigo',
      'convite:anfitriao:' || v_convite.id::text || ':' || v_convidado_id::text
    )
    ON CONFLICT (user_id, motivo, referencia) DO NOTHING;
  END IF;

  IF v_xp_anfitriao > 0 AND EXISTS (
    SELECT 1 FROM public.episode_progress WHERE user_id = v_convite.anfitriao_user_id
  ) THEN
    PERFORM public.conceder_xp_extra(
      v_convite.anfitriao_user_id,
      LEAST(v_xp_anfitriao, 500),
      'Convite de amigo',
      'convite:' || v_convidado_id::text
    );
  END IF;

  INSERT INTO public.convites_resgatados (
    convite_id,
    anfitriao_user_id,
    convidado_user_id,
    recompensa_anfitriao_anicoins,
    recompensa_anfitriao_xp,
    recompensa_convidado_anicoins,
    titulo_concedido,
    especial_admin
  ) VALUES (
    v_convite.id,
    v_convite.anfitriao_user_id,
    v_convidado_id,
    v_anicoins_anfitriao,
    v_xp_anfitriao,
    v_moedas_para_convidado,
    v_titulo_concedido,
    v_convite.especial_admin
  );

  UPDATE public.convites_membros
     SET usos_total = usos_total + 1,
         anicoins_ganhos = anicoins_ganhos + v_anicoins_anfitriao
   WHERE id = v_convite.id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'especial_admin', v_convite.especial_admin,
    'anicoins_ganhos', v_moedas_para_convidado,
    'titulo_concedido', v_titulo_concedido
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resgatar_codigo_convite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resgatar_codigo_convite(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Gatilhos chamando reavaliar_missoes() ao apagar/restaurar episódio,
--    comentário, reação ou carta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gatilho_reavaliar_missoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  IF v_user_id IS NOT NULL THEN
    PERFORM public.reavaliar_missoes(v_user_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.gatilho_reavaliar_missoes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_episode_progress_reavaliar_missoes ON public.episode_progress;
CREATE TRIGGER trg_episode_progress_reavaliar_missoes
  AFTER INSERT OR UPDATE OF watched_at OR DELETE ON public.episode_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();

DROP TRIGGER IF EXISTS trg_episode_comments_reavaliar_missoes ON public.episode_comments;
CREATE TRIGGER trg_episode_comments_reavaliar_missoes
  AFTER INSERT OR UPDATE OF oculto OR DELETE ON public.episode_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();

DROP TRIGGER IF EXISTS trg_episode_reactions_reavaliar_missoes ON public.episode_reactions;
CREATE TRIGGER trg_episode_reactions_reavaliar_missoes
  AFTER INSERT OR DELETE ON public.episode_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();

DROP TRIGGER IF EXISTS trg_user_cards_reavaliar_missoes ON public.user_cards;
CREATE TRIGGER trg_user_cards_reavaliar_missoes
  AFTER INSERT OR DELETE ON public.user_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.gatilho_reavaliar_missoes();
