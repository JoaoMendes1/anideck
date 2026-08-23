


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "genre" "text", "total_watched" bigint, "media_nota_genero" numeric, "tier" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    WITH rotulos_brutos AS (
        SELECT
            e.user_id,
            e.mal_id,
            e.nota,
            r.raw_name
        FROM media_entries e
            LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
            LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
            CROSS JOIN LATERAL unnest(
                COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
            ) AS r(raw_name)
        WHERE e.user_id = p_user_id
          AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
    ),
    rotulos AS (
        SELECT DISTINCT
            rb.user_id,
            rb.mal_id,
            rb.nota,
            COALESCE(t.display_name_pt, rb.raw_name) AS genre,
            COALESCE(t.tier, 'genero')               AS tier
        FROM rotulos_brutos rb
        LEFT JOIN genre_taxonomy t ON t.raw_name = rb.raw_name
    )
    SELECT
        rotulos.user_id,
        rotulos.genre,
        count(*)            AS total_watched,
        round(avg(rotulos.nota), 1) AS media_nota_genero,
        rotulos.tier
    FROM rotulos
    GROUP BY rotulos.user_id, rotulos.genre, rotulos.tier
    ORDER BY (count(*)) DESC;
$$;


ALTER FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") IS 'Afinidade de gêneros de um usuário, com as 3 camadas da taxonomia. Fonte única: consumida pela view_user_genre_affinity (app) e pelo Agente Olheiro (cron).';



CREATE OR REPLACE FUNCTION "public"."get_cron_media_entries"() RETURNS TABLE("user_id" "uuid", "mal_id" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT user_id, mal_id
    FROM media_entries
    WHERE status IN ('Assistindo', 'Em Dia');
$$;


ALTER FUNCTION "public"."get_cron_media_entries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_cron_notification"("p_user_id" "uuid", "p_mal_id" integer, "p_episode_number" integer, "p_anime_title" "text", "p_anime_image" "text") RETURNS TABLE("endpoint" "text", "p256dh" "text", "auth" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO notifications (user_id, mal_id, episode_number, anime_title, anime_image)
    VALUES (p_user_id, p_mal_id, p_episode_number, p_anime_title, p_anime_image)
    ON CONFLICT (user_id, mal_id, episode_number) DO NOTHING;

    IF FOUND THEN
        RETURN QUERY 
        SELECT ps.endpoint, ps.p256dh, ps.auth
        FROM push_subscriptions ps
        WHERE ps.user_id = p_user_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."process_cron_notification"("p_user_id" "uuid", "p_mal_id" integer, "p_episode_number" integer, "p_anime_title" "text", "p_anime_image" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anime_metadata_cache" (
    "mal_id" integer NOT NULL,
    "title" "text",
    "episodes" integer,
    "duration_minutes" integer,
    "genres" "text"[],
    "studios" "text"[],
    "average_score" numeric,
    "season_year" integer,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "tags" "text"[]
);


ALTER TABLE "public"."anime_metadata_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curated_animes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mal_id" integer NOT NULL,
    "custom_title" "text" NOT NULL,
    "custom_synopsis" "text",
    "custom_format" "text",
    "custom_status" "text",
    "custom_tags" "text"[],
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_cover_image" "text",
    "custom_banner_image" "text",
    "custom_characters" "jsonb"
);


ALTER TABLE "public"."curated_animes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curation_suggestions" (
    "id" bigint NOT NULL,
    "mal_id" bigint NOT NULL,
    "titulo" "text" NOT NULL,
    "imagem_url" "text",
    "motivo" "text" NOT NULL,
    "score" numeric(6,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "curation_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'curado'::"text", 'dispensado'::"text"])))
);


ALTER TABLE "public"."curation_suggestions" OWNER TO "postgres";


COMMENT ON TABLE "public"."curation_suggestions" IS 'Fila do Agente Olheiro. Candidatos a entrar no catálogo curado, revisados manualmente no Painel Admin. O agente sugere, não decide.';



CREATE SEQUENCE IF NOT EXISTS "public"."curation_suggestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."curation_suggestions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."curation_suggestions_id_seq" OWNED BY "public"."curation_suggestions"."id";



CREATE TABLE IF NOT EXISTS "public"."episode_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mal_id" integer NOT NULL,
    "episode_number" integer NOT NULL,
    "watched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."episode_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genre_taxonomy" (
    "raw_name" "text" NOT NULL,
    "display_name_pt" "text" NOT NULL,
    "tier" "text" NOT NULL,
    CONSTRAINT "genre_taxonomy_tier_check" CHECK (("tier" = ANY (ARRAY['demografia'::"text", 'genero'::"text", 'tag_tematica'::"text", 'ignorado'::"text"])))
);


ALTER TABLE "public"."genre_taxonomy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mal_id" integer NOT NULL,
    "tipo" "text" NOT NULL,
    "status" "text" NOT NULL,
    "nota" numeric,
    "anotacao" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_favorite" boolean DEFAULT false,
    CONSTRAINT "media_entries_tipo_check" CHECK (("tipo" = ANY (ARRAY['anime'::"text", 'manga'::"text"])))
);


