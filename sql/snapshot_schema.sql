-- =============================================================================
-- snapshot_schema.sql — RETRATO DO BANCO. NAO EXECUTE ESTE ARQUIVO.
-- =============================================================================
-- Regenerado em 01/09/2026 10:02 a partir do banco de producao.
--
-- PARA QUE SERVE: consulta rapida do estado real do banco, sem precisar abrir
-- o painel do Supabase nem confiar nos arquivos sql/ antigos (que podem ter
-- sido redefinidos por arquivos de numero maior -- ver Armadilha 12 do
-- PITFALLS.md). Tambem serve como contexto inicial em sessao nova com IA.
--
-- O QUE ELE NAO E: uma migration. As secoes [1] e [2] sao comentarios; a [3]
-- tem DDL de view que so deve ser usado como referencia, nunca colado direto.
--
-- REGENERAR: rodar sql/gerar_snapshot.sql no SQL Editor e substituir este
-- arquivo inteiro pelo resultado. Fazer isso a cada arquivo sql/ novo.
-- =============================================================================

-- =============================================================================
-- [1] TABELAS — colunas e tipos
-- =============================================================================
-- ATENCAO: apenas colunas, tipos e NOT NULL. NAO inclui PK, FK, DEFAULT,
-- UNIQUE nem CHECK. Este bloco NAO recria as tabelas -- e so consulta.
-- =============================================================================

-- anime_metadata_cache
--     mal_id                       integer NOT NULL
--     title                        text
--     episodes                     integer
--     duration_minutes             integer
--     genres                       ARRAY
--     studios                      ARRAY
--     average_score                numeric
--     season_year                  integer
--     last_updated                 timestamp with time zone
--     tags                         ARRAY

-- app_admins
--     user_id                      uuid NOT NULL
--     created_at                   timestamp with time zone NOT NULL

-- app_settings
--     key                          text NOT NULL
--     value                        text NOT NULL
--     updated_at                   timestamp with time zone NOT NULL

-- curated_animes
--     id                           uuid NOT NULL
--     mal_id                       integer NOT NULL
--     custom_title                 text NOT NULL
--     custom_synopsis              text
--     custom_format                text
--     custom_status                text
--     custom_tags                  ARRAY
--     order_index                  integer
--     created_at                   timestamp with time zone
--     custom_cover_image           text
--     custom_banner_image          text
--     custom_characters            jsonb
--     custom_episodes              jsonb
--     custom_external_links        jsonb
--     custom_first_aired_at        timestamp with time zone
--     custom_duration_minutes      integer
--     is_destaque                  boolean NOT NULL
--     curation_status              text NOT NULL

-- curation_suggestions
--     id                           bigint NOT NULL
--     mal_id                       bigint NOT NULL
--     titulo                       text NOT NULL
--     imagem_url                   text
--     motivo                       text NOT NULL
--     score                        numeric NOT NULL
--     status                       text NOT NULL
--     created_at                   timestamp with time zone NOT NULL
--     reviewed_at                  timestamp with time zone

-- episode_progress
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     watched_at                   timestamp with time zone
--     created_at                   timestamp with time zone

-- genre_taxonomy
--     raw_name                     text NOT NULL
--     display_name_pt              text NOT NULL
--     tier                         text NOT NULL

-- media_entries
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     tipo                         text NOT NULL
--     status                       text NOT NULL
--     nota                         numeric
--     anotacao                     text
--     created_at                   timestamp with time zone NOT NULL
--     updated_at                   timestamp with time zone NOT NULL
--     is_favorite                  boolean

-- notifications
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     mal_id                       integer NOT NULL
--     episode_number               integer NOT NULL
--     read_at                      timestamp with time zone
--     created_at                   timestamp with time zone
--     anime_title                  text
--     anime_image                  text

-- push_subscriptions
--     id                           uuid NOT NULL
--     user_id                      uuid NOT NULL
--     endpoint                     text NOT NULL
--     p256dh                       text NOT NULL
--     auth                         text NOT NULL
--     created_at                   timestamp with time zone

-- ranking_snapshots
--     id                           bigint NOT NULL
--     captured_at                  timestamp with time zone NOT NULL
--     mal_id                       bigint NOT NULL
--     position                     integer NOT NULL

-- =============================================================================
-- [2] RLS POR TABELA
-- =============================================================================
-- RLS ligada com 0 policies significa que ninguem le pela API -- e proposital
-- em app_admins (lida pela is_admin(), SECURITY DEFINER) e ranking_snapshots
-- (lida pelo service role). Nao "corrigir" criando policy.
-- =============================================================================

