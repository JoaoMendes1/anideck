-- =============================================================================
-- 105 — Consistência entre ações desfeitas, Feed, perfil e progresso (#270)
-- =============================================================================
--
-- Corrige os casos em que ações desfeitas continuavam aparecendo no Feed e no
-- perfil público:
--   1. Excluir uma entrada do deck (DELETE em media_entries) não apagava
--      episode_progress nem user_cards, deixando "assistiu" e XP órfãos.
--   2. Desmarcar todos os episódios manualmente (ou via DELETE /episodes)
--      mantinha media_entries.status = 'Completo' e a carta, deixando
--      "completou" no Feed e no perfil.
--   3. atividade_eventos (definição viva, antes em sql/098):
--      - "completou" passa a usar COALESCE(m.completado_em, m.updated_at),
--        evitando ressuscitar conclusão antiga ao editar nota/anotação, e
--        exige episode_progress quando o anime tem episódios conhecidos;
--      - "comentou" e "curtiu" exigem que o autor ainda tenha o episódio
--        marcado em episode_progress (desmarcar episódios apaga a atividade).
--   4. Limpeza pontual de entradas 'Completo' já órfãs (sem episódios marcados
--      para obras com episódios conhecidos) existentes antes desta correção.
--
-- Pode rodar mais de uma vez. Depende do sql/098 e do sql/102.

-- -----------------------------------------------------------------------------
-- 1. Limpar progresso, carta e revisão ativa ao remover entrada do deck
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limpar_progresso_ao_remover_entrada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.user_id IS NULL OR OLD.mal_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM set_config('anideck.saida_completo_descarte', '1', true);

  UPDATE public.revisoes
     SET ativa = false,
         concluida_em = COALESCE(concluida_em, now())
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id
     AND ativa = true;

  DELETE FROM public.episode_progress
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id;

  DELETE FROM public.xp_pendente
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id;

  DELETE FROM public.user_cards
   WHERE user_id = OLD.user_id
     AND mal_id = OLD.mal_id;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.limpar_progresso_ao_remover_entrada() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_media_entries_limpar_progresso ON public.media_entries;
CREATE TRIGGER trg_media_entries_limpar_progresso
  AFTER DELETE ON public.media_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.limpar_progresso_ao_remover_entrada();

-- -----------------------------------------------------------------------------
-- 2. Rebaixar 'Completo' e remover carta quando todos os episódios são desmarcados
-- -----------------------------------------------------------------------------
-- Prefixo "z_" garante execução posterior aos triggers de estorno de XP (sql/104)
-- e reavaliação de missões (sql/101) na tabela episode_progress.
CREATE OR REPLACE FUNCTION public.limpar_completo_sem_episodios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.user_id IS NULL OR COALESCE(OLD.mal_id, 0) <= 0 THEN
    RETURN OLD;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.episode_progress
     WHERE user_id = OLD.user_id
       AND mal_id = OLD.mal_id
  ) THEN
    PERFORM set_config('anideck.saida_completo_descarte', '1', true);

    UPDATE public.media_entries
       SET status = 'Quero Assistir',
           completado_em = NULL
     WHERE user_id = OLD.user_id
       AND mal_id = OLD.mal_id
       AND status = 'Completo';

    DELETE FROM public.user_cards
     WHERE user_id = OLD.user_id
       AND mal_id = OLD.mal_id;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.limpar_completo_sem_episodios() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_episode_progress_z_limpar_completo ON public.episode_progress;
CREATE TRIGGER trg_episode_progress_z_limpar_completo
  AFTER DELETE ON public.episode_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.limpar_completo_sem_episodios();

-- -----------------------------------------------------------------------------
-- 3. Limpeza retroativa de 'Completo' sem episódios em obras com episódios conhecidos
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_removido RECORD;
BEGIN
  PERFORM set_config('anideck.saida_completo_descarte', '1', true);

  FOR v_removido IN
    UPDATE public.media_entries m
       SET status = 'Quero Assistir',
           completado_em = NULL
     WHERE m.status = 'Completo'
       AND m.tipo = 'anime'
       AND NOT EXISTS (
         SELECT 1
           FROM public.episode_progress ep
          WHERE ep.user_id = m.user_id
            AND ep.mal_id = m.mal_id
       )
       AND (
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
    RETURNING m.user_id, m.mal_id
  LOOP
    DELETE FROM public.user_cards
     WHERE user_id = v_removido.user_id
       AND mal_id = v_removido.mal_id;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Índice por completado_em e definição viva de atividade_eventos (antes em sql/098)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS media_entries_completado_em_idx
  ON public.media_entries ((COALESCE(completado_em, updated_at)) DESC)
  WHERE status = 'Completo';

CREATE OR REPLACE FUNCTION public.atividade_eventos(
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
           NULL::uuid AS comentario_id, NULL::text AS texto, false AS texto_oculto,
           NULL::text AS alvo_handle, NULL::text AS alvo_nome
      FROM episodios e

    UNION ALL
    SELECT 'completou', COALESCE(m.completado_em, m.updated_at), m.user_id, m.mal_id, NULL, NULL, NULL, NULL, false, NULL, NULL
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
           CASE WHEN v.pode THEN left(c.texto, 280) END, NOT v.pode, NULL, NULL
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
           CASE WHEN v.pode THEN left(c.texto, 280) END, NOT v.pode, dono.handle, dono.nome
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
         pg.comentario_id, pg.texto, pg.texto_oculto, pg.alvo_handle, pg.alvo_nome
    FROM pagina pg
    JOIN autores a ON a.user_id = pg.user_id
    LEFT JOIN public.curated_animes ca ON ca.mal_id = pg.mal_id
    LEFT JOIN public.anime_metadata_cache mc ON mc.mal_id = pg.mal_id
   ORDER BY pg.quando DESC;
$$;

REVOKE ALL ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) TO service_role;