ALTER TABLE "public"."media_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mal_id" integer NOT NULL,
    "episode_number" integer NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "anime_title" "text",
    "anime_image" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_activity" AS
 SELECT "user_id",
    ("date_trunc"('week'::"text", "watched_at"))::"date" AS "semana",
    "count"(*) AS "episodios_assistidos"
   FROM "public"."episode_progress"
  WHERE ("user_id" = "auth"."uid"())
  GROUP BY "user_id", ("date_trunc"('week'::"text", "watched_at"))
  ORDER BY (("date_trunc"('week'::"text", "watched_at"))::"date");


ALTER VIEW "public"."view_user_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_fastest_binge" AS
 SELECT "ep"."user_id",
    COALESCE("cur"."custom_title", "c"."title") AS "title",
    "count"(*) AS "episodios_marcados",
    (EXTRACT(epoch FROM ("max"("ep"."watched_at") - "min"("ep"."watched_at"))) / (3600)::numeric) AS "horas_gastas"
   FROM (("public"."episode_progress" "ep"
     LEFT JOIN "public"."anime_metadata_cache" "c" ON (("ep"."mal_id" = "c"."mal_id")))
     LEFT JOIN "public"."curated_animes" "cur" ON (("ep"."mal_id" = "cur"."mal_id")))
  WHERE ("ep"."user_id" = "auth"."uid"())
  GROUP BY "ep"."user_id", "ep"."mal_id", COALESCE("cur"."custom_title", "c"."title")
 HAVING (("count"(*) >= 3) AND (EXTRACT(epoch FROM ("max"("ep"."watched_at") - "min"("ep"."watched_at"))) >= ((("count"(*) - 1) * 300))::numeric))
  ORDER BY (EXTRACT(epoch FROM ("max"("ep"."watched_at") - "min"("ep"."watched_at"))) / (3600)::numeric)
 LIMIT 1;


ALTER VIEW "public"."view_user_fastest_binge" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_forgotten_anime" AS
 SELECT "e"."mal_id",
    COALESCE("cur"."custom_title", "c"."title") AS "title",
    "max"("ep"."watched_at") AS "ultimo_episodio",
    "count"("ep"."id") AS "episodios_assistidos",
    "c"."episodes" AS "total_episodios"
   FROM ((("public"."media_entries" "e"
     LEFT JOIN "public"."anime_metadata_cache" "c" ON (("c"."mal_id" = "e"."mal_id")))
     LEFT JOIN "public"."curated_animes" "cur" ON (("cur"."mal_id" = "e"."mal_id")))
     LEFT JOIN "public"."episode_progress" "ep" ON ((("ep"."mal_id" = "e"."mal_id") AND ("ep"."user_id" = "e"."user_id"))))
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."status" = 'Assistindo'::"text"))
  GROUP BY "e"."mal_id", "cur"."custom_title", "c"."title", "c"."episodes"
 HAVING ("max"("ep"."watched_at") IS NOT NULL)
  ORDER BY ("max"("ep"."watched_at"))
 LIMIT 1;


ALTER VIEW "public"."view_user_forgotten_anime" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_genre_affinity" AS
 SELECT "user_id",
    "genre",
    "total_watched",
    "media_nota_genero",
    "tier"
   FROM "public"."fn_user_genre_affinity"("auth"."uid"()) "fn_user_genre_affinity"("user_id", "genre", "total_watched", "media_nota_genero", "tier");