-- anime_metadata_cache      | RLS: t     | policies: 3
-- app_admins                | RLS: t     | policies: 0
-- app_settings              | RLS: t     | policies: 3
-- curated_animes            | RLS: t     | policies: 4
-- curation_suggestions      | RLS: t     | policies: 1
-- episode_progress          | RLS: t     | policies: 1
-- genre_taxonomy            | RLS: t     | policies: 1
-- media_entries             | RLS: t     | policies: 4
-- notifications             | RLS: t     | policies: 2
-- push_subscriptions        | RLS: t     | policies: 1
-- ranking_snapshots         | RLS: t     | policies: 0

-- =============================================================================
-- [3] VIEWS — definicao viva
-- =============================================================================
-- O security_invoker exibido e o valor REAL de cada view no banco. Espera-se
-- "on" em todas desde o sql/017. View nova nasce "off" (default do Postgres).
--
-- NAO copie daqui para editar uma view sem conferir a clausula: o Table Editor
-- do Supabase omite o security_invoker, e colar sem ele devolve a view para
-- security definer em silencio (Armadilha 2 do PITFALLS.md).
-- =============================================================================

CREATE OR REPLACE VIEW public.view_episode_progress_orphans WITH (security_invoker = on) AS
 SELECT ep.user_id,
    ep.mal_id,
    cur.custom_title,
    ep.episode_number,
    ep.watched_at
   FROM episode_progress ep
     JOIN curated_animes cur ON cur.mal_id = ep.mal_id
  WHERE ep.user_id = auth.uid() AND cur.custom_episodes IS NOT NULL AND NOT (EXISTS ( SELECT 1
           FROM jsonb_array_elements(cur.custom_episodes) e(value)
          WHERE ((e.value ->> 'number'::text)::integer) = ep.episode_number))
  ORDER BY cur.custom_title, ep.episode_number;

CREATE OR REPLACE VIEW public.view_unmapped_labels WITH (security_invoker = on) AS
 SELECT r.raw_name,
    count(DISTINCT e.mal_id) AS animes,
    bool_or(cur.custom_tags IS NOT NULL) AS veio_de_curadoria
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
     LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
     CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
     LEFT JOIN genre_taxonomy t ON t.raw_name = r.raw_name
  WHERE e.user_id = auth.uid() AND t.raw_name IS NULL
  GROUP BY r.raw_name
  ORDER BY (count(DISTINCT e.mal_id)) DESC;

CREATE OR REPLACE VIEW public.view_user_activity WITH (security_invoker = on) AS
 SELECT user_id,
    date_trunc('week'::text, watched_at)::date AS semana,
    count(*) AS episodios_assistidos
   FROM episode_progress
  WHERE user_id = auth.uid()
  GROUP BY user_id, (date_trunc('week'::text, watched_at))
  ORDER BY (date_trunc('week'::text, watched_at)::date);

CREATE OR REPLACE VIEW public.view_user_fastest_binge WITH (security_invoker = on) AS
 SELECT ep.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    count(*) AS episodios_marcados,
    EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric AS horas_gastas
   FROM episode_progress ep
     LEFT JOIN anime_metadata_cache c ON ep.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON ep.mal_id = cur.mal_id
  WHERE ep.user_id = auth.uid()
  GROUP BY ep.user_id, ep.mal_id, (COALESCE(cur.custom_title, c.title))
 HAVING count(*) >= 3 AND EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) >= ((count(*) - 1) * 300)::numeric
  ORDER BY (EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric)
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_forgotten_anime WITH (security_invoker = on) AS
 SELECT e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    max(ep.watched_at) AS ultimo_episodio,
    count(ep.id) AS episodios_assistidos,
    c.episodes AS total_episodios
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
     LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
     LEFT JOIN episode_progress ep ON ep.mal_id = e.mal_id AND ep.user_id = e.user_id
  WHERE e.user_id = auth.uid() AND e.status = 'Assistindo'::text
  GROUP BY e.mal_id, cur.custom_title, c.title, c.episodes
 HAVING max(ep.watched_at) IS NOT NULL
  ORDER BY (max(ep.watched_at))
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_genre_affinity WITH (security_invoker = on) AS
 WITH rotulos_brutos AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            r.raw_name
           FROM media_entries e
             LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
             LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
          WHERE e.user_id = auth.uid() AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text]))
        ), rotulos AS (
         SELECT DISTINCT rb.user_id,
            rb.mal_id,
            rb.nota,
            COALESCE(t.display_name_pt, rb.raw_name) AS genre,
            COALESCE(t.tier, 'ignorado'::text) AS tier
           FROM rotulos_brutos rb
             LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
          WHERE COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text
        )
 SELECT user_id,
    genre,
    count(*) AS total_watched,
    round(avg(nota), 1) AS media_nota_genero,
    tier
   FROM rotulos
  GROUP BY user_id, genre, tier
  ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.view_user_genre_animes WITH (security_invoker = on) AS
 WITH base AS (
         SELECT e.user_id,
            e.mal_id,
            e.nota,
            e.status,
            COALESCE(cur.custom_title, c.title) AS title,
            r.raw_name
           FROM media_entries e
             LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
             LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
             CROSS JOIN LATERAL unnest(COALESCE(cur.custom_tags, COALESCE(c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[]))) r(raw_name)
          WHERE e.user_id = auth.uid() AND (e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text]))
        )
 SELECT DISTINCT b.user_id,
    COALESCE(t.display_name_pt, b.raw_name) AS genre,
    b.mal_id,
    b.title,
    b.nota,
    b.status
   FROM base b
     LEFT JOIN genre_taxonomy t ON t.raw_name = b.raw_name
  WHERE COALESCE(t.tier, 'ignorado'::text) <> 'ignorado'::text;

