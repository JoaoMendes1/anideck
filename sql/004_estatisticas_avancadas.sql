-- 004 — Views de apoio para os indicadores avançados das Estatísticas
--
-- Três views novas. Nenhuma substitui nada existente, então é seguro rodar.
-- Todas seguem a regra do projeto: filtro `user_id = auth.uid()` explícito, porque uma view
-- no Postgres roda no contexto de quem a criou e não herda a RLS da tabela base.

-- ---------------------------------------------------------------------------
-- 1. Animes por rótulo — alimenta o drill-down ("assisti 30 de Fantasia, mas quais?")
--
-- Repete de propósito a mesma lógica de rótulos da view_user_genre_affinity: o override da
-- curadoria, a soma das tags e a tradução via genre_taxonomy. Se as duas divergirem, o
-- usuário clica num gênero com 12 animes e a lista abre com 9 — a contagem tem que bater.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_user_genre_animes AS
WITH base AS (
  SELECT
    e.user_id,
    e.mal_id,
    e.nota,
    e.status,
    COALESCE(cur.custom_title, c.title) AS title,
    r.raw_name
  FROM media_entries e
    LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
    LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
    CROSS JOIN LATERAL unnest(
      COALESCE(cur.custom_tags, c.genres, '{}'::text[]) || COALESCE(c.tags, '{}'::text[])
    ) AS r(raw_name)
  WHERE e.user_id = auth.uid()
    AND e.status = ANY (ARRAY['Completo'::text, 'Em Dia'::text, 'Assistindo'::text])
)
SELECT DISTINCT
  b.user_id,
  COALESCE(t.display_name_pt, b.raw_name) AS genre,
  b.mal_id,
  b.title,
  b.nota,
  b.status
FROM base b
  LEFT JOIN genre_taxonomy t ON t.raw_name = b.raw_name;

-- ---------------------------------------------------------------------------
-- 2. Marcações cruas — alimenta o agrupamento por sessão do Padrão de Horário
--
-- Devolve o timestamp de cada episódio marcado, sem agregar. O agrupamento em sessões
-- acontece em Go (é o mesmo tipo de problema do streak: gaps and islands, mais legível e
-- testável fora do SQL), e a conversão para a hora local acontece no navegador.
--
-- Por que a hora não é extraída aqui: `EXTRACT(HOUR FROM watched_at)` usa o fuso da sessão
-- do Postgres, que no Supabase é UTC. Para quem está em UTC-3, isso joga tudo 3 horas pra
-- frente e o gráfico mente. Só o navegador sabe o fuso real de quem está olhando.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_user_watch_timestamps AS
SELECT ep.watched_at
FROM episode_progress ep
WHERE ep.user_id = auth.uid()
ORDER BY ep.watched_at;

-- ---------------------------------------------------------------------------
-- 3. Anime esquecido — o que está "Assistindo" há mais tempo sem episódio novo
--
-- Só entram animes que já foram começados de verdade (têm pelo menos uma marcação). Um
-- anime adicionado ao deck e nunca iniciado não foi "esquecido" — nunca começou.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_user_forgotten_anime AS
SELECT
  e.mal_id,
  COALESCE(cur.custom_title, c.title) AS title,
  max(ep.watched_at)                  AS ultimo_episodio,
  count(ep.id)                        AS episodios_assistidos,
  c.episodes                          AS total_episodios
FROM media_entries e
  LEFT JOIN anime_metadata_cache c ON c.mal_id = e.mal_id
  LEFT JOIN curated_animes cur ON cur.mal_id = e.mal_id
  LEFT JOIN episode_progress ep ON ep.mal_id = e.mal_id AND ep.user_id = e.user_id
WHERE e.user_id = auth.uid()
  AND e.status = 'Assistindo'
GROUP BY e.mal_id, cur.custom_title, c.title, c.episodes
HAVING max(ep.watched_at) IS NOT NULL
ORDER BY max(ep.watched_at) ASC
LIMIT 1;