ALTER VIEW "public"."view_user_genre_affinity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_genre_animes" AS
 WITH "base" AS (
         SELECT "e"."user_id",
            "e"."mal_id",
            "e"."nota",
            "e"."status",
            COALESCE("cur"."custom_title", "c"."title") AS "title",
            "r"."raw_name"
           FROM ((("public"."media_entries" "e"
             LEFT JOIN "public"."anime_metadata_cache" "c" ON (("c"."mal_id" = "e"."mal_id")))
             LEFT JOIN "public"."curated_animes" "cur" ON (("cur"."mal_id" = "e"."mal_id")))
             CROSS JOIN LATERAL "unnest"((COALESCE("cur"."custom_tags", "c"."genres", '{}'::"text"[]) || COALESCE("c"."tags", '{}'::"text"[]))) "r"("raw_name"))
          WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."status" = ANY (ARRAY['Completo'::"text", 'Em Dia'::"text", 'Assistindo'::"text"])))
        )
 SELECT DISTINCT "b"."user_id",
    COALESCE("t"."display_name_pt", "b"."raw_name") AS "genre",
    "b"."mal_id",
    "b"."title",
    "b"."nota",
    "b"."status"
   FROM ("base" "b"
     LEFT JOIN "public"."genre_taxonomy" "t" ON (("t"."raw_name" = "b"."raw_name")))
  WHERE (COALESCE("t"."tier", 'genero'::"text") <> 'ignorado'::"text");


ALTER VIEW "public"."view_user_genre_animes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_longest_anime" AS
 SELECT "e"."user_id",
    COALESCE("cur"."custom_title", "c"."title") AS "title",
    "c"."episodes"
   FROM (("public"."media_entries" "e"
     JOIN "public"."anime_metadata_cache" "c" ON (("e"."mal_id" = "c"."mal_id")))
     LEFT JOIN "public"."curated_animes" "cur" ON (("e"."mal_id" = "cur"."mal_id")))
  WHERE (("e"."status" = 'Completo'::"text") AND ("e"."user_id" = "auth"."uid"()))
  ORDER BY "c"."episodes" DESC NULLS LAST
 LIMIT 1;


ALTER VIEW "public"."view_user_longest_anime" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_rating_distribution" AS
 SELECT "user_id",
    "nota",
    "count"(*) AS "total"
   FROM "public"."media_entries"
  WHERE (("nota" IS NOT NULL) AND ("user_id" = "auth"."uid"()))
  GROUP BY "user_id", "nota"
  ORDER BY "nota";


ALTER VIEW "public"."view_user_rating_distribution" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_stats" AS
 SELECT "e"."user_id",
    "count"(*) AS "total_animes",
    "sum"(
        CASE
            WHEN ("e"."status" = 'Assistindo'::"text") THEN 1
            ELSE 0
        END) AS "assistindo",
    "sum"(
        CASE
            WHEN ("e"."status" = 'Em Dia'::"text") THEN 1
            ELSE 0
        END) AS "em_dia",
    "sum"(
        CASE
            WHEN ("e"."status" = 'Completo'::"text") THEN 1
            ELSE 0
        END) AS "completos",
    "sum"(
        CASE
            WHEN ("e"."status" = 'Dropado'::"text") THEN 1
            ELSE 0
        END) AS "dropados",
    "round"("avg"("e"."nota"), 1) AS "nota_media",
    ("sum"((COALESCE("ep_count"."total", (0)::bigint) * COALESCE("c"."duration_minutes", 24))))::bigint AS "tempo_total_minutos"
   FROM (("public"."media_entries" "e"
     LEFT JOIN "public"."anime_metadata_cache" "c" ON (("e"."mal_id" = "c"."mal_id")))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "total"
           FROM "public"."episode_progress" "ep"
          WHERE (("ep"."user_id" = "e"."user_id") AND ("ep"."mal_id" = "e"."mal_id"))) "ep_count" ON (true))
  WHERE ("e"."user_id" = "auth"."uid"())
  GROUP BY "e"."user_id";


ALTER VIEW "public"."view_user_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_top_rated" AS
 SELECT "e"."user_id",
    COALESCE("cur"."custom_title", "c"."title") AS "title",
    "e"."nota"
   FROM (("public"."media_entries" "e"
     LEFT JOIN "public"."anime_metadata_cache" "c" ON (("e"."mal_id" = "c"."mal_id")))
     LEFT JOIN "public"."curated_animes" "cur" ON (("e"."mal_id" = "cur"."mal_id")))
  WHERE (("e"."nota" IS NOT NULL) AND ("e"."user_id" = "auth"."uid"()))
  ORDER BY "e"."nota" DESC
 LIMIT 1;


