-- =============================================================================
-- RETRATO DO SCHEMA — NÃO EXECUTE ESTE ARQUIVO
-- =============================================================================
-- Regenerado em 26/08/2026 a partir do banco de produção.
--
-- Isto é uma FOTO, não uma migration. Existe para consulta: descobrir a
-- definição real de uma view sem abrir o painel do Supabase.
--
-- Executar reverteria qualquer alteração feita depois da data acima. Por isso
-- ele saiu da numeração — arquivo numerado é para rodar, este não é.
--
-- Para regenerar:
--   SELECT string_agg(
--            format('CREATE OR REPLACE VIEW public.%I AS%s%s;',
--                   viewname, chr(10), definition),
--            chr(10) || chr(10) ORDER BY viewname)
--   FROM pg_views WHERE schemaname = 'public';
--
-- Cobre apenas VIEWS. Tabelas, índices e policies não estão aqui.
-- =============================================================================

CREATE OR REPLACE VIEW public.view_episode_progress_orphans AS
 SELECT ep.user_id,
    ep.mal_id,
    cur.custom_title,
    ep.episode_number,
    ep.watched_at
   FROM (episode_progress ep
     JOIN curated_animes cur ON ((cur.mal_id = ep.mal_id)))
  WHERE ((ep.user_id = auth.uid()) AND (cur.custom_episodes IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM jsonb_array_elements(cur.custom_episodes) e(value)
          WHERE (((e.value ->> 'number'::text))::integer = ep.episode_number)))))
  ORDER BY cur.custom_title, ep.episode_number;;

CREATE OR REPLACE VIEW public.view_unmapped_labels AS
 SELECT r.raw_name,
    count(DISTINCT e.mal_id) AS animes,
    bool_or((cur.custom_tags IS NOT NULL)) AS veio_de_curadoria
   FROM ((((media_entries e
     LEFT JOIN anime_metadata_cache c ON ((c.mal_id = e.mal_id)))
     LEFT JOIN curated_animes cur ON ((cur.mal_id = e.mal_id)))
     CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, (COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])))) r(raw_name))
     LEFT JOIN genre_taxonomy t ON ((t.raw_name = r.raw_name)))
  WHERE ((e.user_id = auth.uid()) AND (t.raw_name IS NULL))
  GROUP BY r.raw_name
  ORDER BY (count(DISTINCT e.mal_id)) DESC;;

CREATE OR REPLACE VIEW public.view_user_activity AS
 SELECT user_id,
    (date_trunc('week'::text, watched_at))::date AS semana,
    count(*) AS episodios_assistidos
   FROM episode_progress
  WHERE (user_id = auth.uid())
  GROUP BY user_id, (date_trunc('week'::text, watched_at))
  ORDER BY ((date_trunc('week'::text, watched_at))::date);;

CREATE OR REPLACE VIEW public.view_user_fastest_binge AS
 SELECT ep.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    count(*) AS episodios_marcados,
    (EXTRACT(epoch FROM (max(ep.watched_at) - min(ep.watched_at))) / (3600)::numeric) AS horas_gastas
   FROM ((episode_progress ep
     LEFT JOIN anime_metadata_cache c ON ((ep.mal_id = c.mal_id)))
     LEFT JOIN curated_animes cur ON ((ep.mal_id = cur.mal_id)))
  WHERE (ep.user_id = auth.uid())
  GROUP BY ep.user_id, ep.mal_id, COALESCE(cur.custom_title, c.title)
 HAVING ((count(*) >= 3) AND (EXTRACT(epoch FROM (max(ep.watched_at) - min(ep.watched_at))) >= (((count(*) - 1) * 300))::numeric))
  ORDER BY (EXTRACT(epoch FROM (max(ep.watched_at) - min(ep.watched_at))) / (3600)::numeric)
 LIMIT 1;;

CREATE OR REPLACE VIEW public.view_user_forgotten_anime AS
 SELECT e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    max(ep.watched_at) AS ultimo_episodio,
    count(ep.id) AS episodios_assistidos,
    c.episodes AS total_episodios
   FROM (((media_entries e
     LEFT JOIN anime_metadata_cache c ON ((c.mal_id = e.mal_id)))
     LEFT JOIN curated_animes cur ON ((cur.mal_id = e.mal_id)))
     LEFT JOIN episode_progress ep ON (((ep.mal_id = e.mal_id) AND (ep.user_id = e.user_id))))
  WHERE ((e.user_id = auth.uid()) AND (e.status = 'Assistindo'::text))
  GROUP BY e.mal_id, cur.custom_title, c.title, c.episodes
 HAVING (max(ep.watched_at) IS NOT NULL)
  ORDER BY (max(ep.watched_at))
 LIMIT 1;;

CREATE OR REPLACE VIEW public.view_user_genre_affinity AS
 WITH rotulos_brutos AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            r.raw_name
           FROM (((media_entries e
             LEFT JOIN anime_metadata_cache c ON ((c.mal_id = e.mal_id)))
             LEFT JOIN curated_animes cur ON ((cur.mal_id = e.mal_id)))
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, (COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])))) r(raw_name))
          WHERE ((e.user_id = auth.uid()) AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])))
        ), rotulos AS (
         SELECT DISTINCT rb.user_id,
            rb.mal_id,
            rb.nota,
            COALESCE(t.display_name_pt, rb.raw_name) AS genre,
            COALESCE(t.tier, 'ignorado'::text) AS tier
           FROM (rotulos_brutos rb
             LEFT JOIN genre_taxonomy t ON ((t.raw_name = rb.raw_name)))
          WHERE (COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text)
        )
 SELECT user_id,
    genre,
    count(*) AS total_watched,
    round(avg(nota), 1) AS media_nota_genero,
    tier
   FROM rotulos
  GROUP BY user_id, genre, tier
  ORDER BY (count(*)) DESC;;

