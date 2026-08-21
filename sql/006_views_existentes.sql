-- 006 — DDL das views que só existiam no painel do Supabase
--
-- Fecha a dívida técnica 2.1. Ao contrário dos arquivos anteriores, aqui **nada muda**:
-- este é o SQL real extraído do banco com `pg_get_viewdef`, não uma reconstrução de memória.
-- Rodar este arquivo num banco que já tem essas views é um no-op — elas serão recriadas
-- idênticas ao que já está lá.
--
-- O valor está em poder recriar o projeto do zero, e em conseguir revisar mudança de view
-- num diff de Pull Request em vez de no histórico (inexistente) do painel.
--
-- Todas já seguem a regra do projeto: filtro `user_id = auth.uid()` explícito.

-- Atividade por semana ------------------------------------------------------
CREATE OR REPLACE VIEW view_user_activity AS
 SELECT user_id,
    date_trunc('week'::text, watched_at)::date AS semana,
    count(*) AS episodios_assistidos
   FROM episode_progress
  WHERE user_id = auth.uid()
  GROUP BY user_id, (date_trunc('week'::text, watched_at))
  ORDER BY (date_trunc('week'::text, watched_at)::date);

-- Recorde: maratona mais rápida ---------------------------------------------
CREATE OR REPLACE VIEW view_user_fastest_binge AS
 SELECT ep.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    count(*) AS episodios_marcados,
    EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric AS horas_gastas
   FROM episode_progress ep
     LEFT JOIN anime_metadata_cache c ON ep.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON ep.mal_id = cur.mal_id
  WHERE ep.user_id = auth.uid()
  GROUP BY ep.user_id, ep.mal_id, (COALESCE(cur.custom_title, c.title))
 HAVING count(*) >= 2
  ORDER BY (EXTRACT(epoch FROM max(ep.watched_at) - min(ep.watched_at)) / 3600::numeric)
 LIMIT 1;

-- Recorde: maior maratona (mais episódios) ----------------------------------
CREATE OR REPLACE VIEW view_user_longest_anime AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    c.episodes
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.status = 'Completo'::text AND e.user_id = auth.uid()
  ORDER BY c.episodes DESC NULLS LAST
 LIMIT 1;

-- Histograma de notas --------------------------------------------------------
CREATE OR REPLACE VIEW view_user_rating_distribution AS
 SELECT user_id,
    nota,
    count(*) AS total
   FROM media_entries
  WHERE nota IS NOT NULL AND user_id = auth.uid()
  GROUP BY user_id, nota
  ORDER BY nota;

-- Números do topo da página --------------------------------------------------
-- O tempo total multiplica a contagem real de episódios marcados pela duração do episódio,
-- com 24 min de fallback. Foi a correção que trocou a fonte de verdade para episode_progress.
CREATE OR REPLACE VIEW view_user_stats AS
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
    sum(COALESCE(ep_count.total, 0::bigint) * COALESCE(c.duration_minutes, 24))::bigint AS tempo_total_minutos
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN LATERAL ( SELECT count(*) AS total
           FROM episode_progress ep
          WHERE ep.user_id = e.user_id AND ep.mal_id = e.mal_id) ep_count ON true
  WHERE e.user_id = auth.uid()
  GROUP BY e.user_id;

-- Recorde: nota mais alta ----------------------------------------------------
CREATE OR REPLACE VIEW view_user_top_rated AS
 SELECT e.user_id,
    COALESCE(cur.custom_title, c.title) AS title,
    e.nota
   FROM media_entries e
     LEFT JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
     LEFT JOIN curated_animes cur ON e.mal_id = cur.mal_id
  WHERE e.nota IS NOT NULL AND e.user_id = auth.uid()
  ORDER BY e.nota DESC
 LIMIT 1;

-- Dias distintos com atividade (base do streak, calculado em Go) --------------
CREATE OR REPLACE VIEW view_user_watch_dates AS
 SELECT DISTINCT user_id,
    date(watched_at) AS dia
   FROM episode_progress
  WHERE user_id = auth.uid()
  ORDER BY (date(watched_at));

-- Episódios por hora ---------------------------------------------------------
-- ⚠️ EXTRACT(hour ...) usa o fuso da sessão do Postgres (UTC no Supabase), o que desloca o
-- resultado para quem não está em UTC. Desde a Fase 6.8 o Padrão de Horário usa a
-- view_user_watch_timestamps + agrupamento por sessão, com a hora resolvida no navegador.
-- Esta view segue existindo apenas como fallback e não deve ganhar usos novos.
CREATE OR REPLACE VIEW view_user_watch_hours AS
 SELECT user_id,
    EXTRACT(hour FROM watched_at)::integer AS hora,
    count(*) AS total
   FROM episode_progress
  WHERE user_id = auth.uid()
  GROUP BY user_id, (EXTRACT(hour FROM watched_at))
  ORDER BY (EXTRACT(hour FROM watched_at)::integer);

-- Distribuição por ano de estreia --------------------------------------------
-- Depende de anime_metadata_cache.season_year, que só é preenchido pelo sync desde a
-- Fase 6.8. Animes cadastrados antes disso precisam do /api/admin/metadata/resync.
CREATE OR REPLACE VIEW view_user_year_distribution AS
 SELECT e.user_id,
    c.season_year,
    count(*) AS total
   FROM media_entries e
     JOIN anime_metadata_cache c ON e.mal_id = c.mal_id
  WHERE c.season_year IS NOT NULL AND e.user_id = auth.uid()
  GROUP BY e.user_id, c.season_year
  ORDER BY c.season_year;