ALTER VIEW "public"."view_user_top_rated" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_watch_dates" AS
 SELECT DISTINCT "user_id",
    "date"("watched_at") AS "dia"
   FROM "public"."episode_progress"
  WHERE ("user_id" = "auth"."uid"())
  ORDER BY ("date"("watched_at"));


ALTER VIEW "public"."view_user_watch_dates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_watch_hours" AS
 SELECT "user_id",
    (EXTRACT(hour FROM "watched_at"))::integer AS "hora",
    "count"(*) AS "total"
   FROM "public"."episode_progress"
  WHERE ("user_id" = "auth"."uid"())
  GROUP BY "user_id", (EXTRACT(hour FROM "watched_at"))
  ORDER BY ((EXTRACT(hour FROM "watched_at"))::integer);


ALTER VIEW "public"."view_user_watch_hours" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_watch_timestamps" AS
 SELECT "watched_at"
   FROM "public"."episode_progress" "ep"
  WHERE ("user_id" = "auth"."uid"())
  ORDER BY "watched_at";


ALTER VIEW "public"."view_user_watch_timestamps" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_year_animes" AS
 SELECT "e"."user_id",
    "c"."season_year",
    "e"."mal_id",
    COALESCE("cur"."custom_title", "c"."title") AS "title",
    "e"."nota",
    "e"."status"
   FROM (("public"."media_entries" "e"
     JOIN "public"."anime_metadata_cache" "c" ON (("c"."mal_id" = "e"."mal_id")))
     LEFT JOIN "public"."curated_animes" "cur" ON (("cur"."mal_id" = "e"."mal_id")))
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("c"."season_year" IS NOT NULL));


ALTER VIEW "public"."view_user_year_animes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_year_distribution" AS
 SELECT "e"."user_id",
    "c"."season_year",
    "count"(*) AS "total"
   FROM ("public"."media_entries" "e"
     JOIN "public"."anime_metadata_cache" "c" ON (("e"."mal_id" = "c"."mal_id")))
  WHERE (("c"."season_year" IS NOT NULL) AND ("e"."user_id" = "auth"."uid"()))
  GROUP BY "e"."user_id", "c"."season_year"
  ORDER BY "c"."season_year";


ALTER VIEW "public"."view_user_year_distribution" OWNER TO "postgres";


ALTER TABLE ONLY "public"."curation_suggestions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."curation_suggestions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."anime_metadata_cache"
    ADD CONSTRAINT "anime_metadata_cache_pkey" PRIMARY KEY ("mal_id");



ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."curated_animes"
    ADD CONSTRAINT "curated_animes_mal_id_key" UNIQUE ("mal_id");



ALTER TABLE ONLY "public"."curated_animes"
    ADD CONSTRAINT "curated_animes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curation_suggestions"
    ADD CONSTRAINT "curation_suggestions_mal_id_unique" UNIQUE ("mal_id");



ALTER TABLE ONLY "public"."curation_suggestions"
    ADD CONSTRAINT "curation_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."episode_progress"
    ADD CONSTRAINT "episode_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genre_taxonomy"
    ADD CONSTRAINT "genre_taxonomy_pkey" PRIMARY KEY ("raw_name");



ALTER TABLE ONLY "public"."media_entries"
    ADD CONSTRAINT "media_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "unique_endpoint" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "unique_notification" UNIQUE ("user_id", "mal_id", "episode_number");



ALTER TABLE ONLY "public"."media_entries"
    ADD CONSTRAINT "unique_user_anime" UNIQUE ("user_id", "mal_id");



ALTER TABLE ONLY "public"."episode_progress"
    ADD CONSTRAINT "unique_user_mal_episode" UNIQUE ("user_id", "mal_id", "episode_number");



CREATE INDEX "idx_curation_suggestions_pendentes" ON "public"."curation_suggestions" USING "btree" ("score" DESC) WHERE ("status" = 'pendente'::"text");



CREATE INDEX "idx_ep_user_mal" ON "public"."episode_progress" USING "btree" ("user_id", "mal_id");



ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."episode_progress"
    ADD CONSTRAINT "episode_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_entries"
    ADD CONSTRAINT "media_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin Full Access" ON "public"."curated_animes" USING (("auth"."uid"() = 'bb751d21-ba19-4ddf-9c85-1e86e8e6b5f7'::"uuid"));



CREATE POLICY "Leitura Pública Destaques" ON "public"."curated_animes" FOR SELECT USING (true);