CREATE OR REPLACE VIEW public.view_user_genre_animes AS
 WITH base AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            e.status,
            COALESCE(cur.custom_title, c.title) AS title,
            r.raw_name
           FROM (((media_entries e
             LEFT JOIN anime_metadata_cache c ON ((c.mal_id = e.mal_id)))
             LEFT JOIN curated_animes cur ON ((cur.mal_id = e.mal_id)))
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, (COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])))) r(raw_name))
          WHERE ((e.user_id = auth.uid()) AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])))
        )
 SELECT DISTINCT b.user_id,
    COALESCE(t.display_name_pt, b.raw_name) AS genre,
    b.mal_id,
    b.title,
    b.nota,
    b.status
   FROM (base b
     LEFT JOIN genre_taxonomy t ON ((t.raw_name = b.raw_name)))
  WHERE (COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text);;

CREATE OR REPLACE VIEW public.view_user_longest_anime AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    c.episodes
   FROM ((media_entries e
     JOIN anime_metadata_cache c ON ((e.mal_id = c.mal_id)))
     LEFT JOIN curated_animes cur ON ((e.mal_id = cur.mal_id)))
  WHERE ((e.status = 'Completo'::text) AND (e.user_id = auth.uid()))
  ORDER BY c.episodes DESC NULLS LAST
 LIMIT 1;;

CREATE OR REPLACE VIEW public.view_user_rating_distribution AS
 SELECT user_id,
    nota,
    count(*) AS total
   FROM media_entries
  WHERE ((nota IS NOT NULL) AND (user_id = auth.uid()))
  GROUP BY user_id, nota
  ORDER BY nota;;

CREATE OR REPLACE VIEW public.view_user_stats AS
 SELECT e.user_id,
    count(*) AS total_animes,
    sum(
        CASE
            WHEN (e.status = 'Assistindo'::text) THEN 1
            ELSE 0
        END) AS assistindo,
    sum(
        CASE
            WHEN (e.status = 'Em Dia'::text) THEN 1
            ELSE 0
        END) AS em_dia,
    sum(
        CASE
            WHEN (e.status = 'Completo'::text) THEN 1
            ELSE 0
        END) AS completos,
    sum(
        CASE
            WHEN (e.status = 'Dropado'::text) THEN 1
            ELSE 0
        END) AS dropados,
    round(avg(e.nota), 1) AS nota_media,
    (sum((COALESCE(ep_count.total, (0)::bigint) * COALESCE(c.duration_minutes, 24))))::bigint AS tempo_total_minutos,
    sum(
        CASE
            WHEN (e.status = 'Quero Assistir'::text) THEN 1
            ELSE 0
        END) AS quero_assistir
   FROM ((media_entries e
     LEFT JOIN anime_metadata_cache c ON ((e.mal_id = c.mal_id)))
     LEFT JOIN LATERAL ( SELECT count(*) AS total
           FROM episode_progress ep
          WHERE ((ep.user_id = e.user_id) AND (ep.mal_id = e.mal_id))) ep_count ON (true))
  WHERE (e.user_id = auth.uid())
  GROUP BY e.user_id;;

CREATE OR REPLACE VIEW public.view_user_top_rated AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota
   FROM ((media_entries e
     LEFT JOIN anime_metadata_cache c ON ((e.mal_id = c.mal_id)))
     LEFT JOIN curated_animes cur ON ((e.mal_id = cur.mal_id)))
  WHERE ((e.nota IS NOT NULL) AND (e.user_id = auth.uid()))
  ORDER BY e.nota DESC
 LIMIT 1;;

CREATE OR REPLACE VIEW public.view_user_watch_dates AS
 SELECT DISTINCT user_id,
    date(watched_at) AS dia
   FROM episode_progress
  WHERE (user_id = auth.uid())
  ORDER BY (date(watched_at));;

CREATE OR REPLACE VIEW public.view_user_watch_hours AS
 SELECT user_id,
    (EXTRACT(hour FROM watched_at))::integer AS hora,
    count(*) AS total
   FROM episode_progress
  WHERE (user_id = auth.uid())
  GROUP BY user_id, (EXTRACT(hour FROM watched_at))
  ORDER BY ((EXTRACT(hour FROM watched_at))::integer);;

CREATE OR REPLACE VIEW public.view_user_watch_timestamps AS
 SELECT watched_at
   FROM episode_progress ep
  WHERE (user_id = auth.uid())
  ORDER BY watched_at;;

CREATE OR REPLACE VIEW public.view_user_year_animes AS
 SELECT e.user_id,
    c.season_year,
    e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota,
    e.status
   FROM ((media_entries e
     JOIN anime_metadata_cache c ON ((c.mal_id = e.mal_id)))
     LEFT JOIN curated_animes cur ON ((cur.mal_id = e.mal_id)))
  WHERE ((e.user_id = auth.uid()) AND (c.season_year IS NOT NULL));;

CREATE OR REPLACE VIEW public.view_user_year_distribution AS
 SELECT e.user_id,
    c.season_year,
    count(*) AS total
   FROM (media_entries e
     JOIN anime_metadata_cache c ON ((e.mal_id = c.mal_id)))
  WHERE ((c.season_year IS NOT NULL) AND (e.user_id = auth.uid()))
  GROUP BY e.user_id, c.season_year
  ORDER BY c.season_year;;