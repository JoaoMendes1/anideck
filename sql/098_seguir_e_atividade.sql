-- =============================================================================
-- 098 — Seguir jogadores, atividade no perfil público e feed da comunidade
-- =============================================================================
--
-- O que muda:
--   1. profiles.mostrar_atividade (padrão: ligado). Desligado, o perfil continua público,
--      mas o que a pessoa assiste, comenta e curte some do perfil e do feed.
--   2. seguidores: quem segue quem. Só se segue perfil público, nunca a si mesmo nem quem
--      tem bloqueio com você (em qualquer direção). Cada um lê só as próprias linhas.
--   3. atividade_eventos(): a lista de acontecimentos, usada pelo perfil e pelo feed:
--      episódios marcados (agrupados por anime e dia), anime completo, comentário e curtida,
--      dos últimos 60 dias.
--   4. social_seguir(), social_resumo(), atividade_assistindo() e feed_comunidade().
--   5. Índices por data nas tabelas lidas pelo feed.
--
-- SPOILER: o texto de um comentário (e do comentário curtido) só sai quando quem olha já
-- marcou aquele episódio, ou é o autor. É a mesma regra da RLS de episode_comments (sql/041);
-- sem ela, o feed mostraria o comentário de um episódio que a pessoa ainda não viu.
--
-- Todas as funções são do service role: o Go confere o token e passa quem está olhando
-- (p_eu, nulo para visitante). O id do autor sai da função só para o Go montar o retrato;
-- a resposta da API leva o @, não o id.
--
-- Pode rodar mais de uma vez.

-- =============================================================================
-- 1. Opção de esconder a atividade
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mostrar_atividade BOOLEAN NOT NULL DEFAULT true;

-- profiles só aceita escrita nas colunas listadas (sql/041 e sql/053): sem isto, salvar a
-- opção pelas Configurações falharia com permissão negada.
GRANT INSERT (mostrar_atividade) ON public.profiles TO authenticated;
GRANT UPDATE (mostrar_atividade) ON public.profiles TO authenticated;

-- =============================================================================
-- 2. Seguidores
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seguidores (
  seguidor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seguido_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (seguidor_id, seguido_id),
  CONSTRAINT seguidores_nao_a_si_mesmo CHECK (seguidor_id <> seguido_id)
);

-- A chave primária já serve a busca por quem eu sigo; este serve a contagem de seguidores.
CREATE INDEX IF NOT EXISTS seguidores_seguido_idx ON public.seguidores (seguido_id);

ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seguidores_le_os_proprios ON public.seguidores;
CREATE POLICY seguidores_le_os_proprios ON public.seguidores
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = seguidor_id);

REVOKE ALL ON public.seguidores FROM anon, authenticated;
GRANT SELECT ON public.seguidores TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.seguidores TO service_role;

-- =============================================================================
-- 3. Índices por data (o feed lê "o mais recente primeiro")
-- =============================================================================

CREATE INDEX IF NOT EXISTS episode_progress_quando_idx
  ON public.episode_progress ((COALESCE(watched_at, created_at)) DESC);
CREATE INDEX IF NOT EXISTS episode_comments_criado_idx
  ON public.episode_comments (created_at DESC);
CREATE INDEX IF NOT EXISTS comment_likes_criado_idx
  ON public.comment_likes (created_at DESC);
CREATE INDEX IF NOT EXISTS media_entries_completo_idx
  ON public.media_entries (updated_at DESC) WHERE status = 'Completo';

-- =============================================================================
-- 4. Bloqueio em qualquer direção
-- =============================================================================

CREATE OR REPLACE FUNCTION public.social_bloqueados(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_a IS NOT NULL AND p_b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks b
     WHERE (b.blocker_id = p_a AND b.blocked_id = p_b)
        OR (b.blocker_id = p_b AND b.blocked_id = p_a)
  );
$$;

-- =============================================================================
-- 5. Eventos de atividade
-- =============================================================================
-- p_autores nulo: todos os perfis que mostram atividade (feed Geral). Lista: só esses.
-- p_antes: cursor da página; a próxima página pede os eventos anteriores ao último visto.
-- Os episódios são agrupados por anime e dia (fuso de Brasília) ANTES do cursor, para um
-- grupo não aparecer cortado em duas páginas.

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
  ),
  eventos AS (
    SELECT 'episodios'::text AS tipo, e.quando, e.user_id, e.mal_id, e.e1 AS episodio, e.e2 AS episodio_ate,
           NULL::uuid AS comentario_id, NULL::text AS texto, false AS texto_oculto,
           NULL::text AS alvo_handle, NULL::text AS alvo_nome
      FROM episodios e

    UNION ALL
    SELECT 'completou', m.updated_at, m.user_id, m.mal_id, NULL, NULL, NULL, NULL, false, NULL, NULL
      FROM public.media_entries m
      JOIN autores a ON a.user_id = m.user_id
     WHERE m.status = 'Completo' AND m.tipo = 'anime'
       AND m.updated_at >= (SELECT desde FROM janela) AND m.updated_at < (SELECT ate FROM janela)

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
       AND c.created_at >= (SELECT desde FROM janela) AND c.created_at < (SELECT ate FROM janela)

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
       AND l.created_at >= (SELECT desde FROM janela) AND l.created_at < (SELECT ate FROM janela)
  ),
  pagina AS (
    SELECT * FROM eventos ORDER BY quando DESC LIMIT (SELECT n FROM janela)
  )
  SELECT pg.tipo, pg.quando, pg.user_id, a.handle, a.nome, a.avatar_custom,
         public.calcular_nivel_usuario(pg.user_id),
         pg.mal_id, mc.title, pg.episodio, pg.episodio_ate, pg.comentario_id, pg.texto,
         pg.texto_oculto, pg.alvo_handle, pg.alvo_nome
    FROM pagina pg
    JOIN autores a ON a.user_id = pg.user_id
    LEFT JOIN public.anime_metadata_cache mc ON mc.mal_id = pg.mal_id
   ORDER BY pg.quando DESC;