CREATE POLICY "Leitura pública" ON "public"."curated_animes" FOR SELECT USING (true);



CREATE POLICY "Leitura pública do cache" ON "public"."anime_metadata_cache" FOR SELECT USING (true);



CREATE POLICY "Permitir atualização no cache para autenticados" ON "public"."anime_metadata_cache" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir edicao de configs" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Permitir inserção no cache para autenticados" ON "public"."anime_metadata_cache" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir leitura de configs" ON "public"."app_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Taxonomia é pública para usuários autenticados" ON "public"."genre_taxonomy" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users manage own subscriptions" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios gerenciam seu proprio progresso de episodios" ON "public"."episode_progress" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar suas próprias entradas" ON "public"."media_entries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem deletar suas próprias entradas" ON "public"."media_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir suas próprias entradas" ON "public"."media_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver suas próprias entradas" ON "public"."media_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_gerencia_sugestoes" ON "public"."curation_suggestions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."anime_metadata_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curated_animes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curation_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."episode_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genre_taxonomy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_genre_affinity"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_media_entries"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_media_entries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_media_entries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_cron_notification"("p_user_id" "uuid", "p_mal_id" integer, "p_episode_number" integer, "p_anime_title" "text", "p_anime_image" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_cron_notification"("p_user_id" "uuid", "p_mal_id" integer, "p_episode_number" integer, "p_anime_title" "text", "p_anime_image" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_cron_notification"("p_user_id" "uuid", "p_mal_id" integer, "p_episode_number" integer, "p_anime_title" "text", "p_anime_image" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."anime_metadata_cache" TO "anon";
GRANT ALL ON TABLE "public"."anime_metadata_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."anime_metadata_cache" TO "service_role";



GRANT ALL ON TABLE "public"."app_admins" TO "anon";
GRANT ALL ON TABLE "public"."app_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."app_admins" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."curated_animes" TO "anon";
GRANT ALL ON TABLE "public"."curated_animes" TO "authenticated";
GRANT ALL ON TABLE "public"."curated_animes" TO "service_role";



GRANT ALL ON TABLE "public"."curation_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."curation_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."curation_suggestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."curation_suggestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."curation_suggestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."curation_suggestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."episode_progress" TO "anon";
GRANT ALL ON TABLE "public"."episode_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."episode_progress" TO "service_role";



GRANT ALL ON TABLE "public"."genre_taxonomy" TO "anon";
GRANT ALL ON TABLE "public"."genre_taxonomy" TO "authenticated";
GRANT ALL ON TABLE "public"."genre_taxonomy" TO "service_role";



GRANT ALL ON TABLE "public"."media_entries" TO "anon";
GRANT ALL ON TABLE "public"."media_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."media_entries" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_activity" TO "anon";
GRANT ALL ON TABLE "public"."view_user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_activity" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_fastest_binge" TO "anon";
GRANT ALL ON TABLE "public"."view_user_fastest_binge" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_fastest_binge" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_forgotten_anime" TO "anon";
GRANT ALL ON TABLE "public"."view_user_forgotten_anime" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_forgotten_anime" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_genre_affinity" TO "anon";
GRANT ALL ON TABLE "public"."view_user_genre_affinity" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_genre_affinity" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_genre_animes" TO "anon";
GRANT ALL ON TABLE "public"."view_user_genre_animes" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_genre_animes" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_longest_anime" TO "anon";
GRANT ALL ON TABLE "public"."view_user_longest_anime" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_longest_anime" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_rating_distribution" TO "anon";
GRANT ALL ON TABLE "public"."view_user_rating_distribution" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_rating_distribution" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_stats" TO "anon";
GRANT ALL ON TABLE "public"."view_user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_top_rated" TO "anon";
GRANT ALL ON TABLE "public"."view_user_top_rated" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_top_rated" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_watch_dates" TO "anon";
GRANT ALL ON TABLE "public"."view_user_watch_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_watch_dates" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_watch_hours" TO "anon";
GRANT ALL ON TABLE "public"."view_user_watch_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_watch_hours" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_watch_timestamps" TO "anon";
GRANT ALL ON TABLE "public"."view_user_watch_timestamps" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_watch_timestamps" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_year_animes" TO "anon";
GRANT ALL ON TABLE "public"."view_user_year_animes" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_year_animes" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_year_distribution" TO "anon";
GRANT ALL ON TABLE "public"."view_user_year_distribution" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_year_distribution" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