CREATE OR REPLACE VIEW public.view_user_longest_anime WITH (security_invoker = on) AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    c.episodes
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.status = 'Completo'::text AND e.user_id = auth.uid()
  ORDER BY c.episodes DESC NULLS LAST
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_rating_distribution WITH (security_invoker = on) AS
 SELECT user_id,
    nota,
    count(*) AS total
   FROM media_entries
  WHERE nota IS NOT NULL AND user_id = auth.uid()
  GROUP BY user_id, nota
  ORDER BY nota;

CREATE OR REPLACE VIEW public.view_user_stats WITH (security_invoker = on) AS
 SELECT e.user_id,
    count(*) AS total_animes,
    sum(
        CASE
            WHEN e.status = 'Assistindo'::text THEN 1
            ELSE 0
        END) AS assistindo,
    sum(
        CASE
            WHEN e.status = 'Em Dia'::text THEN 1
            ELSE 0
        END) AS em_dia,
    sum(
        CASE
            WHEN e.status = 'Completo'::text THEN 1
            ELSE 0
        END) AS completos,
    sum(
        CASE
            WHEN e.status = 'Dropado'::text THEN 1
            ELSE 0
        END) AS dropados,
    round(avg(e.nota), 1) AS nota_media,
    sum(COALESCE(ep_count.total, 0::bigint) * COALESCE(c.duration_minutes, 24))::bigint AS tempo_total_minutos,
    sum(
        CASE
            WHEN e.status = 'Quero Assistir'::text THEN 1
            ELSE 0
        END) AS quero_assistir
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN LATERAL ( SELECT count(*) AS total
           FROM episode_progress ep
          WHERE ep.user_id = e.user_id AND ep.mal_id = e.mal_id) ep_count ON true
  WHERE e.user_id = auth.uid()
  GROUP BY e.user_id;

CREATE OR REPLACE VIEW public.view_user_top_rated WITH (security_invoker = on) AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.nota IS NOT NULL AND e.user_id = auth.uid()
  ORDER BY e.nota DESC
 LIMIT 1;

CREATE OR REPLACE VIEW public.view_user_watch_dates WITH (security_invoker = on) AS
 SELECT DISTINCT user_id,
    date(watched_at) AS dia
   FROM episode_progress
  WHERE user_id = auth.uid()
  ORDER BY (date(watched_at));

CREATE OR REPLACE VIEW public.view_user_watch_hours WITH (security_invoker = on) AS
 SELECT user_id,
    EXTRACT(hour FROM watched_at)::integer AS hora,
    count(*) AS total
   FROM episode_progress
  WHERE user_id = auth.uid()
  GROUP BY user_id, (EXTRACT(hour FROM watched_at))
  ORDER BY (EXTRACT(hour FROM watched_at)::integer);

CREATE OR REPLACE VIEW public.view_user_watch_timestamps WITH (security_invoker = on) AS
 SELECT watched_at
   FROM episode_progress ep
  WHERE user_id = auth.uid()
  ORDER BY watched_at;

CREATE OR REPLACE VIEW public.view_user_year_animes WITH (security_invoker = on) AS
 SELECT e.user_id,
    c.season_year,
    e.mal_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota,
    e.status
   FROM media_entries e
     JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
     LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
  WHERE e.user_id = auth.uid() AND c.season_year IS NOT NULL;

CREATE OR REPLACE VIEW public.view_user_year_distribution WITH (security_invoker = on) AS
 SELECT e.user_id,
    c.season_year,
    count(*) AS total
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
  WHERE c.season_year IS NOT NULL AND e.user_id = auth.uid()
  GROUP BY e.user_id, c.season_year
  ORDER BY c.season_year;