$$;

-- =============================================================================
-- 6. Feed: Geral (todos que mostram atividade) ou Seguindo
-- =============================================================================

CREATE OR REPLACE FUNCTION public.feed_comunidade(
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

-- =============================================================================
-- 7. Atividade de um perfil: eventos e o que está assistindo agora
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atividade_do_perfil(
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

CREATE OR REPLACE FUNCTION public.atividade_assistindo(p_eu UUID, p_handle TEXT)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
           'mal_id', m.mal_id,
           'titulo', mc.title,
           'episodios', mc.episodes,
           'ultimo_episodio', u.ultimo,
           'atualizado_em', GREATEST(m.updated_at, u.quando)
         )
    FROM public.profiles p
    JOIN public.media_entries m ON m.user_id = p.user_id AND m.status = 'Assistindo' AND m.tipo = 'anime'
    LEFT JOIN public.anime_metadata_cache mc ON mc.mal_id = m.mal_id
    CROSS JOIN LATERAL (
      SELECT max(ep.episode_number) AS ultimo, max(COALESCE(ep.watched_at, ep.created_at)) AS quando
        FROM public.episode_progress ep
       WHERE ep.user_id = p.user_id AND ep.mal_id = m.mal_id
    ) u
   WHERE p.handle = lower(btrim(p_handle))
     AND p.publico AND p.mostrar_atividade
     AND NOT public.social_bloqueados(p_eu, p.user_id)
   ORDER BY GREATEST(m.updated_at, u.quando) DESC NULLS LAST
   LIMIT 8;
$$;

-- =============================================================================
-- 8. Seguir e contar
-- =============================================================================

CREATE OR REPLACE FUNCTION public.social_resumo(p_eu UUID, p_handle TEXT)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
           'seguidores', (SELECT count(*) FROM public.seguidores s WHERE s.seguido_id = p.user_id),
           'seguindo',   (SELECT count(*) FROM public.seguidores s WHERE s.seguidor_id = p.user_id),
           'eu_sigo',    p_eu IS NOT NULL AND EXISTS (
                           SELECT 1 FROM public.seguidores s WHERE s.seguidor_id = p_eu AND s.seguido_id = p.user_id),
           'sou_eu',     p_eu IS NOT NULL AND p_eu = p.user_id,
           'mostra_atividade', p.mostrar_atividade
         )
    FROM public.profiles p
   WHERE p.handle = lower(btrim(p_handle)) AND p.publico;
$$;

-- Segue (p_seguir = true) ou deixa de seguir. Devolve o resumo novo. Seguir de novo quem já
-- se segue, ou deixar quem não se segue, não é erro: o botão pode ter sido clicado duas vezes.
CREATE OR REPLACE FUNCTION public.social_seguir(p_eu UUID, p_handle TEXT, p_seguir BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alvo    UUID;
  v_publico BOOLEAN;
  v_total   INTEGER;
BEGIN
  IF p_eu IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, publico INTO v_alvo, v_publico
    FROM public.profiles
   WHERE handle = lower(btrim(p_handle));

  -- Perfil privado responde como inexistente, para não confirmar que o @ existe.
  IF v_alvo IS NULL OR v_publico IS NOT TRUE THEN
    RAISE EXCEPTION 'Membro não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF p_seguir THEN
    IF v_alvo = p_eu THEN
      RAISE EXCEPTION 'Você não pode seguir a si mesmo.' USING ERRCODE = 'P0001';
    END IF;
    IF public.social_bloqueados(p_eu, v_alvo) THEN
      RAISE EXCEPTION 'Membro não encontrado.' USING ERRCODE = 'P0002';
    END IF;
    -- Teto para a aba Seguindo continuar leve.
    SELECT count(*) INTO v_total FROM public.seguidores WHERE seguidor_id = p_eu;
    IF v_total >= 500 THEN
      RAISE EXCEPTION 'Você já segue 500 membros, o máximo.' USING ERRCODE = 'P0003';
    END IF;
    INSERT INTO public.seguidores (seguidor_id, seguido_id)
    VALUES (p_eu, v_alvo)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.seguidores WHERE seguidor_id = p_eu AND seguido_id = v_alvo;
  END IF;

  RETURN public.social_resumo(p_eu, p_handle);
END;
$$;

-- =============================================================================
-- 9. Permissões: só o service role chama
-- =============================================================================

REVOKE ALL ON FUNCTION public.social_bloqueados(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.feed_comunidade(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atividade_do_perfil(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atividade_assistindo(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_resumo(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.social_seguir(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.social_bloqueados(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.atividade_eventos(UUID, UUID[], TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.feed_comunidade(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.atividade_do_perfil(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.atividade_assistindo(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_resumo(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_seguir(UUID, TEXT, BOOLEAN) TO service_role;
