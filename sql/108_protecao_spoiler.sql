-- =============================================================================
-- 108_protecao_spoiler.sql
-- Proteção contra spoiler (#274): marcação contem_spoiler em episode_comments e
-- exposição controlada em atividade_eventos / feed_comunidade / atividade_do_perfil
-- (só revela contem_spoiler quando quem lê já marcou o episódio).
-- =============================================================================

ALTER TABLE public.episode_comments
  ADD COLUMN IF NOT EXISTS contem_spoiler BOOLEAN NOT NULL DEFAULT false;

GRANT UPDATE (texto, contem_spoiler, editado_em) ON public.episode_comments TO authenticated;

-- Remover dependentes na ordem antes de alterar o tipo de retorno de atividade_eventos.
DROP FUNCTION IF EXISTS public.feed_comunidade(UUID, TEXT, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS public.atividade_do_perfil(UUID, TEXT, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER);

-- Definição viva (antes em sql/098 e sql/105).
CREATE FUNCTION public.atividade_eventos(
  p_eu      UUID,
  p_autores UUID[],
  p_antes   TIMESTAMPTZ DEFAULT NULL,
  p_limite  INTEGER DEFAULT 30
)
RETURNS TABLE (
  tipo           TEXT,
  quando         TIMESTAMPTZ,
  autor_id       UUID,
  autor_handle   TEXT,
  autor_nome     TEXT,
  autor_avatar   JSONB,
  autor_nivel    INTEGER,
  mal_id         INTEGER,
  titulo         TEXT,
  episodio       INTEGER,
  episodio_ate   INTEGER,
  comentario_id  UUID,
  texto          TEXT,
  texto_oculto   BOOLEAN,
  contem_spoiler BOOLEAN,
  alvo_handle    TEXT,
  alvo_nome      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH
  janela AS (
    SELECT LEAST(COALESCE(p_antes, now()), now()) AS ate,
           now() - INTERVAL '60 days'            AS desde,
           LEAST(GREATEST(COALESCE(p_limite, 30), 1), 50) AS n
  ),
  autores AS (
    SELECT p.user_id, p.handle, p.nome, p.avatar_custom
      FROM public.profiles p
     WHERE p.publico AND p.mostrar_atividade
       AND (p_autores IS NULL OR p.user_id = ANY (p_autores))
       AND NOT public.social_bloqueados(p_eu, p.user_id)
  ),
  episodios AS (
    SELECT * FROM (
      SELECT ep.user_id,
             ep.mal_id,
             max(COALESCE(ep.watched_at, ep.created_at)) AS quando,
             min(ep.episode_number) AS e1,
             max(ep.episode_number) AS e2
        FROM public.episode_progress ep
        JOIN autores a ON a.user_id = ep.user_id
       WHERE COALESCE(ep.watched_at, ep.created_at) >= (SELECT desde FROM janela)
       GROUP BY ep.user_id, ep.mal_id, (COALESCE(ep.watched_at, ep.created_at) AT TIME ZONE 'America/Sao_Paulo')::date
    ) g
    WHERE g.quando < (SELECT ate FROM janela)
       OR (p_antes IS NULL AND g.quando <= (SELECT ate FROM janela))
  ),
  eventos AS (
    SELECT 'episodios'::text AS tipo, e.quando, e.user_id, e.mal_id, e.e1 AS episodio, e.e2 AS episodio_ate,
           NULL::uuid AS comentario_id, NULL::text AS texto, false AS texto_oculto, false AS contem_spoiler,
           NULL::text AS alvo_handle, NULL::text AS alvo_nome
      FROM episodios e

    UNION ALL
    SELECT 'completou', COALESCE(m.completado_em, m.updated_at), m.user_id, m.mal_id, NULL, NULL, NULL, NULL, false, false, NULL, NULL
      FROM public.media_entries m
      JOIN autores a ON a.user_id = m.user_id
     WHERE m.status = 'Completo' AND m.tipo = 'anime'
       AND COALESCE(m.completado_em, m.updated_at) >= (SELECT desde FROM janela)
       AND (
         COALESCE(m.completado_em, m.updated_at) < (SELECT ate FROM janela)
         OR (p_antes IS NULL AND COALESCE(m.completado_em, m.updated_at) <= (SELECT ate FROM janela))
       )
       AND (
         EXISTS (
           SELECT 1
             FROM public.episode_progress ep
            WHERE ep.user_id = m.user_id
              AND ep.mal_id = m.mal_id
         )
         OR NOT (
           EXISTS (
             SELECT 1
               FROM public.anime_metadata_cache mc
              WHERE mc.mal_id = m.mal_id
                AND COALESCE(mc.episodes, 0) > 0
           )
           OR EXISTS (
             SELECT 1
               FROM public.curated_animes ca
              WHERE ca.mal_id = m.mal_id
                AND jsonb_typeof(ca.custom_episodes) = 'array'
                AND jsonb_array_length(ca.custom_episodes) > 0
           )
         )
       )

    UNION ALL
    SELECT 'comentou', c.created_at, c.user_id, c.mal_id, c.episode_number, NULL, c.id,
           CASE WHEN v.pode THEN left(c.texto, 280) END,
           NOT v.pode,
           CASE WHEN v.pode THEN c.contem_spoiler ELSE false END,
           NULL, NULL
      FROM public.episode_comments c
      JOIN autores a ON a.user_id = c.user_id
      CROSS JOIN LATERAL (
        SELECT p_eu IS NOT NULL AND (p_eu = c.user_id OR EXISTS (
          SELECT 1 FROM public.episode_progress vp
           WHERE vp.user_id = p_eu AND vp.mal_id = c.mal_id AND vp.episode_number = c.episode_number
        )) AS pode
      ) v
     WHERE NOT c.oculto
       AND EXISTS (
         SELECT 1 FROM public.episode_progress cep
          WHERE cep.user_id = c.user_id
            AND cep.mal_id = c.mal_id
            AND cep.episode_number = c.episode_number
       )
       AND c.created_at >= (SELECT desde FROM janela)
       AND (
         c.created_at < (SELECT ate FROM janela)
         OR (p_antes IS NULL AND c.created_at <= (SELECT ate FROM janela))
       )

    UNION ALL
    SELECT 'curtiu', l.created_at, l.user_id, c.mal_id, c.episode_number, NULL, c.id,
           CASE WHEN v.pode THEN left(c.texto, 280) END,
           NOT v.pode,
           CASE WHEN v.pode THEN c.contem_spoiler ELSE false END,
           dono.handle, dono.nome
      FROM public.comment_likes l
      JOIN autores a ON a.user_id = l.user_id
      JOIN public.episode_comments c ON c.id = l.comment_id
      LEFT JOIN public.profiles dono ON dono.user_id = c.user_id
      CROSS JOIN LATERAL (
        SELECT p_eu IS NOT NULL AND (p_eu = c.user_id OR EXISTS (
          SELECT 1 FROM public.episode_progress vp
           WHERE vp.user_id = p_eu AND vp.mal_id = c.mal_id AND vp.episode_number = c.episode_number
        )) AS pode
      ) v
     WHERE NOT c.oculto
       AND c.user_id <> l.user_id
       AND NOT public.social_bloqueados(p_eu, c.user_id)
       AND EXISTS (
         SELECT 1 FROM public.episode_progress lep
          WHERE lep.user_id = l.user_id
            AND lep.mal_id = c.mal_id
            AND lep.episode_number = c.episode_number
       )
       AND EXISTS (
         SELECT 1 FROM public.episode_progress cep
          WHERE cep.user_id = c.user_id
            AND cep.mal_id = c.mal_id
            AND cep.episode_number = c.episode_number
       )
       AND l.created_at >= (SELECT desde FROM janela)
       AND (
         l.created_at < (SELECT ate FROM janela)
         OR (p_antes IS NULL AND l.created_at <= (SELECT ate FROM janela))
       )
  ),
  pagina AS (
    SELECT * FROM eventos ORDER BY quando DESC LIMIT (SELECT n FROM janela)
  )
  SELECT pg.tipo, pg.quando, pg.user_id, a.handle, a.nome, a.avatar_custom,
         public.calcular_nivel_usuario(pg.user_id),
         pg.mal_id, COALESCE(NULLIF(ca.custom_title, ''), mc.title), pg.episodio, pg.episodio_ate,
         pg.comentario_id, pg.texto, pg.texto_oculto, pg.contem_spoiler, pg.alvo_handle, pg.alvo_nome
    FROM pagina pg
    JOIN autores a ON a.user_id = pg.user_id
    LEFT JOIN public.curated_animes ca ON ca.mal_id = pg.mal_id
    LEFT JOIN public.anime_metadata_cache mc ON mc.mal_id = pg.mal_id
   ORDER BY pg.quando DESC;
$$;

CREATE FUNCTION public.feed_comunidade(
  p_eu     UUID,
  p_aba    TEXT,
  p_antes  TIMESTAMPTZ DEFAULT NULL,
  p_limite INTEGER DEFAULT 30
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(e)
    FROM public.atividade_eventos(
      p_eu,
      CASE WHEN p_aba = 'seguindo'
           THEN COALESCE((SELECT array_agg(s.seguido_id) FROM public.seguidores s WHERE s.seguidor_id = p_eu), ARRAY[]::uuid[])
           ELSE NULL END,
      p_antes,
      p_limite
    ) e;
$$;

CREATE FUNCTION public.atividade_do_perfil(
  p_eu     UUID,
  p_handle TEXT,
  p_antes  TIMESTAMPTZ DEFAULT NULL,
  p_limite INTEGER DEFAULT 20
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(e)
    FROM public.profiles p
    CROSS JOIN LATERAL public.atividade_eventos(p_eu, ARRAY[p.user_id], p_antes, p_limite) e
   WHERE p.handle = lower(btrim(p_handle));
$$;

REVOKE ALL ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.feed_comunidade(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atividade_do_perfil(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.feed_comunidade(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.atividade_do_perfil(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