-- =============================================================================
-- [4] POLICIES DO SCHEMA public
-- =============================================================================
-- Contar policies nao diz nada: USING (true) e USING (is_admin()) contam
-- igual. O que vale e o predicado abaixo (Armadilha 15 do PITFALLS.md).
-- =============================================================================

-- anime_metadata_cache   | Permitir inserção no cache para autenticados  | INSERT | authenticated     
--     USING:  -
--     CHECK:  true

-- anime_metadata_cache   | Leitura pública do cache                      | SELECT | public            
--     USING:  true
--     CHECK:  -

-- anime_metadata_cache   | Permitir atualização no cache para autenticados | UPDATE | authenticated     
--     USING:  true
--     CHECK:  true

-- app_settings           | app_settings_insert_admin                     | INSERT | public            
--     USING:  -
--     CHECK:  is_admin()

-- app_settings           | app_settings_leitura_publica                  | SELECT | public            
--     USING:  true
--     CHECK:  -

-- app_settings           | app_settings_update_admin                     | UPDATE | public            
--     USING:  is_admin()
--     CHECK:  is_admin()

-- curated_animes         | admin_remove_curadoria                        | DELETE | public            
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  -

-- curated_animes         | admin_insere_curadoria                        | INSERT | public            
--     USING:  -
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- curated_animes         | Leitura Pública Destaques                     | SELECT | public            
--     USING:  true
--     CHECK:  -

-- curated_animes         | admin_atualiza_curadoria                      | UPDATE | public            
--     USING:  ( SELECT is_admin() AS is_admin)
--     CHECK:  ( SELECT is_admin() AS is_admin)

-- curation_suggestions   | admin_gerencia_sugestoes                      | ALL    | public            
--     USING:  is_admin()
--     CHECK:  is_admin()

-- episode_progress       | Usuarios gerenciam seu proprio progresso de episodios | ALL    | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- genre_taxonomy         | Taxonomia é pública para usuários autenticados | SELECT | authenticated     
--     USING:  true
--     CHECK:  -

-- media_entries          | Usuários podem deletar suas próprias entradas | DELETE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- media_entries          | Usuários podem inserir suas próprias entradas | INSERT | public            
--     USING:  -
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- media_entries          | Usuários podem ver suas próprias entradas     | SELECT | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- media_entries          | Usuários podem atualizar suas próprias entradas | UPDATE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- notifications          | Users view own notifications                  | SELECT | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  -

-- notifications          | Users update own notifications                | UPDATE | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- push_subscriptions     | Users manage own subscriptions                | ALL    | public            
--     USING:  (( SELECT auth.uid() AS uid) = user_id)
--     CHECK:  (( SELECT auth.uid() AS uid) = user_id)

-- =============================================================================
-- [5] POLICIES DO STORAGE (storage.objects)
-- =============================================================================

-- Permitir upload apenas para o Admin           | INSERT | authenticated     
--     USING:  -
--     CHECK:  ((bucket_id = 'curadoria'::text) AND (auth.uid() = '<UUID_DO_ADMIN>'::uuid))

-- =============================================================================
-- [6] BUCKETS
-- =============================================================================
-- Os arquivos do Storage NAO entram no pg_dump. Backup separado via aws s3
-- sync -- ver DECISIONS.md de 01/09/2026.
-- =============================================================================

-- curadoria            | public: t     | limite: sem limite

-- =============================================================================
-- [7] FUNCOES E PERMISSAO DE EXECUCAO
-- =============================================================================
-- definer=true significa que a funcao ignora RLS. Combinada com anon=true, ela
-- e chamavel por qualquer um com a anon key (que vive no bundle publico) --
-- foi assim que o vazamento do sql/018 aconteceu.
--
-- Ao fechar uma funcao, REVOGAR TAMBEM DE PUBLIC: funcao nasce com EXECUTE
-- concedido ao pseudo-papel PUBLIC, e anon/authenticated herdam por ali.
-- REVOKE so de anon e authenticated nao fecha nada.
--
-- is_admin() com anon=true e inofensivo: sem JWT, auth.uid() e NULL e ela
-- devolve false. rls_auto_enable() e event trigger do Supabase, nao e
-- chamavel como funcao comum.
-- =============================================================================

-- fn_user_genre_affinity         | definer: f     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- get_cron_media_entries         | definer: t     | anon: f     | auth: f     | service: t     | search_path=public
-- is_admin                       | definer: t     | anon: t     | auth: t     | service: t     | search_path=public, pg_temp
-- process_cron_notification      | definer: t     | anon: f     | auth: f     | service: t     | search_path=public
-- rls_auto_enable                | definer: t     | anon: t     | auth: t     | service: t     | search_path=pg_catalog

-- =============================================================================
-- FIM DO RETRATO
-- =============================================================================